# Release status 2.1.0

This release was approved for Windows installation and website deployment on 3 November 2026.

- Windows installer: built and version checked.
- Android APK: release-built with the existing private `tracker` signing identity; package ID remains `com.nandakumar.savingsexpensetracker`; version code 20100.
- Web bundle: deployed through the protected GitHub workflow from source commit `9982d594d0b801bbf3dc52288210d15b21ff9140`.
- Database: proposed compatibility trigger included under `docs/audit/proposed`; not applied to production.
- Personal financial data: not read, overwritten or included. Tests used synthetic fixtures.
- Windows Authenticode: no authorized public code-signing certificate was supplied; the installer is not Authenticode signed.
- Supabase cross-account live security verification remains approval/credential gated.
