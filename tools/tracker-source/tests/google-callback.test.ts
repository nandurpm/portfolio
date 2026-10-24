import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
const api = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock('../src/cloud/client', () => ({
  supabase: { auth: { exchangeCodeForSession: api.exchange } },
}));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), getLaunchUrl: vi.fn() } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
const pendingKey = 'tracker-auth-v1-google-pending',
  verifier = 'tracker-auth-v1-code-verifier';
let saved: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  api.exchange.mockReset().mockResolvedValue({ data: {}, error: null });
  saved = new Map();
  vi.stubGlobal('window', {
    desktop: {
      sessionGet: async (k: string) => saved.get(k) ?? null,
      sessionRemove: async (k: string) => {
        saved.delete(k);
      },
      oauthCancel: async () => {},
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('Google callback security boundary (provider not contacted)', () => {
  it('accepts matching Windows and Android authorization-code callbacks', async () => {
    const g = await import('../src/cloud/google');
    for (const redirect of [g.WINDOWS_GOOGLE_REDIRECT, g.ANDROID_GOOGLE_REDIRECT])
      expect(g.parseGoogleCallback(redirect + '?code=synthetic-safe-code', redirect)).toBe(
        'synthetic-safe-code',
      );
  });
  it.each([
    'http://evil.invalid/auth/callback?code=synthetic',
    'http://127.0.0.1:43819/wrong?code=synthetic',
    'http://user:pass@127.0.0.1:43819/auth/callback?code=synthetic',
    'http://127.0.0.1:43819/auth/callback#access_token=synthetic',
    'http://127.0.0.1:43819/auth/callback?access_token=synthetic&code=synthetic',
    'http://127.0.0.1:43819/auth/callback?code=a&code=b',
    'http://127.0.0.1:43819/auth/callback?error=access_denied',
    'http://127.0.0.1:43819/auth/callback',
  ])('rejects foreign, implicit-token, duplicate or declined callbacks: %s', async (raw) => {
    const g = await import('../src/cloud/google');
    expect(() => g.parseGoogleCallback(raw, g.WINDOWS_GOOGLE_REDIRECT)).toThrow();
  });
  it('ignores unsolicited callback links', async () => {
    const g = await import('../src/cloud/google');
    await g.finishGoogleSignIn(g.WINDOWS_GOOGLE_REDIRECT + '?code=synthetic');
    expect(api.exchange).not.toHaveBeenCalled();
  });
  it('clears expired pending attempts without exchanging a code', async () => {
    const g = await import('../src/cloud/google');
    saved.set(
      pendingKey,
      JSON.stringify({ started: Date.now() - 11 * 60 * 1000, redirect: g.WINDOWS_GOOGLE_REDIRECT }),
    );
    saved.set(verifier, 'synthetic');
    await g.finishGoogleSignIn(g.WINDOWS_GOOGLE_REDIRECT + '?code=synthetic');
    expect(api.exchange).not.toHaveBeenCalled();
    expect(saved.size).toBe(0);
  });
  it('exchanges a valid pending attempt once and clears private verifier state', async () => {
    const g = await import('../src/cloud/google');
    saved.set(
      pendingKey,
      JSON.stringify({ started: Date.now(), redirect: g.WINDOWS_GOOGLE_REDIRECT }),
    );
    saved.set(verifier, 'synthetic');
    await g.finishGoogleSignIn(g.WINDOWS_GOOGLE_REDIRECT + '?code=synthetic');
    await g.finishGoogleSignIn(g.WINDOWS_GOOGLE_REDIRECT + '?code=synthetic');
    expect(api.exchange).toHaveBeenCalledTimes(1);
    expect(saved.size).toBe(0);
  });
});
