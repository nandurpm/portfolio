import type { Plan, Entry } from './types';
import { addMonths, monthDay } from './dates';
import { actualCategory, categoryPlan, forecast, reportDate, round } from './calculate';

export function plannedPaymentDate(p: Plan, dueDate: string) {
  return p.settings.emiPreviousMonth
    ? monthDay(addMonths(dueDate.slice(0, 7), -1), p.settings.salaryDay)
    : dueDate;
}

export function installmentTasks(p: Plan, month: string, cutoff = reportDate(p)) {
  return p.categories
    .filter((c) => c.active && c.role === 'emi')
    .flatMap((category) => {
      const rows = category.loanId
        ? (p.additionalLoans?.find((l) => l.id === category.loanId)?.rows ?? [])
        : p.loan.rows;
      return rows
        .filter(
          (row) =>
            plannedPaymentDate(p, row.dueDate).startsWith(month) &&
            !(!category.loanId && row.paidBeforeOpening) &&
            !(
              !category.loanId &&
              p.settings.mode === 'Early closure' &&
              row.month > p.settings.closureMonth
            ),
        )
        .map((row) => {
          const receipts = p.entries.filter(
            (e) => e.loanRowId === row.id && e.categoryId === category.id,
          );
          const paid = round(
            receipts.length
              ? receipts.filter((e) => e.date <= cutoff).reduce((sum, e) => sum + e.amount, 0)
              : row.paidDate && row.paidDate <= cutoff
                ? row.paidAmount
                : 0,
          );
          const remaining = round(Math.max(0, row.emi - paid));
          const payDate = plannedPaymentDate(p, row.dueDate);
          return {
            id: row.id,
            category: category.name,
            dueDate: row.dueDate,
            payDate,
            expected: row.emi,
            paid,
            remaining,
            status:
              remaining <= 0
                ? 'Paid'
                : paid > 0
                  ? 'Part paid'
                  : payDate < cutoff
                    ? 'Overdue in plan'
                    : 'Planned',
          };
        });
    })
    .sort((a, b) => a.payDate.localeCompare(b.payDate) || a.category.localeCompare(b.category));
}

export function budgetAlerts(p: Plan, month: string, cutoff = reportDate(p)) {
  return p.categories
    .filter((c) => c.group !== 'Income')
    .flatMap((c) => {
      const spent = actualCategory(p, c, month, cutoff),
        budget = categoryPlan(p, c, month);
      if (spent <= 0 || (budget > 0 && spent < round(budget * 0.8))) return [];
      return [
        {
          id: c.id,
          name: c.name,
          budget,
          spent,
          remaining: round(budget - spent),
          percent: budget > 0 ? round((spent / budget) * 100) : null,
          level:
            budget <= 0
              ? 'Unbudgeted spending'
              : spent > budget
                ? 'Over budget'
                : spent === budget
                  ? 'Budget reached'
                  : '80% warning',
        },
      ];
    })
    .sort((a, b) => a.remaining - b.remaining);
}

export function projectedShortfalls(p: Plan, cutoff = reportDate(p)) {
  const start =
    cutoff.slice(0, 7) > p.settings.planStart ? cutoff.slice(0, 7) : p.settings.planStart;
  return forecast(p).filter((r) => r.month >= start && r.cash < 0);
}

export function possibleDuplicates(
  entries: Entry[],
  candidate: Pick<Entry, 'date' | 'categoryId' | 'amount'> & { id?: string },
) {
  return entries.filter(
    (e) =>
      e.id !== candidate.id &&
      e.date === candidate.date &&
      e.categoryId === candidate.categoryId &&
      Math.round(e.amount * 100) === Math.round(candidate.amount * 100),
  );
}

export function duplicateGroups(entries: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = JSON.stringify([e.date, e.categoryId, Math.round(e.amount * 100)]);
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
