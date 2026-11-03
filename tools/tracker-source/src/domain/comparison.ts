import type { Plan } from './types';
import { planned, actual, reportDate } from './calculate';
import { monthEnd, monthsBetween } from './dates';

export function monthlyComparison(p: Plan, start: string, end: string) {
  const through = reportDate(p);
  return monthsBetween(start, end).map((month) => {
    const plan = planned(p, month);
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
