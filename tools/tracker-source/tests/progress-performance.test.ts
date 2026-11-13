import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { actual, cumulative, emptyTotals, finish, planned, progress, round } from '../src/domain/calculate';
import { addMonths, inRange, monthEnd, monthsBetween } from '../src/domain/dates';
import { ledgerCashEffect, ledgerPeriod, reportCategories, reverseLedgerTransaction } from '../src/domain/ledger';
import { enablePfAccount, pfCashEffect } from '../src/domain/employment';
import type { Plan } from '../src/domain/types';

/** Deliberately independent full scan, matching the pre-optimization aggregation
 * order. Do not optimize this test oracle along with production indexing. */
function referenceActual(p: Plan, start: string, end: string, categoryId?: string) {
  const totals = emptyTotals();
  const cats = new Map(p.categories.map(c => [c.id, c]));
  for (const entry of p.entries) {
    if (!inRange(entry.date, p.settings.planStart, p.settings.planEnd) || entry.date < start || entry.date > end || (categoryId && entry.categoryId !== categoryId)) continue;
    const c = cats.get(entry.categoryId);
    if (c && c.group !== 'Asset') totals[c.group === 'Income' ? 'income' : c.group === 'Living' ? 'living' : 'debt'] += entry.amount;
  }
  const from = start > p.settings.planStart + '-01' ? start : p.settings.planStart + '-01';
  const through = end < monthEnd(p.settings.planEnd) ? end : monthEnd(p.settings.planEnd);
  const ledger = ledgerPeriod(p, from, through, categoryId);
  const debt = reportCategories(p).filter(c => c.group === 'Debt' && (!categoryId || c.id === categoryId))
    .reduce((sum, c) => sum + ledgerPeriod(p, from, through, c.id).expenses, 0);
  totals.income += ledger.income; totals.debt += debt; totals.living += ledger.expenses - debt;
  return finish(totals);
}

function fixture() {
  const p = financialFixture().data;
  p.settings.planEnd = '2028-03'; p.settings.viewEnd = '2028-03';
  p.accounts = [
    { id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 500, active: true, note: '' },
    { id: 'wallet', name: 'Wallet', kind: 'wallet', openingBalance: 0, active: true, note: '' },
  ];
  p.ledgerTransactions = [
    { id: 'transfer', kind: 'transfer', amount: 10.01, feeAmount: 0.02, date: '2026-12-31', sourceAccountId: 'bank', destinationAccountId: 'wallet', description: 'Synthetic transfer', note: '' },
    { id: 'income', kind: 'income', amount: 25.01, date: '2027-01-01', destinationAccountId: 'bank', incomeCategoryId: 'salary', description: 'Synthetic income', note: '' },
    { id: 'expense', kind: 'expense', amount: 2.03, date: '2027-01-02', sourceAccountId: 'bank', expenseCategoryId: 'bill', description: 'Synthetic expense', note: '' },
    { id: 'refund', kind: 'refund', amount: 1.01, date: '2027-02-01', destinationAccountId: 'bank', originalTransactionId: 'expense', description: 'Synthetic refund', note: '' },
  ];
  reverseLedgerTransaction(p, 'transfer', '2027-01-03', 'Synthetic correction');
  enablePfAccount(p);
  p.pfMovements = [
    { id: 'pf-in', kind: 'contribution', source: 'cash', amount: 5.01, date: '2026-12-31', payment: 'Bank', note: '' },
    { id: 'pf-out', kind: 'claim', source: 'cash', amount: 2.01, date: '2027-01-01', payment: 'Bank', note: '' },
  ];
  const dates = ['2026-10-31', '2026-11-01', '2026-12-31', '2027-01-01', '2027-02-28', '2028-02-29', '2028-04-01'];
  p.entries = Array.from({ length: 70 }, (_, i) => ({ id: 'entry-' + i, date: dates[i % dates.length]!, categoryId: ['salary', 'bill', 'emi'][i % 3]!, amount: [0.005, 0.015, 10.075, 100.01][i % 4]!, payment: 'Bank', description: 'Legacy synthetic precision', notes: '' }));
  return p;
}

describe('indexed progress preserves financial results', () => {
  it.each(['2026-10-31', '2026-11-01', '2026-12-31', '2027-01-01', '2027-02-28', '2028-02-29', '2028-04-01'])(
    'matches independent ordered scans at cutoff %s', date => {
      const p = fixture(), before = structuredClone(p);
      const rows = progress(p, date);
      let expected = p.settings.opening;
      for (const row of rows) {
        const start = row.month + '-01', cutoff = date < monthEnd(row.month) ? date : monthEnd(row.month);
        const future = row.month > date.slice(0, 7);
        const monthly = referenceActual(p, start, cutoff);
        expect(actual(p, start, cutoff)).toEqual(monthly);
        for (const category of p.categories) expect(actual(p, start, cutoff, category.id)).toEqual(referenceActual(p, start, cutoff, category.id));
        const count = p.entries.filter(e => e.date <= date && inRange(e.date, p.settings.planStart, p.settings.planEnd) && e.date.slice(0, 7) === row.month && p.categories.some(c => c.id === e.categoryId && c.group !== 'Asset')).length + ledgerPeriod(p, start, cutoff).count;
        const plan = planned(p, row.month);
        expected = round(expected + plan.savings + (future ? 0 : pfCashEffect(p, start, cutoff)));
        expect(row.plan).toEqual(plan);
        expect(row.count).toBe(count);
        expect(row.actual).toEqual(count ? monthly : null);
        expect(row.expectedCash).toBe(future ? null : expected);
        if (future) expect(row.recordedCash).toBeNull();
        else {
          const ledger = ledgerPeriod(p, p.settings.planStart + '-01', cutoff);
          const totals = referenceActual(p, p.settings.planStart + '-01', cutoff);
          const cash = round(p.settings.opening + totals.savings + pfCashEffect(p, p.settings.planStart + '-01', cutoff) + ledgerCashEffect(p, p.settings.planStart + '-01', cutoff) - ledger.income + ledger.expenses);
          expect(row.recordedCash).toBe(cash);
          expect(cumulative(p, cutoff).actualCash).toBe(cash);
        }
      }
      expect(p).toEqual(before);
    },
  );
  it('recomputes after an in-place edit without a stale object-identity cache', () => {
    const p = fixture();
    const before = progress(p, '2026-11-30')[0]!.recordedCash!;
    p.entries.find(e => e.date === '2026-11-01')!.amount += 1;
    expect(progress(p, '2026-11-30')[0]!.recordedCash).not.toBe(before);
  });
  it('keeps a 288-month, 1000-entry report below the broad server regression budget', () => {
    const p = financialFixture().data;
    p.settings.planEnd = addMonths(p.settings.planStart, 287);
    p.entries = Array.from({ length: 1000 }, (_, i) => ({ id: 'entry-' + i, date: addMonths(p.settings.planStart, i % 288) + '-01', categoryId: i % 2 ? 'bill' : 'salary', amount: 10, payment: 'Bank', description: 'Synthetic benchmark', notes: '' }));
    const start = performance.now();
    const rows = progress(p, monthEnd(p.settings.planEnd));
    const duration = performance.now() - start;
    expect(rows).toHaveLength(monthsBetween(p.settings.planStart, p.settings.planEnd).length);
    expect(duration).toBeLessThan(1500);
    expect(rows.at(-1)!.recordedCash).toBe(500);
  });
});
