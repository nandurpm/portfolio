# Salary history and PF account

The private Salary & PF screen adds dated salary changes and a separate provident-fund ledger. Existing plans retain their legacy salary rule until the user explicitly enables the new history. Existing income, expense, EMI and loan calculations are retained.

- Salary values mean monthly take-home pay. Any number of dated changes can be added, edited or removed (up to 1,000 records). The latest applicable value wins. The existing full-month salary earned in the previous month is received in the following month; there is no new prorating rule.
- Monthly PF on a salary change is a reference, not a posted transaction. Record actual contributions after checking the payslip. This prevents double counting or inventing financial receipts.
- Payroll contributions increase PF only. Cash contributions transfer cash to PF. A partial or full claim transfers PF back to cash, without creating salary income or an expense. These are records, not requests submitted to a PF provider.
- Contributions and claims use integer cents when totaling. Claims may not exceed funds recorded by that date; a future contribution cannot fund an earlier claim. Editing/deleting contributions revalidates the entire ledger. Cash transfers must be within the plan dates; older payroll contributions can establish the opening PF balance.
- Recorded cash, progress and reconciliation include cash transfers; income, expenses and savings exclude them. Budget projections retain the existing salary/budget assumptions and do not invent future PF transfers.
- JSON backup, undo/redo, cloud records and XLSX metadata retain both histories. XLSX includes readable Salary history and PF account sheets; edits to these informational sheets do not replace the authoritative metadata. Edit these records in the app.

## Compatibility and privacy

Update Windows and Android clients before enabling either feature. New records use explicit salary-history / PF-account category types, so older validators reject an unsupported plan instead of silently stripping optional records. The UI explains this before activation. A plan is never auto-migrated on read. Conflicting concurrent claims or salary dates fail validation and require review; they cannot produce a negative PF balance.

No new public routes, indexing, account provider, token storage, encryption claims or database permissions are added. The dashboard's backup and sync messages reflect the existing storage/sync state. A local save is not represented as successful cloud sync.

Validation includes legacy salary parity, multiple salary events, payroll/cash/claim accounting, dated overclaim rejection, cents, cloud conflicts, JSON/XLSX preservation and browser interaction at 360, 768 and 1366 pixels. Browser fixtures use synthetic records and block real Supabase requests.
