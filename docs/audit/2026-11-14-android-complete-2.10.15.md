# Android-first Savings and Expense Tracker audit — 14 November 2026

## A. Audit information

- Baseline: `b84d6713c96680ce950d4ca7d52b7e417b201ba3` (latest verified main at start; source version 2.10.14).
- Branch: `audit/android-complete-20261114`; release prepared as 2.10.15.
- Initial tree clean, no open PRs. Preserved 2.10.14 bounded recovery reads, notification behavior, and updater retry/backoff changes.
- Scope: Android first; shared domain calculations, backup/import, synchronization/authentication configuration, Windows and Web build compatibility. No production records or schema changes. Signing identity, application ID `com.nandakumar.savingsexpensetracker`, and backup format retained.
- Architecture: React/TypeScript renderer packaged locally through Capacitor 8; Android system WebView, native Java file/session/update/widget bridge. Android min API 34 (Android 14), target/compile API 36. Windows is Electron with a distinct installer and preload bridge; Web has a separate sign-in gate. A web build alone is not native validation.

## B. Platform / area coverage

| Area | Review | Verification available before PR | Outstanding / final evidence |
| --- | --- | --- | --- |
| Android | Manifest/permissions, Capacitor/insets, native bridge/session/recovery/update configuration; Home, Activity, Accounts, More and existing secondary screens | Native renderer build and Capacitor sync attempted; financial/UI regressions added | Signed APK, certificate continuity, install/upgrade, Android 16 instrumentation and screenshots must be verified by CI before release |
| Windows | Separate Electron packaging and shared domain/presentation boundaries preserved | Native renderer/Electron build attempted; no claim of Windows runtime here | CI installer build/release; physical Windows use not tested |
| Web | Separate auth gate and domain parity retained | Production web build, provenance and bundle checks | CI browser tests, disposable auth/security tests; no live production user sign-in |
| Financial calculations | Income/expense, paise validation, transfer principal and fees, reversals, budgets, reporting dates, net worth, installments and PF through existing suites plus independent cases | Baseline 290 tests PASS; fixed suite 308 tests PASS | Finite synthetic evidence, not proof for every financial plan |
| Data integrity / backend | Backup normalization/history, offline/cloud revision/conflict code and auth/storage configuration reviewed; no migrations | JSON backup round-trip plus existing import/history/conflict regressions | Disposable DB/RLS and Supabase CI; production configuration is not certified |
| UI / themes | Android-only hierarchy/colors/touch targets, four navigation areas, More grouping, activity semantics, lazy analysis | Source review and regression specs | Chromium simulation/screenshot/axe checks and native emulator evidence separately identified |

## C–D. Confirmed findings and fixes

| ID / severity | Evidence and reproduction | Root cause | Fix / files / regression |
| --- | --- | --- | --- |
| F1 — Medium, shared financial | Budget ₹1 with +0.5% produced ₹1.00 instead of ₹1.01; JavaScript `Math.round(1.005*100)/100` reproduces it. | Bulk and quick percentage adjustments bypassed the project's existing half-away-from-zero paise rule. | `src/domain/budget-adjustment.ts`, `src/pages/Budget.tsx`: use existing `roundMoney` for both paths. Seven independent expected-value cases, including negative tie, zero, −100%, and upper percentage boundary. Existing saved budgets are not rewritten. |
| F2 — Medium, shared validation | `1234567890.09` is a valid supported two-decimal amount but multiplication produces `123456789008.99998`, exceeding the fixed validation tolerance. | Ledger used absolute residual tolerance after binary multiplication rather than the shared magnitude-aware paise validator. | `src/domain/ledger.ts`: reuse `isPaise` and `toPaise`. Retain amount limit, positivity and reference/type checks. Test high opening balance, exact fee/transfer conservation, zero/negative/NaN/infinite/overflow/sub-paise rejection, same-account/duplicate rejection and dated reversal. Generated bot finance source refreshed to match; not deployed to Supabase by this audit. |
| F3 — Medium, Android / shared recent activity | Open Home → Full dashboard analysis. Both Home and embedded dashboard rendered recent activity, repeating `mobile-recent-title` and the same records. | The full dashboard component did not distinguish embedded analysis. | `AndroidDashboard222.tsx` accepts `embedded`; `AndroidHome.tsx` passes it; embedded analysis omits only the redundant recent list. Full standalone dashboard and all analysis functions remain. Browser regression asserts one recent list and no duplicate IDs. |
| F4 — Medium, mobile activity presentation | Add a valid Asset-category daily entry, then view Android Home: old recent list treated every non-income entry as an expense; full Activity already called it an asset movement. | Incomplete category classification in `MobileRecentActivity.tsx`. | Mark Asset entries as neutral movements with an explicit label. No amount/category/report mutation. Browser test compares Home and Activity labels. |
| F5 — Low, Android navigation/clutter | More had five fragmented groups; Reports and Import/Export navigated to exactly the same unscoped page. | Unnecessary grouping and missing import anchor. | `AndroidMore.tsx`: three cohesive groups, all 14 shortcuts retained, Import/Export targets the actual existing import heading. Existing 13-destination tests retained; new spec checks all 14 titles/group count/import destination and record preservation. |
| F6 — Low, Android Activity performance | Each ledger row resolved both account IDs by scanning the entire accounts array. | Repeated linear search, O(transactions × accounts), despite stable per-plan data. | `AndroidActivity.tsx`: construct account-name Map once per memoized activity list. Same output, fewer lookups; full existing activity/transfer suites remain. No unmeasured speed claim. |
| F7 — UI improvement, Android only | Source review found an undifferentiated balance block, repeated monthly labels and no direct balance-to-accounts action. | Weak visual hierarchy rather than an accounting issue. | `AndroidHome.tsx`, scoped `android-simple.css`: navy/indigo cash card, explicit date context, wallet accent, clear monthly heading and consistent cards; direct View accounts action; preserved existing palettes/light/dark, financial labels and four main areas. No new dependencies or fabricated comparison percentage. Browser matrices, existing accessible-rich-theme tests and screenshots required. |

