import { useSyncExternalStore } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from './client';
import config from './config.json';

export const ANDROID_GOOGLE_REDIRECT = 'com.nandakumar.savingsexpensetracker://auth/callback';
export const WINDOWS_GOOGLE_REDIRECT = 'http://127.0.0.1:43819/auth/callback';
const pendingKey = 'tracker-auth-v1-google-pending';
const lifetime = 10 * 60 * 1000;
let state = { pending: false, error: '' };
const listeners = new Set<() => void>();
const publish = (next: typeof state) => {
  state = next;
  listeners.forEach((fn) => fn());
};
export const useGoogleAuth = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state,
  );
const readPending = async (): Promise<{ started: number; redirect: string } | null> => {
  const raw = await window.desktop?.sessionGet?.(pendingKey);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return typeof v.started === 'number' && typeof v.redirect === 'string' ? v : null;
  } catch {
    return null;
  }
};
async function clearPending() {
  await window.desktop?.sessionRemove?.(pendingKey);
  await window.desktop?.sessionRemove?.('tracker-auth-v1-code-verifier');
}
export function parseGoogleCallback(raw: string, redirect: string) {
  const u = new URL(raw),
    expected = new URL(redirect);
  if (
    u.protocol !== expected.protocol ||
    u.host !== expected.host ||
    u.pathname !== expected.pathname ||
    u.username ||
    u.password ||
    u.hash
  )
    throw Error('Invalid Google sign-in return address.');
  if (u.searchParams.has('access_token') || u.searchParams.has('refresh_token'))
    throw Error('Only secure authorization-code callbacks are accepted.');
  if (u.searchParams.has('error'))
    throw Error('Google sign-in was declined or could not finish. Please try again.');
  const codes = u.searchParams.getAll('code');
  const code = codes[0];
  if (codes.length !== 1 || !code || !/^[A-Za-z0-9._~-]{1,2048}$/.test(code))
    throw Error('Google did not return a valid sign-in code.');
  return code;
}
let completing = false,
  generation = 0;
export async function finishGoogleSignIn(raw: string) {
  if (completing) return;
  const attempt = generation;
  const p = await readPending();
  if (attempt !== generation || completing || !p) return; // Never accept unsolicited sign-in links.
  completing = true;
  try {
    if (Date.now() - p.started > lifetime || p.started > Date.now() + 30000)
      throw Error('Google sign-in expired. Please try again.');
    const code = parseGoogleCallback(raw, p.redirect);
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (result.error) throw result.error;
    await clearPending();
    publish({ pending: false, error: '' });
  } catch (e) {
    await clearPending();
    publish({
      pending: false,
      error: e instanceof Error ? e.message : 'Could not complete Google sign-in.',
    });
  } finally {
    completing = false;
  }
}
export async function cancelGoogleSignIn() {
  if (completing) return;
  generation++;
  await window.desktop?.oauthCancel?.();
  await clearPending();
  publish({ pending: false, error: '' });
}
export async function startGoogleSignIn() {
  if (state.pending || completing) return;
  const attempt = ++generation;
  publish({ pending: true, error: '' });
  try {
    const bridge = window.desktop;
    if (!bridge?.oauthOpen || !bridge.sessionSet)
      throw Error('Google sign-in requires the updated installed Windows or Android app.');
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey },
      signal: AbortSignal.timeout(10000),
    });
    if (attempt !== generation) return;
    if (!response.ok)
      throw Error('Could not check Google sign-in. Check your internet connection.');
    const providers = await response.json();
    if (attempt !== generation) return;
    if (!providers.external?.google)
      throw Error(
        'Google sign-in is not enabled yet. Use email/password for now. The app owner needs to finish Google sign-in setup.',
      );
    const settings = await supabase.auth.getSession();
    if (attempt !== generation) return;
    if (settings.data.session) throw Error('You are already signed in.');
    const redirect =
      bridge.platform === 'android' ? ANDROID_GOOGLE_REDIRECT : WINDOWS_GOOGLE_REDIRECT;
    await bridge.sessionSet(pendingKey, JSON.stringify({ started: Date.now(), redirect }));
    if (attempt !== generation) {
      await clearPending();
      return;
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirect,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (attempt !== generation) {
      await clearPending();
      return;
    }
    if (error) throw error;
    if (!data.url) throw Error('Google sign-in is not configured for this project.');
    const callback = await bridge.oauthOpen(data.url);
    if (attempt === generation && callback) await finishGoogleSignIn(callback);
  } catch (e) {
    // Cancellation may already have cleared this attempt.
    if (attempt === generation && state.pending) {
      await clearPending();
      publish({
        pending: false,
        error: e instanceof Error ? e.message : 'Could not open Google sign-in.',
      });
    }
  }
}
export async function installGoogleCallbacks() {
  if (!Capacitor.isNativePlatform()) return;
  await NativeApp.addListener('appUrlOpen', ({ url }) => {
    if (url.startsWith(ANDROID_GOOGLE_REDIRECT)) void finishGoogleSignIn(url);
  });
  const p = await readPending();
  if (p && Date.now() - p.started <= lifetime) publish({ pending: true, error: '' });
  else if (p) await clearPending();
  const launch = await NativeApp.getLaunchUrl();
  if (launch?.url?.startsWith(ANDROID_GOOGLE_REDIRECT)) await finishGoogleSignIn(launch.url);
}
