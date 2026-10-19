import type { Plan } from './types';
import { planned, actual, reportDate } from './calculate';
import { monthEnd, monthsBetween } from './dates';

export type PlanBasis = 'full' | 'by-date';
export function monthlyComparison(p: Plan, basis: PlanBasis, start: string, end: string) {
  const through = reportDate(p);
  return monthsBetween(start, end).map((month) => {
    const plan = planned(p, month, basis === 'by-date' ? through : undefined);
    const entered =
      month > through.slice(0, 7)
        ? null
        : actual(p, month + '-01', through < monthEnd(month) ? through : monthEnd(month));
    return {
      month,
      planIncome: plan.income,
      actualIncome: entered?.income ?? null,
      planExpenses: plan.expenses,
      actualExpenses: entered?.expenses ?? null,
      planSavings: plan.savings,
      actualSavings: entered?.savings ?? null,
    };
  });
}
