# Savings and Expense Tracker 2.1.0

Release candidate prepared 3 November 2026. Production deployment and production database migration require separate approval.

## New

- Shared account ledger for cash, bank, wallet, credit cards, receivables, liabilities, fixed deposits and investments.
- Balance-safe transaction types for income, expenses, transfers, lending, repayment, borrowing, loan principal, fixed deposits, investments, shopping, refunds and credit-card activity.
- Transfers and principal movements no longer inflate income or expenses; card payments do not duplicate card purchases.
- Simplified Android navigation: Home, Transactions, Accounts, Reports and More.
- Account balances, assets, liabilities, net worth, receivables and investments use integer-cent validation.
- Merged the latest website precision, dashboard guidance, mobile progress-card and financial audit corrections into the Windows and Android source.

## Reliability and compatibility

- Existing plans and backups remain valid because the account ledger is an optional, paired extension.
- Proposed Supabase guard prevents legacy clients from deleting an enabled account ledger. It is supplied for staging review and was not applied to production.
- Android private-file writes now fall back safely when atomic replacement is unsupported.
- Android startup failure provides a retry action and diagnostic detail while confirming that existing data was not replaced.
- Application ID and existing Android release signing identity are unchanged.

## Verification

- ESLint and TypeScript quality checks passed.
- 31 unit/regression files and 172 tests passed using synthetic data.
- Dependency compatibility: 5 groups passed; npm audit: 0 vulnerabilities.
- Web, Electron x64, Android release, dashboard visual, desktop responsive and phone responsive builds/tests passed.
- Live two-account Supabase mutation test was not run because disposable credentials and explicit synthetic-write permission were not supplied.
