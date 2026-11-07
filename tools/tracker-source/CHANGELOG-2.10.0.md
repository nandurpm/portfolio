# Savings & Expense Tracker 2.10.0

- Android home-screen **Quick Entry** widget opens Add Expense or Add Income in the existing app form. Nothing is saved until you complete and submit that form.
- Resizable **Monthly Summary** widget shows the current calendar month's recorded income received, expenses paid and savings through today. It uses the same financial engine as Web, Windows and Android; internal transfers remain outside income and expenses.
- Amounts are hidden initially. Each summary widget has Show/Hide, last updated time and Refresh. Refresh opens the app to update local figures and synchronize when possible.
- Native bridge payload logging is disabled in all build modes. Unchanged sync events reuse cached results to avoid extra ledger calculations and writes; a new quick-entry action opens a fresh empty draft.
- Widgets support light/dark system appearance, offline cached summaries and explicit signed-out, locked, missing-data, stale-data and month-change states. Old-account display data is cleared on logout/account switching.
- Widget layouts adapt to available space and font size; enlarge a small widget when prompted. Quick-entry buttons also appear in a summary when space permits.
- Release checks now verify signed ZIP integrity/alignment, Android 14–16 signatures, and Android 16 installation/upgrade with isolated test data. Widget cache, privacy and native layout regression tests are included.

The application ID and Android signing identity are preserved. No production financial records or database schema are changed. The previous APK passed static signature/package checks; the reported phone installation rejection still needs device-specific evidence if it persists. Do not uninstall or clear app data to troubleshoot without a verified backup.

Background widgets display cached local summaries. Android controls update scheduling; they do not continuously access Supabase or calculate new financial data in the background. Keep the app open to synchronize, or tap Refresh.
