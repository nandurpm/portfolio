# Cross-platform feature parity · 2.2.0

Verified baseline: GitHub `main` at `fa9aaa0` / live source commit `a4717e3` on 4 November 2026. Windows and Android are built from this shared React, TypeScript, validation, calculation, reporting and Supabase synchronization source.

| Capability | Web | Windows | Android |
|---|---|---|---|
| Dashboard and full-month calculations | Full | Full | Mobile overview with quick actions and recent activity |
| Daily income and expenses | Full | Full | Primary Transactions tab; add, edit, search and filter |
| Account ledger and balances | Full | Full | Primary Accounts tab; accounts, transfers and essential postings |
| Transfers excluded from income/expenses | Shared rule | Shared rule | Shared rule |
| Budgets and category spending | Full planning tools | Full planning tools | Primary Budget tab with phone cards and monthly overrides |
| Loans, EMI and payment history | Full | Full | Available under More; compact phone cards |
| Salary and PF | Full | Full | Available under More |
| Balances, provisions and reconciliation | Full | Full | Available under More |
| Forecasts and long month tables | Full | Full | Available under More, outside primary navigation |
| Reports, Excel/PDF, import and backup | Full | Full, including native save/print | Basic access under More, including Android file sharing/print |
| Themes and palettes | Full | Full | Touch-friendly Settings under More |
| Authentication and Supabase sync | Full | Full | Full; same user-owned cloud record |
| Offline local data and recovery backups | Browser local storage | Electron user-data and backups | Private app storage and rolling native backups |
| Keyboard shortcuts | Browser-supported | Full desktop shortcuts | Not shown; Android back navigation is native-aware |
| Desktop reminders | Not applicable | Supported | Not shown |

## Intentional interface differences

- Windows retains the complete desktop workspace and advanced controls.
- Android uses five primary destinations: Home, Transactions, Accounts, Budget and More.
- Reports, loans, salary/PF, provisions, forecasts, synchronization and settings remain available on Android through More without removing their underlying data.
- All platforms preserve the same schema, category IDs, account IDs, transaction history, calculations and synchronization envelope.

## Compatibility identities

- Windows Electron application ID: `com.nandakumar.savingsandexpencetracker` (retained for installer/user-data compatibility).
- Android application ID: `com.nandakumar.savingsexpensetracker` (retained).
- Android 2.2.0 version code: `20200`.
- Android release builds require the existing `tracker` signing alias; the build intentionally fails when authorized signing credentials are absent.

