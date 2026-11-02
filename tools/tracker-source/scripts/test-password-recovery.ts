/**
 * End-to-end Supabase password reset using a disposable local Supabase CLI stack.
 * Never contact a production project or modify a real user's password.
 */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const env = process.env;
const endpoint = new URL(env.TRACKER_TEST_URL ?? '');
assert.equal(env.TRACKER_DISPOSABLE_TEST_PROJECT, 'I_AUTHORIZE_SYNTHETIC_TEST_RECORDS');
assert.ok(['127.0.0.1', 'localhost'].includes(endpoint.hostname));
assert.equal(endpoint.protocol, 'http:');
assert.equal(endpoint.port, '54321');
assert.ok(env.TRACKER_TEST_KEY && env.TRACKER_TEST_EMAIL_A && env.TRACKER_TEST_PASSWORD_A);

const base = 'http://127.0.0.1:4173/track/?recovery=1';
const mailpit = 'http://127.0.0.1:57324';
const email = env.TRACKER_TEST_EMAIL_A!;
const beforePassword = env.TRACKER_TEST_PASSWORD_A!;
const afterPassword = crypto.randomUUID() + 'Rr5!';
const sessionData = new Map<string, string>();
const storage = {
  getItem: (name: string) => sessionData.get(name) ?? null,
  setItem: (name: string, value: string) => { sessionData.set(name, value); },
  removeItem: (name: string) => { sessionData.delete(name); },
};
const client = createClient(endpoint.href, env.TRACKER_TEST_KEY!, {
  auth: { flowType: 'pkce', storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
});
const request = await client.auth.resetPasswordForEmail(email, { redirectTo: base });
assert.ifError(request.error);

let message: Record<string, unknown> | null = null;
for (let attempt = 0; attempt < 30; attempt++) {
  const res = await fetch(mailpit + '/api/v1/messages');
  assert.equal(res.status, 200, 'Disposable SMTP capture must be available');
  const inbox = (await res.json()) as { messages?: Array<{ ID?: string; To?: Array<{ Address?: string }> }> };
  const match = inbox.messages?.find((x) => x.To?.some((to) => to.Address === email));
  if (match?.ID) {
    const full = await fetch(mailpit + '/api/v1/message/' + encodeURIComponent(match.ID));
    assert.equal(full.status, 200);
    message = await full.json() as Record<string, unknown>;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
}
assert.ok(message, 'No recovery email received by the disposable Mailpit inbox');
const body = String(message.HTML ?? message.Text ?? '');
const maybe = body.match(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify\?[^\s"'<>]+/);
assert.ok(maybe, 'Recovery email must contain an Auth verification URL');
const verificationLink = maybe[0].replaceAll('&amp;', '&');
const verify = await fetch(verificationLink, { redirect: 'manual' });
assert.ok([301, 302, 303, 307, 308].includes(verify.status), 'Recovery verification must redirect');
const location = verify.headers.get('location');
assert.ok(location, 'Verification must provide a redirect destination');
const callback = new URL(location!);
assert.equal(callback.origin, new URL(base).origin, 'Recovery must redirect only to the approved local app');
assert.equal(callback.pathname, '/track/');
assert.equal(callback.searchParams.get('recovery'), '1');
const code = callback.searchParams.get('code');
assert.ok(code && code.length > 10, 'PKCE callback must contain an authorization code');
const exchange = await client.auth.exchangeCodeForSession(code);
assert.ifError(exchange.error);
assert.equal(exchange.data.user?.email, email);
const changed = await client.auth.updateUser({ password: afterPassword });
assert.ifError(changed.error);
await client.auth.signOut();
const oldLogin = await client.auth.signInWithPassword({ email, password: beforePassword });
assert.ok(oldLogin.error, 'Old password must fail after successful recovery');
const freshLogin = await client.auth.signInWithPassword({ email, password: afterPassword });
assert.ifError(freshLogin.error);
assert.equal(freshLogin.data.user?.email, email);
const replay = await client.auth.exchangeCodeForSession(code);
assert.ok(replay.error, 'Single-use recovery code must not be reusable');
await client.auth.signOut();
console.log('PASS: disposable reset request, SMTP email, authorized redirect, same-client PKCE exchange, password update, old password rejected, new password accepted, code replay denied. No production data used.');
