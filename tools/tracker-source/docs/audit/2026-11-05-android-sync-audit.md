# Savings & Expense Tracker audit and implementation — 05-Nov-2026

## Outcome and scope

Latest published tracker release observed: **tracker-v2.2.1**. Its tag points to `5267da5d921e8e0a72056058b9ab59faa41a8253`; it has APK, Windows installer, source ZIP, changelog and SHA256SUMS assets. This is metadata inspection, not verification of the downloaded APK certificate or installed-device version.

Initial source checkout: `48f403257e40a03aeea9b279685b0ccbb40606f2`. During work, main advanced to `d2aee3a4443d460144744f0dc15fe529a6e7a268`, adding Android haptics/reminders and rebuilt website assets. The implementation was rebased onto that main so the new native work is retained. The public website manifest initially reported version 2.2.1, source `ed44a45e790235072c12bf175f53b62d4505dbd2`. Main already contained changes after the release tag. Matching version numbers alone therefore do not establish identical source across installed apps and the website.

Reviewed shared calculations, cloud serialization/merge, revision and mutation handling, account-cache policy, Android adapter and navigation, native identity/build scripts, Telegram routing/delivery and release workflows. Ran the existing financial, persistence, upgrade, dependency and bot checks, and added Android presentation and notification regressions. This is not a claim that every UI control, real installation or authenticated production flow was exercised.

## Prioritized verified issues

| Severity | Evidence | Resolution |
| --- | --- | --- |
| High | Bot `sendReleaseUpdate` called `/releases/latest`, accepted missing APK/EXE and did not reject draft/prerelease metadata explicitly. | Scan repository releases; filter exact tracker tags and stable publication; require exact versioned APK/EXE/checksum names, uploaded state, positive size, SHA-256 metadata and canonical repository URLs. |
| High | Old notification reserved `software-release:<tag>` as delivered before Telegram acknowledged delivery; failed cleanup was unchecked. | Separate unique pending and delivered keys; only write delivered after acknowledgment; check database errors; recheck delivery after acquiring reservation to close overlapping-worker race. Explicit Telegram rejection releases reservation for retries. Ambiguous delivery stays pending for review. |
| Medium | Release notices contained mojibake emojis, plain links, no release-note summary or independent update preference. | UTF-8 emoji, escaped HTML, bounded release-note excerpts, inline APK/EXE/notes buttons, `/updates`, `/changelog`, separate software setting. |
| Medium | Android Dashboard rendered desktop analytics, tables and multiple repeated summaries despite existing five-tab navigation. | Native-only compact Home using shared calculations; desktop Dashboard remains expanded. Existing Accounts, Transactions, Budget and advanced tools remain available. |
| Medium | Native Home needed historical activity filtering and tablet visibility; shared recent widget was phone-width-only and included future activity. | Optional native/through-date inputs preserve Web behavior and let native Home show activity through its report cutoff on larger screens. |
| Low | Electron-builder artifact name was hard-coded to 2.1.0 while package version was 2.2.1. | Use `${version}` in artifact name. Primary Inno build already derived the version correctly. |
| Release blocker | No authorized signing variables in this environment, no Windows installer environment; Chromium could not start. | No new production app release or unsigned substitute published. Browser/native validation remains a release gate. |

## Android interface

Preserved the existing Home / Transactions / Accounts / Budget / More navigation and native storage implementation. Home now shows spendable balance with cash/reserve explanation, monthly income/expenses/savings, next unpaid EMI, quick income/expense/transfer actions, account summary, five recent movements and a short budget/spending summary. Month selection is device-local, as before.

All figures use existing `actual`, `savingsOverview`, `netWorthSnapshot`, `namedAccountBalances`, `installmentTasks`, `actualCategory` and budget functions. No financial formula, schema, identifier or receipt linkage was replaced. Balance validation errors are not converted to zero.

More adds explicit routes for reconciliation/transfers, provisions/reserves and net worth. Loans/EMI, Salary/PF, Forecast, Reports/Export/Import and Settings remain accessible. Backup/restore remains in Reports; sync/help/theme options remain in their existing screens. Web and Windows keep full analysis and balance breakdown expanded.

