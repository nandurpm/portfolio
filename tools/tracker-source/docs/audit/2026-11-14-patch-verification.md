# Manual audit patch verification — 14 November 2026

## A. Audit information

- Follow-up verification: 2026-11-14, starting approximately 03:07 UTC.
- Verified main baseline: `8a5b515ef20b0c62149b893ba07e652a75d515f0`.
- Branch: `audit/tracker-manual-20261114`; package version remains 2.10.10.
- Local environment: Linux, Node 24.22.1, npm 11.9.0. Commands below ran against the baseline plus this branch's changes, before committing. Build manifests therefore identify the baseline, not the eventual PR commit.
- PR #130 already merged a different, report-only audit. The existing `2026-11-14-manual-audit.md` is preserved. The supplied patch's two source corrections were absent from main; its claimed open PR/branch could not be found. This follow-up independently verifies those corrections rather than adopting the supplied report's unexecuted claims.

## B. Platform audit

| Area | Review result | Build/test result | Outstanding issues |
|---|---|---|---|
| Website | Two shared-domain/import defects reproduced | Local production build, bundle verification and regression tests PASS | Browser CI pending; every-screen manual inspection NOT TESTED |
| Windows | Shared renderer corrections; packaging unchanged | Local release renderer and Electron main/preload build PASS | Actual Windows installer CI pending; Windows installation/update/persistence NOT TESTED locally |
| Android | Shared corrections; Capacitor dependencies unchanged | Local Capacitor template/copy/plugin compatibility checks PASS | Actual Android Gradle build CI pending; emulator/device NOT TESTED in this follow-up |
| Financial calculations | Synthetic receipt/import regressions and randomized ledger invariants | 286 tests PASS, including 7 added | Finite cases; no production user records tested |
| Backend/security | No backend, schema or authentication change | npm audit: 0 vulnerabilities; disposable backend CI pending | Live production RLS/auth parity unverified |
| UI/UX and themes | No UI changes | Existing automated browser suite pending CI | No new visual or device inspection |

## C. Findings

| ID | Status | Severity / platforms | Evidence and fix status |
|---|---|---|---|
| F1 | RESOLVED in branch | Medium / all shared targets | Re-saving loan notes containing `$$`, `$&`, or dollar-backtick/dollar-quote tokens changes linked receipt text. JavaScript string replacement interprets user text as replacement syntax. Literal function replacement fixes this; amounts are unaffected. |
| F2 | RESOLVED in branch | Low / all import targets | `iso(46000.5)` returns 2025-12-10 instead of 2025-12-09. Rounding a numeric Excel serial promotes afternoon times to the next date. Flooring the day serial preserves the date. |
| F3 | DEFERRED | Low / shared ledger | Supplied report flags conservative decimal validation at very large amounts. No correction or independent reproduction in this follow-up. |
| F4 | POTENTIAL | Low / budget | Supplied report flags percentage half-paise rounding differences. Not independently reproduced here; no financial rounding policy changed. |
| F5 | POTENTIAL | Low / installment schedules | Supplied report questions monthly correction of irregular imported lender schedules. No schedule policy changed; intended behavior requires separate review. |
| F6 | NOT REPRODUCED | Ledger invariants | Deterministic 400-trial synthetic generator checks accepted ledgers for net-worth conservation, period totals and account-balance reconciliation. Test requires more than 100 accepted cases; invalid generated ledgers are skipped. This is finite evidence, not exhaustive correctness or guaranteed coverage of every kind. |
| F7 | DEFERRED | Medium / production backend | Production RLS/guard parity and leaked-password protection remain unverified. No production access or migration attempted. |

## D. Fixes implemented

1. `src/domain/installments.ts`: use function replacers for corrected receipt notes and due-date text so replacement values are inserted literally. Regression cases cover unchanged notes with four token patterns plus replacing a plain old note with literal dollar tokens. The dollar-number case already passed before the fix.
2. `src/io/import.ts`: replace `Math.round` with `Math.floor` for numeric Excel serial day extraction. Regression checks integer day, fractions .25/.5/.999, and the next whole day.
3. `tests/manual-audit-20261114.test.ts`: seven synthetic tests, including the independent ledger-invariant test. Formatting adapted to repository style. Before source fixes, five failed and two passed; afterward all seven passed.

## E. Verification

Run from `tools/tracker-source` unless stated otherwise:

| Exact command | Actual local result |
|---|---|
| `npx vitest run tests/manual-audit-20261114.test.ts` before fixes | EXPECTED FAIL: 5 failed, 2 passed |
| `npx vitest run tests/manual-audit-20261114.test.ts` after fixes | PASS: 7 tests |
| `npm run check` | PASS: lint; 48 files / 286 unit tests; 5 dependency compatibility groups; bot finance parity and bot tests; quality typecheck; web production build; bundle budget and 51-file provenance verification |
| `npm run build:release` | PASS: release renderer and Electron main/preload compilation; not an installer |
| `npm audit` | PASS: 0 vulnerabilities |
| `git diff --check` from repository root | PASS |

The PR's existing `Tracker quality (no deployment)` workflow will independently run the exact proposed code through browser checks, PostgreSQL and local Supabase isolation/recovery tests, actual Android debug compilation/native unit tests, and an actual Windows installer build. Results and run links belong in the PR description once available; they are not claimed as passed in this pre-CI report.

Local Windows installer/runtime, Android APK/emulator/device, browser runtime and production backend verification: NOT TESTED in this follow-up. Prior reports' commands and historical CI runs are not new verification evidence. Compilation and synthetic tests do not certify the whole application.

## F. GitHub status

- Branch: <https://github.com/nandurpm/portfolio/tree/audit/tracker-manual-20261114>.
- A separate PR against main will contain these two source fixes, regression tests and this follow-up report. Its description records the commit and CI evidence.
- Awaiting owner review; no merge, release or deployment performed by this follow-up.

## G. Outstanding risks

- Finite automated coverage does not replace every-screen UI or physical Android/Windows testing.
- F3–F5 remain qualified findings; this patch does not invent rounding rules or lender schedules.
- Live backend configuration remains unverified. Production data, schemas, signing identity, application ID and credentials are untouched.
- Installed APK/EXE users need a future approved release to receive these fixes; version 2.10.10 is deliberately unchanged in this review PR.
