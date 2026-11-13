import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { financialFixture } from './fixtures/financial';

const state = vi.hoisted(() => ({ from: '', through: '2026-11-30' }));
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>();
  return {
    ...react,
    useState: (initial: unknown) => react.useState(
      initial && typeof initial === 'object' && 'fromDate' in initial
        ? { ...initial, fromDate: state.from, throughDate: state.through }
        : initial,
    ),
  };
});
vi.mock('../src/store', () => ({ usePlan: () => financialFixture().data, store: {} }));
vi.mock('../src/components/UI', async importOriginal => ({
  ...await importOriginal<typeof import('../src/components/UI')>(),
  useUi: () => ({ toast: vi.fn(), confirm: vi.fn() }),
}));
import Balances from '../src/pages/Balances';

describe('reconciliation preview date editing', () => {
  it.each([
    ['', '2026-11-30'],
    ['2026-11-01', ''],
    ['2026-11-02', '2026-11-01'],
    ['2026-02-30', '2026-11-30'],
  ])('renders an incomplete or invalid interval %s to %s safely', (from, through) => {
    Object.assign(state, { from, through });
    const html = renderToStaticMarkup(<Balances />);
    expect(html).toContain('Choose a valid date range to preview the recorded balance.');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save comparison/);
    expect(html).not.toContain('NaN');
  });
  it('restores the recorded preview for a valid single-day interval', () => {
    Object.assign(state, { from: '2026-11-01', through: '2026-11-01' });
    const html = renderToStaticMarkup(<Balances />);
    expect(html).toContain('Recorded balance:');
    expect(html).toContain('₹500.00');
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Save comparison/);
  });
});
