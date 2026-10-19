import type { Plan } from '../domain/types';
import { clampMonth } from '../domain/dates';
import { validatePlan } from '../domain/validation';
const deviceFields = [
  'theme',
  'palette',
  'animations',
  'dateFormat',
  'autoStart',
  'tray',
  'backupFolder',
  'reminders',
  'reportDate',
  'liveDate',
  'selectedMonth',
  'viewStart',
  'viewEnd',
  'applyViewToExport',
] as const;
export type CloudPlan = Omit<Plan, 'settings' | 'celebrated'> & {
  settings: Partial<Plan['settings']>;
};
export interface SyncMeta {
  ownerId: string;
  revision: number;
  base: CloudPlan;
  lastSyncAt: string;
}
export interface Conflict {
  path: (string | number)[];
  local: unknown;
  remote: unknown;
}
export const equal = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (
    !a ||
    !b ||
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const ak = Object.keys(a),
    bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => k in b && equal((a as any)[k], (b as any)[k]));
};
export function cloudPlan(p: Plan): CloudPlan {
  const { celebrated: _, ...copy } = structuredClone(p);
  for (const key of deviceFields) delete (copy.settings as any)[key];
  return copy;
}
export function localPlan(remote: CloudPlan, device: Plan): Plan {
  const p = structuredClone(remote) as Plan;
  p.settings = { ...device.settings, ...p.settings };
  for (const key of deviceFields) (p.settings as any)[key] = structuredClone(device.settings[key]);
  p.settings.selectedMonth = clampMonth(
    p.settings.selectedMonth,
    p.settings.planStart,
    p.settings.planEnd,
  );
  p.settings.viewStart = clampMonth(p.settings.viewStart, p.settings.planStart, p.settings.planEnd);
  p.settings.viewEnd = clampMonth(p.settings.viewEnd, p.settings.planStart, p.settings.planEnd);
  if (p.settings.viewStart > p.settings.viewEnd) p.settings.viewEnd = p.settings.viewStart;
  p.celebrated = structuredClone(device.celebrated);
  return validatePlan(p);
}
// Arrays of records merge by permanent ID, never by the current array position.
export function mergePlans(base: CloudPlan, local: CloudPlan, remote: CloudPlan) {
  const conflicts: Conflict[] = [];
  function merge(b: any, l: any, r: any, path: (string | number)[]): any {
    if (equal(l, r) || equal(b, r)) return structuredClone(l);
    if (equal(b, l)) return structuredClone(r);
    if (
      Array.isArray(l) &&
      Array.isArray(r) &&
      Array.isArray(b) &&
      [...b, ...l, ...r].every((x) => x && typeof x === 'object' && typeof x.id === 'string')
    ) {
      const bm = new Map(b.map((x) => [x.id, x])),
        lm = new Map(l.map((x) => [x.id, x])),
        rm = new Map(r.map((x) => [x.id, x]));
      const ids = [...new Set([...l.map((x) => x.id), ...r.map((x) => x.id)])];
      const rows = ids
        .map((id) => merge(bm.get(id), lm.get(id), rm.get(id), [...path, id]))
        .filter((x) => x !== undefined);
      // Conflicting category/loan ordering is handled separately from record edits.
      const order = (a: any[]) =>
        a.map((x) => x.id).filter((id) => bm.has(id) && lm.has(id) && rm.has(id));
      const bo = order(b),
        lo = order(l),
        ro = order(r);
      if (!equal(lo, ro) && !equal(bo, lo) && !equal(bo, ro))
        conflicts.push({
          path: [...path, '$order'],
          local: l.map((x) => x.id),
          remote: r.map((x) => x.id),
        });
      else if (equal(bo, lo))
        rows.sort((a, b) => {
          const ai = r.findIndex((x) => x.id === a.id),
            bi = r.findIndex((x) => x.id === b.id);
          return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
        });
      return rows;
    }
    if (
      b &&
      l &&
      r &&
      !Array.isArray(l) &&
      !Array.isArray(r) &&
      typeof b === 'object' &&
      typeof l === 'object' &&
      typeof r === 'object'
    ) {
      const out: Record<string, unknown> = Object.create(null);
      for (const key of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        const value = merge(b[key], l[key], r[key], [...path, key]);
        if (value !== undefined) out[key] = value;
      }
      return out;
    }
    conflicts.push({ path, local: structuredClone(l), remote: structuredClone(r) });
    return structuredClone(l);
  }
  return { plan: merge(base, local, remote, []) as CloudPlan, conflicts };
}
export function resolveConflicts(
  plan: CloudPlan,
  conflicts: Conflict[],
  choices: ('local' | 'remote')[],
) {
  const next = structuredClone(plan) as any;
  conflicts.forEach((c, i) => {
    if (choices[i] !== 'remote') return;
    let target = next;
    for (const key of c.path.slice(0, -1))
      target = Array.isArray(target) ? target.find((x) => x.id === key) : target[key];
    const key = c.path.at(-1)!;
    if (key === '$order') {
      const order = c.remote as string[];
      target.sort((a: any, b: any) => {
        const x = order.indexOf(a.id),
          y = order.indexOf(b.id);
        return (x < 0 ? Infinity : x) - (y < 0 ? Infinity : y);
      });
    } else if (Array.isArray(target)) {
      const index = target.findIndex((x) => x.id === key);
      if (c.remote === undefined) {
        if (index >= 0) target.splice(index, 1);
      } else if (index >= 0) target[index] = structuredClone(c.remote);
      else target.push(structuredClone(c.remote));
    } else if (c.remote === undefined) delete target[key];
    else target[key] = structuredClone(c.remote);
  });
  return next as CloudPlan;
}
