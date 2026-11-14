# Savings and Expense Tracker 2.10.15

## Android experience
- Refine Home with a clearer cash-balance hierarchy, direct account access, a compact monthly heading, readable date context, and consistent light/dark surfaces.
- Keep the four-area navigation and all existing tools. Consolidate More's fragmented groups and make Import/Export open the actual import section.
- Show one recent-activity list when full Home analysis is expanded; eliminate duplicate activity heading IDs.
- Show Asset-category entries as neutral movements instead of expenses in recent activity.
- Resolve Activity account names with one indexed lookup per account rather than repeatedly searching all accounts for each record.

## Financial correctness
- Use the existing half-away-from-zero paise rounding rule for both bulk and quick budget percentage changes (₹1 plus 0.5% becomes ₹1.01).
- Accept valid high-value two-decimal amounts without rejecting them because binary multiplication by 100 leaves a tiny residual. Retain positive-amount, precision, account-type and upper-limit validation.
- Add independent synthetic cases for paise boundaries, transfer conservation, fees, reversals, duplicate prevention, date transitions, and full JSON backup round trips.

No daily-allocation logic, schema migration, production record editing, application-ID change, or signing replacement. Existing 2.10.14 recovery and updater hardening is preserved. Shared financial corrections are also included in the matching Windows build.
