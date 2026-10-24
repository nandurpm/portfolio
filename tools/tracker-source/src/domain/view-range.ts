import type { Plan } from './types';
import { addMonths, clampMonth, today } from './dates';
export function defaultViewRange(start: string, end: string, date = today()): [string, string] {
  const first = clampMonth(date.slice(0, 7), start, end);
  return [first, [addMonths(first, 11), end].sort()[0]!];
}
/** One-time device display preference only; never truncate the financial plan. */
export function initializeDisplayRange(plan: Plan): Plan {
  if (plan.settings.displayRangeVersion === 1) return plan;
  const copy = structuredClone(plan),
    s = copy.settings;
  if (s.viewStart === s.planStart && s.viewEnd === s.planEnd)
    [s.viewStart, s.viewEnd] = defaultViewRange(s.planStart, s.planEnd);
  s.displayRangeVersion = 1;
  return copy;
}
