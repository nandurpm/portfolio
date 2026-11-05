# Savings & Expense Tracker 2.2.3

- Dedicated Android Home: shared balance, income, expenses, savings, accounts, EMI and recent activity, with five-tab navigation and advanced tools retained in More.
- Android Home loads independently of the complete desktop dashboard. Shared financial calculations and data formats are unchanged.
- Improve readability, theme contrast and viewport scrolling; preserve the current Web dashboard and expanded balance analysis.
- Telegram: stable tracker release filtering, validated download metadata, inline APK/Windows/notes buttons, independent software notification preferences, /updates and /changelog.
- Separate pending and delivered notification markers prevent overlapping announcements. Explicit rejection permits retries; ambiguous delivery requires review.
- Preserve package identity and local storage. Back up and synchronize before installing any update; use the existing signing identity and do not uninstall or clear data.

Release candidate only: see the audit report and PR #81 for actual test evidence and outstanding signed-build/device verification. No new APK/EXE was published by this audit.
## Fixed
- Android and Windows now allow the trusted GitHub release API through the packaged Content Security Policy.
- Update detection filters for published `tracker-v*` releases, validates the matching platform asset, and compares semantic versions correctly.
- Automatic checks run on application launch and resume, subject to a 30-minute throttle.
- Settings → About now includes **Check for updates** with clear manual success or failure feedback.
- **Remind me tomorrow** snoozes a specific release for 24 hours rather than permanently hiding it.
- Android APK download and release notes open in the external browser through a restricted native bridge.
- Windows update links open through a validated Electron IPC handler.

## Safety
- No changes to financial calculations, Supabase records, cloud synchronization or local data schema.
- Existing Android package ID and release signing configuration are retained.
- Existing Windows installer identity and data profile remain unchanged.
- Back up unsynced data before updating installed applications.
