import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { sessionPath } from '../electron/session-path';

describe('secure credential file routing', () => {
  it('keeps the existing session file and isolates auxiliary logout/PKCE keys', () => {
    const root = path.resolve('test-profile');
    const keys = [
      'tracker-auth-v1',
      'tracker-auth-v1-user',
      'tracker-auth-v1-code-verifier',
      'tracker-auth-v1-code-verifier-index',
      'tracker-auth-v1-code-verifier:flow-123',
    ];
    const files = keys.map((key) => sessionPath(root, key));
    expect(files[0]).toBe(path.join(root, 'auth-session.bin'));
    expect(new Set(files).size).toBe(keys.length);
    for (const file of files) expect(path.dirname(file)).toBe(root);
  });
  it('rejects foreign namespaces, traversal and oversized keys', () => {
    for (const key of [
      'other-auth',
      '../tracker-auth-v1',
      'tracker-auth-v1-../../secret',
      'tracker-auth-v1-',
      'tracker-auth-v1-' + 'x'.repeat(161),
    ]) {
      expect(() => sessionPath('/profile', key)).toThrow('Unknown session key');
    }
  });
});

// Exercise the installed SDK: its sign-out clears more than the primary session key.
it('allows the real Supabase SDK to finish local sign-out and clear auxiliary keys', async () => {
  const removed: string[] = [];
  const slots = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => slots.get(sessionPath('/profile', key)) ?? null,
    setItem: async (key: string, value: string) => {
      slots.set(sessionPath('/profile', key), value);
    },
    removeItem: async (key: string) => {
      slots.delete(sessionPath('/profile', key));
      removed.push(key);
    },
  };
  await storage.setItem('tracker-auth-v1-user', JSON.stringify({ user: {} }));
  await storage.setItem('tracker-auth-v1-code-verifier', JSON.stringify('old-verifier'));
  const client = createClient('https://example.supabase.co', 'public-test-key', {
    auth: {
      storage,
      storageKey: 'tracker-auth-v1',
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async () => {
        throw Error('Sign-out without a session must stay local');
      },
    },
  });
  const { error } = await client.auth.signOut({ scope: 'local' });
  expect(error).toBeNull();
  expect(removed).toContain('tracker-auth-v1-user');
  expect(removed).toContain('tracker-auth-v1-code-verifier');
  expect(slots.size).toBe(0);
});