### Not reproduced / deferred

- Negative daily entries: a theoretical double-minus display was considered, but the actual schema requires positive amounts. No financial rule or sign behavior was changed for this unconfirmed case.
- Existing internal transfer neutrality is preserved; only fees count as expense. Tests cover reversal and month/date boundaries. No daily allocation added.
- More's remaining deep-link shortcuts may share a page but represent different sections; they are retained as useful functionality rather than deleted as duplicates.
- No new confirmed authentication/RLS flaw established by source review alone. Production Supabase policies/settings, real-account recovery and sync, credential rotation, personal-device lock behavior and real-device keyboard/performance need authorized environment/device evidence. Never certify them from synthetic tests.
- No broad deletion of legacy CSS: it has an established cascade and existing platform-specific overrides. Changes are scoped and verified against screenshots; a complete CSS rewrite would add regression risk.

## E. Verification commands and results

Working directory `tools/tracker-source`. Local runtime Node 24.22.1 / npm 11.9.0; repository .nvmrc specifies Node 24.19.0. CI uses the pinned toolchain.

- Baseline `npm run check`: PASS, 49 files / 290 unit tests, lint, dependency compatibility, bot, typecheck, web build and bundle/provenance.
- New `npx vitest run tests/android-complete-audit.test.ts`: PASS (initial 17 cases; extended to 18 including backup round-trip).
- Fixed `npm run check`: PASS, 50 files / 308 tests; the first run correctly detected stale generated bot finance after ledger changes, then passed after `node scripts/build-bot-finance.mjs` regenerated it.
- `npm run build:release`, `npm audit --json`, `npx cap sync android`, `bash android/gradlew -p android --no-daemon assembleDebug`: final outcomes recorded in PR evidence after command completion.
- `git diff --check`: PASS.
- Local Chromium previously cannot launch due the workspace's socket sandbox; browser simulation is run in GitHub Actions rather than reported as local/device success.

CI is expected to execute existing `.github/workflows/tracker-quality.yml`: full checks/browser regression, disposable PostgreSQL, local disposable Supabase RLS/auth/reset, native dependency/unit checks and real Windows installer build. The release workflow independently builds web/native financial parity, signed APK, certificate comparison against the previous published APK, Android 16 emulator install/upgrade with a private marker, native unit/instrumentation/widget checks, checksums, Windows installer and public release assets. Record actual run outcomes; configuration alone is not PASS.

## F. GitHub / release status

Prepared for PR and 2.10.15 publication under the user's explicit fix-and-release instruction. No direct main edits. No bot update notifications requested. The PR and release notes are the final source for exact commits, run links and published asset URLs after checks finish. A version bump does not itself mean an APK has been released.

## G. Remaining risks / limits

Physical Android devices and OEM WebView/keyboard variants are not available locally. Android 14/15 behavior is not proven by an Android 16 emulator. Compilation, browser simulation, widgets and a private-file upgrade marker each cover specific behaviors; none prove every financial workflow or every installed user's data migration. Production cloud access is not exercised or modified. Native build failures, if any, must be reported as blocked/failed, not hidden. The report is updated with actual evidence before final handoff.
