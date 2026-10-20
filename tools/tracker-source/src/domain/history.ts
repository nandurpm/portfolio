import { cloudPlan, localPlan } from '../cloud/model';
import { enablePatches, produceWithPatches, applyPatches, type Draft, type Patch } from 'immer';
import { APP_NAME, isAppFormat, type Envelope, type Plan, type Delta } from './types';
import { validatePlan } from './validation';
enablePatches();
export const MAX_AUDIT = 500;
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as any)[k] !== undefined),
    kb = Object.keys(b).filter((k) => (b as any)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual((a as any)[k], (b as any)[k]));
}
/** Keep history bounded so the saved file and every save stay small. */
export function trimHistory(e: Envelope): Envelope {
  if (e.audit.length <= MAX_AUDIT) return e;
  const audit = e.audit.slice(-MAX_AUDIT),
    ids = new Set(audit.map((a) => a.id));
  return {
    ...e,
    audit,
    undo: e.undo.filter((id) => ids.has(id)),
    redo: e.redo.filter((id) => ids.has(id)),
  };
}
const get = (root: unknown, path: (string | number)[]) => path.reduce<any>((o, k) => o?.[k], root);
const diff = (before: Plan, patches: Patch[]): Delta[] =>
  patches.map((p) => ({
    path: p.path,
    before: get(before, p.path),
    after: 'value' in p ? p.value : undefined,
    op: p.op,
  }));
export function commit(
  envelope: Envelope,
  label: string,
  recipe: (draft: Draft<Plan>) => void,
): Envelope {
  const [next, forward, inverse] = produceWithPatches(envelope.data, (draft) => {
    recipe(draft);
    synchronizePayments(draft, envelope.data);
  });
  if (!forward.length) return envelope;
  validatePlan(next);
  const id = crypto.randomUUID(),
    item = {
      id,
      at: new Date().toISOString(),
      label,
      changes: diff(envelope.data, forward),
      forward,
      inverse,
    };
  return trimHistory({
    ...envelope,
    data: next,
    audit: [...envelope.audit, item],
    undo: [...envelope.undo, id],
    redo: [],
  });
}
export function stepHistory(e: Envelope, direction: 'undo' | 'redo'): Envelope {
  const ids = e[direction],
    id = ids.at(-1);
  if (!id) return e;
  const action = e.audit.find((a) => a.id === id);
  if (!action) return e;
  const patches = direction === 'undo' ? action.inverse : action.forward,
    next = applyPatches(e.data, patches);
  validatePlan(next);
  const audit = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    label: `${direction === 'undo' ? 'Undo' : 'Redo'}: ${action.label}`,
    changes: diff(e.data, patches),
    forward: patches,
    inverse: direction === 'undo' ? action.forward : action.inverse,
  };
  return trimHistory({
    ...e,
    data: next,
    audit: [...e.audit, audit],
    undo: direction === 'undo' ? e.undo.slice(0, -1) : [...e.undo, id],
    redo: direction === 'redo' ? e.redo.slice(0, -1) : [...e.redo, id],
  });
}
export function revertAudit(e: Envelope, id: string): Envelope {
  const a = e.audit.find((x) => x.id === id);
  if (!a) throw Error('History item was not found.');
  // Reconstruct the state immediately after this action. History includes undo/redo
  // transitions, so replaying their inverses also works for imported legacy history.
  let original = e.data;
  try {
    for (const later of e.audit.slice(e.audit.indexOf(a) + 1).reverse())
      original = applyPatches(original, later.inverse);
    for (const patch of a.inverse) {
      for (let i = 0; i < patch.path.length; i++) {
        if (typeof patch.path[i] !== 'number') continue;
        const prefix = patch.path.slice(0, i);
        const before = get(original, prefix),
          now = get(e.data, prefix);
        if (!Array.isArray(before) || !Array.isArray(now)) throw Error('array changed');
        // Stable identities, not equal amounts, determine whether indices still match.
        const identity = (rows: any[]) =>
          rows.map((row) => (row && typeof row === 'object' && 'id' in row ? row.id : row));
        if (!deepEqual(identity(before), identity(now))) throw Error('rows moved');
      }
    }
  } catch {
    throw Error('Later changes moved or replaced rows. Use Undo, or edit the values directly.');
  }
  const next = applyPatches(e.data, a.inverse);
  // Patches address rows by position. If later edits moved, added or removed rows, the inverse
  // would hit the wrong row. Re-applying the original change must reproduce today's data exactly.
  if (!deepEqual(applyPatches(next, a.forward), e.data))
    throw Error('Later changes touch the same data. Use Undo, or edit the values directly.');
  validatePlan(next);
  return commit(e, `Revert: ${a.label}`, (draft) => {
    Object.assign(draft, next);
  });
}
export function envelopeFrom(raw: unknown): Envelope {
  if (!raw || typeof raw !== 'object') throw Error('Invalid backup');
  const e = raw as Envelope;
  if (!isAppFormat(e.format) || e.schemaVersion !== 1) throw Error('Unsupported backup format');
  const data = validatePlan(e.data);
  if (!Array.isArray(e.audit) || !Array.isArray(e.undo) || !Array.isArray(e.redo))
    throw Error('Missing history in backup');
  for (const a of e.audit) {
    if (!Array.isArray(a.forward) || !Array.isArray(a.inverse) || !Array.isArray(a.changes))
      throw Error('Invalid change history');
    for (const patch of [...a.forward, ...a.inverse])
      if (
        !Array.isArray(patch.path) ||
        patch.path.some((k) => ['__proto__', 'constructor', 'prototype'].includes(String(k)))
      )
        throw Error('Unsafe history path');
  }
  let checkedSync = e.sync;
  if (e.sync) {
    if (
      typeof e.sync.ownerId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.sync.ownerId) ||
      !Number.isSafeInteger(e.sync.revision) ||
      e.sync.revision < 1 ||
      typeof e.sync.lastSyncAt !== 'string'
    )
      throw Error('Invalid cloud-sync metadata in backup');
    checkedSync = { ...e.sync, base: cloudPlan(localPlan(e.sync.base, data)) };
  }
  return { ...e, format: APP_NAME, data, sync: checkedSync };
}

