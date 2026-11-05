# Savings & Expense Tracker 2.2.7

## Android Lavender theme correction
- Fix the restored 2.2.2 Android stylesheet incorrectly mapping **Lavender/violet** to dark teal/green.
- Preserve six distinct colour palettes (Lavender, Ocean, Emerald, Rose, Sunset, Midnight) in Light and Dark modes.
- Make Android navigation, dashboard hero, decorative borders, selected controls and quick-add button follow the selected palette, rather than fixed mint/teal colours.
- Restore neutral lavender-compatible backgrounds in Light and Dark modes, keeping green/red/orange reserved for semantic financial status.
- Preserve the previously restored Android layout, five-tab navigation, update notifications, native storage, device-specific preferences, Supabase synchronization, financial logic, Windows and Web experiences.

## Verification and safety
- Automated Android Chromium regressions cover selecting Lavender in Settings after Emerald, checking actual computed colours across all six palettes and both themes, and screenshot comparisons.
- Verify the native APK retains the same package identity and production signing certificate as the previous release before publishing.
- No changes to financial records or calculation logic. To update an installed app, sync/backup first, then install this APK over the old app without uninstalling.
