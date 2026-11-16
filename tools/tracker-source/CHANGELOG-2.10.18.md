# Savings and Expense Tracker 2.10.18

Android Home-screen widget refresh fix.

The app now publishes the verified local plan to the widget cache immediately after local storage loads. Cloud session discovery and synchronization continue in the background, so a slow or offline authentication check no longer leaves the dashboard widget showing “Open the app to load your summary” and “Not refreshed.”

The widget remains privacy-safe: signed-out, locked, or attention-required plans continue to hide amounts according to the existing access policy.

Verification passed locally with 52 test files and 314 tests, plus lint and TypeScript quality checks. Production CI performs the signed Android build and Android 16 emulator validation.
