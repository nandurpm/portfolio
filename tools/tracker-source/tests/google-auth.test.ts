import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  oauth: vi.fn(),
  exchange: vi.fn(),
  listener: vi.fn(),
  launch: vi.fn(),
  native: false,
}));
vi.mock('../src/cloud/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.session,
      signInWithOAuth: mocks.oauth,
      exchangeCodeForSession: mocks.exchange,
    },
  },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native } }));
vi.mock('@capacitor/app', () => ({
  App: { addListener: mocks.listener, getLaunchUrl: mocks.launch },
}));
let data: Map<string, string>, open: ReturnType<typeof vi.fn>, bridge: Record<string, unknown>;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.native = false;
  data = new Map();
  open = vi.fn().mockResolvedValue(null);
  bridge = {
    platform: 'android',
    sessionGet: async (k: string) => data.get(k) ?? null,
    sessionSet: async (k: string, v: string) => {
      data.set(k, v);
    },
    sessionRemove: async (k: string) => {
      data.delete(k);
    },
    oauthOpen: open,
    oauthCancel: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal('window', { desktop: bridge });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { google: true } }) }),
  );
  mocks.session.mockResolvedValue({ data: { session: null } });
  mocks.oauth.mockImplementation(async () => {
    data.set('tracker-auth-v1-code-verifier', 'secret');
    return { data: { url: 'https://example.com/authorize' }, error: null };
  });
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.listener.mockResolvedValue({ remove: vi.fn() });
  mocks.launch.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
it('starts Google with PKCE redirect and without navigating the app WebView', async () => {
  const auth = await import('../src/cloud/google');
  await auth.startGoogleSignIn();
  expect(mocks.oauth).toHaveBeenCalledWith({
    provider: 'google',
    options: {
      redirectTo: auth.ANDROID_GOOGLE_REDIRECT,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  expect(open).toHaveBeenCalledOnce();
  expect(data.has('tracker-auth-v1-google-pending')).toBe(true);
});
it('exchanges one expected callback and clears encrypted pending state and verifier', async () => {
  const auth = await import('../src/cloud/google');
  await auth.startGoogleSignIn();
  await auth.finishGoogleSignIn(auth.ANDROID_GOOGLE_REDIRECT + '?code=valid-code');
  await auth.finishGoogleSignIn(auth.ANDROID_GOOGLE_REDIRECT + '?code=valid-code');
  expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith('valid-code');
  expect(data.size).toBe(0);
});
it('never accepts an unsolicited or expired callback', async () => {
  const auth = await import('../src/cloud/google');
  await auth.finishGoogleSignIn(auth.ANDROID_GOOGLE_REDIRECT + '?code=bad');
  data.set(
    'tracker-auth-v1-google-pending',
    JSON.stringify({ started: Date.now() - 700000, redirect: auth.ANDROID_GOOGLE_REDIRECT }),
  );
  await auth.finishGoogleSignIn(auth.ANDROID_GOOGLE_REDIRECT + '?code=bad');
  expect(mocks.exchange).not.toHaveBeenCalled();
});
it('rejects wrong origins, duplicate codes, token fragments and token query parameters', async () => {
  const a = await import('../src/cloud/google');
  for (const u of [
    'https://evil.example/auth/callback?code=x',
    a.ANDROID_GOOGLE_REDIRECT + 'evil?code=x',
    a.ANDROID_GOOGLE_REDIRECT + '?code=a&code=b',
    a.ANDROID_GOOGLE_REDIRECT + '#access_token=secret',
    a.ANDROID_GOOGLE_REDIRECT + '?code=a&refresh_token=secret',
  ])
    expect(() => a.parseGoogleCallback(u, a.ANDROID_GOOGLE_REDIRECT)).toThrow();
});
it('shows missing provider configuration without opening a browser', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { google: false } }) }),
  );
  const a = await import('../src/cloud/google');
  await a.startGoogleSignIn();
  expect(open).not.toHaveBeenCalled();
  expect(mocks.oauth).not.toHaveBeenCalled();
});
it('cancel ignores late return links and lets the next attempt start', async () => {
  const a = await import('../src/cloud/google');
  await a.startGoogleSignIn();
  await a.cancelGoogleSignIn();
  await a.finishGoogleSignIn(a.ANDROID_GOOGLE_REDIRECT + '?code=late');
  expect(mocks.exchange).not.toHaveBeenCalled();
  await a.startGoogleSignIn();
  expect(open).toHaveBeenCalledTimes(2);
});
it('uses loopback on Windows and completes the browser response', async () => {
  bridge.platform = 'windows';
  open.mockResolvedValue('http://127.0.0.1:43819/auth/callback?code=windows-code');
  const a = await import('../src/cloud/google');
  await a.startGoogleSignIn();
  expect(mocks.exchange).toHaveBeenCalledWith('windows-code');
});
it('handles Android cold-start return using encrypted pending attempt', async () => {
  mocks.native = true;
  const redirect = 'com.nandakumar.savingsexpensetracker://auth/callback';
  data.set('tracker-auth-v1-google-pending', JSON.stringify({ started: Date.now(), redirect }));
  mocks.launch.mockResolvedValue({ url: redirect + '?code=cold-start' });
  const a = await import('../src/cloud/google');
  await a.installGoogleCallbacks();
  expect(mocks.exchange).toHaveBeenCalledWith('cold-start');
  expect(mocks.listener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
});
it('cannot open browser after cancellation while provider settings are in flight', async () => {
  let reply!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(
      new Promise((r) => {
        reply = r;
      }),
    ),
  );
  const a = await import('../src/cloud/google');
  const pending = a.startGoogleSignIn();
  await a.cancelGoogleSignIn();
  reply({ ok: true, json: async () => ({ external: { google: true } }) });
  await pending;
  expect(open).not.toHaveBeenCalled();
  expect(data.size).toBe(0);
});

it('only exchanges once when warm and cold callbacks arrive together', async () => {
  const a = await import('../src/cloud/google');
  await a.startGoogleSignIn();
  await Promise.all([
    a.finishGoogleSignIn(a.ANDROID_GOOGLE_REDIRECT + '?code=same'),
    a.finishGoogleSignIn(a.ANDROID_GOOGLE_REDIRECT + '?code=same'),
  ]);
  expect(mocks.exchange).toHaveBeenCalledTimes(1);
});

it('handles the Android warm-start appUrlOpen event', async () => {
  mocks.native = true;
  const a = await import('../src/cloud/google');
  await a.installGoogleCallbacks();
  await a.startGoogleSignIn();
  const handler = mocks.listener.mock.calls[0][1];
  handler({ url: a.ANDROID_GOOGLE_REDIRECT + '?code=warm-start' });
  await vi.waitFor(() => expect(mocks.exchange).toHaveBeenCalledWith('warm-start'));
});
