import { createClient, type Session } from '@supabase/supabase-js';
import config from './config.json';
import { WEB_APP } from '../web-mode';
const storage = {
  getItem: async (key: string) =>
    window.desktop?.sessionGet ? window.desktop.sessionGet(key) : sessionStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    if (window.desktop?.sessionSet) await window.desktop.sessionSet(key, value);
    else sessionStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (window.desktop?.sessionRemove) await window.desktop.sessionRemove(key);
    else sessionStorage.removeItem(key);
  },
};
export const supabase = createClient(config.url, config.publishableKey, {
  auth: {
    storage,
    storageKey: 'tracker-auth-v1',
    persistSession: true,
    autoRefreshToken: WEB_APP,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// A previously signed-in native device may open its local plan while offline.
// This cached identity never authorizes cloud requests: Supabase still verifies every token.
export async function readCachedSession(): Promise<Session | null> {
  try {
    const raw = await storage.getItem('tracker-auth-v1');
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value?.user?.id === 'string' &&
      typeof value.access_token === 'string' &&
      typeof value.refresh_token === 'string'
      ? value
      : null;
  } catch {
    return null;
  }
}
