# Android four-area interface

## Scope and baseline

Implementation-ready specification and working React/Capacitor implementation, 14 November 2026 (IST). Baseline main: `872107fd58972b3a8f97b77712e1b557b1524f81`, package 2.10.11. This is an Android presentation change. No domain calculation, model, migration, database, native identifier, signing, import/export format, sync or authentication change is required.

The supplied reference establishes the hierarchy and calm visual direction. Real INR values replace its illustrative dollar amounts. The existing cash calculation is labelled **Total cash balance**, rather than implying that liquid cash equals all assets or net worth. No percentage comparison is fabricated. Existing financial position remains available in Accounts and full analysis.

## Screen hierarchy

| Primary destination | Content | Secondary destinations |
|---|---|---|
| Home | Cash balance, selected-month income/expenses/savings, Add, latest activity | View all → Activity; Full dashboard analysis → existing reporting controls, charts, budget alerts, monthly checklist, financial position and progress |
| Activity | Combined daily entries and account ledger, search | Filter sheet: dates, account, type; record → existing owning history; Manage daily entries; Manage account activity |
| Accounts | Named account cards, current balances, Transfer, Reconcile | Account filter/sort sheet; existing create/edit/archive/openings/history; existing ledger editing and reversals; reconciliation → existing Balances screen |
| More | Grouped feature lists and tool search | Budgets, Loans & EMI, Salary & PF, Forecast, Reports, reconciliation/provisions/financial position, Settings, backup/restore, import/export, cloud sync, help; Undo/Redo retained |

Secondary screens retain their established names and full functionality. On those screens More is the selected primary destination. Daily Entries remains reachable from Activity and Add. Android Back/Escape dismisses the top registered sheet before returning Home. This retains the existing shared navigation contract.

## Design system

`src/android-simple.css` loads after the prior Android stylesheet, only in native Android startup and the explicit development harness. Website/Windows retain their styles and navigation.

| Token | Light | Dark |
|---|---|---|
| Canvas | `#f5f4fc` soft lavender | `#15192c` deep navy |
| Cards/sheets | `#ffffff` | `#20263b` |
| Primary text | `#202852` | `#f0f1ff` |
| Secondary text | `#565e79` | `#c0c5df` |
| Dividers | `#d8dcec` | `#4c5575` |
| Income | `#16724f` | `#85deb6` |
| Expense | `#b23946` | `#ffadb4` |
| Account movement | `#6444aa` | `#cbb6ff` |
| Balance header | `#28366c` with white text | Same |
| Add action | `#247b59` with white text | Same |

- Existing Inter typography; inherited user theme/palette preferences remain available.
- Base content spacing 8–16 px, card padding 12–22 px, corner radius 18–24 px.
- Buttons/inputs/selects at least 48 CSS px high; bottom destination target at least 56 px.
- Three compact summary cards where they fit; stack on the smallest widths. Money wraps rather than truncating.
- Text labels accompany all financial types and navigation icons. Icons are decorative when adjacent text provides the label.
- Focus ring: 3 px `#7c86e8`, with 3 px offset. Existing modal focus trap, Escape/Back order and focus restoration are reused.
- Existing user palette tokens still control legacy screens. The compact surfaces use the stable calm finance palette above; this does not reset saved theme preferences.

## Screen specifications

### Home

Top app bar reads Savings Tracker with existing settings action. The balance card states its cash scope and reporting cutoff. Three summary cards show the existing selected-month totals; savings remains recorded income less expenses. One green Add button opens the quick-action sheet. Recent activity retains real record destinations and a View all link. Account movements have distinct type labels, including transfers with fees. Analysis remains collapsed until requested, preserving all reporting controls without the initial long scroll or eager chart rendering.

### Add sheet

Five labelled rows with icons, explanatory text and chevrons: Add expense, Add income, Transfer, Loan payment, Backup. Expense/income use the existing Entries form. Loan payment opens the established linked-loan receipt workflow rather than inventing a payment. Backup opens Reports focused on Complete backup & restore. Cancel, close, Escape and Android Back dismiss the sheet.

### Activity

