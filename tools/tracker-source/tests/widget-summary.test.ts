import { describe, expect, it } from 'vitest';
import { actual } from '../src/domain/calculate';
import { widgetAccess, widgetAction, widgetSummary, type WidgetContext } from '../src/domain/widget-summary';
import { widgetCoordinator, type WidgetTransport } from '../src/widgets/coordinator';
import { financialFixture } from './fixtures/financial';
import type { LedgerTransaction } from '../src/domain/types';

const context = (): WidgetContext => ({ plan: financialFixture().data, loading: false, locked: false,
  needsAttention: false, online: true, syncPending: false });
const now = () => new Date(2026, 10, 8, 12);
describe('native widget shared financial contract', () => {
  it('matches recorded totals, excludes principal transfers and opening cash, and ignores the dashboard cutoff', () => {
    const c = context(), p = c.plan;
    p.settings.selectedMonth = '2027-02'; p.settings.reportDate = '2027-02-28';
    p.entries.push({ id: 'salary', date: '2026-11-03', categoryId: 'salary', description: '', amount: 1000.15, payment: 'UPI', notes: '' },
      { id: 'bill', date: '2026-11-04', categoryId: 'bill', description: '', amount: 200.05, payment: 'Cash', notes: '' },
      { id: 'future', date: '2026-11-09', categoryId: 'bill', description: '', amount: 50, payment: 'Cash', notes: '' },
      { id: 'old', date: '2026-10-31', categoryId: 'salary', description: '', amount: 3000, payment: 'Bank', notes: '' });
    p.accounts = [
      { id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 50000, active: true, note: '' },
      { id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 100, active: true, note: '' },
      { id: 'loan', name: 'Loan', kind: 'liability', openingBalance: 0, active: true, note: '' },
    ];
    const row = (value: Partial<LedgerTransaction> & Pick<LedgerTransaction, 'id' | 'kind' | 'amount'>): LedgerTransaction =>
      ({ date: '2026-11-05', description: '', note: '', ...value });
    p.ledgerTransactions = [
      row({ id: 'transfer', kind: 'transfer', amount: 300, sourceAccountId: 'bank', destinationAccountId: 'cash', feeAmount: 2 }),
      row({ id: 'borrow', kind: 'borrow', amount: 500, sourceAccountId: 'loan', destinationAccountId: 'bank' }),
      row({ id: 'repay', kind: 'principal-repayment', amount: 100, interestAmount: 3.10, sourceAccountId: 'bank', destinationAccountId: 'loan' }),
      row({ id: 'extra', kind: 'income', amount: 10.05, destinationAccountId: 'bank' }),
      row({ id: 'buy', kind: 'expense', amount: 6.25, sourceAccountId: 'cash' }),
    ];
    expect(widgetSummary(c, now())).toMatchObject({ month: '2026-11', income: '₹1,010.20', expenses: '₹211.40', savings: '₹798.80', status: 'ready' });
    const result = actual(p, '2026-11-01', '2026-11-08');
    expect([result.income, result.expenses, result.savings]).toEqual([1010.2, 211.4, 798.8]);
  });
  it('refreshes after edits/deletions, uses the local calendar across years, and distinguishes unavailable data', () => {
    const c = context();
    expect(widgetSummary(c, now())).toMatchObject({ status: 'empty', income: '₹0.00' });
    c.plan.entries.push({ id: 'e', date: '2026-11-01', categoryId: 'bill', description: '', amount: 0.29, payment: 'UPI', notes: '' });
    expect(widgetSummary(c, now()).expenses).toBe('₹0.29');
    c.plan.entries[0]!.amount = 12.35;
    expect(widgetSummary(c, now()).savings).toBe('−₹12.35');
    c.plan.entries = [];
    expect(widgetSummary(c, now()).status).toBe('empty');
    expect(widgetSummary(c, new Date(2027, 0, 1, 0, 1)).month).toBe('2027-01');
    expect(widgetSummary(c, new Date(2028, 0, 1))).toMatchObject({ status: 'outside_plan', income: '—', expenses: '—' });
    c.online = false;
    expect(widgetSummary(c, now()).offline).toBe(true);
  });
  it('does not expose a signed-out, different, unlinked, locked or unrecovered account', () => {
    const c = context();
    expect(widgetAccess(c)).toEqual({ owner: 'local', access: 'ready' });
    c.planOwner = 'alice';
    expect(widgetAccess(c).access).toBe('signed_out');
    c.userId = 'bob';
    expect(widgetAccess(c)).toEqual({ owner: '', access: 'locked' });
    c.userId = 'alice'; c.needsAttention = true;
    expect(widgetAccess(c).access).toBe('attention');
    c.needsAttention = false; c.locked = true;
    expect(widgetAccess(c).access).toBe('locked');
    c.locked = false; c.loading = true;
    expect(widgetAccess(c).access).toBe('loading');
    c.loading = false;
    expect(widgetAccess(c)).toEqual({ owner: 'alice', access: 'ready' });
    delete c.planOwner;
    expect(widgetAccess(c).access).toBe('attention');
  });
});

describe('widget navigation and refresh lifecycle', () => {
  it('defers quick entry until unlocked, consumes once and only calls navigation', async () => {
    const c = context(); c.planOwner = 'alice';
    let action: string | null = 'expense';
    const writes: Parameters<WidgetTransport['updateWidgets']>[0][] = [], opened: string[] = [];
    const transport: WidgetTransport = {
      beginWidgets: async () => ({ epoch: 7 }),
      updateWidgets: async value => { writes.push(value); },
      consumeWidgetAction: async () => { const value = action; action = null; return { action: value }; },
    };
    const widget = widgetCoordinator(transport, () => c, value => opened.push(value), now);
    const before = JSON.stringify(c.plan);
    await widget.start();
    expect(opened).toEqual([]);
    expect(writes.at(-1)).toMatchObject({ access: 'signed_out', owner: '' });
    expect(writes.at(-1)?.snapshot).toBeUndefined();
    c.userId = 'alice'; widget.publish();
    expect(opened).toEqual(['expense']);
    await widget.consume();
    expect(opened).toEqual(['expense']);
    action = 'income'; await widget.consume();
    action = 'refresh'; await widget.consume();
    expect(opened).toEqual(['expense', 'income', 'refresh']);
    expect(JSON.stringify(c.plan)).toBe(before);
    c.userId = 'bob'; widget.publish();
    expect(writes.at(-1)).toMatchObject({ access: 'locked', owner: '' });
    expect(writes.at(-1)?.snapshot).toBeUndefined();
    const sequences = writes.map(value => value.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    widget.stop(); action = 'income'; await widget.consume(); widget.publish();
    expect(opened).toHaveLength(3);
    expect(widgetAction({ amount: 200, action: 'save' })).toBeNull();
  });
});
