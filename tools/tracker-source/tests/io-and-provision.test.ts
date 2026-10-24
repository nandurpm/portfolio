import { describe, it, expect } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { commit, envelopeFrom } from '../src/domain/history';
import { forecast, categoryPlan, actual } from '../src/domain/calculate';
import { exportWorkbook, monthlyReport } from '../src/io/export';
import { readWorkbook, csvExport, readCSV } from '../src/io/import';
import { saveOriginalPayment } from '../src/domain/installments';
import { validatePlan } from '../src/domain/validation';
describe('provision liability and export integrity', () => {
  it('links a following-month bill paid this month without another due-month charge', () => {
    let e = financialFixture();
    e = commit(e, 'Provision', (d) => {
      d.provisions = [
        {
          id: 'power',
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
    expect(categoryPlan(e.data, e.data.categories[1]!, '2026-12', '2026-12-04')).toBe(0);
    expect(categoryPlan(e.data, e.data.categories[1]!, '2026-12', '2026-12-05')).toBe(100);
    e = commit(e, 'November payment for December bill', (d) => {
      d.entries.push({
        id: 'bill-early',
        date: '2026-11-10',
        categoryId: 'bill',
        amount: 100,
        payment: 'Bank',
        description: 'Next bill',
        notes: '',
        provisionId: 'power',
        billDueMonth: '2026-12',
      });
    });
    expect(categoryPlan(e.data, e.data.categories[1]!, '2026-11', '2026-11-09')).toBe(0);
    expect(categoryPlan(e.data, e.data.categories[1]!, '2026-11', '2026-11-10')).toBe(100);
    expect(
      forecast(e.data)
        .slice(0, 2)
        .map((r) => r.living),
    ).toEqual([100, 0]);
    expect(actual(e.data, '2026-11-01', '2026-12-31').living).toBe(100);
    expect(envelopeFrom(JSON.parse(JSON.stringify(e))).data.entries[0]!.billDueMonth).toBe(
      '2026-12',
    );
    const malformed = structuredClone(e.data);
    malformed.entries[0]!.billDueMonth = '2027-01';
    expect(() => validatePlan(malformed)).toThrow('bill liability');
  });
  it('round-trips receipt IDs, archived payments and optional comparison records through XLSX metadata', async () => {
    let e = financialFixture();
    e = commit(e, 'Historic receipt', (d) => saveOriginalPayment(d, 'row-0', '2026-10-20', 100));
    e = commit(e, 'Part receipt', (d) => saveOriginalPayment(d, 'row-1', '2026-11-10', 40));
    e = commit(e, 'Comparison', (d) => {
      d.reconciliations = [
        {
          id: 'test-recon',
          label: 'Test',
          fromDate: '2026-11-01',
          throughDate: '2026-11-30',
          openingBalance: 500,
          statementBalance: 460,
          methods: ['Bank'],
          note: '',
        },
      ];
    });
    const loaded = await readWorkbook(await exportWorkbook(e.data), e.data);
    expect(
      loaded.plan.entries.map((x) => ({
        id: x.id,
        date: x.date,
        amount: x.amount,
        loanRowId: x.loanRowId,
      })),
    ).toEqual(
      e.data.entries
        .filter((x) => x.date >= '2026-11-01')
        .concat(e.data.entries.filter((x) => x.date < '2026-11-01'))
        .map((x) => ({
          id: x.id,
          date: x.date,
          amount: x.amount,
          loanRowId: x.loanRowId,
        })),
    );
    expect(loaded.plan.reconciliations).toEqual(e.data.reconciliations);
  });
  it('keeps the full plan, out-of-view records, provision links and overrides when exporting a display range', async () => {
    const p = financialFixture().data;
    p.settings.viewStart = '2026-12';
    p.settings.viewEnd = '2026-12';
    p.settings.applyViewToExport = true;
    p.provisions = [
      {
        id: 'power',
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
    p.entries = [
      {
        id: 'archive',
        date: '2026-10-01',
        categoryId: 'bill',
        amount: 5,
        payment: 'Bank',
        description: 'Archive',
        notes: '',
      },
      {
        id: 'early',
        date: '2026-11-10',
        categoryId: 'bill',
        amount: 100,
        payment: 'Bank',
        description: 'Advance bill',
        notes: '',
        provisionId: 'power',
        billDueMonth: '2026-12',
      },
      {
        id: 'visible',
        date: '2026-12-10',
        categoryId: 'salary',
        amount: 1000,
        payment: 'Bank',
        description: 'Salary',
        notes: '',
      },
    ];
    p.overrides['2027-02|bill'] = 125;
    const result = (await readWorkbook(await exportWorkbook(p, '2026-12', '2026-12'), p)).plan;
    expect(result.settings.planStart).toBe('2026-11');
    expect(result.settings.planEnd).toBe('2027-02');
    expect(result.source.originalEnd).toBe('2026-12');
    expect(result.loan.rows).toHaveLength(3);
    expect(result.entries.map((e) => e.id).sort()).toEqual(['archive', 'early', 'visible']);
    expect(result.entries.find((e) => e.id === 'early')!.billDueMonth).toBe('2026-12');
    expect(result.overrides['2027-02|bill']).toBe(125);
  });
  it('exports provision formulas that stay correct when Excel recalculates', async () => {
    const p = financialFixture().data;
    p.provisions = [
      {
        id: 'power',
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
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await exportWorkbook(p)) as never);
    const budget = wb.getWorksheet('Budget')!;
    expect(budget.getCell('D55').value).toMatchObject({ formula: '0' });
    expect(budget.getCell('D59').value).toMatchObject({ formula: '100', result: 100 });
    expect(budget.getCell('F59').value).toBe('Fixed day');
    expect(budget.getCell('G59').value).toBe(5);
  });
  it('round-trips literal CSV formula-like text without creating a second entry', () => {
    const p = financialFixture().data;
    p.entries = [
      {
        id: 'csv',
        date: '2026-11-01',
        categoryId: 'bill',
        amount: 10,
        payment: 'Bank',
        description: '=SUM(A1:A2)',
        notes: '<script>not executable</script>',
      },
    ];
    const loaded = readCSV(csvExport(p), p).plan;
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0]).toMatchObject({
      description: '=SUM(A1:A2)',
      amount: 10,
      notes: '<script>not executable</script>',
    });
  });
  it('escapes category markup in printable reports', () => {
    const p = financialFixture().data;
    p.categories[1]!.name = '<script>alert(1)</script>';
    const html = monthlyReport(p);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
