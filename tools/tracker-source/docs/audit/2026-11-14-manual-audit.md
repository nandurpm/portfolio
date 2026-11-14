# Savings & Expense Tracker manual audit — 14 November 2026

## A. Audit information

- Audit date/time: 14 November 2026, approximately 08:23–08:30 IST (02:53–03:00 UTC).
- Repository: `nandurpm/portfolio`.
- Original verified main commit: `85b22a92ef84848415b0abc9e2a29eca6efda429` (`Build sign-in-required tracker assets`).
- Audit branch: `audit/savings-expense-manual-20261114`.
- Source/package version: `2.10.10`; `trackerReleasePlatforms` declares Android and Windows.
- Open pull requests at audit start: none.
- Working tree at audit start: clean; no unrelated changes were overwritten, reset, or discarded.

This audit reviewed the checked-in website source, Electron/Windows packaging, Capacitor/Android project, financial domain and ledger code, Supabase client/synchronization code, tests, CI scripts, and prior audit records. The deployed website was opened read-only and presented the expected sign-in gate. No credentials were submitted, no production data was changed, and no deployment or release was performed.

## B. Platform audit

| Area | Review result | Build/test result | Outstanding issues |
|---|---|---|---|
| Website | Static review of dashboard/pages/navigation, responsive CSS, theme assets, sign-in gate, data access and error paths; deployed read-only smoke check returned the expected sign-in page | `npm run check` PASS; web production build and bundle verification PASS; deployed page loaded over HTTPS | Authenticated every-screen interaction, browser console, mobile device rendering and visual regression are NOT TESTED in this environment; managed browser console actions were unsupported |
| Windows | Electron main/preload, context isolation, local storage, backup/import/export paths, update configuration, app ID and installer configuration reviewed | `npm run build:release` PASS; Windows installer command reached packaging but was BLOCKED before packaging because `LOCALAPPDATA` is undefined on Linux | Actual NSIS installer, installation, startup, update, signing, and Windows runtime NOT TESTED |
| Android | Capacitor 8 project, application ID, Gradle files, manifest-related source, native bridge/widgets, storage and update paths reviewed | `npx cap sync android` PASS; Gradle invocation BLOCKED: JDK 21 installation lacks `javac` capability required by Gradle | APK generation, emulator, physical device, lifecycle, keyboard/insets and native update behavior NOT TESTED |
| Financial calculations | Income/expense, transfers, balances, net worth, reports, budgets, recurring bills, EMI, reversals, duplicate IDs, paise precision, date boundaries, import/export and reconciliation logic reviewed | 279 unit/integration tests in 47 files PASS; financial regression/property suites included; quality typecheck PASS | Synthetic finite tests do not certify every possible user plan, extreme totals, or production records |
| Backend/security | Supabase client, ownership/revision/mutation paths, sync/conflict handling, secret redaction and checked-in policy fixtures reviewed | `npm audit --json` PASS with 0 info/low/moderate/high/critical vulnerabilities; redaction tests PASS | Disposable database/RLS/Auth cross-user and concurrency tests BLOCKED because required disposable services/accounts/opt-in were absent; current production policy state remains unverified |
| UI/UX and themes | Existing identity, typography, spacing, theme tokens, compact layouts, overflow and native/web shared styles reviewed statically; sign-in layout showed no horizontal overflow in the read-only smoke page | Lint, typecheck, web build and existing render/regression suites PASS | Full authenticated desktop/mobile visual inspection, accessibility tree across every screen and native-device UI NOT TESTED |

## C. Findings

### F1 — NOT REPRODUCED — No new confirmed financial defect

The current main branch contains the prior audit’s financial fixes and regression coverage. Independent execution of the complete non-browser suite passed all 279 tests, including ledger transfer/reversal, paise precision, account/net-worth reconciliation, EMI/provision, date-boundary, import/export and synchronization-related cases. No new confirmed calculation or data-integrity defect was reproduced from the inspected code.

### F2 — NOT REPRODUCED — No new confirmed UI crash or overflow

Static inspection and the deployed sign-in smoke check did not reproduce a crash, broken navigation entry point, or horizontal overflow on the public sign-in page. Authenticated interaction across all screens was not possible without user credentials and was not claimed as tested.

### F3 — POTENTIAL / DEFERRED — Live backend assurance gap — Medium

