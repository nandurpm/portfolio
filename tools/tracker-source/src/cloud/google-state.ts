import { useSyncExternalStore } from 'react';

export let googleState = { pending: false, error: '' };
const listeners = new Set<() => void>();
export function publishGoogleAuth(next: typeof googleState) {
  googleState = next;
  listeners.forEach((listener) => listener());
}
export const useGoogleAuth = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    () => googleState,
let state = { pending: false, error: '' };
const listeners = new Set<() => void>();
export const publishGoogleState = (next: typeof state) => {
  state = next;
  listeners.forEach((fn) => fn());
};
export const getGoogleState = () => state;
export const useGoogleAuth = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    () => state,
  );
