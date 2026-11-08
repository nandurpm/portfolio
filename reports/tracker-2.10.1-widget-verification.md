# Savings & Expense Tracker 2.10.1 — implementation and release verification

Date: 8 November 2026 (India). Release source: `88e16b0d4b61bbfccb7458b06c1e042ee0dc12d4`.

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
| Medium | Native screenshots exposed intact views with unreadable currency/word wrapping at narrow widths and large fonts. Bounds tests alone missed this. | Full-width compact values, one-line amount sizing with explicit enlarge fallback, stacked narrow large-font controls; stronger native assertions and retained screenshots in 2.10.1. |
| Medium | Consuming an action mutated the activity launch intent and disrupted lifecycle tracking. | Separate one-shot pending action, explicit cold initialization, original intent preserved; cold/warm form tests pass. |
| Medium | Debug bridge logging could include sensitive payloads. | `loggingBehavior: 'none'` in all native build modes; instrumentation checks it. |
| Medium | The first unpublished 2.10.1 emulator run found a full-width large-font quick-entry row still arranged horizontally. | Stack both buttons vertically; keep strict named bounds/readability assertions. Publication was blocked by the failing test. |
| Low | Repeated sync-status events traversed the ledger and rewrote identical widget payloads. | Reuse results for unchanged plans and skip identical bridge writes; regression test passes. |
| Medium, CI | Emulator setup hid failures and log collection could wait indefinitely; adbd root/unroot reconnects sometimes returned `closed`. | Isolated/validated AVD, bounded boot/evidence collection, startup diagnostics, verified shell UID after reconnect; signed upgrade test now passes. |
| Unresolved, device-specific | Screenshot reports an invalid package. The published previous APK passed signature/CRC/alignment checks. | 2.9.4 → 2.10.0 installed/upgraded in Android 16 with an isolated retained private-file marker. The final 2.10.1 pipeline passed an in-place upgrade from 2.10.0 with that private marker retained. The reporting phone/file was not inspected; its exact installer rejection remains unconfirmed. |

## Tests and actual results

- 249 TypeScript/unit tests; lint; strict TypeScript; dependency/export compatibility; bot financial compatibility; Web and native production builds: passed.
- 69 browser regressions, including Android widths 320/360/390/412/480, themes, navigation and cross-platform financial fixtures: passed. Android/Windows presentation branches in these tests are browser simulations.
- Disposable database/RLS/authentication/password-recovery checks: passed; no production financial records were used or modified.
- 8 Java unit tests: passed.
- Android 16 instrumentation: 9 listed tests, 0 failures, 1 intentionally skipped process-phase test. That case then passed separately in two processes (seed/read). Eight ordinary tests passed, including system-bar clearance, provider binding/resizing, account isolation, cold/warm form navigation, stale/month-change states, minimum touch targets, intact financial values, oversized-value fallback and layout bounds.
- Summary renderer matrix: 2 system appearances × 3 font scales × 4 widths = 24 variants. Quick Entry minimum-size checks cover 3 font scales. All 27 PNGs were retained and independently counted; representative compact/light, wide/dark and 200% font captures were visually reviewed. Rupee values remain intact and large-font buttons stay readable. These are native renderer captures, not physical launcher screenshots.
- Signed APK ZIP integrity, API 34–36 signature validation and ZIP alignment: passed. Certificate matches tracker-v2.10.0, maintaining the previously checked 2.9.4 signing chain. Application ID remains `com.nandakumar.savingsexpensetracker`; version code is 21001.
- The actual public update checker accepts 2.10.1 for installed Android/Windows 2.10.0, including the trusted APK digest; installed 2.10.1 correctly gets no further update. This verifies public metadata eligibility, not the physical phone popup/download/installer flow.
- Published APK, EXE and Source ZIP downloads were checked against release digests/checksums. The Source ZIP commit also matches the final source. Extracted APK/EXE payloads and all 51 live Web files passed their manifest checks.

## Cross-platform parity

The Web CI payload (identical to all 51 checked live files) and the downloaded/extracted APK and EXE payloads pass `scripts/verify-financial-parity.mjs` together, including checksums of every listed payload file.

