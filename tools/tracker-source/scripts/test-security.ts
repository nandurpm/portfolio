/** Opt-in tests against a disposable Supabase project ONLY. Never production. */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { financialFixture } from '../tests/fixtures/financial';
import { cloudPlan } from '../src/cloud/model';
const env = process.env;
const required = [
  'TRACKER_TEST_URL',
  'TRACKER_TEST_KEY',
  'TRACKER_TEST_EMAIL_A',
  'TRACKER_TEST_PASSWORD_A',
  'TRACKER_TEST_EMAIL_B',
  'TRACKER_TEST_PASSWORD_B',
];
if (
  required.some((k) => !env[k]) ||
  env.TRACKER_DISPOSABLE_TEST_PROJECT !== 'I_AUTHORIZE_SYNTHETIC_TEST_RECORDS'
) {
  console.error(
    'BLOCKED: supply two authorized accounts in a disposable project and the explicit synthetic-record opt-in. No requests made.',
  );
  process.exit(2);
}
const url = new URL(env.TRACKER_TEST_URL!);
if (
  url.hostname === 'svqtisipjyymguswxteb.supabase.co' ||
  (url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
)
  throw Error('Production project and insecure URLs are prohibited');
const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const a = createClient(url.href, env.TRACKER_TEST_KEY!, options),
  b = createClient(url.href, env.TRACKER_TEST_KEY!, options),
  anon = createClient(url.href, env.TRACKER_TEST_KEY!, options);
try {
  const aa = await a.auth.signInWithPassword({
    email: env.TRACKER_TEST_EMAIL_A!,
    password: env.TRACKER_TEST_PASSWORD_A!,
  });
  assert.ifError(aa.error);
  const bb = await b.auth.signInWithPassword({
    email: env.TRACKER_TEST_EMAIL_B!,
    password: env.TRACKER_TEST_PASSWORD_B!,
  });
  assert.ifError(bb.error);
  const aid = aa.data.user!.id,
    bid = bb.data.user!.id;
  assert.notEqual(aid, bid);
  assert.equal((await a.auth.getUser()).data.user?.id, aid);
  const refreshed = await a.auth.refreshSession();
  assert.ifError(refreshed.error);
  assert.equal(refreshed.data.user?.id, aid);
  for (const client of [a, b]) {
    const q = await client.from('tracker_plans').select('user_id');
    assert.ifError(q.error);
    assert.equal(
      q.data.length,
      0,
      'Test account must have no existing plan; refusing to overwrite',
    );
  }
  const plan = cloudPlan(financialFixture().data);
  const save = async (client: typeof a, revision: number, id: string, data = plan) =>
    client.rpc('tracker_save_plan', {
      p_data: data,
      p_expected_revision: revision,
      p_mutation_id: id,
    });
  const id = crypto.randomUUID();
  const first = await save(a, 0, id);
  assert.ifError(first.error);
  assert.equal(first.data.ok, true);
  const duplicate = await save(a, 0, id);
  assert.ifError(duplicate.error);
  assert.equal(duplicate.data.revision, first.data.revision);
  const conflict = await save(a, 0, crypto.randomUUID());
  assert.ifError(conflict.error);
  assert.equal(conflict.data.ok, false);
  const second = await save(b, 0, crypto.randomUUID());
  assert.ifError(second.error);
  assert.equal(second.data.ok, true);
  for (const [client, other] of [
    [a, bid],
    [b, aid],
  ] as const) {
    const q = await client.from('tracker_plans').select('user_id').eq('user_id', other);
    assert.ifError(q.error);
    assert.deepEqual(q.data, []);
    const write = await client.from('tracker_plans').update({ data: plan }).eq('user_id', other);
    assert.ok(write.error, 'Direct writes must be denied');
  }
  const noauth = await save(anon, 0, crypto.randomUUID());
  assert.ok(noauth.error, 'Anonymous RPC must be denied');
  const anonymousRead = await anon.from('tracker_plans').select('user_id');
  assert.ok(anonymousRead.error || anonymousRead.data?.length === 0);
  const [x, y] = await Promise.all([
    save(a, first.data.revision, crypto.randomUUID()),
    save(a, first.data.revision, crypto.randomUUID()),
  ]);
  assert.ifError(x.error);
  assert.ifError(y.error);
  assert.equal([x.data.ok, y.data.ok].filter(Boolean).length, 1);
  assert.ifError((await a.auth.signOut()).error);
  assert.ok((await save(a, 0, crypto.randomUUID())).error, 'Logged-out RPC must fail');
  console.log(
    'PASS: password login, two-user read isolation, direct-write denial, anonymous denial, idempotency, stale-revision conflict, concurrent writers, logout. Synthetic records retained in disposable project. OAuth/browser session flows remain separate checks.',
  );
} finally {
  await Promise.allSettled([a.auth.signOut(), b.auth.signOut()]);
}
