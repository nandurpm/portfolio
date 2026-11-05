# Savings & Expense Tracker 2.2.4

## Automatic update notifications
- Android now registers an OS-managed periodic release checker when the app launches. It requests only public GitHub release metadata and never reads financial records or authentication tokens.
- If a newer verified production APK is published, Android can display a native system notification even while the app is closed, subject to notification permission, connectivity, and battery optimizations.
- Tapping the notification opens the official GitHub APK download in the external browser.
- Existing in-app update checks, manual Settings checks and 24-hour reminder snoozing remain available.
- Background work uses the Android WorkManager minimum periodic interval of 15 minutes. Execution is not guaranteed at an exact time, and it will not run after a user force-stops the app until reopened.

## Telegram notifications
- Supabase's existing owner-only software update schedule was moved from 15-minute to 5-minute checks to reduce release notification delays, retaining deduplication and isolated financial data.

## Upgrade and data safety
- Keep the existing Android package ID and production signing identity.
- No changes to Supabase financial data, plan schema, local account storage, EMI calculations, authentication or Windows installer identity.
- **One-time manual in-place installation is necessary** for existing v2.2.2 or earlier APKs. Old APKs cannot acquire this new background code remotely.
- Sync outstanding changes and export a full JSON backup before upgrading. Do not uninstall the existing app.
