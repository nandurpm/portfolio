# Savings & Expense Tracker 2.2.9

## In-app Android updates — easy manual access
- Adds a visible **Settings → About → Check for updates** button for Android and Windows installed applications, restoring the manual update check that had disappeared from Settings.
- Android now uses the verified native in-app APK download and installation system introduced in 2.2.8: progress, checksum, app identity, signing certificate and Android system installer confirmation.
- The browser-only website does not display native APK installation controls.
- Adds browser regression tests confirming that the manual Settings button dispatches the update-check event on Android and Windows.
- Keeps the 2.2.2 Android interface, Lavender theme correction, all financial calculations, Supabase synchronization, package identity, and local records unchanged.

## Installing
To activate the new in-app updater in an existing 2.2.7 or earlier APK, install 2.2.9 once over the existing application without uninstalling. For future versions, go to Settings → About → Check for updates → Download & install in app; approve the installation in Android. If prompted, allow installs from this source, return to Tracker, and tap Install downloaded update.
