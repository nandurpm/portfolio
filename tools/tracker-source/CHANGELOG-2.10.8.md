# Savings & Expense Tracker 2.10.8 — Mobile EMI account editing fix

- Fix the mobile EMI payment editor so it preselects the account linked to the existing payment receipt.
- Keep legacy receipts without an account ID explicitly assigned to Unallocated cash.
- Use a single-receipt lookup in both mobile and desktop edit flows; ambiguous multiple receipts are not silently selected.
- Add regression coverage for single, missing and multiple linked receipts.
- Android patch release. No Supabase schema changes or production financial data changes.
- Preserve the existing Android application ID and production signing identity for in-place updates. Windows installer remains on its existing release under the current Android-only release configuration.
