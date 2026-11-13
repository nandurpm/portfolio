# Savings and Expense Tracker 2.10.9

Maintenance release for Android and Windows containing the fixes reviewed in PR #126.

## Fixes

- Allow dated reversals of preserved legacy bill payments whose due-month link is off schedule, without changing the original posting or accepting new invalid bill links.
- Prevent reconciliation preview crashes while dates are cleared or edited; require a valid ordered interval before saving.
- Restore readable Loan, Payroll and Cash-flow snapshot metric spacing on the website and Windows app, with responsive layouts and existing theme colours.
- Verify the actual Windows installer in non-publishing pull-request checks.

## Updates and installation

- Both the Android APK and Windows x64 EXE are included in this release.
- Windows: Settings → About → Check for updates is available, with automatic update prompts. Download update opens the official installer in the external browser; run it over the existing installation. Silent or fully internal Windows installation is not provided.
- Android: download the verified APK inside Tracker and approve the update in Android's system installer. The existing application ID and production signing identity are preserved.
- Export a full JSON backup and sync pending changes before updating. Install over the existing application; do not uninstall it.

## Verification scope

The audit fixes passed 270 automated tests, 79 Chromium browser cases, actual Windows installer compilation, Android debug APK/native unit compilation and disposable backend checks before this release preparation. Release-specific build, Android signing-certificate continuity and emulator results are recorded in the GitHub release workflow; these earlier checks alone do not certify this release or physical-device behavior.
