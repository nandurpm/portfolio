import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, readCachedSession } from './client';
import {
  cloudPlan,
  equal,
  localPlan,
  mergePlans,
  resolveConflicts,
  type CloudPlan,
  type Conflict,
} from './model';
import { store } from '../store';
import { WEB_APP } from '../web-mode';
interface Remote {
  data: CloudPlan;
  revision: number;
}
interface Review {
  plan: CloudPlan;
  remote: Remote;
  conflicts: Conflict[];
}
interface State {
  session: Session | null;
  status: string;
  error: string;
  locked: boolean;
  initial: Remote | null | undefined;
  review: Review | null;
  busy: boolean;
}
let state: State = {
  session: null,
  status: 'Local only',
  error: '',
  locked: false,
  initial: undefined,
  review: null,
  busy: false,
};
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};
let authEpoch = 0;
let started = false,
  running = false,
  rerun = false,
  timer: ReturnType<typeof setTimeout> | undefined;
let cleanups: (() => void)[] = [];
function queue(delay = 700) {
  clearTimeout(timer);
  timer = setTimeout(() => void sync.run(), delay);
}
const meta = (ownerId: string, r: Remote) => ({
  ownerId,
  base: r.data,
  revision: r.revision,
  lastSyncAt: new Date().toISOString(),
});
function mergeSafe(base: CloudPlan, local: CloudPlan, remote: CloudPlan) {
  const result = mergePlans(base, local, remote);
  try {
    localPlan(result.plan, store.get().data);
  } catch {
    return { plan: local, conflicts: [{ path: [], local, remote }] };
  }
  return result;
}
async function fetchRemote(): Promise<Remote | null> {
  const { data, error } = await supabase
    .from('tracker_plans')
    .select('data,revision')
    .eq('user_id', state.session!.user.id)
    .maybeSingle();
  if (error) throw error;
  if (
    data &&
    !data.data.additionalLoans &&
    store.get().sync?.base.additionalLoans?.length &&
    store.get().data.additionalLoans?.length
  )
    throw Error(
      'Another device saved an older plan format. Your additional loans are preserved locally. Update that device before syncing again.',
    );
  if (data)
    for (const field of ['reconciliations', 'provisions'] as const) {
      if (
        store.get().sync?.base[field]?.length &&
        store.get().data[field]?.length &&
        data.data[field] === undefined
      )
        throw Error(
          `Another device omitted ${field}. Sync paused to preserve the local records. Update all devices and review a full backup before continuing.`,
        );
    }
  if (data) data.data = cloudPlan(localPlan(data.data, store.get().data));
  return data;
}
export const sync = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => state,
  retryInitial() {
    if (state.initial === null) emit({ initial: undefined });
  },
  async start() {
    if (started) return;
    started = true;
    emit({ locked: !!store.get().sync?.ownerId, status: 'Checking sign-in' });
    const applySession = (session: Session | null) => {
      const owner = store.get().sync?.ownerId;
      emit({
        session,
        locked: !!owner && session?.user.id !== owner,
        status: session ? 'Ready to sync' : owner ? 'Sign in to unlock' : 'Local only',
        initial: undefined,
        review: null,
        error: '',
      });
      if (session) queue(0);
    };
    const cached = await readCachedSession();
    if (cached) {
      applySession(cached);
      const epoch = authEpoch;
      void supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (epoch !== authEpoch) return;
          if (error) {
            emit({
              error: error.message,
              status: 'Offline or sign-in needs attention — local changes retained',
            });
            return;
          }
          if (state.session?.user.id === data.session?.user.id) emit({ session: data.session });
          else applySession(data.session);
        })
        .catch((error) => emit({ error: String(error) }));
    } else {
      const { data, error } = await supabase.auth.getSession();
      applySession(data.session);
      if (error) emit({ error: error.message });
    }
    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (state.session?.user.id !== session?.user.id) {
          authEpoch++;
          applySession(session);
        } else emit({ session });
      });
    });
    cleanups.push(() => authListener?.data?.subscription.unsubscribe());
    cleanups.push(
      store.subscribe(() => {
        if (state.session && !state.review && !state.locked && state.initial === undefined) queue();
      }),
    );
    const poll = setInterval(() => {
      if (!document.hidden && navigator.onLine) queue(0);
    }, 15000);
    const online = () => queue(0);
    window.addEventListener('online', online);
    const visible = () => {
      if (!document.hidden) {
        void store.refreshHealth();
        queue(0);
      }
    };
    document.addEventListener('visibilitychange', visible);
    cleanups.push(
      () => clearInterval(poll),
      () => window.removeEventListener('online', online),
      () => document.removeEventListener('visibilitychange', visible),
    );
  },
  stop() {
    started = false;
    authEpoch++;
    clearTimeout(timer);
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
  },
  async run() {
    if (running) {
      rerun = true;
      return;
    }
    const session = state.session;
    if (
      !session ||
      state.locked ||
      state.review ||
      state.initial !== undefined ||
      store.status()[0].startsWith('Recovery needed')
    )
      return;
    if (!navigator.onLine) {
      emit({ status: 'Offline — changes stay on this device' });
      return;
    }
    running = true;
    try {
      emit({ busy: true, error: '', status: 'Synchronizing…' });
      await store.flush();
      const envelope = store.get(),
        local = cloudPlan(envelope.data),
        base = envelope.sync;
      if (!base) {
        const remote = await fetchRemote();
        emit({ initial: remote, status: 'Choose initial sync' });
        return;
      }
      if (base.ownerId !== session.user.id)
        throw Error(
          'This device is linked to a different account. Sign in with its original account.',
        );
      const { data: version, error: versionError } = await supabase
        .from('tracker_plans')
        .select('revision')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (versionError) throw versionError;
      if (version?.revision === base.revision && equal(local, base.base)) {
        emit({ status: 'Up to date' });
        return;
      }
      if (!version)
        throw Error(
          'The cloud plan is missing. Your local data has been preserved. Restore the cloud project before resuming.',
        );
      const remote =
        version.revision === base.revision
          ? { data: base.base, revision: base.revision }
          : (await fetchRemote())!;
      if (state.session?.user.id !== session.user.id) return;
      if (!equal(local, cloudPlan(store.get().data))) {
        rerun = true;
        return;
      }
      const merged = mergeSafe(base.base, local, remote.data);
      if (merged.conflicts.length) {
        emit({ review: { ...merged, remote }, status: 'Review conflicting edits' });
        return;
      }
      if (equal(merged.plan, remote.data)) {
        store.acceptCloud(merged.plan, meta(session.user.id, remote));
        await store.flush();
        emit({ status: 'Up to date' });
        return;
      }
      const { data: reply, error } = await supabase.rpc('tracker_save_plan', {
        p_data: merged.plan,
        p_expected_revision: remote.revision,
        p_mutation_id: crypto.randomUUID(),
      });
      if (error) throw error;
      if (state.session?.user.id !== session.user.id) return;
      if (!reply.ok) {
        rerun = true;
        return;
      }
      const accepted: Remote = { data: reply.data, revision: reply.revision };
      const latest = cloudPlan(store.get().data),
        combined = mergeSafe(local, latest, accepted.data);
      if (combined.conflicts.length) {
        emit({ review: { ...combined, remote: accepted }, status: 'Review conflicting edits' });
        return;
      }
      store.acceptCloud(combined.plan, meta(session.user.id, accepted));
      await store.flush();
      emit({ status: 'Up to date' });
      if (!equal(combined.plan, accepted.data)) rerun = true;
    } catch (error) {
      emit({
        status: navigator.onLine ? 'Sync needs attention' : 'Offline — changes stay on this device',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      running = false;
      emit({ busy: false });
      if (rerun) {
        rerun = false;
        queue(500);
      }
    }
  },
  async connect(choice: 'cloud' | 'device') {
    if (!state.session || state.initial === undefined)
      throw Error('Sign in and load the cloud plan first.');
    emit({ busy: true, error: '' });
    try {
      await store.flush();
      // Keep an independent pre-link copy before replacing any local plan.
      if (window.desktop) await store.backup();
      else localStorage.setItem('tracker-before-sync', JSON.stringify(store.get()));
      const initial = state.initial;
      if (choice === 'cloud' && initial) {
        store.acceptCloud(initial.data, meta(state.session.user.id, initial));
      } else {
        const local = cloudPlan(store.get().data);
        const { data: reply, error } = await supabase.rpc('tracker_save_plan', {
          p_data: local,
          p_expected_revision: initial?.revision ?? 0,
          p_mutation_id: crypto.randomUUID(),
        });
        if (error) throw error;
        if (!reply.ok) {
          emit({ initial: await fetchRemote() });
          throw Error('Cloud data changed. Review the refreshed counts before connecting.');
        }
        store.acceptCloud(
          local,
          meta(state.session.user.id, { data: reply.data, revision: reply.revision }),
        );
      }
      await store.flush();
      emit({ initial: undefined, status: 'Up to date' });
      queue(0);
    } catch (error) {
      emit({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      emit({ busy: false });
    }
  },
  async resolve(choices: ('local' | 'remote')[]) {
    const review = state.review;
    if (!review || !state.session) return;
    const result =
      choices[0] === 'remote' && review.conflicts[0]?.path.length === 0
        ? review.remote.data
        : resolveConflicts(review.plan, review.conflicts, choices);
    // A validation failure preserves the review and both versions.
    store.acceptCloud(result, meta(state.session.user.id, review.remote));
    await store.flush();
    emit({ review: null, error: '', status: 'Ready to sync' });
    queue(0);
  },
  async signOut() {
    if (WEB_APP) {
      await store.flush();
      if (store.get().sync && !equal(cloudPlan(store.get().data), store.get().sync!.base)) {
        await sync.run();
        if (!equal(cloudPlan(store.get().data), store.get().sync!.base))
          throw Error(
            'Your latest changes have not synced. Connect and Sync now before signing out. Export a JSON backup in Reports if you need a separate copy.',
          );
      }
    }
    authEpoch++;
    await store.flush();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    if (WEB_APP) await store.clearBrowserData();
  },
};
export const useCloud = () => useSyncExternalStore(sync.subscribe, sync.get);
