import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { assertEditedBillLinks } from '../src/domain/bill-schedule';
import { reverseLedgerTransaction, ledgerSummary } from '../src/domain/ledger';
import { validatePlan } from '../src/domain/validation';
import { actual, cumulative } from '../src/domain/calculate';
import { netWorthSnapshot } from '../src/domain/net-worth';
import { roundMoney } from '../src/domain/round-money';

function legacyBill() {
  const p = financialFixture().data;
  p.accounts = [{ id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 500, active: true, note: '' }];
  p.provisions = [{ id: 'bill-plan', categoryId: 'bill', startMonth: '2026-11', firstDueMonth: '2026-12', everyMonths: 2, monthlyAmount: 50, billAmount: 100, openingReserve: 0, allocationDay: 1, dueDay: 5, enabled: true }];
  p.ledgerTransactions = [{ id: 'legacy', kind: 'expense', date: '2026-11-10', sourceAccountId: 'bank', amount: 100, expenseCategoryId: 'bill', provisionId: 'bill-plan', billDueMonth: '2027-01', description: 'Synthetic legacy off-schedule bill', note: '' }];
  return validatePlan(p);
}

describe('manual audit: legacy bill correction', () => {
  it('permits a dated reversal of a preserved off-schedule bill and restores cash exactly', () => {
    const before = legacyBill(), after = structuredClone(before);
    reverseLedgerTransaction(after, 'legacy', '2026-11-11', 'Correct imported link');
    expect(() => assertEditedBillLinks(before, after)).not.toThrow();
    expect(() => validatePlan(after)).not.toThrow();
    expect(after.ledgerTransactions![0]).toEqual(before.ledgerTransactions![0]);
    expect(cumulative(after, '2026-11-10').actualCash).toBe(400);
    expect(cumulative(after, '2026-11-11').actualCash).toBe(500);
    expect(actual(after, '2026-11-01', '2026-11-11').expenses).toBe(0);
    expect(ledgerSummary(after, '2026-11-11').balances.bank).toBe(500);
  });
  it('still rejects a newly created or edited off-schedule bill', () => {
    const before = legacyBill(), after = structuredClone(before);
    after.ledgerTransactions![0]!.amount = 99;
    expect(() => assertEditedBillLinks(before, after)).toThrow(/schedule/);
    const empty = structuredClone(before);
    empty.ledgerTransactions = [];
    expect(() => assertEditedBillLinks(empty, before)).toThrow(/schedule/);
  });
});

describe('independent financial boundary checks', () => {
  it('reconciles a paise transfer and its reversal across a year boundary', () => {
    const p = financialFixture().data;
    p.accounts = [
      { id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 500, active: true, note: '' },
      { id: 'wallet', name: 'Wallet', kind: 'wallet', openingBalance: 0, active: true, note: '' },
    ];
    p.ledgerTransactions = [{ id: 'transfer', kind: 'transfer', date: '2026-12-31', sourceAccountId: 'bank', destinationAccountId: 'wallet', amount: 0.01, description: 'Synthetic transfer', note: '' }];
    const before = netWorthSnapshot(p, '2026-12-30');
    reverseLedgerTransaction(p, 'transfer', '2027-01-01', 'Synthetic reversal');
    expect(actual(p, '2026-12-01', '2026-12-31')).toMatchObject({ income: 0, expenses: 0, savings: 0 });
    expect(actual(p, '2027-01-01', '2027-01-31')).toMatchObject({ income: 0, expenses: 0, savings: 0 });
    expect(ledgerSummary(p, '2026-12-31').balances).toEqual({ bank: 499.99, wallet: 0.01 });
    expect(ledgerSummary(p, '2027-01-01').balances).toEqual({ bank: 500, wallet: 0 });
    for (const date of ['2026-12-31', '2027-01-01']) {
      const after = netWorthSnapshot(p, date);
      expect(after.cash).toBe(500);
      expect(after.namedCash).toBe(500);
      expect(after.unallocatedCash).toBe(0);
      expect(after.netWorth).toBe(before.netWorth);
    }
  });
  it.each([0, -0.01])('rejects a nonpositive ledger amount %s', amount => {
    const p = legacyBill();
    p.ledgerTransactions![0]!.amount = amount;
    expect(() => validatePlan(p)).toThrow();
  });
  it('rejects duplicate ledger IDs without altering the source record', () => {
    const p = legacyBill();
    p.ledgerTransactions!.push(structuredClone(p.ledgerTransactions![0]!));
    expect(() => validatePlan(p)).toThrow(/unique/);
  });
  it.each([[10.075, 10.08], [-10.075, -10.08], [0, 0], [0.005, 0.01]])(
    'rounds the decimal boundary %s to %s', (input, expected) => {
      expect(roundMoney(input)).toBe(expected);
    },
  );
});
