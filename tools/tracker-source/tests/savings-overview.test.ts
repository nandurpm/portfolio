import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { actual, cumulative, savingsOverview } from '../src/domain/calculate';
import type { Entry } from '../src/domain/types';

const entry = (id: string, date: string, amount: number, categoryId: string): Entry => ({
  id, date, amount, categoryId, payment: 'Cash', description: 'Synthetic test', notes: '',
});

describe('recorded savings cards', () => {
  it('shows monthly, calendar-year and lifetime net savings separately from opening cash', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-02';
    p.entries = [entry('nov', '2026-11-02', 129, 'bill')];
    const summary = savingsOverview(p, '2026-11');
    expect(summary).toEqual({ month: -129, year: -129, lifetime: -129, calendarYear: '2026' });
    expect(cumulative(p).actualCash).toBe(371); // opening ₹500 is not savings added
  });

  it('does not fabricate savings from unspent full-month budget or allocate daily expenses', () => {
    const p = financialFixture().data;
    p.entries = [entry('nov', '2026-11-01', 500, 'bill')];
    expect(savingsOverview(p, '2026-11', '2026-11-01').lifetime).toBe(-500);
    expect(savingsOverview(p, '2026-11', '2026-11-02')).toMatchObject({
      month: -500, year: -500, lifetime: -500,
    });
    expect(actual(p, '2026-11-01', '2026-11-02').expenses).toBe(500);
  });

  it('uses report-date year even when reviewing another month', () => {
    const p = financialFixture().data;
    p.entries = [
      entry('nov', '2026-11-02', 129, 'bill'),
      entry('dec-income', '2026-12-05', 800, 'salary'),
      entry('dec-spend', '2026-12-15', 200, 'bill'),
      entry('jan-income', '2027-01-05', 1000, 'salary'),
      entry('jan-spend', '2027-01-06', 300, 'bill'),
      entry('feb-spend', '2027-02-01', 50, 'bill'),
    ];
    expect(savingsOverview(p, '2026-11', '2026-12-31')).toEqual({
      month: -129, year: 471, lifetime: 471, calendarYear: '2026',
    });
    expect(savingsOverview(p, '2026-12', '2027-01-07')).toEqual({
      month: 600, year: 700, lifetime: 1171, calendarYear: '2027',
    });
    expect(savingsOverview(p, '2027-02', '2027-02-02')).toEqual({
      month: -50, year: 650, lifetime: 1121, calendarYear: '2027',
    });
    expect(cumulative(p, '2027-02-02').actual.savings).toBe(1121);
  });

  it('excludes archived pre-opening payments and future-dated entries', () => {
    const p = financialFixture().data;
    p.entries = [
      entry('archive', '2026-10-20', 2000, 'bill'),
      entry('nov', '2026-11-02', 129, 'bill'),
      entry('future', '2026-12-01', 10000, 'salary'),
    ];
    expect(savingsOverview(p, '2026-11', '2026-10-31')).toMatchObject({
      month: 0, year: 0, lifetime: 0,
    });
    expect(savingsOverview(p, '2026-11', '2026-11-02')).toMatchObject({
      month: -129, year: -129, lifetime: -129,
    });
    expect(savingsOverview(p, '2026-11', '2026-12-01')).toMatchObject({
      month: -129, year: 9871, lifetime: 9871,
    });
  });

  it('recalculates when actual entries change without editing the plan', () => {
    const p = financialFixture().data;
    const before = JSON.stringify(p.settings);
    p.entries = [entry('bill', '2026-11-02', 129, 'bill')];
    expect(savingsOverview(p, '2026-11', '2026-11-02').year).toBe(-129);
    p.entries[0]!.amount = 200;
    expect(savingsOverview(p, '2026-11', '2026-11-02').lifetime).toBe(-200);
    expect(JSON.stringify(p.settings)).toBe(before);
  });
});
