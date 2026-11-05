# Tracker build, upgrade and release commands

The maintained source is `tools/tracker-source`. The generated website in `track` and the GitHub Release installers are outputs; do not edit generated bundles or commit installers directly.

## One-time setup

```powershell
cd tools/tracker-source
npm ci
```

Use Node.js from `.nvmrc` and JDK 21 for Android. Production Android builds require the existing authorized keystore through `TRACKER_KEYSTORE_PATH` and `TRACKER_KEYSTORE_PASSWORD`; never commit either value or create a replacement identity.

## Verify every shared change

```powershell
cd tools/tracker-source
npm run lint
npm test
npm run typecheck:quality
npm run check
npm audit
```

## Build the website

```powershell
cd tools/tracker-source
npm run build:web
npm run check:bundle
cd ../..
node scripts/stage-tracker.mjs
```

`stage-tracker.mjs` writes the verified web build to `track`, plus `release.json` and `downloads.json`. The latter points to the matching GitHub Release EXE, APK, source ZIP and checksums.

## Build Windows locally

```powershell
cd tools/tracker-source
npm run dist:win
```

Output: `release/installers/Savings-and-Expense-Tracker-Setup-<version>.exe`.

## Build Android locally

```powershell
cd tools/tracker-source
$env:TRACKER_KEYSTORE_PATH='C:\private\tracker-release.jks'
$env:TRACKER_KEYSTORE_PASSWORD='<private value>'
npm run android:release
Remove-Item Env:TRACKER_KEYSTORE_PASSWORD
```

Output: `android/app/build/outputs/apk/release/app-release.apk`. The application ID stays `com.nandakumar.savingsexpensetracker`, and the version code is derived from the package version.

## Publish web, Windows and Android together

1. Update `package.json`, the About screen and `CHANGELOG-<version>.md` in one commit.
2. Open and merge a pull request to `main`. The web workflow rebuilds `track` from that exact source commit.
3. In GitHub Actions, run **Release tracker web, Windows and Android** from `main`, or create and push the matching tag:

```powershell
git tag tracker-v<version>
git push origin tracker-v<version>
```

The workflow runs quality checks, builds the EXE and signed APK, creates the source ZIP and SHA-256 list, and publishes all files to one GitHub Release. The existing in-app update check and Telegram release monitor then discover that release.

Required repository configuration:

- Secret `TRACKER_ANDROID_KEYSTORE_BASE64`
- Secret `TRACKER_KEYSTORE_PASSWORD`
- Variable `TRACKER_ANDROID_KEY_ALIAS` (`tracker`)
- Variable `SUPABASE_PROJECT_REF`

`SUPABASE_ACCESS_TOKEN` is only needed if a future workflow deploys Edge Functions. Use a project-scoped token and pin Supabase CLI v2; CLI v3 changed hosted-deployment defaults. The current release workflow does not need this token because the deployed Telegram bot reads the latest GitHub Release.

## Upgrade safety

- Windows retains the existing app identity and user-data directory. Do not enable `deleteAppDataOnUninstall`.
- Android retains the application ID and production signing identity. Never uninstall merely to update.
- Export a backup before manual upgrade testing. Use synthetic data for automated tests.
- The Windows installer is kept in GitHub Releases because it exceeds GitHub's 100 MB normal-file limit. `track/downloads.json` provides the stable public link without bloating the website repository.
