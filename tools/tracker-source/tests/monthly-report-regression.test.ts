import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { actual, cumulative, planned, progress } from '../src/domain/calculate';
import { monthlyReport } from '../src/io/export';
import { addInstallmentLoan, saveInstallmentPayment } from '../src/domain/installments';
import { loanSummary, paymentRows } from '../src/domain/loan-summary';

describe('monthly budget reporting (no daily allocation)', () => {
  it('uses complete November income and expense plans from November 1 onward', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-01';
    const full = planned(p, '2026-11');
    expect(full.income).toBe(1000);
    expect(full.expenses).toBeGreaterThan(0);
    expect(cumulative(p).plan).toEqual(full);
    expect(progress(p)[0]!.plan).toEqual(full);
    expect(progress(p)[0]!.recordedCash).toBe(500);
    expect(progress(p)[0]!.actual).toBeNull();
  });

  it('spending today changes actual expenses once, not tomorrow when no entry is added', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-01';
    p.entries = [{
      id: 'spend-500',
      date: '2026-11-01',
      amount: 500,
      categoryId: 'bill',
      payment: 'Cash',
      description: 'One-time spending',
      notes: '',
    }];
    const full = planned(p, '2026-11');
    expect(cumulative(p).actual.expenses).toBe(500);
    expect(progress(p)[0]!.actual!.expenses).toBe(500);
    expect(progress(p)[0]!.recordedCash).toBe(0);
    p.settings.reportDate = '2026-11-02';
    expect(cumulative(p).plan).toEqual(full);
    expect(cumulative(p).actual.expenses).toBe(500);
    expect(progress(p)[0]!.plan).toEqual(full);
    expect(actual(p, '2026-11-01', '2026-11-02').expenses).toBe(500);
  });

  it('PDF preview explicitly uses full months without a daily-budget column', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-01';
    const html = monthlyReport(p);
    expect(html).toContain('Full-month plan');
    expect(html).toContain('Actual recorded');
    expect(html).toContain('Unspent budgets are not actual savings');
    expect(html).not.toContain('Plan by date');
    expect(html).not.toContain('Daily budgets are spread across the month');
  });
});

describe('phone EMI receipt verification', () => {
  it('does not convert a paid note to a payment, but counts an archived linked receipt', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-01';
    const phone = addInstallmentLoan(p, {
      name: 'Phone',
      principal: 30000,
      monthlyEmi: 2000,
      tenure: 18,
      firstDueDate: '2026-12-05',
      note: 'Verified Rs 2000 paid 20-Oct-2026',
    });
    expect(loanSummary(paymentRows(p, phone.rows)).paid).toBe(0);
    saveInstallmentPayment(p, phone.id, phone.rows[0]!.id, '2026-10-20', 2000);
    expect(loanSummary(paymentRows(p, phone.rows)).paid).toBe(2000);
    expect(p.entries[0]).toMatchObject({ amount: 2000, date: '2026-10-20' });
    expect(cumulative(p).actual.expenses).toBe(0);
  });
});
