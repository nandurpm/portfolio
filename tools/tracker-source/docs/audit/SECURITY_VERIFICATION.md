# Security verification — 2026-10-24

Inspection was limited to metadata, function definitions, grants, policies and security advisors. No production financial rows or credentials were queried. No database write, policy alteration or migration was performed.

## Observed production metadata

- `public.tracker_plans` has RLS enabled (not forced).
- Authenticated table grant is SELECT; direct application table writes are not granted.
- Authenticated SELECT policy scopes `user_id` to `(select auth.uid())`.
- Dedicated `tracker_plan_writer` INSERT and SELECT/UPDATE policies compare `user_id` with JWT subject claims; UPDATE has both USING and WITH CHECK.
- `tracker_save_plan(jsonb,bigint,uuid)` is SECURITY DEFINER with an empty search path. Authenticated EXECUTE is granted; anonymous EXECUTE is not.
- The RPC derives owner identity from JWT claims, rejects missing identity, validates mutation/revision/data inputs, and checks installment payment summary consistency. It takes a per-owner advisory transaction lock, then locks the owner's plan row. Repeated mutation IDs return the stored result; mismatched revisions return a conflict; successful updates increment the revision.
- Security advisor flags authenticated access to a SECURITY DEFINER function. This is expected for this RPC pattern but is **not** proof of safety: permissions and impersonation must be tested.
- Leaked-password protection is disabled. Enabling it needs owner approval/configuration and plan capability review; not changed.

## Not verified

Two authorized disposable test accounts/project were unavailable. Therefore cross-user SELECT/INSERT/UPDATE/RPC authorization, runtime RLS effectiveness, password login/logout, Google OAuth, token refresh/expiry/recovery, and actual concurrent database writes have **not passed**. Source unit tests of merge/conflict behavior do not establish database isolation. `npm run test:security` exits 2 (Blocked) before requests when credentials/opt-in are absent.

`scripts/test-security.ts` provides an opt-in synthetic harness for an isolated project. It refuses the known production URL and accounts with existing plans. Review/copy the actual policies/RPC into an authorized disposable environment, supply publishable credentials and two empty accounts through environment variables, then run it. No service-role key is required or appropriate. Do not interpret the harness existing as tests passing.

## Compatibility proposal — not applied

`proposed/preserve-optional-fields.sql` blocks omission of existing optional collections and the EMI-timing setting by older clients. It changes no financial rows or schema shape. It needs staging tests, review and separate database approval before use. It does not validate every field, prevent explicit collection removal, or replace RLS/RPC validation. Review an authoritative server validator for provision references before enabling mixed-client writes. Upgrade all active clients and verify backups first.

Existing owner IDs are never rewritten by this branch. No new table/column is required for optional JSON records. Do not downgrade a device and let it overwrite a newer cloud plan.
