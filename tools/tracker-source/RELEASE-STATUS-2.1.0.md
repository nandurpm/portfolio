# Release status 2.1.0

This is an approval-ready release candidate, not a production deployment.

- Windows installer: built and version checked.
- Android APK: release-built with the existing private `tracker` signing identity; package ID remains `com.nandakumar.savingsexpensetracker`; version code 20100.
- Web bundle: built, but not uploaded to the live site.
- Database: proposed compatibility trigger included under `docs/audit/proposed`; not applied to production.
- Personal financial data: not read, overwritten or included. Tests used synthetic fixtures.
- Windows Authenticode: no authorized public code-signing certificate was supplied; the installer is not Authenticode signed.
- Supabase cross-account live security verification remains approval/credential gated.

