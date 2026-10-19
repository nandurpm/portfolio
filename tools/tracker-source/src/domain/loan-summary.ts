import type { InstallmentRow, LoanRow } from './types';
import { round } from './calculate';
export function loanSummary(rows: (InstallmentRow | LoanRow)[]) {
  const total = round(rows.reduce((n, r) => n + r.emi, 0));
  const paid = round(rows.reduce((n, r) => n + Math.min(r.emi, r.paidAmount), 0));
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
