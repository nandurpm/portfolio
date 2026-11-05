import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Plan } from '../src/domain/types';
import { financialFixture } from './fixtures/financial';
import { actual, money, savingsOverview } from '../src/domain/calculate';
import { netWorthSnapshot } from '../src/domain/net-worth';
const state = vi.hoisted(() => ({ plan: null as unknown as Plan }));
vi.mock('../src/store', () => ({ usePlan: () => state.plan, store: { change: vi.fn() } }));
vi.mock('../src/components/usePhone', () => ({ usePhone: () => false }));
import { AndroidHome } from '../src/components/AndroidHome';
const render = () => renderToStaticMarkup(<AndroidHome navigate={() => {}} addEntry={() => {}} />);
beforeEach(() => { state.plan = financialFixture().data; });
it('renders the shared dated financial results and never mutates stored records', () => {
  const p = state.plan;
  p.entries.push({ id: 'salary', categoryId: 'salary', date: '2026-11-10', amount: 1000, payment: 'Bank', description: 'Synthetic pay', notes: '' });
  p.entries.push({ id: 'expense', categoryId: 'bill', date: '2026-11-11', amount: 120, payment: 'Bank', description: 'Synthetic spend', notes: '' });
  p.settings.reportDate = '2026-11-15';
  const before = JSON.stringify(p), html = render();
  const a = actual(p, '2026-11-01', '2026-11-15');
  for (const value of [a.income, a.expenses, savingsOverview(p, '2026-11', '2026-11-15').month, netWorthSnapshot(p, '2026-11-15').spendable]) {
    expect(html).toContain(money(value));
  }
  expect(JSON.stringify(p)).toBe(before);
  expect(html).not.toContain('Full dashboard analysis');
  expect(html).toContain('View balance breakdown');
});
it('keeps recent movements on Android tablets and excludes future transactions from historical reports', () => {
  state.plan.settings.reportDate = '2026-11-15';
  state.plan.entries.push({ id: 'future', categoryId: 'bill', date: '2026-12-10', amount: 123, payment: 'Cash', description: 'FUTURE_SHOULD_NOT_APPEAR', notes: '' });
  const html = render();
  expect(html).toContain('Latest money movements');
  expect(html).not.toContain('FUTURE_SHOULD_NOT_APPEAR');
});
it('shows zero activity as an empty state rather than inventing transactions', () => {
  state.plan.entries = [];
  const html = render();
  expect(html).toContain('No activity yet');
  expect(html).toContain('No spending recorded');
});
