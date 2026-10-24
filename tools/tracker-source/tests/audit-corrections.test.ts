import { describe, it, expect } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { presetRange, monthDay, addMonths } from '../src/domain/dates';
import { validatePlan } from '../src/domain/validation';
import { commit, envelopeFrom, stepHistory } from '../src/domain/history';
import {
  saveOriginalPayment,
  addInstallmentLoan,
  saveInstallmentPayment,
} from '../src/domain/installments';
import { actual, forecast, cumulative, planned, closureAnalysis } from '../src/domain/calculate';
import { archivedReceiptSummary } from '../src/domain/archive';
import { reconciliationResult, provisionResult } from '../src/domain/balances';
import { mergePlans, cloudPlan, localPlan } from '../src/cloud/model';
import type { Entry } from '../src/domain/types';
const record = (
  id: string,
  date: string,
  amount: number,
  categoryId: string,
  payment = 'Bank',
): Entry => ({
  id,
  date,
  amount,
  categoryId,
  payment,
  description: 'Synthetic fixture',
  notes: '',
});
describe('BUG-001: full current plan and explicit range presets', () => {
  it('returns the extended current range, not the original imported range', () => {
    const p = financialFixture().data;
    expect(
      presetRange('Full plan', p.settings.planStart, p.settings.planEnd, '2026-12-15'),
    ).toEqual(['2026-11', '2027-02']);
    expect(p.source.originalEnd).toBe('2026-12');
  });
  it.each([
    ['Current month', '2026-12', '2026-12'],
    ['Previous month', '2026-11', '2026-11'],
    ['Next month', '2027-01', '2027-01'],
    ['Last 3 months', '2026-10', '2026-12'],
    ['Last 6 months', '2026-07', '2026-12'],
    ['Next 3 months', '2026-12', '2027-02'],
    ['Next 6 months', '2026-12', '2027-05'],
    ['Next 12 months', '2026-12', '2027-11'],
  ])('%s', (preset, start, end) =>
    expect(presetRange(preset, '2026-01', '2028-12', '2026-12-15')).toEqual([start, end]),
  );
  it('keeps display changes separate from plan and transactions', () => {
    const e = financialFixture();
    const n = commit(e, 'View only', (d) => {
      d.settings.viewStart = '2026-12';
      d.settings.viewEnd = '2027-01';
    });
    expect(n.data.settings.planStart).toBe(e.data.settings.planStart);
    expect(n.data.settings.planEnd).toBe(e.data.settings.planEnd);
    expect(n.data.entries).toEqual(e.data.entries);
  });
});
describe('BUG-004: malformed backup receipt integrity', () => {
  it('rejects orphaned and non-EMI links without altering the input backup', () => {
    for (const [loanRowId, categoryId] of [
      ['missing', 'emi'],
      ['row-1', 'bill'],
    ]) {
      const e = financialFixture();
      e.data.entries = [{ ...record('bad', '2026-11-10', 1, categoryId!), loanRowId }];
      const original = JSON.stringify(e);
      expect(() => envelopeFrom(e)).toThrow('Invalid loan receipt link');
      expect(JSON.stringify(e)).toBe(original);
    }
  });
  it('rejects a receipt linked to another loan category', () => {
    const p = financialFixture().data;
    const l = addInstallmentLoan(p, {
      name: 'Second loan',
      principal: 200,
      monthlyEmi: 100,
      tenure: 2,
      firstDueDate: '2026-12-05',
      note: '',
    });
    p.entries = [{ ...record('bad', '2026-11-10', 1, 'emi'), loanRowId: l.rows[0]!.id }];
    expect(() => validatePlan(p)).toThrow('Invalid loan receipt link');
  });
  it('rejects combined receipt overpayments during restore', () => {
    const p = financialFixture().data;
    p.entries = [
      { ...record('a', '2026-11-10', 60, 'emi'), loanRowId: 'row-1' },
      { ...record('b', '2026-11-11', 50, 'emi'), loanRowId: 'row-1' },
    ];
    expect(() => validatePlan(p)).toThrow('exceed');
  });
  it('preserves valid legacy backups without new optional records', () => {
    const e = financialFixture();
    const loaded = envelopeFrom(JSON.parse(JSON.stringify(e)));
    expect(loaded.data.entries).toEqual(e.data.entries);
    expect(loaded.data.provisions).toBeUndefined();
    expect(loaded.data.reconciliations).toBeUndefined();
  });
});
describe('BUG-005: independent receipt and cash ledgers', () => {
  it('Scenario A: November due, October 20 payment, no November second deduction', () => {
    let e = financialFixture();
    e.data.settings.emiPreviousMonth = false;
    e = commit(e, 'Actual historical payment', (d) =>
      saveOriginalPayment(d, 'row-0', '2026-10-20', 100),
    );
    expect(e.data.loan.rows[0]).toMatchObject({
      paid: true,
      paidAmount: 100,
      paidDate: '2026-10-20',
    });
    expect(actual(e.data, '2026-11-01', '2026-11-30').debt).toBe(0);
    expect(forecast(e.data)[0]).toMatchObject({ emi: 0, cash: 1400 });
    expect(archivedReceiptSummary(e.data)).toMatchObject({
      before: 100,
      after: 0,
      count: 1,
    });
  });
  it('Scenarios B/C: next-month liability paid Nov 10 exactly once', () => {
    let e = financialFixture();
    e = commit(e, 'Opening installment', (d) => saveOriginalPayment(d, 'row-0', '2026-10-20', 100));
    e = commit(e, 'December installment paid early', (d) => {
      saveOriginalPayment(d, 'row-1', '2026-11-10', 100);
      d.entries.push(
        record('income', '2026-11-10', 1000, 'salary'),
        record('bill-paid', '2026-11-12', 100, 'bill'),
      );
    });
    expect(e.data.loan.rows[1]).toMatchObject({
      paid: true,
      paidDate: '2026-11-10',
    });
    expect(forecast(e.data)[0]).toMatchObject({
      emi: 100,
      savings: 800,
      cash: 1300,
    });
    expect(actual(e.data, '2026-11-01', '2026-11-30')).toMatchObject({
      income: 1000,
      expenses: 200,
      savings: 800,
    });
    expect(cumulative(e.data, '2026-11-30').actualCash).toBe(1300);
    expect(e.data.entries.filter((x) => x.loanRowId === 'row-1')).toHaveLength(1);
  });
  it('partial receipts across months reduce the correct liability; editing/deleting/undo recalculate', () => {
    let e = financialFixture();
    e.data.settings.emiPreviousMonth = false;
    e = commit(e, 'Part 1', (d) => saveOriginalPayment(d, 'row-1', '2026-11-10', 40));
    e = commit(e, 'Part 2', (d) => saveOriginalPayment(d, 'row-1', '2026-12-04', 60));
    expect(e.data.loan.rows[1]).toMatchObject({ paid: true, paidAmount: 100 });
    expect(planned(e.data, '2026-11').debt).toBe(140);
    expect(planned(e.data, '2026-12').debt).toBe(60);
    const id = e.data.entries[0]!.id;
    e = commit(e, 'Edit receipt', (d) => saveOriginalPayment(d, 'row-1', '2026-11-10', 30, id));
    expect(e.data.loan.rows[1]).toMatchObject({ paid: false, paidAmount: 90 });
    e = commit(e, 'Delete receipt', (d) => {
      d.entries = d.entries.filter((x) => x.id !== id);
    });
    expect(e.data.loan.rows[1]).toMatchObject({ paid: false, paidAmount: 60 });
    expect(stepHistory(e, 'undo').data.loan.rows[1]!.paidAmount).toBe(90);
  });
  it('late/post-plan receipt stays visible in lifetime ledger but outside current actual cash', () => {
    let e = financialFixture();
    e = commit(e, 'Late receipt', (d) => saveOriginalPayment(d, 'row-1', '2027-03-10', 100));
    expect(e.data.loan.rows[1]!.paidAmount).toBe(100);
    expect(archivedReceiptSummary(e.data)).toMatchObject({
      after: 100,
      count: 1,
    });
    expect(actual(e.data, '2026-11-01', '2027-03-31').debt).toBe(0);
    expect(forecast(e.data)[0]!.emi).toBe(100);
  });
  it('rejects overpayment atomically while retaining distinct legitimate transfers', () => {
    let e = financialFixture();
    e = commit(e, 'Transfer 1', (d) => saveOriginalPayment(d, 'row-1', '2026-11-10', 50));
    e = commit(e, 'Transfer 2', (d) => saveOriginalPayment(d, 'row-1', '2026-11-10', 50));
    expect(e.data.entries).toHaveLength(2);
    const before = JSON.stringify(e);
    expect(() =>
      commit(e, 'Overpay', (d) => saveOriginalPayment(d, 'row-1', '2026-11-11', 1)),
    ).toThrow();
    expect(JSON.stringify(e)).toBe(before);
  });
  it('added loans use the same out-of-range receipt policy', () => {
    let e = financialFixture();
    let id = '';
    e = commit(e, 'Add loan', (d) => {
      id = addInstallmentLoan(d, {
        name: 'Other',
        principal: 100,
        monthlyEmi: 100,
        tenure: 1,
        firstDueDate: '2026-11-05',
        note: '',
      }).id;
    });
    e = commit(e, 'Historic receipt', (d) =>
      saveInstallmentPayment(d, id, d.additionalLoans![0]!.rows[0]!.id, '2026-10-20', 100),
    );
    expect(e.data.additionalLoans![0]!.rows[0]!.paid).toBe(true);
    expect(actual(e.data, '2026-11-01', '2027-02-28').debt).toBe(0);
  });
});
describe('date, carry-forward and conflict boundaries', () => {
  it.each([
    ['2028-02', 31, '2028-02-29'],
    ['2027-02', 31, '2027-02-28'],
    ['2026-04', 31, '2026-04-30'],
  ])('clamps %s', (month, day, expected) =>
    expect(monthDay(String(month), Number(day))).toBe(expected),
  );
  it('carries negative cash and applies a salary raise to its receipt month', () => {
    const p = financialFixture().data;
    p.settings.opening = -500;
    p.categories.find((c) => c.id === 'bill')!.amount = 1500;
    const rows = forecast(p);
    expect(rows.map((r) => r.income)).toEqual([1000, 1000, 1000, 1200]);
    expect(rows.map((r) => r.cash)).toEqual([-1100, -1700, -2200, -2500]);
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    p.settings.closureMonth = '2028-01';
    expect(closureAnalysis(p).assessment).toBe('Outside plan range');
  });
  it('merges independent edits and requires review for conflicts', () => {
    const p = financialFixture().data,
      base = cloudPlan(p),
      a = structuredClone(base),
      b = structuredClone(base);
    a.entries.push(record('a', '2026-11-10', 1, 'bill'));
    b.entries.push(record('b', '2026-11-11', 2, 'bill'));
    const merged = mergePlans(base, a, b);
    expect(merged.conflicts).toHaveLength(0);
    expect(localPlan(merged.plan, p).entries).toHaveLength(2);
    a.settings.opening = 1;
    b.settings.opening = 2;
    expect(mergePlans(base, a, b).conflicts.length).toBeGreaterThan(0);
  });
});
describe('reconciliation and separate bill reserves', () => {
  it('compares selected bank methods without creating adjustment transactions', () => {
    const p = financialFixture().data;
    p.entries = [
      record('in', '2026-11-10', 1000, 'salary'),
      record('bill', '2026-11-11', 100, 'bill'),
      record('cash', '2026-11-12', 20, 'bill', 'Cash'),
    ];
    const before = JSON.stringify(p);
    expect(
      reconciliationResult(p, {
        label: 'Test',
        fromDate: '2026-11-01',
        throughDate: '2026-11-30',
        openingBalance: 500,
        statementBalance: 1390,
        methods: ['Bank'],
        note: '',
      }),
    ).toMatchObject({
      income: 1000,
      expenses: 100,
      calculated: 1400,
      difference: -10,
      count: 2,
    });
    expect(JSON.stringify(p)).toBe(before);
  });
  it('allocates a reserve separately and forecasts bill cash only in due months', () => {
    let e = financialFixture();
    e = commit(e, 'Opt in provision', (d) => {
      d.provisions = [
        {
          id: 'provision',
          categoryId: 'bill',
          startMonth: '2026-11',
          firstDueMonth: '2026-12',
          everyMonths: 2,
          monthlyAmount: 50,
          billAmount: 100,
          openingReserve: 0,
          allocationDay: 10,
          dueDay: 5,
          enabled: true,
        },
      ];
    });
    expect(forecast(e.data).map((r) => r.living)).toEqual([0, 100, 0, 100]);
    expect(provisionResult(e.data, e.data.provisions![0]!, '2026-11-09').reserve).toBe(0);
    expect(provisionResult(e.data, e.data.provisions![0]!, '2026-11-10').reserve).toBe(50);
    e = commit(e, 'Actual bill', (d) => d.entries.push(record('bill', '2026-12-05', 100, 'bill')));
    expect(provisionResult(e.data, e.data.provisions![0]!, '2026-12-10')).toEqual({
      allocations: 100,
      payments: 100,
      reserve: 0,
    });
    expect(actual(e.data, '2026-11-01', '2026-12-31').living).toBe(100);
    expect(envelopeFrom(JSON.parse(JSON.stringify(e))).data.provisions).toEqual(e.data.provisions);
  });
});
