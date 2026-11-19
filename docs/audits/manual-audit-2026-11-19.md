# Savings & Expense Tracker manual audit — 2026-11-19

## A. Audit identity

- **Audit date:** 2026-11-19 (Asia/Kolkata)
- **Repository:** `https://github.com/nandurpm/portfolio`
- **Application source:** `tools/tracker-source`
- **Baseline commit:** `580edb1f29dd31a5a21404029e3a178155587e5c`
- **Audit branch:** `audit/savings-expense-tracker-20261119`
- **Application version at baseline:** `2.10.18`
- **Latest published native release inspected:** `tracker-v2.10.18`, published 2026-11-16, targeting commit `02b9257968e1ef5aaa1e46432f353a3594618520`
- **Current source build:** web build manifest reports version `2.10.18`, source commit `580edb1f29dd31a5a21404029e3a178155587e5c`, `dirty: false`, mode `web`, Node `24.19.0`.
- **Production safety:** no production Supabase project, user records, live financial data, migrations, release signing credentials, or private tokens were accessed.

## Executive summary

The audit started from a clean clone of the verified `main` tip and a dedicated branch. Static review covered the Web/Vite/React implementation, Electron packaging and update paths, Capacitor/Android source, financial domain logic, import/export, synchronization and security test harnesses, update metadata, workflows, and release assets.

The current source passed the repository quality suite and the real-browser regression suite. The release-mode web/Electron build also completed. Android compilation reached Gradle twice but could not complete in this sandbox: the first attempt lacked the full Java compiler; after installing the full JDK, the build was blocked by the absence of an Android SDK and unset `ANDROID_HOME`. Windows installer/runtime verification is blocked by the Linux-only audit environment and was not claimed from static inspection.

No confirmed application defect was reproduced during this audit, so no speculative source fix was made. One **POTENTIAL** data-model/product risk remains: category visibility is global rather than date-effective. This is relevant to the requested historical “Travel and tea” / future “Travel” and “Tea and Snacks” configuration, but implementing it safely requires an approved compatibility design for historical budgets, backdated entries, backup/restore, and older clients. It was intentionally deferred rather than silently changing financial semantics.

## B. Platform matrix

| Platform / area | Static review | Executable verification | Result and limitation |
|---|---|---|---|
| Web financial/domain logic | Completed across calculation, ledger, budgets, loans, PF, import/export, backup and sync code | `npm run check` at baseline SHA: 52 test files, 314 tests passed; TypeScript, lint, bundle and manifest checks passed | **PASS** for the executed repository suite; this is not a claim of production-data verification |
| Web browser runtime | Completed across dashboard, accounts, activity, budgets, reports, loans, PF, auth, themes, responsive layouts, update UI and parity | `npm run test:browser` at baseline SHA: 92 passed in 6.6 minutes | **PASS** for the synthetic browser suite |
| Web production build | Vite build and provenance reviewed | `npm run build:web` and `npm run check:bundle`: build passed; `reportsBytes=48684`; manifest verified with exact baseline SHA | **PASS** |
| Electron/Windows source | Electron main/preload, packaging, update packaging, persistence and release metadata reviewed | `npm run build:release` completed the release-mode web/Electron build | **PASS** for build only; Windows runtime and installer execution were not available on Linux |
| Android source | Capacitor bridge, lifecycle/update/widget code, application ID, versioning and native tests reviewed | Android build attempted after `npx cap sync android`; Gradle blocked by missing Android SDK (`SDK location not found`, `ANDROID_HOME` unset) | **BLOCKED**; emulator, physical device, signed APK and Android runtime were not tested |
| Synchronization/security | Client cloud model, ownership filters, idempotency/conflict tests and disposable security harness reviewed | Production was not accessed; no disposable Supabase credentials/project were supplied for `npm run test:security` | **NOT TESTED** for live RLS/RPC behavior; static review completed |
| Live deployed website | Deployment URL and manifest endpoint were attempted | Python `urllib` received HTTP 403 from both `https://nandakumarm.dpdns.org/track/` and `/track/build.json` | **BLOCKED**; no authenticated browser session or production data was used |
| Windows runtime | Electron implementation and update behavior reviewed | Not executable in the Linux sandbox | **BLOCKED** |
| Physical Android device | Android-specific source and browser simulations reviewed | No physical device attached | **NOT TESTED** |

