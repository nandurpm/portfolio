# Savings & Expense Tracker 2.9.4 — Financial Parity and Audit Fixes

- Use one decimal-aware paise rounder for calculations, Accounts ledger, salary/PF and compact formatting; correct half-paise interest cases such as ₹10.075 -> ₹10.08.
- Apply the same bill recurrence predicate to Daily Entries and new/edited Accounts bill links. Default Accounts to the next scheduled due month while still allowing advance payment dates.
- Show a review notice for existing off-schedule bill links and preserve readable validation messages in Accounts.
- Keep existing backups, legacy off-cycle Accounts links and stored lender schedules readable; do not automatically rewrite records or regenerate loans.
- Clamp Android progress filters to a changed/synchronized plan range.
- Show known future income/expense/savings plans consistently across progress views; keep future actuals blank.
- Add financial-engine/data-model SHA-256 fingerprints to Web and native build manifests, an extracted-payload comparison script, and a release quality gate comparing Web/native financial source identity.
- Add rounding, recurrence, legacy compatibility, build-tampering and Web/Windows-shell/Android parity regressions.

UI layout and native integration features intentionally differ. Equal financial records, settings and reporting cutoff use the same shared calculation engine. Physical-device installation/native integration and authenticated production offline/reconnect tests are distinct from source, browser-simulation and packaged-payload checks.
