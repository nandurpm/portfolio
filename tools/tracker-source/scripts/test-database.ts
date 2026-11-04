/** Real PostgreSQL/RLS/RPC tests, restricted to an explicitly disposable loopback database. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { financialFixture } from '../tests/fixtures/financial';
import { cloudPlan } from '../src/cloud/model';
const run = promisify(execFile),
  raw = process.env.TRACKER_TEST_DATABASE_URL;
if (!raw || process.env.TRACKER_DISPOSABLE_DATABASE !== 'I_AUTHORIZE_SYNTHETIC_TEST_RECORDS') {
  console.error(
    'BLOCKED: disposable loopback PostgreSQL database and explicit opt-in required. No requests made.',
  );
  process.exit(2);
}
const url = new URL(raw);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Loopback database only');
assert.equal(url.pathname, '/tracker_test', 'Database must be named tracker_test');
const sql = async (text: string) => {
  const out = await run(
    'psql',
    ['--dbname', url.href, '-X', '-qAt', '--set', 'ON_ERROR_STOP=1', '--command', text],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  return out.stdout.trim().split('\n').at(-1) ?? '';
};
const quote = (v: string) => "'" + v.replaceAll("'", "''") + "'";
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222';
const as = async (role: string, owner: string, text: string) =>
  sql(
    `BEGIN; SET LOCAL ROLE ${role}; SELECT set_config('request.jwt.claims',${quote(owner ? JSON.stringify({ sub: owner }) : '{}')},true); ${text}; COMMIT;`,
  );
const data = cloudPlan(financialFixture().data);
const save = async (owner: string, rev: number, mutation: string, payload: unknown = data) =>
  JSON.parse(
    await as(
      'authenticated',
      owner,
      `SELECT public.tracker_save_plan(${quote(JSON.stringify(payload))}::jsonb,${rev},${quote(mutation)}::uuid)`,
    ),
  );
const denied = async (p: Promise<unknown>, message: string) => {
  await assert.rejects(p, message);
  checks++;
};
let checks = 0;
assert.equal(
  await sql("SELECT to_regclass('public.tracker_plans') IS NULL"),
  't',
  'Refusing nonempty test schema',
);
await sql(await fs.readFile('database/test-fixture/schema.sql', 'utf8'));
await sql(`INSERT INTO auth.users(id) VALUES('${a}'),('${b}')`);
assert.equal(await sql("SELECT has_table_privilege('authenticated','public.tracker_plans','INSERT')"),'f');checks++;
const id = crypto.randomUUID();
const first = await save(a, 0, id);
assert.equal(first.ok, true);
assert.equal((await save(a,0,id)).revision,1,'Replay after a lost response must not increment revision');checks++;
assert.equal((await save(a,0,crypto.randomUUID())).ok,false,'Stale revision after a committed save must not overwrite');checks++;
checks++;
assert.equal((await save(b, 0, crypto.randomUUID())).ok, true);
checks++;
for (const [who, other] of [
  [a, b],
  [b, a],
]) {
  assert.equal(await as('authenticated', who, 'SELECT count(*) FROM public.tracker_plans'), '1');
  checks++;
  assert.equal(
    await as(
      'authenticated',
      who,
      `SELECT count(*) FROM public.tracker_plans WHERE user_id='${other}'`,
    ),
    '0',
  );
  checks++;
  await denied(
    as(
      'authenticated',
      who,
      `UPDATE public.tracker_plans SET user_id='${who}' WHERE user_id='${other}'`,
    ),
    'Cross-user writes denied',
  );
  await denied(
    as('authenticated', who, `DELETE FROM public.tracker_plans WHERE user_id='${other}'`),
    'Cross-user deletes denied',
  );
}
await denied(
  as('anon', '', `SELECT public.tracker_save_plan('{}'::jsonb,0,'${crypto.randomUUID()}'::uuid)`),
  'Anonymous RPC denied',
);
await denied(as('anon', '', 'SELECT count(*) FROM public.tracker_plans'), 'Anonymous read denied');
await denied(save('', 0, crypto.randomUUID()), 'Missing subject denied');
assert.equal((await save(a, 0, id)).revision, 1);
checks++;
assert.equal((await save(a, 0, crypto.randomUUID())).ok, false);
checks++;
const [one, two] = await Promise.all([
  save(a, 1, crypto.randomUUID()),
  save(a, 1, crypto.randomUUID()),
]);
assert.equal([one, two].filter((x) => x.ok).length, 1);
checks++;
// Reproduce baseline server-side integrity gap using synthetic records only.
const orphan = structuredClone(data);
orphan.entries.push({
  id: 'orphan',
  date: '2026-11-10',
  categoryId: 'emi',
  loanRowId: 'missing',
  amount: 1,
  payment: 'Bank',
  description: 'Synthetic',
  notes: '',
});
assert.equal(
  (await save(a, 2, crypto.randomUUID(), orphan)).ok,
  true,
  'Baseline gap must reproduce',
);
checks++;
assert.equal((await save(a, 3, crypto.randomUUID())).revision, 4);
checks++;
// Reproduce S2 against the copied production RPC in a disposable database only.
const accountsModern = {...structuredClone(data),accounts:[],ledgerTransactions:[]};
assert.equal((await save(b,1,crypto.randomUUID(),accountsModern)).revision,2);checks++;
assert.equal((await save(b,2,crypto.randomUUID(),data)).revision,3,'Baseline RPC accepts a legacy payload omitting enabled ledgers');checks++;
await sql(await fs.readFile('database/guards/preserve-modern-ledgers.sql', 'utf8'));
assert.equal((await save(b,3,crypto.randomUUID(),accountsModern)).revision,4);checks++;
await denied(save(b,4,crypto.randomUUID(),data),'Guard rejects a legacy payload omitting enabled account ledgers');
const omittedTransactions=structuredClone(accountsModern) as Partial<typeof accountsModern>;
delete omittedTransactions.ledgerTransactions;
await denied(save(b,4,crypto.randomUUID(),omittedTransactions),'Paired ledger must remain enabled');

await denied(save(a, 4, crypto.randomUUID(), orphan), 'Proposed guard rejects orphan receipt');
const allocated = {...structuredClone(data),accounts:[{id:'synthetic-bank',name:'Synthetic bank',kind:'bank',openingBalance:500,active:true,note:''}],ledgerTransactions:[],settings:{...data.settings,openingFromAccounts:true},entries:[{id:'allocated-entry',date:'2026-11-01',categoryId:'bill',amount:1,payment:'Bank',description:'Synthetic',notes:'',accountId:'synthetic-bank'}]};
assert.equal((await save(b,4,crypto.randomUUID(),allocated)).revision,5);checks++;
const missingAssignment=structuredClone(allocated);
delete (missingAssignment.entries[0] as Record<string,unknown>).accountId;
await denied(save(b,5,crypto.randomUUID(),missingAssignment),'Legacy client cannot strip account assignment');
const missingOpeningSource=structuredClone(allocated);
delete (missingOpeningSource.settings as Record<string,unknown>).openingFromAccounts;
await denied(save(b,5,crypto.randomUUID(),missingOpeningSource),'Legacy client cannot strip account opening source');
const categorized={...structuredClone(allocated),ledgerTransactions:[{id:'categorized-ledger',date:'2026-11-01',kind:'expense',sourceAccountId:'synthetic-bank',amount:1,expenseCategoryId:'bill',description:'Synthetic',note:''}]};
assert.equal((await save(b,5,crypto.randomUUID(),categorized)).revision,6);checks++;
const missingCategory=structuredClone(categorized);
delete (missingCategory.ledgerTransactions[0] as Record<string,unknown>).expenseCategoryId;
await denied(save(b,6,crypto.randomUUID(),missingCategory),'Legacy client cannot strip expense stream category');
const lender={...structuredClone(categorized), additionalLoans:[{id:'lender',name:'Synthetic lender',principal:100,monthlyEmi:110,tenure:1,firstDueDate:'2026-12-05',note:'',rows:[{id:'lender-row',month:'2026-12',dueDate:'2026-12-05',emi:110,principal:100,interest:10,balance:0,paid:false,paidAmount:0,paidBeforeOpening:false,paidDate:''}]}]};
assert.equal((await save(b,6,crypto.randomUUID(),lender)).revision,7);checks++;
const strippedLender=structuredClone(lender);delete (strippedLender.additionalLoans[0]!.rows[0]! as Record<string,unknown>).principal;
await denied(save(b,7,crypto.randomUUID(),strippedLender),'Legacy client cannot strip lender principal allocation');

const cross = structuredClone(data);
cross.entries.push({ ...orphan.entries[0]!, id: 'cross', loanRowId: 'row-1', categoryId: 'bill' });
cross.loan.rows[1]!.paidAmount = 1;
await denied(
  save(a, 4, crypto.randomUUID(), cross),
  'Proposed guard rejects wrong-category receipt',
);
const dup = structuredClone(data);
dup.entries.push(
  { ...orphan.entries[0]!, loanRowId: undefined },
  { ...orphan.entries[0]!, loanRowId: undefined },
);
await denied(save(a, 4, crypto.randomUUID(), dup), 'Proposed guard rejects duplicate IDs');
const newer = {
  ...structuredClone(data),
  provisions: [
    {
      id: 'synthetic-provision',
      categoryId: 'bill',
      startMonth: '2026-11',
      firstDueMonth: '2026-12',
      everyMonths: 2,
      monthlyAmount: 50,
      billAmount: 100,
      openingReserve: 0,
      allocationDay: 10,
      dueDay: 5,
      enabled: true,
    },
  ],
  reconciliations: [],
};
assert.equal((await save(a, 4, crypto.randomUUID(), newer)).revision, 5);
checks++;
await denied(save(a, 5, crypto.randomUUID()), 'Older client cannot omit existing provision');
assert.equal(await as('authenticated', a, 'SELECT revision FROM public.tracker_plans'), '5');
checks++;
const modern = structuredClone(newer) as typeof newer & {
  salaryChanges: unknown[];
  pfMovements: unknown[];
};
modern.categories = modern.categories.map(c => c.role === 'salary' ? { ...c, role: 'salary-history' as const } : c);
modern.categories.push({
  id: 'synthetic-pf', name: 'PF account', group: 'Asset' as const,
  role: 'pf-account' as const, amount: 0, timing: 'Fixed day' as const,
  day: 1, months: [], active: false, note: '',
});
modern.salaryChanges = [];
modern.pfMovements = [];
assert.equal((await save(a, 5, crypto.randomUUID(), modern)).revision, 6);
checks++;
const oldWithoutSalary = structuredClone(modern);
delete (oldWithoutSalary as Partial<typeof modern>).salaryChanges;
await denied(save(a, 6, crypto.randomUUID(), oldWithoutSalary), 'A legacy client may not remove enabled empty salary history');
const oldWithoutPf = structuredClone(modern);
delete (oldWithoutPf as Partial<typeof modern>).pfMovements;
await denied(save(a, 6, crypto.randomUUID(), oldWithoutPf), 'A legacy client may not remove enabled empty PF account records');
assert.equal(await as('authenticated', a, 'SELECT revision FROM public.tracker_plans'), '6');
checks++;

checks++;
assert.equal(await as('authenticated', b, 'SELECT revision FROM public.tracker_plans'), '6');
checks++;
console.log(
  JSON.stringify({
    passed: checks,
    database: await sql('SHOW server_version'),
    syntheticIdentities: 2,
    realConcurrentSessions: true,
    productionTouched: false,
    scope:
      'Copied PostgreSQL policies/RPC plus proposed guard. Supabase HTTP/JWT verification/OAuth/native tests remain separate.',
  }),
);
