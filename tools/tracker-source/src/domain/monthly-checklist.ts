import type { Category, Plan } from './types';
import { actual, actualCategory, categoryPlan, reportDate, round } from './calculate';
import { installmentTasks } from './insights';
import { monthDay, monthEnd } from './dates';

export interface ChecklistCategory {
  id: string;
  name: string;
  kind: 'income' | 'bill' | 'spending';
  planned: number;
  recorded: number;
  remaining: number;
  percentage: number | null;
  plannedDate: string | null;
  status: string;
  note: string;
}

/** Display-only grouping. A missing transaction is never proof that a bill is unpaid. */
function checklistCategory(p: Plan, c: Category, month: string, cutoff: string): ChecklistCategory {
  const provision = p.provisions?.find((r) => r.enabled && r.categoryId === c.id);
  const planned = categoryPlan(p, c, month);
  const recorded = actualCategory(p, c, month, cutoff);
  const kind: ChecklistCategory['kind'] =
    c.group === 'Income' ? 'income' : c.timing === 'Fixed day' || provision ? 'bill' : 'spending';
  const plannedDate = kind === 'spending'
    ? null
    : monthDay(month, provision?.dueDay ?? c.day);
  const remaining = round(planned - recorded);
  const percentage = planned > 0 ? round((recorded / planned) * 100) : null;
  const status = kind === 'income'
    ? recorded === 0 ? 'Not recorded' : recorded < planned ? 'Part received' : 'Income recorded'
    : recorded > planned && planned >= 0 ? 'Over budget'
    : recorded === 0 ? 'No entry recorded'
    : kind === 'bill'
      ? recorded < planned ? 'Part recorded' : 'Expense recorded'
      : 'Spending recorded';
  const note = kind === 'income'
    ? remaining > 0 ? 'Expected income not yet recorded' : 'Income recorded'
    : remaining < 0 ? 'Above the monthly budget' : 'Unspent budget is not savings';
  return { id: c.id, name: c.name, kind, planned, recorded, remaining, percentage, plannedDate, status, note };
}

/** All totals are from recorded transactions, never a daily budget allocation. */
export function monthlyChecklistView(p: Plan, month: string, cutoff = reportDate(p)) {
  const items = p.categories
    .filter((c) =>
      c.active &&
      c.role !== 'emi' &&
      c.role !== 'closure' &&
      (categoryPlan(p, c, month) > 0 || actualCategory(p, c, month, cutoff) > 0),
    )
    .map((c) => checklistCategory(p, c, month, cutoff));
  const totals = actual(p, month + '-01', cutoff < monthEnd(month) ? cutoff : monthEnd(month));
  return {
    income: items.filter((i) => i.kind === 'income'),
    bills: items.filter((i) => i.kind === 'bill'),
    spending: items.filter((i) => i.kind === 'spending'),
    loans: installmentTasks(p, month, cutoff),
    totals,
  };
}

/** Classify a missing EMI receipt without asserting that the bank payment did not occur. */
export function installmentDisplayStatus(
  task: ReturnType<typeof installmentTasks>[number],
  cutoff: string,
) {
  if (task.remaining <= 0) return 'Payment recorded';
  if (task.paid > 0) return 'Part recorded';
  if (task.dueDate < cutoff) return 'Due date passed · verify';
  if (task.payDate < cutoff) return 'Planned date passed';
  return 'Scheduled';
}
