# Savings & Expense Tracker 2.10.1

- Fix narrow Android widget amounts breaking across lines. Compact summaries now give each financial value the full width and fit it on one line, with a clear enlarge prompt when the complete value cannot fit.
- Stack Quick Entry and summary actions at narrow widths with large fonts so button labels stay readable and touch targets remain at least 48dp.
- Add native regression assertions for intact currency values, oversized-value fallback and large-font action labels. Release verification retains native widget screenshots before test cleanup.
- Includes all 2.10.0 Quick Entry and Monthly Summary widget features. Shared financial calculations, synchronization, the approved Android dashboard, application ID and signing identity are unchanged.

The phone-specific “package appears invalid” screenshot still requires device evidence if it persists. Release checks verify the signed APK, installation and in-place upgrade on Android 16 using isolated data. Never uninstall or clear financial data to troubleshoot without a verified backup.
