# Android home-screen widgets

## Use

Long-press the Android home screen, select Widgets, then Savings and Expense Tracker. Add Quick Entry or Monthly Summary. Launcher wording varies. Both resize horizontally and vertically. Quick Entry supplies transaction shortcuts; Monthly Summary focuses on totals, Refresh and Show/Hide without repeating those shortcuts. The app also explains setup under Settings.

Quick Entry opens the existing Income or Expense form. Review the fields and tap its existing save button. Widget intents contain an allowlisted action, no amount, account, credential or transaction payload. An authentication/linked-plan/recovery gate defers navigation until the app can safely open the form. Local-only plans retain the app's existing offline access. This release introduces no separate app-lock system; existing plan locking and Android's device/app access controls still apply.

Monthly Summary starts with amounts hidden; each instance has Show/Hide. It uses the current **local calendar month through today**, independent of the Dashboard's selected month and report cutoff. Income, expenses and savings come directly from `actual()` and the shared INR formatter. Opening balances and principal transfers do not become income. Existing engine rules for recorded loan payments, interest and fees apply.

Refresh intentionally opens the app. It recalculates from the locally available plan, and requests the existing sync path when access and connectivity permit. Offline totals say they are cached; pending sync is shown. Missing, unavailable, locked and out-of-plan data use placeholders, never invented zero amounts. Known empty months can display true ₹0.00 totals.

## Architecture and privacy

- `src/domain/widget-summary.ts`: shared calculation adapter/access policy, no alternate engine.
- `src/widgets/coordinator.ts`: ordered, per-process bridge updates and deferred navigation.
- `src/widgets/android-widgets.ts`: subscribes to plan changes, auth/sync changes, visibility, connectivity and the local clock. Web/Windows never start this native bridge.
- Native Java `WidgetStore`, `TrackerWidgets`, `QuickEntryWidget`, `MonthlySummaryWidget`: RemoteViews rendering and private display-only cache. No Compose/Glance/Kotlin or additional runtime dependency.
- `WidgetStore` stores formatted summary strings, time/month, privacy choices and opaque account identity in private preferences. It stores no credentials or transaction history. Android backup remains disabled. Encrypted session storage is unchanged.
- Native session removal/account switching immediately revokes previous-account snapshots. Owner checks plus process epochs and ordered sequences reject late updates. The next app process starts in a loading state until access is resolved. Rendering and cache mutations share a lock.
- Per-widget privacy defaults to hidden and persists across process restarts. Signed-out/locked states clear formatted amounts. Intents and diagnostic messages never contain financial values or session data.

The provider asks Android for a cache re-render no more often than every 30 minutes. Date, clock, timezone and package changes also request rendering. Android may defer these events to save battery. Native code never starts a hidden WebView or calls Supabase. A month mismatch suppresses old totals until the app generates a current summary. Caches older than six hours are labelled stale; last updated remains the actual local calculation time. Background rendering never changes that time.

Light/dark widget colours follow the Android system. Very small sizes or large fonts get an explicit enlarge/open-app message when the native text measurement cannot fit the totals. No amount is truncated to fit. The dedicated Quick Entry widget always supplies the two entry actions.

## Verification

Synthetic TypeScript tests cover shared totals, transfers/fees/principal, cutoff dates, rounding, edits/deletions, empty versus unavailable data, local year boundaries, auth isolation and one-time deferred navigation.

Native unit tests cover epoch/sequence ordering, current-month validation, stale clocks and navigation allowlisting. Android instrumentation tests cover private-cache recreation, logout/switch isolation, privacy persistence, compact/wide rendering, light/dark, large fonts, stale/missing/month-change states, and generated RemoteViews screenshots. The release pipeline installs the previous signed APK and upgrades it in an isolated Android 16 emulator before publication; a private non-financial fixture checks retained app storage. Existing system-bar instrumentation also runs.

Web/Windows production builds and browser regressions remain required. Browser Android presentation tests are simulations, not native widget checks. Emulator results do not establish physical launcher/OEM app-lock behaviour; test on the user's phone remains necessary.

## Reported 2.9.4 installer failure

The published APK (`c0179937426a45d94aac09c467189127bce2cd8843d0cd2242e7ec5468a7bb90`) passed ZIP CRC, API 34–36 v2 signature and 16 KB ZIP alignment checks. Its certificate matches earlier releases, its application ID is unchanged, and it contains no native `.so` libraries or split/test-only requirement. This is static evidence, not proof of successful installation on the reporting phone.

The screenshot does not expose the installer error code or the downloaded file's hash, so its root cause is unresolved. If the new official release still fails, preserve the installed app/data and collect Android PackageInstaller/PackageManager diagnostics and the exact downloaded file checksum. Do not replace signing keys, rename the app package, uninstall or reset records as a workaround.

References: [Android App Widgets](https://developer.android.com/develop/ui/views/appwidgets), [update scheduling](https://developer.android.com/develop/ui/views/appwidgets/advanced), [apksigner](https://developer.android.com/tools/apksigner), [zipalign](https://developer.android.com/tools/zipalign).
