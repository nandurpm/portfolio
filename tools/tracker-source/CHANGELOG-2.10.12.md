# Savings and Expense Tracker 2.10.12

Android interface redesign, packaged with the existing shared Windows application.

## Android

- Four main destinations: **Home, Activity, Accounts and More**.
- Compact Home with the existing cash and monthly totals, a green **Add** button, recent activity and expandable full analysis. Future reporting dates remain labelled as forecasts.
- Quick actions for expense, income, transfer, loan payment and backup.
- Combined Activity history with search and date/account/type filters.
- Scrollable account and transfer sheets, same-account transfer prevention, optional fees and the existing validated save/reversal/history workflows.
- Grouped secondary tools, reconciliation, reports, budgets, loans/EMI, Salary/PF, backup/restore, import/export, cloud sync, settings and help. Keyboard guidance remains available.
- Light/dark styling, aligned summary cards, larger touch targets and responsive phone/tablet layouts.

## Compatibility

- Financial calculations, storage/data models, authentication, synchronization and backup formats are unchanged.
- Android application ID and signing identity are preserved. No production data migration or OTA updater is introduced.
- Windows retains its existing interface and Settings → About → Check for updates option, with version 2.10.12 for consistent release detection.
- Bot update notifications now require an explicit manual-release opt-in; publication does not automatically trigger them.

## Verification

The merged redesign passed 290 unit tests and 86 browser tests, Android compilation/native test tasks, Windows installer packaging and disposable backend checks. Release-specific checks run again for this version, including signed-APK certificate continuity, isolated emulator installation/upgrade and widget instrumentation before publication. Browser simulation and emulator checks do not establish full physical-device correctness; physical Android keyboard/TalkBack and installed Windows runtime verification remain outstanding.

## Updating

Synchronize pending changes and export a full JSON backup before upgrading. Install the APK or Windows installer over the existing app; do not uninstall first. Android: More → Settings → About → Check for updates, or download the APK from this release. Windows: Settings → About → Check for updates, or use the EXE from this release.
