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
