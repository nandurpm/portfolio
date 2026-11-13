# Savings and Expense Tracker 2.10.10

Android and Windows performance maintenance release containing the approved PR #128 changes.

## Performance improvements

- Remove repeated cumulative-budget calculations and repeated entry-date validation from monthly progress reports.
- Preserve original transaction aggregation order, fractional-paise rounding, transfers, reversals, refunds and PF cash movements.
- Avoid rerendering the selected screen for unrelated menu/save-status updates, while refreshing on plan edits and the minute clock, including date rollover.
- Fetch independent startup modules concurrently while retaining native bridge, OAuth initialization and data-validation safeguards.
- Preload common tabs concurrently and defer optional Android charts until near the viewport.

## Verification

The performance PR passed 279 automated tests, 81 Chromium browser cases, Windows installer compilation, Android compilation/native unit tests and disposable backend checks. The 288-month/1,000-entry paired synthetic server benchmark improved from 3,102 ms to 65 ms with exact progress-output parity. Repeated synthetic Android-shell tab switches measured 388–831 ms. These figures are not physical-device performance guarantees. Signing continuity, actual Android installation/upgrade and emulator tests are gated by the release workflow.

## Installation and updates

Both the Android APK and Windows x64 EXE are included. Existing application IDs, Android production signing identity, financial rules and storage formats are preserved; no browser-engine replacement is required.

- Android: check for updates in Settings, download the verified APK inside Tracker, then approve installation through Android.
- Windows: Settings → About → Check for updates. Download update opens the official EXE externally; run it over the existing installation.
- Export a full JSON backup and sync pending changes before updating. Do not uninstall the existing app.
