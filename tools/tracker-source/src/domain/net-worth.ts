import type { Plan } from "./types";
import { cumulative, reportDate, round } from "./calculate";
import { ledgerSummary, liquidKinds } from "./ledger";
import { pfSummary } from "./employment";
import { paymentRows } from "./loan-summary";

export function namedAccountBalances(p: Plan, date = reportDate(p)) {
  const balances = { ...ledgerSummary(p, date).balances };
  for (const e of p.entries) {
    if (!e.accountId || e.date < p.settings.planStart + "-01" || e.date > date)
      continue;
    const category = p.categories.find((c) => c.id === e.categoryId);
    if (category && category.group !== "Asset")
      balances[e.accountId] = round(
        (balances[e.accountId] ?? 0) +
          (category.group === "Income" ? e.amount : -e.amount),
      );
  }
  return balances;
}
export function netWorthSnapshot(p: Plan, date = reportDate(p)) {
  const ledger = ledgerSummary(p, date);
  const cash = cumulative(p, date).actualCash;
  const pf = pfSummary(p, date).balance;
  const balances = namedAccountBalances(p, date);
  const namedCash = (p.accounts ?? [])
    .filter((a) => liquidKinds.includes(a.kind))
    .reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);
  const originalPrincipal = Math.max(
    0,
    p.loan.principal -
      paymentRows(p, p.loan.rows, date).reduce(
        (sum, r) => sum + r.principal * Math.min(1, (r.emi > 0 ? r.paidAmount / r.emi : 0)),
        0,
      ),
  );
  // Additional fixed-payment loans do not store amortization. Disclose a proportional estimate,
  // never mistake all future repayments (which include charges) for principal outstanding.
  const additionalPrincipal = (p.additionalLoans ?? []).reduce((sum, loan) => {
    const rows = paymentRows(p, loan.rows, date);
    const total = rows.reduce((n, r) => n + r.emi, 0);
    const paid = rows.reduce((n, r) => n + Math.min(r.emi, r.paidAmount), 0);
    return sum + loan.principal * (total ? Math.max(0, 1 - paid / total) : 1);
  }, 0);
  const planLoans = round(originalPrincipal + additionalPrincipal);
  const liquidAssets = (p.accounts ?? [])
    .filter((a) => liquidKinds.includes(a.kind))
    .reduce((sum, a) => sum + (ledger.balances[a.id] ?? 0), 0);
  const nonCashAssets = round(ledger.assets - liquidAssets);
  const assets = round(cash + nonCashAssets + pf);
  const linkedDebt = (p.accounts ?? [])
    .filter((a) => a.planLoanId)
    .reduce((sum, a) => sum - (ledger.balances[a.id] ?? 0), 0);
  const liabilities = round(ledger.liabilities - linkedDebt + planLoans);
  return {
    cash,
    pf,
    namedCash,
    unallocatedCash: round(cash - namedCash),
    nonCashAssets,
    assets,
    liabilities,
    netWorth: round(assets - liabilities),
    planLoans,
    estimated:
      additionalPrincipal > 0 ||
      paymentRows(p, p.loan.rows, date).some(
        (r) => r.paidAmount > 0 && r.paidAmount < r.emi,
      ),
  };
}
