import { initializeDisplayRange } from './view-range';
import seed from './seed.json' with { type: 'json' };
import type { Plan, Envelope } from './types';
import { APP_NAME } from './types';
import { today, clampMonth } from './dates';
export function freshPlan(): Plan {
  const p = structuredClone(seed) as Plan;
  p.settings.salaryShort = p.settings.salary31;
  p.settings.reportDate = today();
  p.settings.selectedMonth = clampMonth(
    today().slice(0, 7),
    p.settings.planStart,
    p.settings.planEnd,
  );
  return initializeDisplayRange(p);
}
export const freshEnvelope = (): Envelope => ({
  format: APP_NAME,
  schemaVersion: 1,
  data: freshPlan(),
  audit: [],
  undo: [],
  redo: [],
});
