# Savings & Expense Tracker 2.2.8

## Android: download and install future updates inside the app
- Updates now display **Download & install in app**, a progress bar and clear installation status.
- Android downloads only an official release APK from the trusted GitHub tracker release route, into a private tracker-updates directory.
- Before invoking the system installer, the APK must pass GitHub's published SHA-256 checksum, package ID, version progression and signing-certificate comparison with the installed app.
- APK is shared only to the Android installer using a read-only, narrowly scoped non-exported FileProvider. Financial records and authentication files are never shared.
- If Android requires **Allow installs from this source**, the app opens relevant system settings and retains the verified file. Return to Tracker and select **Install downloaded update**.
- Android still requires user approval for installation. No silent installation, uninstallation, app data clearing or production database changes.
- Background software update notifications now open Tracker rather than an external GitHub browser download. Windows keeps its external installer workflow.
- One-time manual installation of 2.2.8 is required; older installed APKs do not contain this new native capability.

## Preserved
- Restored Android layout, Lavender theme fix, financial calculations, EMIs, account reconciliation and Supabase synchronization.
- Existing package ID and production signing certificate, with release workflow signer continuity.
- Windows app identity and all existing financial storage.

## Installation
1. Sync pending edits and export a JSON backup.
2. Install the 2.2.8 APK over the existing app, without uninstalling.
3. For future versions tap Settings → Check for updates or use the automatic update popup.
4. Tap **Download & install in app**; approve the Android installation.
5. If install-source permission is required, allow installs from Tracker, return to the app and tap **Install downloaded update**.

## Verification
CI tests and native compilation validate the new code, but installation on a physical Android 16 device requires independent verification.
