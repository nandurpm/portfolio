# Windows and Android builds

This is the existing Electron/Capacitor tracker restored alongside the verified shared web implementation. Native storage, OAuth, app IDs, legacy Windows profile path, Android insets, secure credential stores and backup bridges are retained. Release defaults contain no private financial records.

## Requirements

- Node **24.19.0**, npm lockfile (`npm ci`).
- Windows x64: Inno Setup 6, default `%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe`; alternatively set `INNO_COMPILER`.
- Android: JDK 21, SDK platform 36, Build Tools 36.0.0, Gradle 8.14.3. Set `JAVA_HOME`, `ANDROID_HOME` and optionally `GRADLE_USER_HOME`. Minimum supported Android is 14/API 34, as in the previous application.
- Build from this directory in the Git checkout. The build records its exact commit, source tree, dirty state, lockfile hash and Node version.

## Check and build

```powershell
npm ci
npm test
npm run lint
npm run typecheck:quality
npm audit
npm run build:release
npm run dist:win
```

Windows installer: `release/installers/Savings-and-Expense-Tracker-Setup.exe`. No updater or release publication is configured. Without an authorized Windows signing certificate, the installer is **not Authenticode signed**.

Android release signing uses the existing private release identity. Supply `TRACKER_KEYSTORE_PATH` and `TRACKER_KEYSTORE_PASSWORD` through your private environment, never source files or committed configuration. Alias remains `tracker`.

```powershell
npm run android:release
```

APK: `android/app/build/outputs/apk/release/app-release.apk`. `versionCode` derives from package version: major × 10000 + minor × 100 + patch. Do not replace a missing key with a new one for an in-place update.

For browser regression checks with an installed Chrome, optionally set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, then run `npm run test:browser`. These harness checks are not proof of real native provider authentication.

## Data, upgrade and rollback

1. Before installation, export a **full JSON backup** from Reports and retain the original installer/APK privately. Confirm pending edits have synced. Never put financial backups or signing credentials in this source tree.
2. Compare APK package ID and certificate fingerprint to the installed app. Update in place only when both match. Never uninstall, clear app storage or reset the plan to resolve an installation failure.
3. Windows uses the same installer AppId and legacy `%APPDATA%\Savings and Expence Tracker` profile. Close the app normally after saving before installing the update. Do not manually replace files in a running installation.
4. After an approved upgrade, verify account, transaction IDs, loan receipts, balances, provisions, reconciliation and sync revision before making new entries.
5. Rollback is not a reason to write an older, incompatible plan over newer cloud data. Preserve a fresh backup first. Android ordinarily blocks version-code downgrades; a safe corrective release using the same signing identity is preferable. Never uninstall merely to downgrade. Older clients that do not preserve provisions/reconciliation must not upload them.

Signing keys, credentials, real financial records and production Supabase changes are deliberately excluded. See `WINDOWS_ANDROID_UPDATE_REPORT.md` for evidence and remaining approval gates.
