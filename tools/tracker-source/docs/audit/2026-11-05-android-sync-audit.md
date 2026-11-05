# Savings & Expense Tracker — audit and implementation

Date: 05-Nov-2026 · [Draft PR #81](https://github.com/nandurpm/portfolio/pull/81)

## Result

Implemented a dedicated Android Home using the existing shared financial engine, retained five-tab navigation and advanced tools, repaired verified shared accessibility/layout defects, and deployed safer owner-only Telegram release notifications. No production financial records, Supabase schema, package identity or user-data location were changed.

**Release candidate: 2.2.3, Android version code 20203.** The initial latest release was 2.2.1; 2.2.2 was published during the audit, so this PR advances beyond that released version. [Published 2.2.2](https://github.com/nandurpm/portfolio/releases/tag/tracker-v2.2.2) contains APK, EXE, source ZIP and checksums, but does not contain this PR's Android Home. This audit has not published a new APK/EXE.

The implementation preserves main's incoming Android haptics/reminders and its newer Dashboard redesign through `90df8cc0e7b28f5d10ef2f0db277a922335d9ecf`. Full desktop analysis and balance breakdown remain expanded. Matching version labels alone did not establish matching source: main and the live website advanced after the published release tags.

## Verified findings and fixes

| Severity | Evidence | Fix / status |
| --- | --- | --- |
| High | Bot `sendReleaseUpdate` used repository `/releases/latest`; validation allowed notices without both production installers. | Scan releases; accept exact `tracker-vX.Y.Z` stable publications only; require canonical versioned APK/EXE/checksum URLs, uploaded state, positive sizes and SHA-256 metadata. |
| High | Delivered marker was inserted before Telegram acknowledgment. Error cleanup was unchecked; delivery failure could suppress later announcements. | Separate unique pending/delivered keys, checked database errors, post-reservation recheck and acknowledgment-before-delivered ordering. Explicit Telegram rejection can retry; ambiguous delivery remains pending for review. |
| Medium | Android rendered the full desktop Dashboard and repeated analytics despite existing mobile navigation. | Separate lazy-loaded Android Home; avoid preloading/computing desktop analysis on native startup. Advanced functions stay accessible. |
| Medium | Release notice had mojibake emojis, plain links, no meaningful release-note excerpt and no independent software preference. | UTF-8, escaped/bounded HTML, inline download/notes buttons, `/updates`, `/changelog`, separate Software Update Notifications setting. |
| Medium | CI reproduced white-on-white hero controls, low-contrast text, broken violet/dark accent tokens, small hero text, outer document scrolling and constrained desktop width. | Targeted CSS repairs; current main's dashboard design preserved. Browser regressions now pass on the integrated implementation. |
| Medium | Recent activity widget was width-only and did not support a historical cutoff for native Home. | Native/through-date options preserve Web behavior, retain Android tablet activity and exclude future records from the native historical summary. |
| Low | Electron-builder filename was hard-coded to 2.1.0. | Use `${version}`. Existing primary Inno output already derived its version. |
| Remaining | Signed artifact identity, installed-device upgrades and production cross-device transport were not exercised. | Release gates remain open; no unsigned replacement or new app release was published. |

## Android UI

Primary tabs remain **Home, Transactions, Accounts, Budget, More**.

Home contains spendable balance with recorded cash/reserve explanation, monthly income/expenses/savings, next unpaid EMI, account summary, recent movements, quick income/expense/transfer routes and a short spending/budget summary. Month selection remains device-local. The screen uses existing theme/palette variables and 44–48 px touch actions. Full desktop charts, repeated summaries and comparison tables are not loaded into native Home.

More exposes reconciliation/transfers, provisions/reserves and financial position explicitly. Existing Loans/EMI, Salary/PF, Forecast, Reports/Export/Import and Settings remain. Backup/restore, sync details, themes and help remain in their existing secondary screens. Existing keyboard/inset, Android Back, corruption recovery and system-bar implementations were retained.

Android Home uses `actual`, `savingsOverview`, `netWorthSnapshot`, `namedAccountBalances`, `installmentTasks`, `actualCategory` and the existing budget functions. There is no replacement financial engine. Validation failures are not silently turned into zero balances.

Synthetic before/after captures at **360, 393 and 768 px** are included in the delivered screenshot ZIP. “Before shared layout” means the current full Web dashboard rendered at the same viewport; “after” means the native Home branch in the browser harness. These are not installed-device screenshots and contain no real financial records. The archive identifies its exact source commit and CI run.

## Validation results

| Check | Result and scope |
| --- | --- |
| Financial/regression tests | **PASS: 221 tests / 38 files** |
| ESLint and TypeScript | **PASS**, including stricter quality configuration |
| Shared bot-finance parity | **PASS** |
| Existing bot functionality and new release tests | **PASS** |
| Web build / bundle budget / manifest hashes | **PASS** |
| Release-mode Web/Electron source bundle | **PASS locally for 2.2.3**; not a Windows installer |
| Dependency/security audit | **PASS: 0 reported vulnerabilities** |
| Browser UI/accessibility | **PASS: 51 tests** on integrated code, including native sizes, all six palettes/light-dark, desktop scrolling, auth boundary and synthetic recovery |
| PostgreSQL/RLS/RPC | **PASS in GitHub CI** against disposable PostgreSQL |
| Disposable Supabase / email recovery | **PASS in GitHub CI**, two test accounts; no production test writes |
| Native compatibility | **PASS in CI: 8 groups**, including disposable Android template debug compilation, unsigned Windows Electron directory packaging and ASAR runtime loading |
| Signed 2.2.3 APK | **NOT BUILT**: authorized signing credentials unavailable locally; existing release identity must be used |
| 2.2.3 Windows installer | **NOT BUILT**: local Linux host lacks Windows/LOCALAPPDATA/Inno environment |
| Physical-device lifecycle, signed upgrades and Google OAuth | **NOT VERIFIED** |
| Native PDF printing/export dialogs | **NOT VERIFIED on devices** |

Evidence: [Integrated implementation CI](https://github.com/nandurpm/portfolio/actions/runs/41968054680), head `45b35ed1774bfdd4d32ebf2cca59bbc05af3940e`, passed quality, database, local-supabase and native-dependencies jobs. Its browser run passed all 51 tests. Initial browser runs found 23 failures, then six; those failures drove the repairs rather than being excluded from testing.

[2.2.3 candidate CI](https://github.com/nandurpm/portfolio/actions/runs/41968555020), head `0052266fd9d655a8e709d57e9e0a108ee876bda8`: **PASS: quality, database, local-supabase and native-dependencies, including 221 tests / 38 files and all 51 browser tests**. This differs from the fully tested implementation only in package/lock/harness version labels and the candidate changelog.

The local browser could not launch because a required socket operation was denied. Local database/security scripts correctly blocked when no disposable backend was configured. CI supplied working browsers and disposable backends, so the CI results above supersede those local infrastructure limitations. Generated native template/packaging tests do not prove the actual signed application or installer works on a device.

## Financial calculation audit

Passing coverage includes:

- Income/expenses, planned versus recorded totals, opening balances and month/year/lifetime savings.
- Named accounts, account openings, transfer neutrality, credit/debt and asset/net-worth integration.
- Historical cutoffs, salary/PF, monthly budgets/overrides, provisions and bank/cash reconciliation.
- Loan principal allocations, partial and advance EMI receipts, contractual dates versus planned/payment dates, archived receipts and historical debt totals.
- Editing, deletion, undo, stable IDs and JSON backup/save/restore preservation.
- CSV/XLSX export calculations and archive/Excel round trips. Device PDF output remains a separate manual check.

Examples of existing evidence: `ledger-integration.test.ts` checks that transfers do not change total cash/net worth and that assigned entries do not post a second expense. `advance-emi.test.ts` checks installment receipts and cash-month timing without duplicate payments. `native-upgrade.test.ts` preserves reserves/reconciliation through native JSON backup/restore. New `android-home.test.tsx` checks rendered values against shared calculations, no render-time plan mutation, tablet activity and historical filtering.

No production account totals were fabricated or changed for this audit.

## Synchronization and data preservation

The application synchronizes a **whole plan**, with ID-based three-way merge on the client. Inspected production `tracker_save_plan` derives an authenticated owner, serializes writes with advisory/row locks, validates revisions and uses mutation IDs. `tracker_preserve_optional_fields` is present and checks modern ledgers, IDs and receipt relationships. Client conflict review, cache ownership checks and corruption safeguards are retained.

| Scenario | Automated evidence | Remaining real-device check |
| --- | --- | --- |
| Android → Web / Web → Android | Shared model/engine; merge and stable-ID tests; disposable RPC tests pass | Signed-in installed APK and browser round trip |
| Windows → Android / Android → Windows | Same serialization/calculations; native persistence tests pass | Installed EXE/APK round trip |
| Offline Android → online | Offline additions, recovery and merge tests pass | Real suspension/restart/network transition |
| Concurrent changes | Addition/retry and delete-versus-edit conflict tests; revision/RPC tests pass | Two actual device UIs resolving conflicts |
| Deletion propagation | ID merge and explicit conflict resolution tested | Confirm no stale installed client resurrects a production-like synthetic record |
| Upgrade preservation | Synthetic native upgrade/backup tests pass | Signed in-place APK/EXE upgrade with backup/hash comparison |

These are shared-code and disposable-backend results, not a claim that three installed clients were tested together. Whole-plan synchronization still depends on compatible clients, revision enforcement and explicit conflict review. It is not a record-level durable outbox. Device-only theme, date and range filters intentionally do not synchronize; compare identical filters when checking totals.

Android ID stays `com.nandakumar.savingsexpensetracker`; the candidate advances to code **20203** after published 2.2.2 (source-derived code 20202; the released binary was not independently inspected). The installed certificate still needs comparison with the signed candidate APK. No key was invented. Windows app/installer identity is unchanged; Electron retains the legacy **Savings and Expence Tracker** user-data directory. JSON format, record IDs, receipt links, pending edits and financial fields are unchanged. No uninstall, data clearing, schema migration or production-plan replacement occurred.

## Production security inspection

Read-only inspection confirmed RLS enabled on all six public tracker/bot tables, own-user plan read policies, restricted writer policies, the authenticated save RPC and the optional-field preservation trigger.

Advisors reported leaked-password protection disabled: review [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The authenticated SECURITY DEFINER save RPC is intentional for restricted writes and includes owner checks and an empty search path; retain those safeguards. Five private bot tables have RLS without public policies, which is expected deny-by-default behavior, not a reason to expose them.

Pinned app dependencies/lockfile are retained; the bot Supabase import now pins 2.118.0. Zero known dependency advisories does not establish absence of unknown vulnerabilities.

## Telegram deployment and release verification

The bot is deployed as Edge Function **version 17**, pinned to `081445d7cfafa1b181a91de880c3fc92cb0d6b55` using the existing pinned-source deployment approach. Fresh inspection confirmed its import and existing `verify_jwt=false` configuration; webhook/cron secrets and owner/private-chat checks still authenticate requests. Health returns `software: release-notifications-v2`. Unauthenticated POST returns **HTTP 403**. No real notification was sent as a local test.

Software preference and notification markers reuse the private owner/key table, independently of financial preferences, without a migration. The message contains actual release-note excerpts, release date, safe canonical APK/EXE/notes buttons, backup instructions and no unsupported installed-version claim.

Release workflow integration runs after published asset checks and requires repository secret `TRACKER_BOT_CRON_SECRET` to match the existing cron secret. If missing, the workflow warns; the independent 15-minute software schedule remains the fallback. Secret presence/value was not inspected or assumed. A separate `savings-bot-software-updates` cron job is now active every 15 minutes. It reuses the existing authenticated tracker invocation, changing only the payload from `alerts` to `updates`; query verification confirmed this. Existing daily, monthly, financial-alert, greeting and backup schedules were retained. Its first scheduled delivery has not yet been observed. No financial records or schema were changed.

Tests cover API errors/rate limits, wrong tags, drafts/prereleases, missing files/digests, unsafe URLs, escaping, independent preferences, repeated/concurrent checks, rejection retries and ambiguous delivery. Published 2.2.2 metadata has the required uploaded APK/EXE/checksum names, positive sizes and SHA-256 digests. This is metadata validation, not a downloaded binary signature check.

Limitations: discovery checks the first 100 repository releases and selects the newest complete tracker version; historical announcements are not replayed. Telegram provides no idempotency token for sending messages. A timeout/crash can leave uncertain delivery, so pending markers are retained for operator review instead of risking duplicates. Inspect delivery before clearing a matching `software-pending:<tag>` marker; never remove a delivered marker to force a resend.

## Remaining release gates

1. Use existing authorized Android signing identity; verify certificate, package, version code and embedded source provenance against the intended candidate commit.
2. Build/verify the Windows installer in the existing Windows release workflow; check installation identity and user-data preservation.
3. Test signed in-place upgrades, Android lifecycle/keyboard/cutouts and device export dialogs without uninstalling or clearing data.
4. Test synthetic cross-device creation/edit/deletion/offline/conflict flows using the same authenticated test account. Verify native Google login separately.
5. Confirm release-callback secret configuration and observe the first scheduled Telegram delivery, including the independent preference.
6. Review disabled leaked-password protection. No production Auth settings were changed automatically.

## Changed files

- `.github/workflows/tracker-unified-release.yml`
- `tools/tracker-source/package.json`, `package-lock.json`, `CHANGELOG-2.2.3.md`
- `tools/tracker-source/src/App.tsx`
- `tools/tracker-source/src/components/AndroidHome.tsx`, `android-home.css`, `MobileRecentActivity.tsx`
- `tools/tracker-source/src/pages/Dashboard.tsx`
- `tools/tracker-source/src/styles.css`, `src/cloud/web-signin.css`
- `tools/tracker-source/supabase/functions/savings-tracker-bot/index.ts`, `release.test.cjs`
- `tools/tracker-source/tests/android-home.test.tsx`
- `tools/tracker-source/tests/browser/android-home.spec.ts`, `harness.tsx`, `login-ui.spec.ts`
- This audit report.
