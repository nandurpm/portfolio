import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { enablePfAccount } from '../src/domain/employment';
import {
  closureAmount, cumulative, forecast, progress, regenerateLoan, timedAmount,
} from '../src/domain/calculate';
import { paymentRows } from '../src/domain/loan-summary';
import { installmentTasks, budgetAlerts } from '../src/domain/insights';
import { monthlyChecklistView } from '../src/domain/monthly-checklist';
import { reconciliationResult } from '../src/domain/balances';
import { compactMoney } from '../src/domain/format-money';
import { monthlyComparison } from '../src/domain/comparison';
import { userError } from '../src/domain/user-error';
import { assertEditedMoneyPrecision } from '../src/domain/money-precision';
import { formatMoney } from '../src/domain/format-money';
import { actual } from '../src/domain/calculate';
import { validateEntry, validatePlan } from '../src/domain/validation';

describe('Audit repairs — financial integrity', () => {
  it('books PF cash movements equally into expected, recorded and forecast cash, not savings', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-03';
    const original = cumulative(p);
    const originalForecast = forecast(p)[0]!.cash;
    enablePfAccount(p);
    p.pfMovements = [
      { id: 'fund', date: '2026-10-15', kind: 'contribution', source: 'payroll', amount: 1000, payment: 'Bank', note: '' },
      { id: 'claim', date: '2026-11-03', kind: 'claim', source: 'cash', amount: 1000, payment: 'Bank', note: '' },
    ];
    const current = cumulative(p);
    expect(current.expectedCash - original.expectedCash).toBe(1000);
    expect(current.actualCash - original.actualCash).toBe(1000);
    expect(current.plan).toEqual(original.plan);
    expect(current.actual).toEqual(original.actual);
    expect(forecast(p)[0]!.cash - originalForecast).toBe(1000);
    expect(progress(p, '2026-11-03')[0]).toMatchObject({ expectedCash: current.expectedCash, recordedCash: current.actualCash });
  });

  it('applies quoted fees/interest only to the selected closure month', () => {
    const p = financialFixture().data;
    p.settings.closureMonth = '2026-11';
    p.settings.accruedInterest = 500;
    p.settings.fees = 200;
    p.settings.lenderQuote = 0;
    expect(closureAmount(p, '2026-11')).toBe(900);
    expect(closureAmount(p, '2026-12')).toBe(100);
    p.settings.lenderQuote = 825;
    expect(closureAmount(p, '2026-11')).toBe(825);
    expect(closureAmount(p, '2026-12')).toBe(100);
  });

  it('rejects an unaffordable final EMI instead of silently creating a balloon', () => {
    const p = financialFixture().data;
    Object.assign(p.loan, {
      principal: 100000, annualRate: 12, tenure: 12,
      firstEmi: 5000, regularEmi: 5000, firstInterest: 1000,
    });
    expect(() => regenerateLoan(p)).toThrow(/EMI is too low to repay/);
    expect(p.loan.rows).toHaveLength(3); // failed regeneration must be atomic
  });

  it('does not count a legacy undated payment as received; before-opening remains exempt', () => {
    const p = financialFixture().data;
    const row = p.loan.rows[1]!; // due December, planned November
    row.paidAmount = 100;
    row.paid = true;
    row.paidDate = '';
    expect(paymentRows(p, [row], '2026-11-03')[0]!.paidAmount).toBe(0);
    expect(installmentTasks(p, '2026-11', '2026-11-03').find(x => x.id === row.id)?.paid).toBe(0);
    row.paidBeforeOpening = true;
    expect(paymentRows(p, [row], '2026-11-03')[0]!.paidAmount).toBe(100);
  });

  it('ignores legacy Asset entries in reconciliation and progress totals', () => {
    const p = financialFixture().data;
    enablePfAccount(p);
    p.entries.push({
      id: 'legacy-asset', date: '2026-11-03', amount: 250,
      categoryId: p.categories.find(c => c.group === 'Asset')!.id,
      payment: 'Bank', description: '', notes: '',
    });
    const r = reconciliationResult(p, {
      label: 'Account', fromDate: '2026-11-01', throughDate: '2026-11-30',
      openingBalance: 500, statementBalance: 500, methods: ['Bank'], note: '',
    });
    expect(r).toMatchObject({ expenses: 0, income: 0, calculated: 500, count: 0 });
    expect(progress(p, '2026-11-03')[0]?.actual).toBeNull();
  });

  it('uses full-month comparison and never prorates daily categories', () => {
    const p = financialFixture().data;
    p.settings.reportDate = '2026-11-03';
    const c = p.categories.find(c => c.id === 'bill')!;
    expect(timedAmount(100, c, '2026-11', '2026-11-03')).toBe(0);
    expect(timedAmount(100, c, '2026-11', '2026-11-30')).toBe(100);
    expect(monthlyComparison(p, '2026-11', '2026-11')[0]?.planExpenses).toBe(200);
  });

  it('formats 99,950 as ₹1L and avoids negative-zero money', () => {
    expect(compactMoney(99950)).toBe('₹1L');
    expect(compactMoney(99999)).toBe('₹1L');
    expect(compactMoney(-0.004)).toBe('₹0');
    expect(compactMoney(9950000)).toBe('₹99.5L');
    expect(compactMoney(9995000)).toBe('₹1Cr');
    expect(compactMoney(-0.005)).toBe('−₹0.01');
  });

  it('sanitizes runtime errors while preserving actionable business validation', () => {
    expect(userError(new Error('EMI is too low to repay this loan within 12 months.')))
      .toContain('EMI is too low');
    expect(userError(new Error('TypeError: cannot read properties of undefined')))
      .not.toContain('TypeError');
  });

  it('rejects new sub-cent entries but leaves legacy backup migration separate', () => {
    const p = financialFixture().data;
    const tiny = { id:'tiny', date:'2026-11-03', categoryId:'bill', amount:0.004, payment:'Bank', description:'', notes:'' };
    expect(() => validateEntry(tiny, p)).toThrow('two decimal places');
    // An older backup with this historical amount remains readable, rather
    // than preventing login or deleting user data during an automatic upgrade.
    p.entries.push(tiny);
    expect(() => validatePlan(p)).not.toThrow();
    expect(() => validateEntry({...tiny, notes:'Review without changing money'}, p)).not.toThrow();
    expect(() => validateEntry({...tiny, amount:0.008}, p)).toThrow('two decimal places');
  });

  it('uses one Unbudgeted spending label for spending with no allocation', () => {
    const p = financialFixture().data;
    const c = p.categories.find(x => x.id === 'bill')!;
    c.amount = 0;
    p.entries.push({ id:'spend', date:'2026-11-03', categoryId:c.id, amount:10, payment:'Bank', description:'', notes:'' });
    const a = budgetAlerts(p,'2026-11','2026-11-03').find(x=>x.id===c.id);
    expect(a?.level).toBe('Unbudgeted spending');
    expect(monthlyChecklistView(p, '2026-11', '2026-11-03').spending.find(x=>x.id===c.id)?.status).toBe('Unbudgeted spending');
  });
});


