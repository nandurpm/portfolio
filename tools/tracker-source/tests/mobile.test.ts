import { afterEach, it, expect, vi } from 'vitest';
import { freshEnvelope } from '../src/domain/defaults';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock('@capacitor/core');
});
async function setup(text: string | null, backups: { name: string; text: string }[] = []) {
  const api = {
    load: async () => ({ text, dataPath: 'phone/plan.json' }),
    save: vi.fn().mockResolvedValue(undefined),
    confirmValid: vi.fn().mockResolvedValue(undefined),
    preserveCorrupt: vi.fn().mockResolvedValue(undefined),
    readBackups: async () => ({ items: backups }),
  };
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { documentElement: { dataset: {} } });
  vi.doMock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: () => true },
    registerPlugin: () => api,
  }));
  const { installMobile } = await import('../src/mobile');
  await installMobile();
  return api;
}
it('loads and marks a validated phone plan before allowing background backup', async () => {
  const e = freshEnvelope(),
    api = await setup(JSON.stringify(e));
  expect((await window.desktop!.load()).envelope?.data.settings.opening).toBe(0);
  expect(api.confirmValid).toHaveBeenCalledOnce();
  expect(api.save).not.toHaveBeenCalled();
});
it('preserves corruption and restores a valid phone backup before the next automatic backup', async () => {
  const e = freshEnvelope();
  e.data.settings.opening = 900;
  const api = await setup('broken', [
    { name: 'bad.json', text: 'bad' },
    { name: 'good.json', text: JSON.stringify(e) },
  ]);
  const loaded = await window.desktop!.load();
  expect(api.preserveCorrupt).toHaveBeenCalledOnce();
  expect(loaded.envelope?.data.settings.opening).toBe(900);
  expect(loaded.warning).toContain('good.json');
  expect(api.save).toHaveBeenCalledOnce();
});
it('locks phone edits if no valid backup can recover the plan', async () => {
  const api = await setup('broken');
  await expect(window.desktop!.load()).rejects.toThrow('editing is paused');
  expect(api.save).not.toHaveBeenCalled();
});