| Field | Identical value across all three |
|---|---|
| Version | `2.10.1` |
| Source commit | `88e16b0d4b61bbfccb7458b06c1e042ee0dc12d4` |
| Tracker source tree | `76ee6b090a7f3f08e485a8b0ec1c983cc7454bda` |
| Financial logic SHA-256 | `ef00e7fcaea73d09c99bf844777990557045e0aa5e226896bb4e9df96d4f2345` |
| Data-model SHA-256 | `9e05f646c1a6a7ae8e51c12263b8231016938bcfaa81445c07c3a7ec5b6c2852` |

This establishes identical shared financial implementation and data model in the shipped payloads. Displayed figures require the same account, synced records and reporting scope; widgets explicitly use this calendar month through today and can show older cached data while the app is closed.

## Changed paths and review history

Paths below are relative to `tools/tracker-source/` unless prefixed otherwise.

- `tools/tracker-source/src/domain/widget-summary.ts`, `src/widgets/`, `src/native-tracker.ts`.
- `src/App.tsx`, `src/pages/Entries.tsx`, `src/pages/Settings.tsx`.
- `android/app/src/main/java/com/nandakumar/savingsexpensetracker/`: widget providers/cache/policy/renderer plus activity/plugin integration.
- `android/app/src/main/res/`: widget layouts, colours, backgrounds and provider metadata; Android manifest/build configuration.
- `tests/widget-summary.test.ts`, native Java unit and instrumentation tests.
- Package version/lock, `CHANGELOG-2.10.0.md` / `CHANGELOG-2.10.1.md`, `docs/ANDROID-WIDGETS.md`; tracker quality/build/release workflows.

Merged reviews: [#96](https://github.com/nandurpm/portfolio/pull/96), [#97](https://github.com/nandurpm/portfolio/pull/97), [#98](https://github.com/nandurpm/portfolio/pull/98), [#99](https://github.com/nandurpm/portfolio/pull/99), [#101](https://github.com/nandurpm/portfolio/pull/101), [#102](https://github.com/nandurpm/portfolio/pull/102). Full changed-file lists are in those PRs. A narrowly guarded temporary recovery workflow stopped the failed unpublished test run and was removed before merging.

## Delivery and remaining verification

- [Website](https://nandakumarm.dpdns.org/track/): deployed and all 51 files verified against the trusted GitHub manifest.
- [Release and notes](https://github.com/nandurpm/portfolio/releases/tag/tracker-v2.10.1).
- [Signed APK](https://github.com/nandurpm/portfolio/releases/download/tracker-v2.10.1/Savings-and-Expense-Tracker-2.10.1.apk).
- [Windows EXE](https://github.com/nandurpm/portfolio/releases/download/tracker-v2.10.1/Savings-and-Expense-Tracker-Setup-2.10.1.exe).
- [Source ZIP](https://github.com/nandurpm/portfolio/releases/download/tracker-v2.10.1/Savings-and-Expense-Tracker-2.10.1-Source.zip).
- [Successful release/test workflow](https://github.com/nandurpm/portfolio/actions/runs/42445784786).
- [Native test reports and 27 renderer PNGs](https://github.com/nandurpm/portfolio/actions/runs/42445784786/artifacts/13603672792) (CI retention: 30 days).
- [Final PR quality checks](https://github.com/nandurpm/portfolio/actions/runs/42445356614).

Physical phone/OEM launcher resizing, OEM app-lock behavior, the reporting phone's installer error and update popup/download/installer flow, and installation/execution on a physical Windows system remain unverified. The Windows package was built and statically checked; browser Windows simulation and Linux Electron smoke checks do not establish Windows runtime behavior. Windows Authenticode signing is not configured; only the Android APK is claimed as signed.

Published on 8 November 2026 at 09:49 India time.

| Public file | SHA-256 |
|---|---|
| APK | `bd32ef2fb36af5a9a460983ca6572ad855f2279fddaa02400e96165dea1ecbfc` |
| Windows EXE | `573d8b056754ce298d52f29fdac339f2872d9bf7065506c2f295a56eff84adcf` |
| Source ZIP | `f9a9af6e890690b85370977f013a5082ea76dae7539186ed466fa3e7e5eaa3fc` |

The immediate Telegram release trigger still lacks GitHub secret `TRACKER_BOT_CRON_SECRET`; the release workflow reported its existing scheduled fallback. Telegram delivery was not confirmed. No signing credential was changed or exposed.

Install the new APK over the existing app. Do not uninstall or clear financial data to troubleshoot the old installer screenshot. Add widgets by long-pressing the Android home screen, choosing Widgets, then Savings and Expense Tracker.
