# Savings & Expense Tracker 2.10.6

## Android daily-use redesign

- Home prioritizes the recorded cash balance, three monthly figures (income, expenses, savings), a compact monthly expense-budget bar, and the five most recent recorded movements.
- Adds a direct **Transfer money** action that opens the existing Accounts transaction form in Transfer mode without creating any posting.
- Keeps **Balance breakdown** accessible and moves annual totals, progress tables, detailed charts, guidance and secondary reports into the existing optional **Full dashboard analysis** disclosure. Advanced chart components mount only when opened.
- Collapses secondary transaction totals, income/opening-savings budget settings, bulk budget adjustments and account-opening controls on phones; all existing handlers remain available.
- Consolidates repeated Android More shortcuts into three clearly named groups while retaining all distinct destinations in the primary navigation or their original pages.
- Uses the currently selected app palette for More surfaces and header rather than a fixed purple skin.
- Corrects neutral account movements in recent activity to display their recorded principal instead of the misleading word "Transfer".
- Prevents repeated account transaction submissions while an asynchronous confirmation or save is in progress.
- Adds responsive Android browser interaction and financial-preservation regressions.

## Compatibility

- Shared calculation, rounding, Supabase synchronization, authentication, database schema, Android app ID, native signing configuration and native widget providers remain unchanged.
- Existing Quick Entry and Monthly Summary widgets stay separate because their functions differ, and summary quick actions were already deduplicated in 2.10.5.
- Browser previews do not establish physical-device appearance, notification delivery or OEM launcher support. Verify installation/upgrades and widget behaviour on an Android device before claiming those results.
