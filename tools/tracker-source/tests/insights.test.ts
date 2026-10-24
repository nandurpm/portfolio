import { describe, it, expect } from 'vitest';
import { freshPlan } from '../src/domain/defaults';
import type { Entry, Plan } from '../src/domain/types';
import {
  budgetAlerts,
  installmentTasks,
  projectedShortfalls,
  possibleDuplicates,
  duplicateGroups,
  plannedPaymentDate,
} from '../src/domain/insights';
import { cloudPlan, equal } from '../src/cloud/model';
function fixture(): Plan {
  const p = freshPlan();
  Object.assign(p.settings, {
    planStart: '2026-11',
    planEnd: '2027-01',
    selectedMonth: '2026-11',
    reportDate: '2026-11-15',
    liveDate: false,
    opening: 0,
    salary31: 1000,
    raisedSalary: 1000,
    emiPreviousMonth: true,
    mode: 'Scheduled',
  });
  p.settings.salaryDay = 10;
  p.overrides = {};
  p.entries = [];
  p.additionalLoans = [];
  p.categories = [
    {
      id: 'salary',
      name: 'Income',
      role: 'salary',
      group: 'Income',
      amount: 0,
      timing: 'Fixed day',
      day: 10,
      active: true,
      months: [],
      note: '',
    },
    {
      id: 'food',
      name: 'Food',
      role: 'regular',
      group: 'Living',
      amount: 100,
      timing: 'Daily',
      day: 1,
      active: true,
      months: [],
      note: '',
    },
    {
      id: 'extra',
      name: 'Extra',
      role: 'regular',
      group: 'Living',
      amount: 0,
      timing: 'Daily',
      day: 1,
      active: true,
      months: [],
      note: '',
    },
    {
      id: 'emi',
      name: 'Loan',
      role: 'emi',
      group: 'Debt',
      amount: 0,
      timing: 'Fixed day',
      day: 5,
      active: true,
      months: [],
      note: '',
    },
  ];
  p.loan.rows = [
    {
      id: 'dec',
      month: '2026-12',
      dueDate: '2026-12-05',
      emi: 200,
      principal: 180,
      interest: 20,
      balance: 820,
      paid: false,
      paidBeforeOpening: false,
      paidAmount: 0,
      paidDate: '',
    },
  ];
  return p;
}
function entry(id: string, amount: number, categoryId = 'food', date = '2026-11-12'): Entry {
  return {
    id,
    date,
    categoryId,
    amount,
    description: 'Synthetic test',
    notes: '',
    payment: 'Cash',
  };
}
describe('budget alerts', () => {
  it.each([
    [79.99, null],
    [80, '80% warning'],
    [100, 'Budget reached'],
    [100.01, 'Over budget'],
  ])('checks exact warning boundary %s', (amount, level) => {
    const p = fixture();
    p.entries = [entry('a', Number(amount))];
    expect(budgetAlerts(p, '2026-11')[0]?.level ?? null).toBe(level);
  });
  it('flags unbudgeted expenses, ignores income and later-dated entries', () => {
    const p = fixture();
    p.entries = [
      entry('a', 10, 'extra'),
      entry('b', 1000, 'salary'),
      entry('c', 200, 'food', '2026-11-20'),
    ];
    expect(budgetAlerts(p, '2026-11')).toHaveLength(1);
    expect(budgetAlerts(p, '2026-11')[0]).toMatchObject({
      level: 'Unbudgeted spending',
      spent: 10,
      remaining: -10,
      percent: null,
    });
  });
});
describe('payment checklist', () => {
  it('separates pay and due dates and never invents a payment', () => {
    const p = fixture();
    expect(plannedPaymentDate(p, '2026-12-05')).toBe('2026-11-10');
    expect(installmentTasks(p, '2026-11')[0]).toMatchObject({
      payDate: '2026-11-10',
      dueDate: '2026-12-05',
      paid: 0,
      remaining: 200,
      status: 'Overdue in plan',
    });
    expect(p.entries).toHaveLength(0);
  });
  it('uses linked receipts across months, excludes future records and handles partial payments', () => {
    const p = fixture();
    p.entries = [
      { ...entry('a', 50, 'emi', '2026-10-20'), loanRowId: 'dec' },
      { ...entry('b', 150, 'emi', '2026-11-20'), loanRowId: 'dec' },
    ];
    expect(installmentTasks(p, '2026-11')[0]).toMatchObject({
      paid: 50,
      remaining: 150,
      status: 'Part paid',
    });
    expect(installmentTasks(p, '2026-11', '2026-11-20')[0]).toMatchObject({
      paid: 200,
      remaining: 0,
      status: 'Paid',
    });
  });
  it('respects due-month mode and closure', () => {
    const p = fixture();
    p.settings.emiPreviousMonth = false;
    expect(installmentTasks(p, '2026-11')).toHaveLength(0);
    expect(installmentTasks(p, '2026-12')[0]!.payDate).toBe('2026-12-05');
    p.settings.emiPreviousMonth = true;
    p.settings.mode = 'Early closure';
    p.settings.closureMonth = '2026-11';
    expect(installmentTasks(p, '2026-11')).toHaveLength(0);
  });
});
describe('cash warnings and duplicate detection', () => {
  it('warns about negative projected cash without changing data and excludes past months', () => {
    const p = fixture();
    p.settings.opening = -1000;
    const before = JSON.stringify(p);
    expect(projectedShortfalls(p)[0]).toMatchObject({ month: '2026-11', cash: -300 });
    expect(projectedShortfalls(p, '2026-12-01').some((r) => r.month === '2026-11')).toBe(false);
    expect(JSON.stringify(p)).toBe(before);
  });
  it('matches date, category and cents, excludes the edited record and retains legitimate records', () => {
    const rows = [
      entry('a', 50),
      entry('b', 50),
      entry('c', 50, 'extra'),
      entry('d', 50, 'food', '2026-11-13'),
    ];
    expect(possibleDuplicates(rows, rows[0]!)).toEqual([rows[1]]);
    expect(duplicateGroups(rows)).toEqual([[rows[0], rows[1]]]);
    expect(rows).toHaveLength(4);
  });
  it('detects pending financial changes but ignores device view and appearance preferences', () => {
    const p = fixture(),
      base = cloudPlan(p);
    p.settings.viewEnd = '2027-01';
    p.settings.theme = 'dark';
    expect(equal(cloudPlan(p), base)).toBe(true);
    p.entries.push(entry('new', 1));
    expect(equal(cloudPlan(p), base)).toBe(false);
  });
});