function synchronizePayments(p: Draft<Plan>, before: Plan) {
  const extraRows = (p.additionalLoans ?? []).flatMap((l) => l.rows);
  const allRows = [...p.loan.rows, ...extraRows];
  for (const e of p.entries) {
    if (!e.loanRowId) continue;
    const row = allRows.find((r) => r.id === e.loanRowId);
    const cat = p.categories.find((c) => c.id === e.categoryId);
    const extra = extraRows.some((r) => r.id === e.loanRowId);
    const owner = p.additionalLoans?.find((l) => l.rows.some((r) => r.id === e.loanRowId));
    if (
      !row ||
      (!extra && row.paidBeforeOpening) ||
      cat?.role !== 'emi' ||
      (owner && cat.loanId !== owner.id)
    ) {
      delete e.loanRowId;
      continue;
    }
  }
  for (const row of allRows) {
    const extra = extraRows.some((r) => r.id === row.id);
    if (row.paidBeforeOpening && !extra) continue;
    const receipts = p.entries.filter((e) => e.loanRowId === row.id);
    if (receipts.length) {
      row.paidAmount = Math.round(receipts.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
      if (row.paidAmount > row.emi)
        throw Error('Combined receipts cannot exceed the scheduled installment.');
      row.paid = row.paidAmount >= row.emi;
      row.paidDate = receipts
        .map((e) => e.date)
        .sort()
        .at(-1)!;
      if (extra)
        row.paidBeforeOpening = receipts.every((e) => e.date < `${p.settings.planStart}-01`);
    } else if (before.entries.some((e) => e.loanRowId === row.id)) {
      row.paid = false;
      row.paidAmount = 0;
      row.paidDate = '';
      if (extra) row.paidBeforeOpening = false;
    }
    // Imported schedule-only payments remain intact; never invent a transaction/date.
  }
}
