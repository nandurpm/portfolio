# Savings & Expense Tracker 2.10.0 — implementation and release verification

Date: 8 November 2026 (India). Release source: `205f94577c4c2608a9f56555584f898494b78d51`.

## Delivered

- Native Android RemoteViews Quick Entry and Monthly Summary widgets; no Glance/Compose runtime dependency.
- Quick Entry opens a fresh Income or Expense form through the existing access gate, dismissing the previous chooser/editor. Navigation never submits a transaction.
- Monthly Summary uses the shared `actual()` calculations and INR formatter for the current local calendar month through today. Internal transfer principal and opening balances do not become income. Existing fee/interest/payment definitions remain unchanged.
- Private, account-bound formatted caches; hidden amounts by default; per-widget Show/Hide; last updated time; refresh opens the app. Explicit unavailable, locked, signed-out, offline, out-of-plan, stale and month-change states.
- Updates follow data/auth/sync changes. Unchanged immutable plans reuse computed results. Android's periodic rendering reads cached data; there is no background financial engine or continuous Supabase polling by widgets.
- Existing Android redesign, package ID, signing certificate, financial model and production records are preserved.

## Findings and fixes

| Severity | Finding / cause | Fix / evidence |
|---|---|---|
| Medium | Existing Add chooser or entry editor could cover a widget's new form. | Dismiss transient dialogs, clear the new draft, focus after cleanup; warm-intent test starts with the chooser open. |
| Medium | Native button defaults and estimated text sizes could clip controls or overflow a summary row. | Explicit multiline controls, no baseline alignment, actual Android layout measurement before adding optional rows; native bounds tests pass. |
| Medium | Consuming an action mutated the activity launch intent and disrupted lifecycle tracking. | Separate one-shot pending action, explicit cold initialization, original intent preserved; cold/warm form tests pass. |
| Medium | Debug bridge logging could include sensitive payloads. | `loggingBehavior: 'none'` in all native build modes; instrumentation checks it. |
| Low | Repeated sync-status events traversed the ledger and rewrote identical widget payloads. | Reuse results for unchanged plans and skip identical bridge writes; regression test passes. |
| Medium, CI | Emulator setup hid failures and log collection could wait indefinitely; adbd root/unroot reconnects sometimes returned `closed`. | Isolated/validated AVD, bounded boot/evidence collection, startup diagnostics, verified shell UID after reconnect; signed upgrade test now passes. |
| Unresolved, device-specific | Screenshot reports an invalid package. The published previous APK passed signature/CRC/alignment checks. | Both 2.9.4 and 2.10.0 installed in an Android 16 emulator, and the upgrade retained an isolated private-file marker. The reporting phone/file was not inspected; its exact installer rejection remains unconfirmed. |

## Tests and actual results

- 249 TypeScript/unit tests; lint; strict TypeScript; dependency/export compatibility; bot financial compatibility; Web and native production builds: passed.
- 69 browser regressions, including Android widths 320/360/390/412/480, themes, navigation and cross-platform financial fixtures: passed. Android/Windows presentation branches in these tests are browser simulations.
- Disposable database/RLS/authentication/password-recovery checks: passed; no production financial records were used or modified.
- 8 Java unit tests: passed.
- Android 16 instrumentation: 8 listed tests, 0 failures, 1 intentionally skipped process-phase test. That case then passed separately in two processes (seed/read). Seven ordinary tests passed, including system-bar clearance, provider binding/resizing, account isolation, cold/warm form navigation, stale/month-change states, minimum touch targets and layout bounds.
- Summary renderer matrix: 2 system appearances × 3 font scales × 4 widths = 24 variants. Quick Entry minimum-size checks cover 3 font scales.
- Signed APK ZIP integrity, API 34–36 signature validation and ZIP alignment: passed. Certificate matches tracker-v2.9.4. Application ID remains `com.nandakumar.savingsexpensetracker`; version code is 21000.
- Published APK, EXE and Source ZIP downloads were checked against release digests/checksums. Extracted APK/EXE payloads and all 51 live Web files passed their manifest checks.

## Cross-platform parity

The downloaded Web, APK and EXE payloads pass `scripts/verify-financial-parity.mjs` together, including checksums of every listed payload file.

| Field | Identical value across all three |
|---|---|
| Version | `2.10.0` |
| Source commit | `205f94577c4c2608a9f56555584f898494b78d51` |
| Tracker source tree | `9e98a8b498c0586b0c074f17a4db5527962ebb5c` |
| Financial logic SHA-256 | `ef00e7fcaea73d09c99bf844777990557045e0aa5e226896bb4e9df96d4f2345` |
| Data-model SHA-256 | `9e05f646c1a6a7ae8e51c12263b8231016938bcfaa81445c07c3a7ec5b6c2852` |

This establishes identical shared financial implementation and data model in the shipped payloads. Displayed figures require the same account, synced records and reporting scope; widgets explicitly use this calendar month through today and can show older cached data while the app is closed.

## Changed paths and review history

- `tools/tracker-source/src/domain/widget-summary.ts`, `src/widgets/`, `src/native-tracker.ts`.
- `src/App.tsx`, `src/pages/Entries.tsx`, `src/pages/Settings.tsx`.
- `android/app/src/main/java/com/nandakumar/savingsexpensetracker/`: widget providers/cache/policy/renderer plus activity/plugin integration.
- `android/app/src/main/res/`: widget layouts, colours, backgrounds and provider metadata; Android manifest/build configuration.
- `tests/widget-summary.test.ts`, native Java unit and instrumentation tests.
- Package version/lock, `CHANGELOG-2.10.0.md`, `docs/ANDROID-WIDGETS.md`; tracker quality/build/release workflows.

Merged reviews: [#96](https://github.com/nandurpm/portfolio/pull/96), [#97](https://github.com/nandurpm/portfolio/pull/97), [#98](https://github.com/nandurpm/portfolio/pull/98), [#99](https://github.com/nandurpm/portfolio/pull/99). Full changed-file lists are in those PRs. A narrowly guarded temporary recovery workflow stopped the failed unpublished test run and was removed before merging.

## Delivery and remaining verification

- [Website](https://nandakumarm.dpdns.org/track/): deployed and all 51 files verified against the trusted GitHub manifest.
- [Release and notes](https://github.com/nandurpm/portfolio/releases/tag/tracker-v2.10.0).
- [Signed APK](https://github.com/nandurpm/portfolio/releases/download/tracker-v2.10.0/Savings-and-Expense-Tracker-2.10.0.apk).
- [Windows EXE](https://github.com/nandurpm/portfolio/releases/download/tracker-v2.10.0/Savings-and-Expense-Tracker-Setup-2.10.0.exe).
- [Successful release/test workflow](https://github.com/nandurpm/portfolio/actions/runs/42427079089).

Physical phone/OEM launcher behavior, the reporting phone's installer error, and installation/execution on a physical Windows system remain unverified. The Windows package was built and statically checked; browser Windows simulation and Linux Electron smoke checks do not establish Windows runtime behavior.

The immediate Telegram release trigger still lacks GitHub secret `TRACKER_BOT_CRON_SECRET`; the release workflow reported its existing scheduled fallback. Telegram delivery was not confirmed. No signing credential was changed or exposed.

Install the new APK over the existing app. Do not uninstall or clear financial data to troubleshoot the old installer screenshot. Add widgets by long-pressing the Android home screen, choosing Widgets, then Savings and Expense Tracker.
