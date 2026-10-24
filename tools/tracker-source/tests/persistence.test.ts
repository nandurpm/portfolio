import { afterEach, describe, it, expect, vi } from 'vitest';
import { financialFixture } from './fixtures/financial';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set('savings-expence-v1', initial);
  const api = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', api);
  return { values, api };
}
describe('local persistence protection', () => {
  it('retains unsaved changes and recovers a failed save through retry', async () => {
    const { api, values } = storage(JSON.stringify(financialFixture()));
    const { store } = await import('../src/store');
    await store.load();
    api.setItem.mockImplementation(() => {
      throw Error('Storage quota exceeded');
    });
    store.change('Update opening', (d) => {
      d.settings.opening = 600;
    });
    await expect(store.retrySave()).rejects.toThrow('quota');
    expect(store.get().data.settings.opening).toBe(600);
    expect(JSON.parse(values.get('savings-expence-v1')!).data.settings.opening).toBe(500);
    api.setItem.mockImplementation((k, v) => {
      values.set(k, v);
    });
    await store.retrySave();
    expect(JSON.parse(values.get('savings-expence-v1')!).data.settings.opening).toBe(600);
  });
  it('locks a corrupt plan without overwriting the original', async () => {
    const { values } = storage('{broken');
    const { store } = await import('../src/store');
    await store.load();
    expect(() =>
      store.change('Unsafe edit', (d) => {
        d.settings.opening = 0;
      }),
    ).toThrow('paused');
    expect(values.get('savings-expence-v1')).toBe('{broken');
    expect(values.get('savings-expence-v1-corrupt')).toBe('{broken');
  });
  it('restores a valid older backup without leaving newer optional records attached, and supports undo', async () => {
    const current = financialFixture();
    current.data.reconciliations = [
      {
        id: 'new',
        label: 'New',
        fromDate: '2026-11-01',
        throughDate: '2026-11-30',
        openingBalance: 0,
        statementBalance: 0,
        methods: [],
        note: '',
      },
    ];
    storage(JSON.stringify(current));
    const { store } = await import('../src/store');
    await store.load();
    store.restore(financialFixture());
    expect(store.get().data.reconciliations).toEqual([]);
    store.undo();
    expect(store.get().data.reconciliations).toHaveLength(1);
    await store.retrySave();
  });
});
