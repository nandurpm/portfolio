import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { addInstallmentLoan, correctInstallmentDates, saveInstallmentPayment } from '../src/domain/installments';
import { plannedPaymentDate, installmentTasks } from '../src/domain/insights';
import { paymentDisplayStatus } from '../src/domain/payment-status';
import { loanSummary, paymentRows } from '../src/domain/loan-summary';
import { validatePlan } from '../src/domain/validation';
import { actual, planned } from '../src/domain/calculate';
import { monthlyReport, exportWorkbook } from '../src/io/export';

describe('payment labels and per-loan planned days', () => {
  it('does not mislabel future/unverified/partial installments as unpaid', () => {
    const p = financialFixture().data;
    const row = p.loan.rows[1]!;
    expect(paymentDisplayStatus(row, '2026-11-10', '2026-12-05', '2026-11-02')).toBe('Scheduled');
    expect(paymentDisplayStatus(row, '2026-11-10', '2026-12-05', '2026-11-11')).toBe('Planned date passed');
    expect(paymentDisplayStatus(row, '2026-11-10', '2026-12-05', '2026-12-06')).toBe('Due date passed · verify');
    expect(paymentDisplayStatus({ ...row, paidAmount: 40 }, '2026-11-10', row.dueDate, '2026-11-15')).toBe('Part recorded');
    expect(paymentDisplayStatus({ ...row, paidAmount: 100 }, '2026-11-10', row.dueDate, '2026-11-15')).toBe('Payment recorded');
  });

  it('supports an optional advance day without modifying lender due dates or receipts', () => {
    const p = financialFixture().data;
    const phone = addInstallmentLoan(p, {
      name: 'Phone', principal: 30000, monthlyEmi: 2000, tenure: 18,
      firstDueDate: '2026-12-05', note: 'Synthetic', plannedPayDay: 5,
    });
    expect(plannedPaymentDate(p, phone.rows[0]!.dueDate, phone.id)).toBe('2026-11-05');
    expect(plannedPaymentDate(p, p.loan.rows[1]!.dueDate)).toBe('2026-11-10');
    expect(installmentTasks(p, '2026-11', '2026-11-04').find(x => x.category === 'Phone')).toMatchObject({ payDate: '2026-11-05', dueDate: '2026-12-05', paid: 0 });
    saveInstallmentPayment(p, phone.id, phone.rows[0]!.id, '2026-11-03', 100, '__unallocated');
    const receipt = structuredClone(p.entries[0]!);
    correctInstallmentDates(p, phone.id, '2026-12-05', 'Confirmed synthetic', 9);
    expect(plannedPaymentDate(p, phone.rows[0]!.dueDate, phone.id)).toBe('2026-11-09');
    expect(p.entries[0]!.id).toBe(receipt.id);
    expect(p.entries[0]!.date).toBe(receipt.date);
    expect(p.entries[0]!.amount).toBe(receipt.amount);
    expect(() => validatePlan(p)).not.toThrow();
    expect(() => correctInstallmentDates(p, phone.id, '2026-12-05', 'Bad day', 32)).toThrow();
  });

  it('exposes a future-dated EMI receipt only after report date reaches it', () => {
    const p = financialFixture().data;
    const phone = addInstallmentLoan(p, {
      name: 'Phone', principal: 30000, monthlyEmi: 2000, tenure: 18,
      firstDueDate: '2026-12-05', note: '',
    });
    saveInstallmentPayment(p, phone.id, phone.rows[0]!.id, '2026-12-02', 2000, '__unallocated');
    p.settings.reportDate = '2026-11-15';
    expect(loanSummary(paymentRows(p, phone.rows)).paid).toBe(0);
    expect(actual(p, '2026-11-01', '2026-11-15').expenses).toBe(0);
    p.settings.reportDate = '2026-12-03';
    expect(loanSummary(paymentRows(p, phone.rows)).paid).toBe(2000);
  });
});

describe('export parity and print presentation', () => {
  it('keeps actual minus full-month plan signs consistent for income and expenses in Excel', async () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-02';
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await exportWorkbook(p)) as never);
    const sheet = wb.getWorksheet('Dashboard')!;
    expect(sheet.getCell('D14').value).toBe(0 - planned(p, '2026-11').income);
    expect(sheet.getCell('D15').value).toBe(0 - planned(p, '2026-11').expenses);
    expect(sheet.getCell('D13').value).toBe('Actual minus plan');
  });

  it('shows additional-loan statuses and paid amounts through report cutoff in Excel', async () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-15';
    const phone = addInstallmentLoan(p, {
      name: 'Phone', principal: 30000, monthlyEmi: 2000, tenure: 18,
      firstDueDate: '2026-12-05', note: '', plannedPayDay: 5,
    });
    saveInstallmentPayment(p, phone.id, phone.rows[0]!.id, '2026-12-02', 2000, '__unallocated');
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await exportWorkbook(p)) as never);
    const sheet = wb.getWorksheet('Additional loans')!;
    expect(sheet.getCell('G5').value).toBe(0);
    expect(sheet.getCell('I5').value).toBe('Planned date passed');
    expect(sheet.getCell('G4').value).toBe('Paid through report date');
  });

  it('provides readable print styles and distinguishes calculated cash from bank reconciliation', () => {
    const p = financialFixture().data;
    const html = monthlyReport(p);
    expect(html).toContain('@media print');
    expect(html).toContain('Calculated cash');
    expect(html).toContain('not a verified bank statement');
    expect(html).not.toContain('Daily budgets are spread across the month');
  });
});