The repository contains client-side ownership and mutation guards plus historical SQL/security fixtures, but this execution did not have an authorized disposable Supabase/Postgres environment or two synthetic accounts. Current production RLS/Auth configuration, cross-user isolation, RPC authorization and concurrency behavior therefore remain unverified. No production policy or schema was changed. Resolution requires a separately approved disposable-environment verification and, if needed, a reviewed migration.

### F4 — BLOCKED / DEFERRED — Native packaging verification — Medium

The Electron renderer/main/preload release build and Capacitor synchronization passed. The Windows installer command could not enter packaging because the Linux environment has no `LOCALAPPDATA`; Android Gradle could not compile because the available JDK 21 installation does not provide the required `JAVA_COMPILER`/`javac` capability. These are verification blockers, not confirmed application defects.

## D. Fixes implemented

No source-code fix was necessary: no new confirmed defect was reproduced during this audit. This report is the only audit artifact added on the branch. Existing accepted fixes on `main` were preserved.

## E. Verification

All commands below were run from `tools/tracker-source` unless noted:

| Exact command | Result |
|---|---|
| `npm ci --no-audit --no-fund` under Node `v24.19.0` | PASS; lockfile installation completed |
| `npm run lint` | PASS |
| `npm test -- --reporter=dot` | PASS; 279 tests / 47 files |
| `npm run check` | PASS; lint, tests, dependency compatibility, bot finance, bot regressions, quality types, web build, bundle and manifest verification |
| `npm audit --json` | PASS; 0 vulnerabilities across info/low/moderate/high/critical |
| `npm run build:release` | PASS; renderer plus Electron main/preload release build |
| `npx cap sync android` | PASS; actual Android project synchronized |
| `bash android/gradlew -p android --no-daemon assembleDebug testDebugUnitTest` | BLOCKED; JDK 21 lacks required `JAVA_COMPILER` capability |
| `npm run dist:win` | BLOCKED; Linux environment has undefined `LOCALAPPDATA` before Windows installer packaging |
| `npm run test:security` | BLOCKED exit 2; disposable Supabase/two-account prerequisites and explicit opt-in absent; no requests made |
| `npm run test:database` | BLOCKED exit 2; disposable loopback PostgreSQL and explicit opt-in absent; no requests made |
| `python3 .github/scripts/test-weekly-audit-report.py` from repository root | PASS; 9 tests |
| `python3 .github/scripts/test_redact_supabase_cli_output.py` from repository root | PASS; 5 tests |
| `git diff --check` | PASS |
| Managed browser navigation to `https://nandakumarm.dpdns.org/track/` | PASS read-only load; expected sign-in gate displayed; no credentials submitted |
| Managed browser console/DOM automation | NOT TESTED; browser reported unsupported action for console calls |

Device verification status: Android emulator NOT TESTED; Android physical device NOT TESTED; Windows VM/physical application NOT TESTED. No release, deployment, notification, signing credential, Android application ID, or production-data operation was performed.

The web build emitted non-fatal Rollup warnings about comment placement in the installed Zod package; no application failure was observed and no dependency was changed merely to silence the warnings.

## F. GitHub status

- Branch: [`audit/savings-expense-manual-20261114`](https://github.com/nandurpm/portfolio/tree/audit/savings-expense-manual-20261114).
- Base commit: `85b22a92ef84848415b0abc9e2a29eca6efda429`.
- Audit report commit: [`54374d7e06872bfae12f1146cd77a91c7d9fad17`](https://github.com/nandurpm/portfolio/commit/54374d7e06872bfae12f1146cd77a91c7d9fad17).
- Pull request: [#130](https://github.com/nandurpm/portfolio/pull/130), open against `main` for user review; it will not be merged by this audit.
- No changes are merged by this audit.

## G. Outstanding risks

The main unresolved risks are the absence of live disposable Supabase/Postgres verification, lack of authenticated browser/device coverage, and unavailable Windows installer and Android APK environments. The audit evidence supports the tested static, unit, integration, web-build, Electron-build, Capacitor-sync and dependency-security claims only; it does not support a claim of full platform validation. Before release, run the blocked backend tests in a disposable environment, build/install the Windows installer on Windows, build and run the APK with a complete Android SDK/JDK, and perform authenticated browser, emulator and physical-device checks.