describe('Follow-up audit: legacy-safe monetary edits', () => {
  it('never creates a displayed total that differs from living + debt', () => {
    const p = financialFixture().data;
    p.entries.push({ id:'small-living', date:'2026-11-03', categoryId:'bill', amount:0.004, payment:'Bank', description:'', notes:'' });
    p.categories.push({ id:'new-debt', name:'New debt', group:'Debt', role:'regular', active:true, amount:0, timing:'Daily', day:1, months:[], note:'' });
    p.entries.push({ id:'small-debt', date:'2026-11-03', categoryId:'new-debt', amount:0.004, payment:'Bank', description:'', notes:'' });
    const result = actual(p,'2026-11-01','2026-11-30');
    expect(result.expenses).toBe(0.01);
    expect(result.expenses).toBe(result.living + result.debt);
    expect(result.savings).toBe(result.income - result.expenses);
  });

  it('rejects new fractional budget overrides and provisions while keeping old values untouched', () => {
    const original = financialFixture().data;
    const changed = structuredClone(original);
    changed.overrides['2026-11|bill'] = 0.004;
    expect(() => assertEditedMoneyPrecision(original, changed)).toThrow('two decimal places');
    const unchanged = structuredClone(original);
    original.entries.push({ id:'old', date:'2026-11-03', categoryId:'bill', amount:0.004, payment:'Bank', description:'', notes:'' });
    unchanged.entries = structuredClone(original.entries);
    unchanged.settings.reportDate = '2026-11-03';
    expect(() => assertEditedMoneyPrecision(original, unchanged)).not.toThrow();
    unchanged.entries[0]!.amount = 0.008;
    expect(() => assertEditedMoneyPrecision(original, unchanged)).toThrow('two decimal places');
  });

  it('does not show negative zero as a full INR amount', () => {
    expect(formatMoney(-0.004)).toBe('₹0.00');
  });
});

describe('website follow-up regression boundaries', () => {
  it('rejects fractional paise without rejecting valid large monetary amounts or arithmetic noise', async () => {
    const { isPaise } = await import('../src/domain/money-precision');
    for (const value of [0, 0.29, 0.1 + 0.2, 10000000000.29, -10000000000.29, 1e12]) expect(isPaise(value)).toBe(true);
    for (const value of [0.004, 0.000000001, 12.345, NaN, Infinity]) expect(isPaise(value)).toBe(false);
  });
  it('applies cash contributions and future claims to the matching cash periods only', () => {
    const p=financialFixture().data;
    p.settings.reportDate='2026-11-03';
    const old=cumulative(p), oldForecast=forecast(p);
    enablePfAccount(p);
    p.pfMovements=[
      {id:'fund',date:'2026-10-15',kind:'contribution',source:'payroll',amount:1000,payment:'Bank',note:''},
      {id:'cash',date:'2026-11-03',kind:'contribution',source:'cash',amount:100,payment:'Bank',note:''},
      {id:'future-claim',date:'2026-12-01',kind:'claim',source:'cash',amount:1000,payment:'Bank',note:''},
    ];
    expect(cumulative(p).expectedCash-old.expectedCash).toBe(-100);
    expect(cumulative(p).actualCash-old.actualCash).toBe(-100);
    expect(forecast(p)[0]!.cash-oldForecast[0]!.cash).toBe(-100);
    expect(forecast(p)[1]!.cash-oldForecast[1]!.cash).toBe(900);
    expect(progress(p)[0]).toMatchObject({expectedCash:old.expectedCash-100, recordedCash:old.actualCash-100});
    expect(cumulative(p).actual.savings).toBe(old.actual.savings);
  });
});


it('shows safe import warnings rather than raw schema diagnostics', async () => {
  const { readCSV } = await import('../src/io/import');
  const preview=readCSV('Date,Category,Description,Amount,Payment,Notes\n2026-11-03,Bill,Synthetic,not-money,Bank,\n',financialFixture().data);
  expect(preview.warnings.length).toBeGreaterThan(0);
  expect(preview.warnings.join(' ')).not.toMatch(/invalid_type|Zod|NaN|stack/);
  expect(preview.plan.entries).toHaveLength(0);
});
