# Savings & Expense Tracker manual audit — 13 November 2026

## A. Audit information

- Started 13 November 2026, approximately 12:37 IST; local checks recorded through 12:45 IST.
- Baseline: `a495733e437a734ecb50821b4c269c79071915f4` (latest verified main).
- Branch: `audit/tracker-manual-20261113`.
- Source/package version: 2.10.8; latest release `tracker-v2.10.8` contains APK/source/checksums, no Windows installer. `trackerReleasePlatforms` is Android-only.
- Repository clone was initially delayed, then completed. Initial working tree was clean; no AGENTS.md was found. Open-PR search returned none. Existing branch inventory and recent commits were inspected; branches and existing fixes were retained.
- Local tests/builds ran on the baseline plus the changes in this PR. Local manifests embed the baseline SHA because the working tree was uncommitted; they are not exact-commit CI evidence. Consult this PR's Checks for subsequent exact-head verification.

## B. Platform audit

| Area | Review result | Local build/test result | Outstanding issues |
|---|---|---|---|
| Website | React 19/Vite 7, sign-in gate, CSP, reports, accounts, financial domain and reconciliation reviewed | Production web build, types, lint, bundle verification pass | Real browser interaction, mobile layout, contrast and every-screen visual inspection blocked locally |
| Windows | Electron 44, sandbox/context isolation, IPC checks, local atomic storage, backups, OAuth and packaging configuration inspected | Native renderer and Electron main/preload compilation pass; ASAR/dependency tests pass | Actual Inno Setup EXE build blocked on Linux (`LOCALAPPDATA` absent); installation/startup/update/window behavior not tested |
| Android | Capacitor 8.5; actual Android project, manifest, native storage/widget/update tests and inset code inspected | Release renderer and `cap sync android` pass | Gradle download fails: network unreachable; APK/native unit/device tests not executed locally |
| Financial calculations | Entries, ledger, accounts, net worth, dates, reserves, installment receipts, reports and merge logic reviewed | 270 tests/46 files pass, including 15 new regression/boundary cases | No certification of all possible plans, extreme totals or real production records |
| Backend/security | Client owner checks, revision/mutation RPC usage, conflict merging, historical SQL fixture, CSP and native session handling inspected | npm audit: zero known advisories; security-log redaction tests pass | Disposable DB/Auth runtime prerequisites absent; live RLS/configuration not verified |
| UI/UX/themes | Existing design retained; reconciliation editing fixed | React render regression tests pass | Browser launch blocked; no emulator or physical-device validation |

## C. Findings

### F1 — RESOLVED — High — shared financial correction workflow

An imported/off-schedule provision-linked expense is readable, but adding its dated reversal through `store.change` throws “Choose a bill due month on the provision schedule.” Reproduction uses a two-month provision first due December 2026, a preserved legacy payment linked to January 2027, and its next-day reversal. The new regression failed before the fix and passes afterwards. Root cause: the edit guard looked only at `originalTransactionId` (refunds); reversals refer to `reversalOfId`. Existing original record and new invalid-bill validation remain intact.

### F2 — RESOLVED — Medium — shared reconciliation UI

Clear the reconciliation start date with combined payment methods selected. Rendering calls `ledgerCashEffect` with an empty start date and throws `RangeError: Invalid time value`. Empty end dates/reversed intervals could also show misleading previews. React server-render regression reproduces the crash before the fix. Preview calculation and submission now require valid, ordered dates; an accessible status message explains incomplete input.

### F3 — DEFERRED — Medium — production backend assurance gap

The checked-in policy/RPC snapshot is historical, not an authoritative inspection of today's deployed database. Existing documentation reports prior leaked-password-protection and mixed-client validation concerns. Their current production status is POTENTIAL/unverified. Do not alter production policies from this snapshot. Safely review live metadata with authorized access, reproduce policies and guards in a disposable stack, run cross-user/RPC/concurrency tests, then propose separately reviewed migrations if needed. No production data or schema was changed.

### F4 — NOT REPRODUCED — Low — suspected deployed asset mismatch

Read-only HTTP checks returned 200 and security headers. The served manifest reports version 2.10.8, web/sign-in mode, source `1295b005a026da242bf923ecb80c3ea03d803d3c`, whereas audit main is `a495733e437a734ecb50821b4c269c79071915f4`. The verifier subsequently confirmed all 51 served files match `track/build.json` committed in the audited repository. This verifies deployed bytes against that artifact, not equivalence with the current source or full application behavior. No deployment was performed.

### F5 — RESOLVED — Medium — Windows verification coverage gap

The PR quality workflow built a synthetic Windows fixture only; the actual Inno Setup installer was built exclusively by the publishing workflow and the current release platform list is Android-only. Added an isolated Windows runner job to the existing read-only quality workflow, reusing `npm run dist:win` and the Inno compiler path from the existing release job. It verifies installer existence/size and records its SHA-256. It does not install, launch, sign or publish the application. The build result must be checked in CI before marking it PASS.

## D. Fixes implemented

