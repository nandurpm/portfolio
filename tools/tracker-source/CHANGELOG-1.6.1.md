# Savings and Expense Tracker 1.6.1

Released: 2 November 2026

## Corrected

- Monthly dashboard, progress, charts, Excel and PDF reports now compare actual transactions with the complete monthly plan; daily budget allocation and date-prorated budget figures are removed.
- Actual savings is actual income minus actual expenses. Actual cash is opening savings plus actual income minus actual expenses. Remaining budget is full-month planned expenses minus actual expenses.
- Monthly progress now reports planned and actual income, expenses, savings and cash, plus the savings gap, transaction count and status from the same calculation basis.
- Savings and cash charts use cumulative full-month planned values and cumulative actual transaction values.
- Income categories display **Income received**; expense categories retain **Budget used**, including safe handling for zero budgets.
- Loan and EMI summaries distinguish planned payment dates, contractual due dates and actual receipt dates. Future receipts remain pending until their actual date, historical schedule-only flags are not treated as receipt proof, and linked receipts are counted once.
- Mobile and desktop readability, keyboard access and startup theme handling match the verified website implementation.

## Compatibility

- Windows keeps the existing Electron data directory and installer identity.
- Android keeps application ID `com.nandakumar.savingsexpensetracker`, uses versionName `1.6.1` and versionCode `10601`, and is signed with the established release certificate when the private key is supplied.
- Backup schema remains compatible with existing version 1 data; this release does not rewrite personal financial records during upgrade.

## Reconciliation note

The available local backups contain a historical phone-loan schedule and one linked ₹2,000 entry dated 19 October 2026, but no independently stored receipt proving a 20 October payment. Version 1.6.1 therefore does not auto-correct or auto-mark that installment from notes. Confirm the actual receipt before editing the personal record.
