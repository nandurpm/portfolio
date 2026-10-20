import { useSyncExternalStore } from 'react';
import { localPlan, type CloudPlan, type SyncMeta } from './cloud/model';
import type { Draft } from 'immer';
import type { Envelope, Plan } from './domain/types';
import { freshEnvelope } from './domain/defaults';
import { commit, stepHistory, revertAudit, envelopeFrom, trimHistory } from './domain/history';
let current = freshEnvelope(),
  loaded = false,
  locked = false,
  status = 'Loading',
  warning = '',
  dataPath = 'Browser preview storage',
  lastSavedAt = '',
  lastBackupAt = '';
const listeners = new Set<() => void>();
type SaveState = readonly [
  status: string,
  warning: string,
  dataPath: string,
  savedAt: string,
  backupAt: string,
];
let saveState: SaveState = [status, warning, dataPath, lastSavedAt, lastBackupAt];
let pending: Promise<void> = Promise.resolve();
const emit = () => {
  saveState = [status, warning, dataPath, lastSavedAt, lastBackupAt];
  listeners.forEach((fn) => fn());
};
function requireEditable() {
  if (locked) throw Error('Changes are paused. Restore a JSON backup in Reports to continue.');
}
function persist() {
  if (locked) return;
  const snapshot = current;
  status = 'Saving';
  emit();
  pending = pending
    .catch(() => {})
    .then(async () => {
      try {
        if (window.desktop) await window.desktop.save(snapshot);
        else localStorage.setItem('savings-expence-v1', JSON.stringify(snapshot));
        lastSavedAt = new Date().toISOString();
        if (!window.desktop) localStorage.setItem('savings-expence-last-saved', lastSavedAt);
        status = 'Saved locally';
        warning = '';
      } catch (error) {
        status = 'Save failed';
        warning = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        emit();
      }
    });
  void pending.catch(() => {});
}
export const store = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => current,
  async load() {
    if (loaded) return;
    loaded = true;
    try {
      if (window.desktop) {
        const r = await window.desktop.load();
        dataPath = r.dataPath;
        if (r.envelope) current = envelopeFrom(r.envelope);
        warning = r.warning ?? '';
      } else {
        const raw = localStorage.getItem('savings-expence-v1');
        if (raw) {
          try {
            current = envelopeFrom(JSON.parse(raw));
          } catch (e) {
            try {
              localStorage.setItem('savings-expence-v1-corrupt', raw);
            } catch {}
            throw e;
          }
        }
      }
      if (window.desktop?.storageStatus) {
        const health = await window.desktop
          .storageStatus()
          .catch(() => ({ lastSavedAt: '', lastBackupAt: '' }));
        lastSavedAt = health.lastSavedAt;
        lastBackupAt = health.lastBackupAt;
      } else if (!window.desktop)
        lastSavedAt = localStorage.getItem('savings-expence-last-saved') ?? '';
      status = 'Saved locally';
    } catch (e) {
      locked = true;
      warning = `Could not load saved data: ${e instanceof Error ? e.message : String(e)}. Changes are paused so your stored data is not overwritten. Restore a JSON backup in Reports to continue.`;
      status = 'Recovery needed';
    }
    emit();
  },
  change(label: string, fn: (draft: Draft<Plan>) => void) {
    requireEditable();
    const next = commit(current, label, fn);
    if (next !== current) {
      current = next;
      persist();
    }
  },
  undo() {
    requireEditable();
    current = stepHistory(current, 'undo');
    persist();
  },
  redo() {
    requireEditable();
    current = stepHistory(current, 'redo');
    persist();
  },
  revert(id: string) {
    requireEditable();
    current = revertAudit(current, id);
    persist();
  },
  restore(e: Envelope) {
    const validated = envelopeFrom(e);
    const previous = current;
    const replaced = commit(previous, 'Restore backup', (d) => Object.assign(d, validated.data));
    const item = replaced === previous ? null : replaced.audit.at(-1)!;
    current = trimHistory({
      ...validated,
      sync: previous.sync,
      data: replaced.data,
      audit: item ? [...validated.audit, item] : validated.audit,
      // The restore itself can be undone, returning to the plan that was open before.
      undo: item ? [item.id] : [],
      redo: [],
    });
    locked = false;
    warning = '';
    persist();
  },
  acceptCloud(data: CloudPlan, meta: SyncMeta) {
    requireEditable();
    const plan = localPlan(data, current.data);
    current = {
      ...commit(current, 'Synchronize financial plan', (d) => {
        if (plan.additionalLoans === undefined) delete d.additionalLoans;
        Object.assign(d, plan);
      }),
      sync: meta,
    };
    persist();
  },
  async refreshHealth() {
    if (!window.desktop?.storageStatus) return;
    try {
      const health = await window.desktop.storageStatus();
      lastSavedAt = health.lastSavedAt;
      lastBackupAt = health.lastBackupAt;
      emit();
    } catch {}
  },
  async retrySave() {
    requireEditable();
    persist();
    await pending;
  },
  async backup() {
    requireEditable();
    if (!window.desktop)
      throw Error(
        'Automatic backup folders are available in the desktop app. Use Reports to export a JSON backup.',
      );
    await pending;
    const file = await window.desktop.backup();
    lastBackupAt = new Date().toISOString();
    emit();
    return file;
  },
  flush: () => pending,
  async clearBrowserData() {
    if (window.desktop)
      throw Error('Native financial profiles are not cleared by browser sign-out.');
    await pending;
    for (const key of [
      'savings-expence-v1',
      'savings-expence-v1-corrupt',
      'savings-expence-last-saved',
      'tracker-before-sync',
    ])
      localStorage.removeItem(key);
    current = freshEnvelope();
    locked = false;
    warning = '';
    lastSavedAt = '';
    lastBackupAt = '';
    status = 'Signed out';
    emit();
  },
  status: () => saveState,
};
export function usePlan() {
  return useSyncExternalStore(store.subscribe, () => store.get().data);
}
export function useEnvelope() {
  return useSyncExternalStore(store.subscribe, store.get);
}
export function useSaveStatus() {
  return useSyncExternalStore(store.subscribe, store.status);
}
