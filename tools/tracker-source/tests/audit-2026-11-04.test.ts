import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { validatePlan } from '../src/domain/validation';
import { provisionResult } from '../src/domain/balances';
import { archivedEntryCount } from '../src/domain/archive';
import { ledgerPeriod } from '../src/domain/ledger';
import type { Entry, LedgerTransaction } from '../src/domain/types';

const bank = {
  id: 'bank',
  name: 'Bank',
  kind: 'bank' as const,
  openingBalance: 500,
  active: true,
  note: '',
};

const expense = (date: string): LedgerTransaction => ({
  id: 'account-expense',
  date,
  kind: 'expense',
  amount: 50,
  sourceAccountId: 'bank',
  description: 'Test purchase',
  note: '',
});

const entry = (id: string, date: string, amount: number): Entry => ({
  id,
  date,
  categoryId: 'bill',
  amount,
  payment: 'Bank',
  description: 'Electricity bill',
  notes: '',
});

describe('2026-11-04 tracker audit regression checks', () => {
  it('rejects account ledger posts outside the plan at either boundary', () => {
    const p = financialFixture().data;
    p.accounts = [bank];
    for (const date of ['2026-10-15', '2027-03-01']) {
      p.ledgerTransactions = [expense(date)];
      expect(() => validatePlan(p)).toThrow(/Account transaction date must be inside the plan range/);
    }
    p.ledgerTransactions = [expense('2026-11-15')];
    expect(() => validatePlan(p)).not.toThrow();
  });

  it('does not spend earmarked reserves on unrelated category expenses', () => {
    const p = financialFixture().data;
    p.provisions = [{
      id: 'electricity-reserve',
      categoryId: 'bill',
      startMonth: '2026-11',
      firstDueMonth: '2026-12',
      everyMonths: 2,
      monthlyAmount: 150,
      billAmount: 300,
      openingReserve: 0,
      allocationDay: 10,
      dueDay: 25,
      enabled: true,
    }];
    p.entries = [
      entry('unrelated', '2026-11-10', 80),
      {
        ...entry('linked', '2026-11-11', 100),
        provisionId: 'electricity-reserve',
        billDueMonth: '2026-12',
      },
    ];
    validatePlan(p);
    expect(provisionResult(p, p.provisions[0]!, '2026-11-15')).toEqual({
      allocations: 150,
      payments: 100,
      reserve: 50,
    });
  });

  it('counts archived Daily Entries without including them in plan totals', () => {
    const p = financialFixture().data;
    p.entries = [
      entry('before', '2026-10-15', 10),
      entry('inside', '2026-11-15', 20),
      entry('after', '2027-03-01', 30),
    ];
    expect(() => validatePlan(p)).not.toThrow();
    expect(archivedEntryCount(p)).toBe(2);
  });

  it('counts account-only activity in the same month as Daily Entries', () => {
    const p = financialFixture().data;
    p.accounts = [bank];
    p.ledgerTransactions = [expense('2026-11-15')];
    p.entries = [entry('daily', '2026-11-12', 20)];
    expect(p.entries.filter((e) => e.date >= '2026-11-01' && e.date <= '2026-11-30').length
      + ledgerPeriod(p, '2026-11-01', '2026-11-30').count).toBe(2);
  });
});
