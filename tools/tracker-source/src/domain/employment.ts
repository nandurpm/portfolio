import type { Category, Plan, SalaryChange, PfMovement } from "./types";
import { addMonths, monthEnd } from "./dates";
const cents = (amount: number) => Math.round((amount + Number.EPSILON) * 100);
export const isSalaryCategory = (category: Category) =>
  category.role === "salary" || category.role === "salary-history";
/** Reading a legacy plan never migrates or changes it. */
export function salaryHistory(p: Plan): SalaryChange[] {
  const history =
    p.salaryChanges ??
    (p.settings.raisedSalary !== p.settings.salary31
      ? [
          {
            id: "legacy-salary-change",
            effectiveDate: p.settings.raiseStart + "-01",
            monthlySalary: p.settings.raisedSalary,
            monthlyPfContribution: 0,
          },
        ]
      : []);
  return [...history].sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate),
  );
}
export function salaryAtDate(p: Plan, date: string) {
  const change = salaryHistory(p)
    .filter((row) => row.effectiveDate <= date)
    .at(-1);
  return {
    monthlySalary: change?.monthlySalary ?? p.settings.salary31,
    monthlyPfContribution: change?.monthlyPfContribution ?? 0,
  };
}
/** Preserve the existing full-month, paid-the-following-month convention. */
export const salaryForReceiptMonth = (p: Plan, month: string) =>
  salaryAtDate(p, monthEnd(addMonths(month, -1))).monthlySalary;
export function enableSalaryHistory(p: Plan) {
  if (!p.categories.some(isSalaryCategory))
    throw Error(
      "Create an income category using the salary rule in Budget & Plan first.",
    );
  p.salaryChanges ??= salaryHistory(p);
  for (const category of p.categories)
    if (isSalaryCategory(category)) category.role = "salary-history";
}
/** A meaningful account type also makes older validators reject, rather than strip, PF data. */
export function enablePfAccount(p: Plan) {
  if (!p.categories.some((category) => category.role === "pf-account")) {
    let name = "PF account";
    for (
      let n = 2;
      p.categories.some(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      );
      n++
    )
      name = `PF account ${n}`;
    p.categories.push({
      id: crypto.randomUUID(),
      name,
      group: "Asset",
      role: "pf-account",
      amount: 0,
      timing: "Fixed day",
      day: 1,
      months: [],
      active: false,
      note: "Managed in Salary & PF. Transfers are not income or expenses.",
    });
  }
  p.pfMovements ??= [];
}
export function pfCashEffect(
  p: Plan,
  from: string,
  through: string,
  methods: string[] = [],
) {
  return (
    (p.pfMovements ?? [])
      .filter(
        (row) =>
          row.date >= from &&
          row.date <= through &&
          row.date >= p.settings.planStart + "-01" &&
          row.date <= monthEnd(p.settings.planEnd) &&
          (!methods.length || methods.includes(row.payment)),
      )
      .reduce(
        (sum, row) =>
          sum +
          (row.kind === "claim"
            ? cents(row.amount)
            : row.source === "cash"
              ? -cents(row.amount)
              : 0),
        0,
      ) / 100
  );
}
export function pfSummary(p: Plan, through: string) {
  let contributions = 0,
    claimed = 0;
  for (const row of p.pfMovements ?? [])
    if (row.date <= through) {
      if (row.kind === "claim") claimed += cents(row.amount);
      else contributions += cents(row.amount);
    }
  return {
    balance: (contributions - claimed) / 100,
    contributions: contributions / 100,
    claimed: claimed / 100,
  };
}
export function validatePfMovements(rows: PfMovement[]) {
  // Contributions can fund claims on the same day; future deposits cannot fund past claims.
  const days = new Map<string, number>();
  for (const row of rows)
    days.set(
      row.date,
      (days.get(row.date) ?? 0) +
        cents(row.amount) * (row.kind === "claim" ? -1 : 1),
    );
  let balance = 0;
  for (const [date, change] of [...days].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    balance += change;
    if (balance < 0)
      throw Error(
        `PF claims exceed the recorded PF balance on ${date}. Check the contribution and claim dates.`,
      );
  }
}
