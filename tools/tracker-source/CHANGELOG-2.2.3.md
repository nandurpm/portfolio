# Savings & Expense Tracker 2.2.3

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