Cards use existing theme/palette tokens; touch actions have 44–48 px minimum heights. Existing native inset, keyboard, Android Back and system-bar code is retained. Material-inspired presentation does not establish full Material 3 conformance without device/UI review.

## Financial and synchronization verification

`npm run check` passed locally after rebasing and fixing the browser harness type error:

- 38 financial/regression test files, **221 tests**.
- ESLint; strict quality TypeScript; main TypeScript; shared bot-finance parity.
- Five dependency compatibility groups, including archive/Excel round trips and Capacitor template/web-copy/plugin synchronization.
- Existing owner/privacy/edit/report/EMI bot suite and new release-notification regression suite.
- Web build, bundle budget and manifest/hash verification.

Tests cover transfer neutrality, account openings/balances, historical cutoffs, savings month/year/lifetime, salary/PF, assets/liabilities/net worth, budgets, provision/reconciliation behavior, advance/partial EMI receipts, archive history, backup parsing, native persistence recovery, upgrade preservation and three-way merge conflicts. New native Home tests compare rendered amounts with the shared engine, assert no plan mutation, retain tablet activity and exclude future transactions from historical summaries.

These are synthetic code-level tests. They do not establish production transport delivery or physical-device behavior.

| Path or scenario | Algorithm/persistence evidence | End-to-end transport/device status |
| --- | --- | --- |
| Android → Web | Shared cloud model; merge/addition and stable-ID tests pass | Not tested with two signed-in devices |
| Web → Android | Same shared engine/model; merge tests pass | Not tested with installed APK |
| Windows → Android | Same serialization and calculations | Not tested with installed EXE/APK |
| Android → Windows | Same serialization and calculations | Not tested with installed EXE/APK |
| Offline Android → online | Persistence/recovery and offline merge tests pass | Real Android lifecycle/network transition pending |
| Concurrent additions | ID-based additions/retries tested | Disposable live backend test blocked |
| Delete versus edit | Conflict returned; explicit local/remote resolution tested | Real two-device conflict review pending |
| App update preserves records | Native upgrade/backup tests pass | Signed in-place APK/EXE upgrade pending |

The backend stores a whole plan. Client three-way merge is keyed by permanent IDs. The inspected production save RPC uses an authenticated owner, advisory/row locks, expected revision and mutation ID; stale revisions are rejected. The optional-field trigger preserves newer ledgers and links against older clients. Keep these controls: whole-plan synchronization still depends on compatible clients and explicit conflict review, and is not a record-level outbox.

Device-only filters/theme/date settings are intentionally omitted from cloud serialization. Compare results with identical filters; synchronization does not force every device into the same view.

## Production security inspection (read only)

Confirmed RLS enabled on all six public tracker/bot tables. `tracker_plans` has own-user read and restricted writer policies. The save RPC derives owner from authenticated claims, validates input/revisions and serializes writes. `tracker_preserve_optional_fields` exists as an enabled table trigger and checks IDs, relationships and optional-ledger preservation. No schema changes or financial-record writes were made for this audit.

Supabase advisors reported:

