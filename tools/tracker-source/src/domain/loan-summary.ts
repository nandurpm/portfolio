import type { Plan, InstallmentRow, LoanRow } from "./types";
import { reportDate, round } from "./calculate";

/** Derive report-date payment status without changing stored receipt allocations. */
export function paymentRows<T extends InstallmentRow | LoanRow>(
  p: Plan,
  rows: T[],
  cutoff = reportDate(p),
): T[] {
  return rows.map((row) => {
    const receipts = p.entries.filter((e) => e.loanRowId === row.id);
    const effective = receipts.filter((e) => e.date <= cutoff);
    const paidAmount = receipts.length
      ? round(effective.reduce((sum, e) => sum + e.amount, 0))
      : row.paidDate && row.paidDate > cutoff
        ? 0
        : row.paidAmount;
    const paidDate = receipts.length
      ? (effective
          .map((e) => e.date)
          .sort()
          .at(-1) ?? "")
      : row.paidDate > cutoff
        ? ""
        : row.paidDate;
    return { ...row, paidAmount, paidDate, paid: paidAmount >= row.emi };
  });
}

export function loanSummary(rows: (InstallmentRow | LoanRow)[]) {
  const total = round(rows.reduce((n, r) => n + r.emi, 0));
  const paid = round(
    rows.reduce((n, r) => n + Math.min(r.emi, r.paidAmount), 0),
  );
  const next = [...rows]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .find((r) => r.paidAmount < r.emi);
  return {
    total,
    paid,
    remaining: round(Math.max(0, total - paid)),
    paidCount: rows.filter((r) => r.paidAmount >= r.emi).length,
    next,
    nextAmount: next ? round(next.emi - next.paidAmount) : 0,
  };
}
