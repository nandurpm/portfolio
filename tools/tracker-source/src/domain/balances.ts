import type { Plan, Reconciliation, Provision } from "./types";
import { monthsBetween, monthDay } from "./dates";
import { round } from "./calculate";
/** Bank/pooled comparison only: never creates an income/expense adjustment. */
export function reconciliationResult(p: Plan, r: Omit<Reconciliation, "id">) {
  const categories = new Map(p.categories.map((c) => [c.id, c]));
  let income = 0,
    expenses = 0,
    count = 0;
  for (const e of p.entries) {
    if (
      e.date < r.fromDate ||
      e.date > r.throughDate ||
      (r.methods.length && !r.methods.includes(e.payment))
    )
      continue;
    const category = categories.get(e.categoryId);
    if (!category) continue;
    if (category.group === "Income") income += e.amount;
    else expenses += e.amount;
    count++;
  }
  income = round(income);
  expenses = round(expenses);
  const calculated = round(r.openingBalance + income - expenses);
  return {
    income,
    expenses,
    count,
    calculated,
    difference: round(r.statementBalance - calculated),
  };
}
/** Earmarking is not another expense: only recorded bill payments reduce reserve. */
export function provisionResult(p: Plan, r: Provision, throughDate: string) {
  const months =
    throughDate.slice(0, 7) < r.startMonth
      ? []
      : monthsBetween(r.startMonth, throughDate.slice(0, 7));
  const allocations = round(
    months.filter((m) => monthDay(m, r.allocationDay) <= throughDate).length *
      r.monthlyAmount,
  );
  const payments = round(
    p.entries
      .filter(
        (e) =>
          e.categoryId === r.categoryId &&
          e.date >= `${r.startMonth}-01` &&
          e.date <= throughDate,
      )
      .reduce((s, e) => s + e.amount, 0),
  );
  return {
    allocations,
    payments,
    reserve: round(r.openingReserve + allocations - payments),
  };
}