- Leaked-password protection disabled: review enabling it in Auth settings. [Guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Authenticated execution of the SECURITY DEFINER save RPC: inspected and intentional for restricted writes; retain owner checks, empty search path and grants. [Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Five bot tables have RLS with no public policies: expected deny-by-default behavior for server-only tables; do not add public policies merely to silence the informational notice.

`npm audit --json`: **0 known vulnerabilities**. Existing pinned dependency versions and lockfile retained. Bot Supabase import now pins the same 2.118.0 version as the app. A clean advisory result does not prove absence of unknown vulnerabilities.

## Data preservation and app identity

Android package remains `com.nandakumar.savingsexpensetracker`. Version remains 2.2.1 / code 20201; this PR is not a newly numbered production release. Next production build must increment version/code and use the existing authorized certificate. Do not distribute a rebuilt 20201 APK as a new update.

Windows app ID and installer identity are unchanged. Electron continues using the legacy `Savings and Expence Tracker` user-data directory; no data-path migration was introduced. No uninstall, cache clearing, production-plan replacement or schema migration was performed. Existing JSON envelope/backups, financial IDs and pending edits retain their format.

## Telegram behavior and limitations

Software preferences use the existing private owner/key marker table, independent of financial preferences; no database migration is needed. Existing `software-release:<tag>` markers are respected. Owner/private-chat checks and webhook/cron authentication are retained.

The release workflow calls the authenticated `updates` check only after confirming published assets. It needs repository secret `TRACKER_BOT_CRON_SECRET`, matching the existing function's cron secret. If absent, the workflow explicitly warns and existing scheduled alert checks remain the fallback. Presence/value of that secret was not inspected or assumed.

Tests include draft/prerelease rejection, wrong tags, missing files/digests, unsafe or foreign URLs, HTML escaping, repeated/concurrent checks, rate limits/API errors, separate preference persistence, explicit delivery rejection and ambiguous timeouts. No synthetic Telegram notification was sent to the real owner during local testing.

A Telegram timeout cannot establish whether a message arrived. Pending markers are intentionally retained after ambiguous outcomes or a crash. An operator must inspect delivery before removing a matching `software-pending:<tag>` marker. Never remove the delivered marker to force a resend. This favors avoiding duplicate messages over blindly retrying uncertain deliveries; automatic exactly-once delivery cannot be guaranteed without Telegram idempotency support.

Asset verification here means GitHub metadata and canonical URLs, not downloaded binary signature validation. Release CI must verify signatures/package/version and byte hashes. Discovery checks the first 100 repository releases and announces the newest complete tracker version; it does not replay historical announcements.

## Test/build status and remaining gates

| Check | Result |
| --- | --- |
| Dependency install | PASS: pinned `npm ci --ignore-scripts` |
| Financial/regression units | PASS: 221 tests / 38 files |
| ESLint / TypeScript / bundle integrity | PASS |
| Existing and new Telegram tests | PASS |
| Dependency/archive/Excel/Capacitor compatibility | PASS; full native compilation not implied |
| Dependency audit | PASS: zero reported vulnerabilities |
| Web build | PASS |
| Native web/Electron source build | PASS (`build:release`); not a Windows installer |
| Browser layout/accessibility/screenshots | BLOCKED: bundled browser download invalid; fallback official Chromium 131 starts but required socket operation is denied by environment. Suite interrupted after infrastructure failures; no UI-pass claim. |
| Before/after screenshots | NOT PRODUCED. Browser tests retain baseline desktop/phone captures and add native Home captures when a functioning browser is available. |
| Disposable PostgreSQL/RLS/RPC tests | BLOCKED: no loopback test database configured; guard made no requests |
| Disposable two-user Supabase security/recovery | BLOCKED: no disposable project/accounts supplied; production deliberately excluded |
| Signed Android APK | BLOCKED: existing signing key/password variables unavailable; no replacement key created |
| Windows installer | BLOCKED: Linux host lacks Windows/LOCALAPPDATA/Inno installer environment |
| Real Android/Windows upgrades, Google login and password recovery | NOT VERIFIED this run |

Browser regression tests are committed for 360, 393 and 768 px Android presentation and desktop analysis preservation. Existing responsive/theme/keyboard/auth/accessibility suites remain in CI. Before publication, run them on the PR commit; inspect all palettes and light/dark mode; capture before/after screenshots; test actual signed upgrades and real account round trips without using production financial records as fixtures.

No APK/EXE or app release is published by this implementation. Current public release: https://github.com/nandurpm/portfolio/releases/tag/tracker-v2.2.1 . PR and Edge Function deployment results are recorded in the completion message and subsequent verification notes.

## Changed files

- `.github/workflows/tracker-unified-release.yml`
- `tools/tracker-source/package.json`
- `tools/tracker-source/src/App.tsx`
- `tools/tracker-source/src/components/AndroidHome.tsx`
- `tools/tracker-source/src/components/android-home.css`
- `tools/tracker-source/src/components/MobileRecentActivity.tsx`
- `tools/tracker-source/src/pages/Dashboard.tsx`
- `tools/tracker-source/supabase/functions/savings-tracker-bot/index.ts`
- `tools/tracker-source/supabase/functions/savings-tracker-bot/release.test.cjs`
- `tools/tracker-source/tests/android-home.test.tsx`
- `tools/tracker-source/tests/browser/android-home.spec.ts`
- `tools/tracker-source/tests/browser/harness.tsx`
- This audit report.
