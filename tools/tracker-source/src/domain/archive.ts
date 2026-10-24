import type { Plan } from "./types";
import { monthEnd } from "./dates";
import { round } from "./calculate";
export function receiptScope(p: Plan, date: string) {
  return date < `${p.settings.planStart}-01`
    ? "before opening"
    : date > monthEnd(p.settings.planEnd)
      ? "after plan end"
      : "inside plan";
}
export function archivedReceiptSummary(p: Plan) {
  const receipts = p.entries.filter((e) => e.loanRowId);
  const sum = (scope: string) =>
    round(
      receipts
        .filter((e) => receiptScope(p, e.date) === scope)
        .reduce((s, e) => s + e.amount, 0),
    );
  return {
    before: sum("before opening"),
    after: sum("after plan end"),
    count: receipts.filter((e) => receiptScope(p, e.date) !== "inside plan")
      .length,
  };
}
