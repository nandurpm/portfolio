/** Only bootstraps the ephemeral Supabase CLI stack on fixed loopback endpoints. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const run = promisify(execFile),
  dir = process.env.TRACKER_LOCAL_SUPABASE_DIR;
assert.ok(dir, 'Explicit disposable CLI workdir required');
assert.ok(process.env.GITHUB_ENV, 'This helper is restricted to the disposable CI job');
const reply = await run(
  'npx',
  ['--yes', 'supabase@2.122.0', '--workdir', dir, 'status', '--output', 'json'],
  { maxBuffer: 1024 * 1024 },
);
const status = JSON.parse(reply.stdout),
  api = new URL(status.API_URL),
  db = new URL(status.DB_URL);
assert.ok(
  ['localhost', '127.0.0.1'].includes(api.hostname) &&
    api.port === '54321' &&
    api.protocol === 'http:',
  'Local Supabase API only',
);
assert.ok(
  ['localhost', '127.0.0.1'].includes(db.hostname) && db.port === '54322',
  'Local Supabase DB only',
);
let schema = await fs.readFile('database/test-fixture/schema.sql', 'utf8');
schema = schema.slice(schema.indexOf('CREATE TABLE public.tracker_plans'));
schema =
  'CREATE ROLE tracker_plan_writer NOLOGIN NOBYPASSRLS; GRANT USAGE ON SCHEMA auth,public TO tracker_plan_writer; GRANT EXECUTE ON FUNCTION auth.uid() TO tracker_plan_writer;\n' +
  schema;
const existing = await run('psql', [
  '--dbname',
  db.href,
  '-X',
  '-qAt',
  '--set',
  'ON_ERROR_STOP=1',
  '--command',
  "SELECT to_regclass('public.tracker_plans') IS NULL",
]);
assert.equal(existing.stdout.trim(), 't', 'Refusing to overwrite an existing tracker table');
await run(
  'psql',
  ['--dbname', db.href, '-X', '-q', '--set', 'ON_ERROR_STOP=1', '--command', schema],
  { maxBuffer: 1024 * 1024 },
);
await run('psql', [
  '--dbname',
  db.href,
  '-X',
  '-q',
  '--set',
  'ON_ERROR_STOP=1',
  '--command',
  await fs.readFile('docs/audit/proposed/preserve-optional-fields.sql', 'utf8'),
]);
const key = status.ANON_KEY ?? status.PUBLISHABLE_KEY,
  secret = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
assert.ok(key && secret, 'Local CLI API keys missing');
const admin = createClient(api.href, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const passwordA = crypto.randomUUID() + 'aA1!',
  passwordB = crypto.randomUUID() + 'bB2!';
for (const [email, password] of [
  ['tracker-a@example.invalid', passwordA],
  ['tracker-b@example.invalid', passwordB],
]) {
  const r = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(r.error);
}
const env = {
  TRACKER_TEST_URL: api.href,
  TRACKER_TEST_KEY: key,
  TRACKER_TEST_EMAIL_A: 'tracker-a@example.invalid',
  TRACKER_TEST_PASSWORD_A: passwordA,
  TRACKER_TEST_EMAIL_B: 'tracker-b@example.invalid',
  TRACKER_TEST_PASSWORD_B: passwordB,
  TRACKER_DISPOSABLE_TEST_PROJECT: 'I_AUTHORIZE_SYNTHETIC_TEST_RECORDS',
};
for (const value of [key, secret, passwordA, passwordB]) console.log('::add-mask::' + value);
assert.ok(process.env.GITHUB_ENV, 'This helper is restricted to the disposable CI job');
await fs.appendFile(
  process.env.GITHUB_ENV,
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n',
);
console.log(
  'Prepared two synthetic local Auth accounts and copied tracker schema; no cloud project or production record accessed.',
);
