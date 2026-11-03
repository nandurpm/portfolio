# Savings and Expense Tracker 2.0.0

Released: 3 November 2026

## Final audited release

- Uses complete monthly planned budgets everywhere; no date-prorated daily allocation is used in the dashboard, charts, progress tables, Excel exports or PDF reports.
- Actual savings is recorded income minus recorded expenses. Calculated cash is opening savings plus actual savings and PF cash transfers. Remaining budget is the complete monthly expense plan minus recorded expenses.
- Negative monthly savings is labelled **Savings shortfall**; positive or zero savings is labelled **Saved this month**. Export tables use **Savings / deficit**.
- Dashboard, responsive phone layout and desktop layout share the same calculations, navigation, styling and synchronization behavior.
- Income categories show **Income received** and expense categories show **Budget used**, with zero-budget handling.
- EMI reconciliation keeps planned payment dates, contractual due dates and actual receipt dates separate. Notes alone never mark a payment as paid, and linked receipts are counted once.
- Salary-history and PF category roles are accepted during cloud synchronization; raw validation diagnostics are not exposed to users.
- Existing local data directories, Android application ID, backup schema, authentication and synchronization identities are preserved.

## Package identities

- Windows installer: `Savings-and-Expense-Tracker-Setup-2.0.0.exe`
- Android application ID: `com.nandakumar.savingsexpensetracker`
- Android versionName: `2.0.0`
- Android versionCode: `20000`
- Android minimum SDK: 34 (Android 14)
- Android target SDK: 36 (Android 16)

## Reconciliation note

The audited archives do not independently prove that the reported ₹2,000 phone payment dated 20 October 2026 was made. Version 2.0.0 preserves the stored records and does not infer payment from notes.

