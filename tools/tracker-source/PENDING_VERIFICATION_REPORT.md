# Pending tracker verification and fixes — 2026-10-24

Base: `4f46496c1f37962c02f2f0ba4d4a41798622552e`. Branch: `fix/tracker-verification-20261024`.
No production financial records were read or changed. Live inspection used advisors and schema/function/role metadata only. No live migration, policy, grant, auth setting, merge or deployment was performed. No paid Supabase branch was created.

## Scope and issue register

| ID | Change / verification | Evidence | Status at preparation |
| -- | -- | -- | -- |
| RELEASE-001 | Settings displays source commit/build time. `build.json` includes commit/tree, package/Node version, lock hash and complete asset hashes. Staging preserves identity in release.json. Trusted-artifact deployment verifier detects mismatched source/manifest/assets. | Local web build, manifest verification and changed-asset regression pass. CI retains public build artifact. | Fixed locally; final CI results in PR |
| SYNC-002 | Two devices independently creating the first optional collection now merge records by stable ID instead of a whole-array conflict. | Offline additions, retry idempotency, new collections and edit-vs-delete choice regressions pass. | Fixed |
| DB-001 | Production RLS/RPC copied as metadata into a disposable-only fixture; two synthetic subjects and separate sessions exercise read/write boundaries, idempotency and revision concurrency. | PostgreSQL 17 CI job configured; no production test writes. | Awaiting hosted result |
| DB-002 | Server RPC accepts an orphan receipt when no known installment references it; frontend validation alone cannot protect direct API writes. Proposed trigger rejects missing/wrong-category receipt links, duplicate IDs, nonpositive amounts and older-client omission of optional collections. | Copied baseline must reproduce gap; proposed trigger tested only in disposable environment. | Proposal; production application requires separate approval |
| AUTH-002 | Local Supabase CLI stack creates two synthetic real Auth users and tests password login, getUser, refresh, logout, REST/RPC authorization, idempotency and concurrent saves. | CLI 2.122.0, loopback-only endpoints; no linked cloud project. | Awaiting hosted result; not production/provider certification |
| AUTH-003 | Real WebAccess gate exercised with mocked HTTP: valid token, revoked token, mismatched user, different local owner, password submission and logout/local clearing. | Five explicit mock-HTTP browser cases. | Awaiting hosted result |
| A11Y-001 | WCAG 2/2.1 A/AA Axe critical/serious checks over eight screens at 320/390/768/1366px; keyboard focus trap, Escape, focus restoration. | Isolated fixture only; scanner version pinned 4.14.0. | Awaiting hosted result; manual screen reader assessment remains blocked |
| PERF-001 | Memoize closure analysis during non-plan Loan form state changes. Add cold-route visible-render smoke measurements and a generous 12s hosted-runner budget. | Per-width JSON attachments in synthetic browser artifacts. | Awaiting hosted measurements; not a universal device speed claim |
| NATIVE-002 | Actual native backups and installed-app compatibility. | This repository has shared web UI but no Electron main-process/Android platform source or runnable native build targets. | Blocked on full native source/build and device access |
| OAUTH-002 | Real Google OAuth/provider consent, redirect, recovery and expiry lifecycle. | Provider test credentials and authorized test browser/environment not available to this branch. | Blocked; mocks/password stack tests do not certify Google |
| PROD-002 | Runtime two-user isolation and cloud-specific configuration parity. | Production RLS enabled, owner-scoped policies, writer role NOLOGIN/NOBYPASSRLS, authenticated RPC execute; metadata only. | Production runtime verification remains blocked pending isolated authorized project/accounts |

## Verification methods and limits

Local `npm run check`: lint, **65 tests in 9 files**, quality TypeScript, authenticated production build and Reports bundle guard pass. Manifest corruption regression proves changed assets are rejected. Project dependency audit remains zero vulnerabilities after the new pinned accessibility dev dependency. Hosted database/Auth/browser results are authoritative only after the PR jobs complete; update the PR handoff with exact run IDs and outcomes.

The PostgreSQL fixture copies the actual tracker RPC, policies and final grants. Its minimal auth.uid/users objects are test scaffolding, not an Auth server. A separate local Supabase job supplies real local GoTrue/PostgREST/JWT behavior. Neither accesses the cloud project or proves production redirect/mail/Google/provider configuration. Test identities and account passwords are synthetic, ephemeral and not reused in production.

The server-side guard is a proposal, not a full server JSON-schema validator. In particular, it does not exhaustively validate every provision/reconciliation field or prevent an explicit collection deletion. Validate real backup copies in staging before approving it. Current production SQL is unchanged. The leaked-password-protection advisor warning remains; enabling it needs a configuration/plan review and approval. The authenticated SECURITY DEFINER warning is still expected for the owned RPC and requires the authorization evidence described above.

The first-render browser capture timeout alone did not prove a performance defect. The new tests report actual isolated load times. Memoization changes repeated work only, not calculation semantics. Human screen-reader interaction and slower physical-device measurements are still required for broader certification.

## Deployment identity and trusted verification

Use the `tracker-web-build` CI artifact as the trusted release inventory. After a later approved deployment, run:

```sh
npm run verify:deployment -- https://nandakumarm.dpdns.org/track/ APPROVED_SOURCE_COMMIT /absolute/path/to/approved/build.json
```

Do not use a manifest downloaded from the site under test as its own trusted reference. The checker validates exact approved commit, manifest equality and each asset's SHA-256. This is integrity/provenance mapping, not a cryptographically signed attestation. SOURCE_DATE_EPOCH can fix the timestamp when reproducing an artifact.

## Migration, approvals and rollback

No database migration was applied. Review `docs/audit/proposed/preserve-optional-fields.sql` after disposable tests pass, validate compatibility against authorized backup copies in staging, and obtain separate production approval. It creates/replaces a trigger function and trigger, changes no existing financial rows and rejects unsafe future writes. Rollback removes that trigger/function only; do not reset or rewrite user plans.

A normal source revert rolls back web changes after an approved release. Retain previous assets and all newer user data first. Build identity is additive. The array-merge correction preserves record IDs and requires an explicit choice for delete/edit conflicts. No existing financial calculation formula or cash accounting rule changed.

Stop before merge/deploy/live security configuration. Remaining access needs: full native source/builds/devices; real Google test account/provider environment; approval for production SQL/configuration; and authorized staging/production-parity verification.