| Defect | Modified files | Correction | Regression |
|---|---|---|---|
| F1 legacy bill reversal rejected | `src/domain/bill-schedule.ts` | Resolve reversal origin using `reversalOfId`; retain refund semantics | `tests/manual-audit-20261113.test.ts`: legacy reversal, cash/expense restoration, unchanged original and rejection of new/edited invalid bills |
| F2 invalid-date render crash | `src/pages/Balances.tsx` | Validate interval before preview; disable/guard submission; retain form and layout | `tests/reconciliation-preview.test.tsx`: empty start/end, impossible date, reversed interval and valid same-day recovery; browser interaction case in `tests/browser/reconciliation-date-edit.spec.ts` |
| F5 actual Windows build missing from PR checks | `.github/workflows/tracker-quality.yml` | Add non-publishing actual installer build on Windows using existing packaging command | CI job `Build actual Windows installer (no release)` checks expected output and hashes it; runtime installation remains untested |

Independent financial cases additionally exercise paise transfers/reversals across December/January, zero/negative rejection, duplicate IDs and positive/negative decimal half ties. Existing suites cover income/expense, EMI allocation, archive/report cutoffs, PF, import/export, persistence, conflict merges, refunds and seeded transfer invariants. Passing these finite cases is not proof of complete financial correctness.

## E. Verification

Run from `tools/tracker-source` unless stated otherwise:

| Exact command | Local result |
|---|---|
| `npm ci --no-audit --no-fund` | PASS: dependencies installed using lockfile |
| `npx vitest run tests/manual-audit-20261113.test.ts` before fix | Expected FAIL: original legacy reversal rejected |
| `npx vitest run tests/reconciliation-preview.test.tsx` before fix | Expected FAIL: 4 failing cases, including invalid-time exception |
| `npx vitest run tests/manual-audit-20261113.test.ts tests/reconciliation-preview.test.tsx` after fix | PASS: 15 tests |
| `npm run check` | PASS: lint, unit/integration suites, five dependency compatibility groups, bot finance generation/checks, bot tests, quality types, web build and bundle/manifest checks; first post-fix run preceded eight additional test cases |
| `npm run lint` and `npm test` after all test additions | PASS: lint; 270 tests in 46 files |
| `npm run build:release` | PASS: native renderer plus Electron main/preload build; not an installer/APK |
| `npm audit --json` | PASS: 0 reported vulnerabilities; not a guarantee against undisclosed vulnerabilities |
| `npx cap sync android` | PASS: actual project synchronized; generated ignored outputs excluded from commit |
| `bash android/gradlew -p android --no-daemon assembleDebug testDebugUnitTest` | BLOCKED: Gradle distribution download, `java.net.SocketException: Network is unreachable`; Android SDK also unavailable locally |
| `npm run dist:win` | BLOCKED: Linux lacks Windows `LOCALAPPDATA`/Inno Setup environment; build script stops before installer packaging |
| `npx playwright install chromium` | BLOCKED: download was not a valid ZIP |
| `npx playwright test tests/browser/reconciliation-date-edit.spec.ts` | BLOCKED: pinned browser not installed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/reconciliation-date-edit.spec.ts --timeout=15000` | BLOCKED: browser aborts before tests, socket operation denied by sandbox |
| `npm run test:database` | BLOCKED exit 2: disposable PostgreSQL URL/opt-in absent; psql/container runtime unavailable |
| `npm run test:security` | BLOCKED exit 2: disposable Supabase and two synthetic accounts absent; no requests made |
| `python3 .github/scripts/test-weekly-audit-report.py` (repository root) | PASS: 9 tests |
| `python3 .github/scripts/test_redact_supabase_cli_output.py` (repository root) | PASS: 5 tests |
| `git diff --check` | PASS |
| `curl -I --max-time 20 https://nandakumarm.dpdns.org/track/` | PASS: HTTP 200, CSP/HSTS/frame/content-type/referrer protections observed; no signed-in interaction |
| `curl -fsS --max-time 20 https://nandakumarm.dpdns.org/track/build.json -o /tmp/tracker-live-build.json` | PASS: manifest readable; provenance limitation in F4 |
| `node scripts/verify-deployment.mjs https://nandakumarm.dpdns.org/track/ 1295b005a026da242bf923ecb80c3ea03d803d3c ../../track/build.json` | PASS: all 51 deployed files match the committed manifest |

Device status: Android emulator NOT TESTED; Android physical device NOT TESTED; Windows physical/VM application NOT TESTED. Browser emulation would not establish native correctness even if CI passes. Zod annotation/deprecation warnings were nonfatal; no dependency changes were made merely to silence them.

## F. GitHub status

- [Audit branch](https://github.com/nandurpm/portfolio/tree/audit/tracker-manual-20261113).
- [Baseline commit](https://github.com/nandurpm/portfolio/commit/a495733e437a734ecb50821b4c269c79071915f4).
- PR will target main; no merge, release, deployment, notification, signing-identity or application-ID change is authorized by this PR creation.
- Exact fix commit, PR and current non-deploying CI run links are reported in the PR conversation/body after creation. CI results must be matched to that head SHA; historical successful runs do not validate this patch.

## G. Outstanding risks

Complete every-screen visual/browser, installer and native device validation before asserting full-platform validation. Run disposable database/Auth tests; verify current live policies and deployment provenance separately. Preserve private signing identity and use existing release procedures only after approval. This audit provides two confirmed fixes and bounded automated evidence; it does not claim that all screens, devices, production settings or financial scenarios are fully audited.
