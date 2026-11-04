# Savings and Expense Tracker 2.2.0

## Android experience

- Reworked the phone navigation into Home, Transactions, Accounts, Budget and More.
- Promoted monthly Budget to a primary everyday destination and moved Reports into More.
- Added compact recent activity to the mobile Home screen, combining Daily Entries and account-ledger movements without changing stored records.
- Retained the prominent quick-add action, native Android back handling, system-safe insets and private native backups.
- Kept advanced reports, loans, salary/PF, provisions, forecasts, synchronization and settings available without crowding the primary navigation.

## Shared baseline

- Includes the verified 4 November website fixes for account-ledger dates, provisions, sign-in, reporting scope, scrolling, overflow, dashboard contrast and coordinated theme palettes.
- Uses the same financial calculations, validation, reporting and Supabase synchronization envelope across web, Windows and Android.
- Transfers, account principal movements and card payments remain excluded from income and expenses.
- Existing categories, entries, accounts, ledger history, EMI receipts, reconciliation records and backups remain schema-compatible.

## Version and compatibility

- Shared version: 2.2.0.
- Android version code: 20200; package ID unchanged.
- Windows application ID and installer identity unchanged.
- Existing production Android signing identity is required for the release APK.

