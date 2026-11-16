# Savings and Expense Tracker 2.10.17

Android widget availability fix.

## Home screen widgets

- Marked the Quick Entry and Monthly Summary widget receivers as exported Android components so the system launcher and AppWidgetHost can discover them and deliver widget lifecycle/update broadcasts.
- Kept widget actions explicit and immutable; no financial data or credentials are exposed through the receiver declarations.

## Verification

- 52 test files and 314 tests passed locally.
- Lint and TypeScript quality checks passed.
- Web release build and Capacitor sync passed.
- Android signed build, installation, upgrade, and widget instrumentation validation are delegated to the production GitHub Actions runner with the authorized Android SDK and emulator.
