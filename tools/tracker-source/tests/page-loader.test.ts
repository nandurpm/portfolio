import { expect, test, vi } from 'vitest';
import { cachedLoader } from '../src/page-loader';
test('intent and navigation share one in-flight module request', async () => {
  let resolve!: (value: string) => void;
  const load = vi.fn(() => new Promise<string>(r => { resolve = r; }));
  const module = cachedLoader(load);
  const intent = module();
  expect(module()).toBe(intent);
  resolve('screen');
  expect(await intent).toBe('screen');
  expect(await module()).toBe('screen');
  expect(load).toHaveBeenCalledTimes(1);
});
test('a failed speculative request can retry on navigation', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('screen');
  const module = cachedLoader(load);
  await expect(module()).rejects.toThrow('offline');
  expect(await module()).toBe('screen');
  expect(load).toHaveBeenCalledTimes(2);
});
