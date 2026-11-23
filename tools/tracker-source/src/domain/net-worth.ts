import type { Plan } from "./types";
import { cumulative, reportDate, round } from "./calculate";
import { ledgerSummary, liquidKinds } from "./ledger";
import { pfSummary } from "./employment";
import { inRange } from "./dates";
import { provisionResult } from "./balances";
import { paymentRows } from "./loan-summary";

export function namedAccountBalances(p: Plan, date = reportDate(p), base = ledgerSummary(p, date).balances) {
  const balances = { ...base };
  for (const e of p.entries) {
    if (
      !e.accountId ||
      !inRange(e.date, p.settings.planStart, p.settings.planEnd) ||
      e.date > date
    )
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
  const balances = namedAccountBalances(p, date, ledger.balances);
  const namedCash = round(
    (p.accounts ?? [])
      .filter((a) => liquidKinds.includes(a.kind))
      .reduce((sum, a) => sum + (balances[a.id] ?? 0), 0),
  );
  const principalAt = (cutoff: string) => round(Math.max(
    0,
    p.loan.principal - paymentRows(p, p.loan.rows, cutoff).reduce(
      (sum, row) => sum + row.principal * Math.min(1, row.emi > 0 ? row.paidAmount / row.emi : 0),
      0,
    ),
  ));
  const closureCategories = new Set(p.categories
    .filter((category) => category.group === 'Debt' && category.role === 'closure')
    .map((category) => category.id));
  const settlements = p.entries
    .filter((entry) => entry.date <= date && closureCategories.has(entry.categoryId))
    .sort((left, right) => left.date.localeCompare(right.date));
  let recordedSettlement = 0;
  // Evaluate coverage on the receipt date. Later ordinary EMIs must not
  // retroactively turn an earlier partial payment into a full settlement.
  const settled = settlements.some((entry) => {
    recordedSettlement = round(recordedSettlement + entry.amount);
    return recordedSettlement >= principalAt(entry.date);
  });
  const originalPrincipal = settled ? 0 : principalAt(date);
  const additionalPrincipal = (p.additionalLoans ?? []).reduce((sum, loan) => {
    const rows = paymentRows(p, loan.rows, date);
    if (loan.rows.every(r => r.principal !== undefined)) {
      return sum + Math.max(0, loan.principal - rows.reduce((n,r,i) => n + (loan.rows[i]!.principal ?? 0) * Math.min(1, r.emi > 0 ? r.paidAmount/r.emi : 0),0));
    }
    const total = rows.reduce((n,r)=>n+r.emi,0);
    const paid = rows.reduce((n,r)=>n+Math.min(r.emi,r.paidAmount),0);
    return sum + loan.principal * (total ? Math.max(0,1-paid/total) : 1);
  },0);
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
  const unlinked = p.entries.filter(
    (e) =>
      !e.accountId &&
      inRange(e.date, p.settings.planStart, p.settings.planEnd) &&
      e.date <= date &&
      p.categories.some((c) => c.id === e.categoryId && c.group !== "Asset"),
  );
  const reserved = round(
    (p.provisions ?? [])
      .filter((r) => r.enabled)
      .reduce(
        (sum, r) => sum + Math.max(0, provisionResult(p, r, date).reserve),
        0,
      ),
  );
  return {
    unlinkedCount: unlinked.length,
    reserved,
    spendable: round(cash - reserved),
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
      (recordedSettlement > 0 && originalPrincipal > 0) ||
      (p.additionalLoans ?? []).some(l => !l.rows.every(r => r.principal !== undefined) || paymentRows(p,l.rows,date).some(r=>r.paidAmount > 0 && r.paidAmount < r.emi)) ||
      paymentRows(p, p.loan.rows, date).some(
        (r) => (r.paidAmount > 0 && r.paidAmount < r.emi) || (r.paidBeforeOpening && r.dueDate > date),
      ),
  };
}
