# Unified balances and account corrections

The Dashboard and Accounts screen derive net worth from the same report-date snapshot.

- `settings.opening` is the total opening liquid savings. Opening cash, bank and wallet accounts allocate that total; they do not add to it. Negative unallocated cash means the named balances and total require reconciliation, not extra income.
- Unassigned Entries and PF cash transfers affect unallocated cash. Entries can now select a cash, bank or wallet account; assigning an existing Entry changes its location, not total cash or spending.
- Account transactions feed actual income/expenses and monthly progress. Combined cash reconciliations include their cash effects. Method-filtered reconciliations remain restricted to Entries/PF because ledger movements do not have payment-method tags; the UI states this limitation.
- Liquid transfers leave total cash unchanged. Lending, investment and FD principal change cash and noncash assets. Borrowing changes cash and debt. Card purchases change debt and expenses; card payments change cash and debt without a second expense.
- Full loan payments in legacy Entries remain cash expenses. Ledger loan repayments separate principal, interest and fees. The cash balance uses actual liquid movements, so principal is neither lost nor counted twice.
- PF is an asset. Original plan loan principal uses report-date receipts against schedule principal. A partial payment allocation is proportional and estimated. Additional fixed-payment loans do not carry a lender amortization breakdown; their principal estimate is proportional to repayment progress, clearly disclosed. Future interest is never subtracted as current principal. An account can link to a plan loan to prevent a second liability; payments for linked loans stay in Loan & Closure.
- Record each real transaction once, in Entries or Accounts. This bridge does not infer historical account allocations or merge distinct receipts based on matching amounts.

Account and transaction edits preserve IDs and metadata. Account removal is blocked while referenced. Purchases with linked refunds cannot be removed until those refunds are removed. Changes support Undo/history. Reconciliations and provisions can also be edited or removed; provisions can be disabled without removing records.

Opening liabilities accept either existing sign and calculate as debt. The input explains positive outstanding amounts. Credit limits are displayed separately and never added to assets. Transactions validate required account types, dates, interest/fee precision and refund links. Account rendering reports invalid ledger data without substituting a misleading zero balance.

## Findings not treated as confirmed bugs

The editable source exists at `tools/tracker-source`; modifying minified production bundles is unnecessary. Regenerating the original loan schedule deliberately replaces manual row overrides, and the existing confirmation states that behavior while retaining receipts. A lender's irregular first period makes mandatory equality with a standard annuity EMI inappropriate; schedule regeneration already verifies payoff and rejects insufficient installments.

FDs/investments remain at recorded cost; the account form explicitly labels this. Market-price updates and accrued-interest valuation require a separate dated valuation feature. No valuation is inferred.

## Verification

Synthetic integration tests cover shared dashboard totals, assigned Entries, opening balance allocation, future cutoffs, liquid transfers, liability sign, card purchase/payment, borrowing/FD fees and interest, cross-month refunds, type/date rejection, PF/loan inclusion, linked-loan deduplication and reversible edits/removal. No live financial records are created or changed by these tests.

## Financial-position completion

Both pages now use the same Financial position component, including named liquid cash, unallocated difference, Entries without an account, PF, loan principal, noncash assets, earmarked cash and spendable cash. Allocation differences show a warning rather than suggesting a fictitious income adjustment.

An explicit opt-in makes named cash/bank/wallet openings the authoritative opening total. Subsequent account opening corrections update the total in the same audited operation. Archived accounts retain their balances. The manual opening field becomes read-only until manual mode is deliberately restored.

Account forms expose notes, active/archive status and resulting-balance previews. An edit confirmation shows the opening correction. Account history is accessible from the Accounts page. Postings covered by a saved reconciliation, and originals referenced by a reversal, cannot be silently edited or removed. A dated inverse transaction preserves the original posting and adjusts all balance, income, expense and cash calculations using the original amounts. Corrections require a reason, cannot precede the original and cannot be applied twice.

## Independent audit regressions F1–F5

- F1: Accounts rejects EMI/closure categories centrally and directs users to Loan & Closure. It does not fabricate an installment receipt or bypass cumulative overpayment checks.
- F2: provision receipts combine Entries and eligible account bill purchases/refunds/reversals once. Ledger bill payments can identify their provision and due month, including advance payments. Fees on unrelated movements are not treated as utility bills.
- F3: visible XLSX Accounts activity and a companion Accounts activity CSV preserve movement types, principal, interest, fees, flow effects, categories and correction references. The Entries CSV remains compatible with its importer. The activity CSV explicitly refuses Daily Entries import so transfers cannot be flattened into expenses.
- F4: reporting-only Uncategorized income/expense rows reconcile breakdowns with aggregate totals in Dashboard, monthly activity, charts and printed/XLSX reports. Negative refund/correction categories have an accessible net-category table beside the positive-spending pie.
- F5: category existence, stream compatibility and installment restrictions are checked centrally. Mixed withdrawal interest and fees have independent income and expense categories. Refunds inherit the original purchase category.

The live linked-account gate was not bypassed or cleared. Once the user signed in, the authorized SBI/wallet clarification was saved: SBI opening ₹2,000 plus separate Railway Wallet ₹700; eight recorded UPI expenses totaling ₹594 assigned to SBI. The observed Dashboard cash became ₹2,106, named account cash matched, unallocated cash became zero, and net savings remained −₹594. Future entries were not rewritten.

### Backend verification scope

Read-only production metadata showed the existing restricted-owner RPC, but no preservation trigger on tracker_plans. The copied production RPC is exercised by the disposable PostgreSQL harness: a modern payload followed by a legacy payload reproduces enabled-ledger omission, then the new guard rejects the same omission while preserving revision/data. Additional cases protect Entry account attribution, category-stream fields and account-derived opening source. No defect reproduction is run against a real customer's plan.

Leaked-password protection is unavailable on the connected Free plan (official Supabase documentation limits it to Pro and above). No paid upgrade, password change, broader policy or account-clearing action is performed. Native signed releases, external Lighthouse measurements and production cross-user impersonation remain outside the web fix verification.
