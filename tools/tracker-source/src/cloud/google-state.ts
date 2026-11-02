import { useSyncExternalStore } from 'react';
let state = { pending: false, error: '' };
const listeners = new Set<() => void>();
export const publishGoogleState = (next: typeof state) => {
  state = next;
  listeners.forEach((fn) => fn());
};
export const useGoogleAuth = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    () => state,
  );
