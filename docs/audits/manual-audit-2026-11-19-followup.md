# Savings & Expense Tracker audit — 2026-11-19 follow-up

## A. Audit information

- **Audit date/time:** 2026-11-19 16:13 IST
- **Repository:** https://github.com/nandurpm/portfolio
- **Application source:** `tools/tracker-source`
- **Verified main baseline:** `8cfde416a70b4141f101ab180426762e8af43527`
- **Audit branch:** `audit/savings-expense-tracker-20261119-followup`, created directly from the verified main baseline.
- **Audit branch tip after report commit:** `0d1086816e2d2e49fb5d8eb7dbfa2b0ffec7b987` (subsequent documentation-only update will be recorded separately).
- **Application version:** `2.10.19`
- **Latest published native release inspected:** [tracker-v2.10.19](https://github.com/nandurpm/portfolio/releases/tag/tracker-v2.10.19), published 2026-11-19 05:41 UTC, targeting source commit `e9b6f31ca6764617055a8a5411c5d32e9ba7c499`.
- **Android application ID:** `com.nandakumar.savingsexpensetracker`; minimum Android 14 / API 34; target API 36.
- **Repository state at start:** no open pull requests. PRs #146 and #145 were merged. All inspected pre-existing branches were at or behind main (zero commits ahead); none was changed or deleted.
- **Source provenance:** the release web manifest identifies version 2.10.19, source commit `e9b6f31ca6764617055a8a5411c5d32e9ba7c499`, clean build, `requiresSignIn: true`, route `/track/`. The later main commits changed generated web assets and audit documentation; the tracker source tree used by the release remains the 2.10.19 source.
- **Production safety:** read-only Supabase project/database metadata and advisor checks were performed. No user financial rows, secrets, live account sessions, or production schema/configuration were read or changed.

## Executive summary

The current source/release has strong automated evidence: 324 unit/domain tests, 92 browser scenarios, dependency audit with zero reported vulnerabilities, 45 disposable PostgreSQL database tests, local Supabase security/recovery checks, native Android compilation, a signed APK, Android 16 emulator install/upgrade and widget instrumentation, and a Windows Inno Setup installer build. A read-only production metadata review also confirmed the plan-preservation trigger is deployed and the bot tables have no anon/authenticated grants. Supabase Auth leaked-password protection is disabled; the organization is on the Free plan, while Supabase documentation lists that protection as Pro+.

One confirmed CI security-hardening defect was found: the tracker release workflow granted `contents: write` to every job, including build/test jobs that only need read access. The audit branch narrows the workflow-wide permission to `contents: read`, grants `contents: write` only to the release publisher, and adds a regression guard to the quality workflow. The new guard is pending this branch's PR CI result.

No new financial calculation defect was confirmed. The named-cash paise-rounding defect was already corrected by merged PR #146 and is covered by the current 324-test suite. The previous potential date-effective category issue remains unresolved and requires an approved data-model decision.

This is **not** a full end-to-end validation of all three deployed targets. The live website could not be fetched in this environment; Windows installer installation/upgrade was not exercised; no physical Android device was connected; one Android instrumentation test was skipped; and production Supabase was deliberately not accessed.

## B. Platform audit

| Area | Review result | Build/test result | Outstanding issues |
|---|---|---|---|
| Website | Shared React/Vite source, auth gate, financial UI and route manifest reviewed | Web build, bundle/provenance checks and 92 Playwright scenarios passed; `npm audit` reported 0 vulnerabilities | Live `/track/` and `build.json` runtime could not be fetched from this environment; authenticated production browser verification remains outstanding |
| Windows | Electron main/preload, storage, OAuth, installer configuration and update packaging reviewed | Inno Setup 6 installer compiled; published EXE is 116,282,946 bytes | No install, launch, in-place upgrade, uninstall/data-retention rehearsal was performed; installer is not Authenticode-signed |
| Android | Capacitor bridge, Gradle configuration, widgets, storage/backup, update worker, manifest and app ID reviewed | Signed APK verified; certificate matches 2.10.18; install and in-place upgrade passed on Android 16 emulator; 8 JVM unit tests passed; instrumentation: 8 passed, 1 skipped | Physical-device verification not performed; skipped process-isolation test remains unverified |
| Financial calculations | Paise rounding, account/net-worth aggregation, transfer semantics and financial regression coverage reviewed | 53 test files / 324 tests passed; web/native financial-engine parity check passed | Synthetic tests do not validate the owner's live financial records; date-effective category semantics remain a potential gap |
| Backend/security | Client sync and live metadata-only review of RLS, grants, policies, RPC ownership/privileges, trigger and migrations | 45 disposable PostgreSQL tests passed; local Supabase security and password-recovery steps completed; 5 redaction tests passed; production metadata checks completed read-only | Leaked-password protection disabled on Free plan; authenticated SECURITY DEFINER RPC remains an intentional advisor warning; three RLS performance warnings |
| UI/UX and themes | Browser flows and responsive checks; Android widget light/dark, width and font-scale render evidence inspected | 92 browser tests passed; widget render tests passed at 180/250/360/480 dp and font scales 1.0/1.3/2.0 | Full live production screen review and physical-device visual review remain outstanding |

## C. Findings

| ID | Severity | Status | Affected area | Evidence / reproduction | Root cause, impact and disposition |
|---|---|---|---|---|---|
| SEC-CI-001 | Medium | **RESOLVED on audit branch; PR CI pending** | GitHub Actions release workflow | `.github/workflows/tracker-unified-release.yml` granted workflow-wide `contents: write`; prepare, quality, Windows and Android jobs do not publish releases | Workflow-level permission was broader than required. Changed the default to `contents: read`; only `publish` receives `contents: write`. Added `.github/scripts/test-tracker-release-permissions.rb` and wired it into `tracker-quality.yml`. No release or deployment is invoked by this branch. |
| WIN-SIGN-001 | Medium | **CONFIRMED / DEFERRED** | Windows distribution | `README-NATIVE.md` explicitly states that the installer is not Authenticode-signed without an authorized Windows certificate; current build workflow compiles Inno Setup but has no signing step | Users may see SmartScreen/publisher warnings and the executable lacks a trusted publisher signature. Cannot safely implement without an authorized code-signing certificate and protected signing process. |
| CAT-001 | Medium | **POTENTIAL** | Shared budget/category model across Web, Windows and Android | Current `Category` model has no effective-start/end date; `Budget.tsx` filters categories globally by group rather than by the selected month | Historical categories can remain selectable in future budget views. This was documented in the previous audit and remains. Requires an approved compatibility design for historical budgets, backdated entries, backup/restore and older clients; no personal category names or financial rules were hardcoded. |
| PROD-001 | Low | **DEFERRED** | Live website | Fetch attempts for `/track/` and `/track/build.json` were rejected by the available web runtime as inaccessible/disabled | Cannot independently verify the deployed route, browser console, authenticated screen or deployed manifest from this environment. Static build/provenance and synthetic browser tests passed; no production login was attempted. |
| WIN-RUNTIME-001 | Medium | **DEFERRED** | Windows install/update/data persistence | CI built the Inno Setup installer and verified its output size/hash; it did not install or launch it | Packaging success is not proof of Windows startup, update, uninstall retention, backup/restore or data migration. Requires a Windows VM/device rehearsal with a disposable profile. |
| AND-DEVICE-001 | Low | **DEFERRED** | Android device lifecycle and widgets | Android 16 emulator tests passed, but no physical device was attached. `separateProcessRestoresPrivateCacheAndPrivacy` was skipped in the instrumentation report | Physical-device behavior and the skipped process-isolation scenario remain unverified. |
| CI-WARN-001 | Low | **POTENTIAL** | CI/dependency maintenance | Successful runs emit Node.js 20 action-runtime deprecation warnings and dependency `url.parse` / `punycode` deprecation warnings | These warnings did not cause a failing build and `npm audit` reported zero vulnerabilities. Review pinned GitHub Actions and dependency upgrades separately; no speculative dependency update was made. |
| FIN-ROUND-001 | Low | **RESOLVED before this audit** | Net-worth named-cash aggregation | Merged PR #146 and `CHANGELOG-2.10.19.md` record rounding named cash balances to the nearest paise after summing liquid accounts; 2.10.19 tests passed | The aggregate could retain floating-point sub-paise noise. The shared rounding correction and regression coverage are already in main; no duplicate change was made. |

No new application-source or financial defect was reproduced during this follow-up. The only new code changes are CI permission hardening and its regression test. Production metadata confirms the earlier server-side ledger-preservation guard is now deployed.

## D. Fixes implemented on the audit branch

1. **Release-token least privilege**
   - Defect: workflow-wide `contents: write` permission was inherited by build/test jobs.
   - Root cause: permission was declared at workflow scope instead of the publisher job.
   - Files: `.github/workflows/tracker-unified-release.yml`.
   - Correction: workflow default is now `contents: read`; only `jobs.publish.permissions.contents` is `write`.
2. **Regression protection**
   - Files: `.github/scripts/test-tracker-release-permissions.rb`, `.github/workflows/tracker-quality.yml`.
   - Correction: Ruby/YAML guard asserts every non-publisher job has effective read-only content permission and the publisher alone has write permission. The quality workflow runs this guard.
   - Verification: awaiting the new PR's CI run.
3. **No application financial/UI/backend source was changed.** No database migration, production data write, release, website deployment, signing-key change or update notification was performed by this audit.

## E. Verification evidence

### Read-only production Supabase metadata review

- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.11.0.003; organization plan: Free.
- Security advisor: leaked-password protection is disabled. Supabase documentation says the control is available on Pro and above. No Auth settings were changed.
- Security advisor: `tracker_save_plan` is an authenticated SECURITY DEFINER RPC. Metadata review confirmed `anon_execute=false`, `authenticated_execute=true`, owner `tracker_plan_writer` is NOLOGIN/NOBYPASSRLS with no inherited roles, `search_path` is empty, and its table privileges are limited to SELECT/INSERT/UPDATE on `tracker_plans`. The function derives owner from the JWT subject and performs plan validation, revision/idempotency checks and transaction locking. This is intentional for client sync; the advisor remains a design warning, not proof of an exploit.
- Five Telegram bot tables have RLS enabled and no policies; read-only privilege checks confirmed anon/authenticated have no SELECT/INSERT/UPDATE grants. This is consistent with service-role-only Edge Function access; no policy was added.
- Production `tracker_plans` has owner-scoped read/write policies for authenticated and `tracker_plan_writer`; direct authenticated insert/update privileges are absent.
- The `tracker_preserve_optional_fields` BEFORE INSERT/UPDATE trigger is present. Its function is SECURITY INVOKER with empty `search_path`. Production migration history includes the modern-ledger and lender-principal guard migrations from 2026-11-04.
- Performance advisor: three RLS init-plan warnings and one unused bot-audit index. Health advisor: no findings. No user financial rows were queried.
- Advisor references: [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [SECURITY DEFINER RPC](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [RLS init-plan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [unused index](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

### Existing merged-source CI evidence

- [Tracker quality run #44465474893](https://github.com/nandurpm/portfolio/actions/runs/44465474893)
  - `npm run check`: 53 test files, 324 tests passed.
  - `npm run test:browser`: 92 passed.
  - `npm audit`: 0 vulnerabilities.
  - `npm run test:database`: 45 passed on disposable PostgreSQL 17; two synthetic identities; production untouched.
  - Supabase CLI redaction tests: 5 passed; local Supabase security/password-recovery steps completed.
  - Native dependency compatibility checks passed; Android debug compilation and `testDebugUnitTest` completed successfully.
  - Windows installer build job compiled the actual Inno Setup installer.
  - Weekly report evidence-gate regression: 9 tests passed.
- [Tracker release run #44466056795](https://github.com/nandurpm/portfolio/actions/runs/44466056795)
  - Source commit: `e9b6f31ca6764617055a8a5411c5d32e9ba7c499`.
  - Release-quality steps: financial/lint/TypeScript/bundle checks, web build and web/native financial-engine parity passed.
  - Android: signed APK `2.10.19`; package ID `com.nandakumar.savingsexpensetracker`; signing certificate matched the previously published 2.10.18 APK; Android 16 emulator installation and in-place upgrade passed; private-file marker survived; 8 JVM unit tests passed; 8 instrumentation tests passed and 1 was skipped.
  - Windows: Inno Setup 6 compilation succeeded; installer artifact was produced. Installation and launch were not performed.
  - Published assets: APK, Windows EXE, source ZIP, changelog and SHA256SUMS are present in [release 2.10.19](https://github.com/nandurpm/portfolio/releases/tag/tracker-v2.10.19).
- Android test artifact: [run #44466056795, artifact 14502597172](https://github.com/nandurpm/portfolio/actions/runs/44466056795/artifacts/14502597172). It contains 8 passed / 1 skipped instrumentation cases and 27 widget render screenshots. Screenshots were reviewed for light/dark, multiple widget widths and font scales.

### Exact commands represented by the workflows

Run from `tools/tracker-source` unless noted:

- `npm run check`
- `npm run build:web && npm run check:bundle`
- `npm run build:release && node scripts/verify-financial-parity.mjs dist-web dist`
- `npm run test:browser`
- `npm audit`
- `npm run test:database`
- `npm run test:security`
- `node --import tsx scripts/test-password-recovery.ts`
- `npm run build:release && npx cap sync android && cd android && bash ./gradlew --no-daemon assembleDebug testDebugUnitTest assembleReleaseAndroidTest`
- `npm run android:release` followed by `apksigner verify`, `zipalign -c`, `aapt dump badging`, emulator install/upgrade and connected instrumentation tests.
- `npm run dist:win` (Inno Setup 6 compile and artifact validation).

The new permission regression test has been added to the PR-triggered quality workflow. Current-head PR quality run [#44509848403](https://github.com/nandurpm/portfolio/actions/runs/44509848403) is in progress; do not treat the new guard as passed until that run completes.

## F. GitHub status

- **Audit branch:** https://github.com/nandurpm/portfolio/tree/audit/savings-expense-tracker-20261119-followup
- **Commits:**
  - https://github.com/nandurpm/portfolio/commit/d38ec997356e5b696555a8694bfbd6b75ef2eb88 — scope release write permission to publisher.
  - https://github.com/nandurpm/portfolio/commit/967a64bbb43db57921d62a34f5cd1b89db73f4b3 — run the permission guard in quality CI.
  - https://github.com/nandurpm/portfolio/commit/789856207261bcf7c89423a92f422336eb18f8d9 — add the permission regression test.
  - https://github.com/nandurpm/portfolio/commit/0d1086816e2d2e49fb5d8eb7dbfa2b0ffec7b987 — add the audit report.
- **Pull request:** [#147 — restrict tracker release write permissions to publisher](https://github.com/nandurpm/portfolio/pull/147), open and awaiting CI/owner approval.
- **Merge/deployment:** not merged; no release or production deployment was performed by this audit.

## G. Outstanding risks and approval gates

1. Approve a date-effective category model and compatibility contract before changing CAT-001. Preserve historical category IDs and budgets; support backdated entries, backup/restore and older clients.
2. Supply an authorized Windows code-signing certificate and protected signing process before adding Authenticode signing.
3. Run Windows installer install/launch/in-place-upgrade/uninstall retention checks in a disposable Windows environment.
4. Verify the live `/track/` route and manifest through an authorized browser session; compare its source SHA with the intended deployment.
5. Decide whether to upgrade the Supabase organization from Free to Pro to enable leaked-password protection; see [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
5. Run physical-device Android checks on the owner's device and investigate the skipped process-isolation test.
6. Continue to test production RLS/RPC only through an explicitly authorized disposable project. Production financial data, schema and Auth configuration remain untouched. The read-only metadata review is documented above.
7. Update deprecated GitHub Action runtimes and dependency deprecation sources in a separate tested maintenance change.

**Conclusion:** automated source, browser, database, local Supabase, Android emulator and Windows packaging evidence is strong for version 2.10.19. Windows runtime, physical Android, live website and production Supabase verification remain incomplete. The least-privilege workflow fix is implemented on the audit branch and awaits its own PR CI and owner approval.
