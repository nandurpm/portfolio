# Live-review display corrections

Base main: `fb6ad2757e1a35c36986055f18194edd581a10c7`.
Branch: `fix/tracker-display-20261024`. No production data, database policy or migration changes. Stop before merge/deployment per the existing approval instruction.

1. Mobile More menu hides normal Saved locally text on the web; Saving/Save failed/Recovery needed remain visible. This supersedes the earlier UX-001 source-only assessment: that review missed the separate mobile menu.
2. Web Settings hides installed-desktop reminder/autostart/tray/folder controls, says Web app instead of Browser preview, and removes internal workbook-development notes. Reports retains JSON export/restore and uses web-appropriate backup guidance. Native desktop controls remain available.
3. Savings, cash and planned-versus-actual axes use full rupee values with Indian digit grouping and up to two decimals, with additional axis width. No financial values or calculation formulas change.
4. Additional EMI due/paid/planned dates and receipt displays use the chosen date format. Original-loan planned dates and receipt displays also respect that preference. Native editable date inputs keep ISO values, as required by HTML date controls.
5. New and legacy full-range views default to 12 inclusive months, starting at the current month clamped inside the plan. Short plans remain shorter. Existing custom views are retained. A device-only optional settings marker ensures a subsequent explicit Full plan selection survives reloads. The marker and range preferences are excluded from financial cloud data. The 98-month plan, original imported range, all transactions, overrides and loan schedules remain intact. Plan-range edits default the display to 12 months; view-range Full plan still selects the whole plan.

Local validation: `npm run check` passes lint, 61 regression tests in 7 files, strict TypeScript, authenticated production web build and bundle guard. New range tests prove forecast/entries/loan preservation, custom/full selection retention and device-only sync behavior. Existing five-viewport isolated browser tests now cover the 12-of-98 default, explicit Full plan, mobile menu text, EMI dates and cleaned Settings. Final hosted CI evidence is recorded in the PR before handoff; synthetic data only.

No existing app data is rewritten automatically. The one-time display initialization happens in memory on load; the preference is saved with the next normal save. Explicit range choices immediately use the app's usual save path. There is no database migration. Rollback is a revert of this branch's source commit; optional display marker can be ignored by older versions without changing financial records.

Bank comparisons and electricity provisions are intentionally not created from guessed values. Configuration needs statement dates, the account opening/statement balances and matching payment methods, plus the electricity bill cycle, next due date, expected amount and existing earmarked reserve.
