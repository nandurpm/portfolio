import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { monthlyChecklistView, installmentDisplayStatus } from '../src/domain/monthly-checklist';
import type { Entry } from '../src/domain/types';

const entry = (id: string, date: string, amount: number, categoryId: string, loanRowId?: string): Entry => ({
  id, date, amount, categoryId, loanRowId, payment: 'Cash',
  description: 'Synthetic checklist record', notes: '',
});

describe('monthly activity display', () => {
  it('groups categories by income, fixed bills, variable spending and scheduled EMIs', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-02';
    p.categories.push({
      id: 'rent', name: 'Room rent', group: 'Living', role: 'regular',
      amount: 1500, timing: 'Fixed day', day: 10, months: [], active: true, note: '',
    });
    p.entries = [entry('spent', '2026-11-02', 114, 'bill')];
    const snapshot = JSON.stringify(p);
    const view = monthlyChecklistView(p, '2026-11');
    expect(view.income.map(x => x.id)).toContain('salary');
    expect(view.bills.map(x => x.id)).toContain('rent');
    expect(view.spending.map(x => x.id)).toContain('bill');
    expect(view.loans).toHaveLength(1);
    expect(view.totals).toMatchObject({ income: 0, expenses: 114, savings: -114 });
    expect(view.spending[0]).toMatchObject({
      planned: 100, recorded: 114, remaining: -14, percentage: 114,
      status: 'Over budget', kind: 'spending',
    });
    expect(JSON.stringify(p)).toBe(snapshot);
  });

  it('does not convert a missing fixed-day bill entry into a paid/unpaid assertion', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-15';
    p.categories.push({
      id: 'rent', name: 'Room rent', group: 'Living', role: 'regular',
      amount: 1500, timing: 'Fixed day', day: 10, months: [], active: true, note: '',
    });
    const rent = monthlyChecklistView(p, '2026-11').bills.find(x => x.id === 'rent');
    expect(rent).toMatchObject({
      status: 'No entry recorded', recorded: 0, remaining: 1500,
      plannedDate: '2026-11-10',
    });
    expect(p.entries).toHaveLength(0);
  });

  it('distinguishes planned date passed from contractual due date passed', () => {
    const p = financialFixture().data;
    const novTask = monthlyChecklistView(p, '2026-11', '2026-11-04').loans[0]!;
    expect(novTask).toMatchObject({ expected: 100, paid: 0, remaining: 100 });
    expect(installmentDisplayStatus(novTask, '2026-11-04')).toBe('Scheduled');
    expect(installmentDisplayStatus(novTask, '2026-11-06')).toBe('Planned date passed');
    expect(installmentDisplayStatus(novTask, '2026-12-06')).toBe('Due date passed · verify');
    expect(p.loan.rows[1]!.paid).toBe(false);
  });

  it('counts linked historical receipts without duplicating them in monthly cash totals', () => {
    const p = financialFixture().data;
    p.entries = [entry('oct-emi', '2026-10-20', 30, 'emi', 'row-1')];
    const view = monthlyChecklistView(p, '2026-11', '2026-11-15');
    expect(view.loans[0]).toMatchObject({ paid: 30, remaining: 70 });
    expect(installmentDisplayStatus(view.loans[0]!, '2026-11-15')).toBe('Part recorded');
    expect(view.totals.expenses).toBe(0); // archive is excluded from November cash flow
  });

  it('ignores future-dated transactions until the report date and uses complete budgets', () => {
    const p = financialFixture().data;
    p.entries = [
      entry('bill-1', '2026-11-01', 50, 'bill'),
      entry('bill-future', '2026-11-20', 200, 'bill'),
    ];
    expect(monthlyChecklistView(p, '2026-11', '2026-11-01').spending[0]).toMatchObject({
      planned: 100, recorded: 50, remaining: 50, percentage: 50,
    });
    expect(monthlyChecklistView(p, '2026-11', '2026-11-02').totals.expenses).toBe(50);
    expect(monthlyChecklistView(p, '2026-11', '2026-11-20').totals.expenses).toBe(250);
  });
});
