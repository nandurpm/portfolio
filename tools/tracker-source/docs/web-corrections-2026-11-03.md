# Tracker website corrections — 3 November 2026

Applied the website-relevant source/test changes from the existing v2.0.1 app correction candidate. This changes `/track`, not installed EXE/APK packages or their signing/version settings. Authentication, RLS, private-route access and indexing rules are unchanged.

- Recorded PF cash allocations and claims now affect planned, actual and forecast cash in matching periods, without becoming income, expenses or savings. Savings charts accumulate net savings independently of the cash ledger.
- Full-month budgets remain intact. Unfinished reporting months show “In progress” for savings/cash comparisons; completed month-end reports retain their variance. No daily budget proration remains.
- Quoted closure charges apply only to the quoted month. Other months use indicative principal, with an explicit warning that future settlement dates and amounts require lender confirmation.
- Loan regeneration rejects an EMI that would require an unannounced final balloon payment. Legacy undated payments remain pending consistently; explicit before-opening receipts retain their handling.
- Expense components reconcile with displayed totals for legacy fractional-paise records. New/modified monetary values use a common paise check across entries, budgets, loans, PF, provisions, settings and reconciliation. Unchanged historical values and JSON backups remain readable and are never silently rewritten. Failed monetary edits leave the saved plan and audit history untouched.
- Asset entries are excluded defensively from reconciliation/progress, in addition to the existing validation preventing new Asset transactions.
- Zero-budget spending has one label. Known validation messages remain actionable; unexpected runtime diagnostics go through the friendly error handler.
- Chart series use theme tokens; cloud/checklist supporting text is larger; money formatting handles unit promotion and negative zero. Mobile progress uses cards, and entry-list height adapts to the viewport.

The existing optional Android test workflow now applies only the remaining native-candidate metadata patch, because the shared source/tests are already present. This prevents double-applying these fixes; no native build or release is performed for this website change.

Validation: full unit/regression, compatibility, lint/type, web build/inventory, and browser responsive/accessibility/authentication checks. Tests use synthetic records and mocked auth requests, not production financial data. Live host verification remains subject to this environment's network access.

Deferred: a wholesale split of the large CSS file and general desktop data-grid replacement. Theme-specific defects are fixed without introducing a broad visual rewrite; desktop tables retain labeled, keyboard-accessible horizontal scrolling.