## C. Findings

| ID | Severity | Status | Area / platform | File or function | Reproduction / evidence | Root cause and impact |
|---|---|---|---|---|---|---|
| CAT-001 | Medium | **POTENTIAL** | Date-effective category selection and reporting; Web/Android/Windows shared model | `src/domain/types.ts`, `src/pages/Budget.tsx` (`cats = p.categories.filter(c => c.group !== 'Asset')`), `src/domain/calculate.ts` | Static trace shows categories are filtered by group and current category state, not by an effective date. The model has no category effective-start field. Existing tests verify that “Travel” and “Tea and Snacks” are distinct, but no current test proves date-aware visibility for November 2026 versus December 2026. | The requested configuration can preserve the old category and historical records, but the old category can remain selectable/displayed in future budget views unless zero future budget is manually maintained. A safe fix requires a versioned data-model decision covering historical budgets, backdated entries, backup/restore, and older clients. No migration or hardcoded personal category names was introduced. |
| PROD-001 | Low | **DEFERRED** | Deployment/runtime provenance | `https://nandakumarm.dpdns.org/track/` | Both the route and `/track/build.json` returned HTTP 403 from this sandbox. | Production runtime and deployed manifest could not be independently verified without an authorized runtime path. This is a verification limitation, not an application defect claim. |
| NAT-001 | Low | **DEFERRED** | Android native build/runtime | `android/` Gradle project | First build attempt failed because the Java 21 runtime lacked `JAVA_COMPILER`; after installing `openjdk-21-jdk-headless`, the retry failed because no Android SDK location was configured (`ANDROID_HOME` unset and no `android/local.properties`). | Native build and emulator/device evidence are unavailable in this environment. No source change is justified by this infrastructure failure. |
| WIN-001 | Low | **DEFERRED** | Windows installer/runtime | Electron packaging and `scripts/build-windows-installer.mjs` | The Linux sandbox has no Windows runner or Inno Setup compiler. | Installer execution, Windows persistence, Windows update launch behavior and upgrade retention require a Windows runner/device. Static review does not establish runtime success. |

No finding is classified **CONFIRMED** or **RESOLVED** because no application defect was deterministically reproduced and no source fix was made.

## D. Financial/data-integrity review

Static review and the executed synthetic suites covered the following boundaries:

- Income, expense, opening balance, savings, net-worth and account-ledger aggregation.
- Internal account transfers and transfer fees, including neutrality of principal and dated reversal behavior.
- Credit-card/liability and account activity semantics.
- Loan/EMI schedules, partial and advance payments, closure, edited rows, receipts and overpayment guards.
- Employment/PF contributions, claims and cash-transfer boundaries.
- Monthly budgets, overrides, percentage adjustment, full-month comparisons, and the prohibition on daily allocation calculations.
- Paise precision, rounding, negative/zero handling, negative-zero formatting and fractional-cent validation.
- Month/date boundaries, future/past filtering, date transitions, import/export and backup round trips.

**Executed evidence:** `npm run check` passed 52 test files and 314 tests at the exact baseline SHA; browser platform-finance parity also passed in the 92-test browser run. These are synthetic/local checks and do not prove correctness against production records.

## E. UI, accessibility, performance and synchronization review

Static review covered the four Android navigation areas (Home, Activity, Accounts, More), responsive phone/tablet/desktop layouts, themes, touch targets, focus and screen-reader labels, loading/error states, long-list virtualization, chart loading, update dialogs, offline persistence and sync status messaging.

