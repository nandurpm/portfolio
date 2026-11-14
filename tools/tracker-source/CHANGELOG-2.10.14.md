# Savings and Expense Tracker 2.10.14

Android reliability hardening release following the 2.10.13 audit.

## Android recovery and updates
- Bound native plan and backup reads to 16 MiB so oversized or damaged files cannot create unbounded bridge payloads.
- Preserve readable backup entries while reporting oversized/unreadable snapshots instead of silently dropping them.
- Removed the intrusive notification permission prompt from first launch; background update checks continue to respect the user’s notification setting.
- Background release-check failures now use WorkManager retry/backoff instead of being recorded as successful checks.

## Verification
- Lint passed.
- TypeScript quality checks passed.
- 49 test files and 290 tests passed.
- Release web build and Capacitor Android sync passed.
- Final signed APK publication remains delegated to the GitHub Actions release workflow, which has the production Android SDK and authorized signing identity.