Both underlying record stores appear in one descending-date list. Labels distinguish income, expense, asset movement, transfer, loan payment, refund, reversal and other ledger kinds. Ledger principal is shown as a movement amount; fees are explicitly annotated. This screen does not calculate a new financial total. Account/date/type filters are disclosed in a sheet; search stays visible. Filtered empty state explains how to recover. Lists paginate in increments of 50. Editing/deleting/protected reversals stay with their existing owning screens.

### Accounts

Account cards are promoted before advanced position/opening sections. Filter and sort opens a sheet using existing search/sort state. All bank/cash/wallet/credit/receivable/liability/FD/investment kinds, archived records, account history and opening logic remain intact. Reconcile opens existing Balance reconciliation. Existing transaction/edit/reversal actions remain available below the cards.

### Transfer sheet

The existing transaction form and `addTransaction` handler are reused in a focus-trapped bottom sheet. Title: Transfer between accounts; fields: From account, To account, Amount, Date, Fees, optional Description, and applicable fee category. Transfer type is fixed while using this focused flow. Same-account options are disabled; changing the source clears a conflicting destination. Save transfer retains existing two-decimal, account-kind, date, conflict and submission-lock validation. Existing reversal/history behavior remains unchanged. No second financial posting path is introduced.

### More

Secondary features use single-column grouped rows, with descriptions and existing tool search. Advanced account/planning tools and Undo/Redo stay accessible. Backup/restore and cloud sync have explicit separate destinations, with duplicate combined shortcuts removed from navigation only. Help opens the existing guidance/shortcut dialog. No ads or decorative artwork are introduced.

## States and responsive behavior

| State | Behavior |
|---|---|
| Initial/lazy load | Existing app splash and screen-loading feedback; analysis has its own loading status |
| No activity | Clear empty state; Add remains available |
| No matching filters | Explain no matches; filters can be cleared without modifying records |
| No accounts | Existing Add first account empty state; transfer validation requests valid accounts |
| Invalid transfer | Existing accessible toast/status explains missing/invalid values; sheet stays open |
| Save pending | Existing Saving… disabled button and synchronous submission lock prevent duplicate posts |
| Balance calculation failure | Existing Accounts alert; records retained; Undo remains available |
| Rendering/storage failure | Existing boundary/recovery screens; no data discarded |
| Keyboard/short viewport | Scrollable sheet bounded by `100dvh`, single-column inputs and scroll margin; safe-area bottom padding |
| Large text | Wrapping names/amounts, flexible rows, minimum touch targets, sheet scrolling |
| Large Android screens | Four-item bottom navigation remains available; shared desktop sidebar is hidden only on Android |

Physical Android keyboard/lifecycle and TalkBack require device testing. Browser viewport simulation is evidence for responsive layout, not proof of IME behavior.

## Migration and regression plan

1. Add the Android-only shell routes and styles. Keep Website/Windows screen routing unchanged.
2. Wrap existing dashboard in progressive disclosure; use the same calculation exports for the compact summary.
3. Present a combined read-only Activity index; route changes back to the authoritative existing editors.
4. Wrap the existing transfer form in a sheet, preserving its mutation handler and financial validation.
5. Keep existing account and secondary feature handlers and schemas. No user-data conversion or backup conversion is needed. Rollback is presentation-only.
6. Update obsolete five-tab/always-expanded Android UI assertions to the new hierarchy while retaining reporting, chart, theme and financial-parity checks.
7. Add synthetic four-destination, quick-action, transfer-fee/conservation/duplicate, activity-filter, backup/restore and short-viewport/large-text tests.
8. Run local lint, unit/integration, typecheck and web/native-renderer builds, then full no-deployment CI including browser, actual Windows installer, Android compilation and disposable backend tests. Review screenshots from CI artifacts before considering a release.
9. Owner reviews the PR. Do not merge, publish a release, deploy or change Android signing as part of this redesign task.

## Verification record

Local Chromium launch is BLOCKED by sandbox `socket() failed: Operation not permitted`; no local browser PASS is claimed. Local commands and final CI run/results are recorded in the PR description. Device/emulator verification is NOT TESTED unless explicitly supplemented with actual evidence. Financial/report/backup regression suites remain applicable even though their implementations are unchanged.