The browser suite exercised 360px, 393px, 768px, 1366px and 1920px layouts, light/dark/palette variants, navigation, form submission locking, recovery flows, parity, responsive scrolling and synthetic long-plan performance. All 92 scenarios passed. This supports the browser test scope only; it is not a claim of measured physical-device startup, memory, frame rate, or Android lifecycle behavior.

Static security review found existing ownership/idempotency/conflict test coverage and safe error/logging boundaries. Live RLS/RPC behavior was not tested because no disposable authorized Supabase project was provided and production access was prohibited.

## F. Updates and release integrity

The source contains separate update paths:

- Android foreground update discovery validates release tag, asset name, URL, size, GitHub digest, package identity, version increase and signing-certificate continuity before installation.
- Android background work is notification-only; it directs the user back to the app rather than silently installing an APK.
- Windows update behavior is an external installer/update package path; no claim was made that a Windows runtime receives source fixes until an installer is installed.
- The latest release assets inspected were uploaded and included APK, EXE, source ZIP, changelog and SHA256SUMS. The release targets commit `02b9257968e1ef5aaa1e46432f353a3594618520`, which is older than the audit baseline `580edb1f29dd31a5a21404029e3a178155587e5c`; therefore the published native release was not treated as containing the current source tip.

## G. Fixes and changed files

No application source files were changed. No regression test was added because no confirmed defect met the safe-fix threshold. The only proposed change in this branch is this audit report.

## H. Exact verification evidence register

All commands below ran from `tools/tracker-source` unless noted and used Node `24.19.0` after installing the repository-pinned runtime.

| Evidence | Exact command | Result |
|---|---|---|
| Baseline | `git rev-parse HEAD` | `580edb1f29dd31a5a21404029e3a178155587e5c` |
| Dependency install | `npm ci --ignore-scripts --no-audit --no-fund` | Passed; 702 packages installed. |
| Local quality | `npm run check` | Passed: 52 test files / 314 tests; dependency compatibility, bot tests, lint, typecheck, web build and bundle verification passed. |
| Browser runtime | `npm run test:browser` | Passed: 92 scenarios. |
| Release-mode build | `npm run build:release` | Passed web release build and Electron build. |
| Android attempt | `npm run build:release && npx cap sync android && cd android && bash ./gradlew --no-daemon assembleDebug testDebugUnitTest` | Blocked: Android SDK location not found; no `ANDROID_HOME` or `android/local.properties`. |
| Live route attempt | Python `urllib` requests to `/track/` and `/track/build.json` | Blocked by HTTP 403; no authenticated production access attempted. |
| Working tree | `git status --short --branch` | Clean audit branch before report addition; generated build outputs are ignored and were not committed. |

## I. Required follow-up / approval-dependent work

1. Approve a date-effective category model and compatibility contract before implementing CAT-001. The design must preserve the historical “Travel and tea” category and transactions, preserve November’s saved adjusted budget, expose Travel ₹150 and Tea & Snacks ₹350 from December 2026, keep the combined future budget at ₹500, and remain compatible with backdated entries, historical budgets, backup/restore, and older clients.
2. Run the Android Gradle build and native unit/instrumentation tests on CI or a configured Android SDK/emulator, then perform lifecycle, update-install, widget, keyboard/back, offline/reconnect and process-recreation checks.
3. Run the Windows installer and upgrade rehearsal on a Windows runner/device, including persistence retention and external update behavior.
4. Independently verify the deployed `/track/build.json` through an authorized browser/runtime path and compare its source SHA with the intended release commit.
5. Run the disposable Supabase security/password-recovery suites with explicitly authorized synthetic accounts only; do not connect the audit to production.

**Audit conclusion:** no confirmed application defect was reproduced in the available Web/Electron/local synthetic scope. Android, Windows runtime, live deployment and live synchronization evidence remain blocked or not tested for the reasons recorded above.
