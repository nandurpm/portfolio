import { describe, it, expect } from 'vitest';
import { freshPlan } from '../src/domain/defaults';
import {
  forecast,
  planned,
  regenerateLoan,
  defaultAmount,
  actual,
  closureAnalysis,
} from '../src/domain/calculate';
import {
  addInstallmentLoan,
  saveInstallmentPayment,
  correctInstallmentDates,
  saveOriginalPayment,
} from '../src/domain/installments';
import { validatePlan } from '../src/domain/validation';

function fixture() {
  const p = freshPlan();
  Object.assign(p.settings, {
    planStart: '2026-11',
    planEnd: '2030-01',
    selectedMonth: '2026-11',
    viewStart: '2026-11',
    viewEnd: '2026-12',
    opening: 0,
    salary31: 10000,
    raisedSalary: 10000,
    raiseStart: '2030-01',
    salaryDay: 10,
    emiPreviousMonth: true,
    mode: 'Scheduled',
  });
  p.categories = [
    {
      id: 'salary',
      name: 'Income',
      group: 'Income',
      amount: 0,
      timing: 'Fixed day',
      day: 10,
      months: [],
      active: true,
      role: 'salary',
      note: '',
    },
    {
      id: 'living',
      name: 'Living',
      group: 'Living',
      amount: 3000,
      timing: 'Daily',
      day: 1,
      months: [],
      active: true,
      role: 'regular',
      note: '',
    },
    {
      id: 'emi',
      name: 'Loan',
      group: 'Debt',
      amount: 0,
      timing: 'Fixed day',
      day: 5,
      months: [],
      active: true,
      role: 'emi',
      note: '',
    },
    {
      id: 'closure',
      name: 'Closure',
      group: 'Debt',
      amount: 0,
      timing: 'Fixed day',
      day: 10,
      months: [],
      active: true,
      role: 'closure',
      note: '',
    },
  ];
  p.entries = [];
  p.overrides = { '2026-11|living': 4000 };
  p.additionalLoans = [];
  Object.assign(p.loan, {
    principal: 12000,
    annualRate: 12,
    tenure: 12,
    regularEmi: 1066.19,
    firstEmi: 1066.19,
    firstInterest: 120,
    firstDueDate: '2026-11-05',
    dueDay: 5,
    rows: [],
  });
  p.loan.rows = regenerateLoan(p);
  Object.assign(p.loan.rows[0]!, {
    paidBeforeOpening: true,
    paid: true,
    paidAmount: 1066.19,
  });
  const phone = addInstallmentLoan(p, {
    name: 'Phone',
    principal: 5000,
    monthlyEmi: 500,
    tenure: 12,
    firstDueDate: '2026-12-05',
    note: 'First installment due 5-Dec-2026 paid early on 19-Oct-2026.',
  });
  saveInstallmentPayment(p, phone.id, phone.rows[0]!.id, '2026-10-19', 500);
  correctInstallmentDates(
    p,
    phone.id,
    '2026-11-05',
    'First installment due 5-Nov-2026 paid early on 19-Oct-2026.',
  );
  return { p, phone };
}
describe('advance EMI cash planning', () => {
  it('counts December installments in November exactly once, on salary day', () => {
    const { p } = fixture();
    const [nov, dec] = forecast(p);
    expect(nov).toMatchObject({
      emi: 1566.19,
      expenses: 5566.19,
      savings: 4433.81,
      cash: 4433.81,
      reserve: 0,
      spendable: 4433.81,
    });
    expect(dec).toMatchObject({
      emi: 1566.19,
      expenses: 4566.19,
      savings: 5433.81,
      cash: 9867.62,
      reserve: 0,
      spendable: 9867.62,
    });
    expect(planned(p, '2026-11', '2026-11-09').debt).toBe(0);
    expect(planned(p, '2026-11', '2026-11-10').debt).toBe(1566.19);
    expect(actual(p, '2026-11-01', '2026-11-30').debt).toBe(0);
  });
  it('preserves phone receipts and ends after 12 installments', () => {
    const { p, phone } = fixture();
    expect(phone.rows[0]!.dueDate).toBe('2026-11-05');
    expect(phone.rows.at(-1)!.dueDate).toBe('2027-10-05');
    expect(p.entries[0]).toMatchObject({
      date: '2026-10-19',
      amount: 500,
      loanRowId: phone.rows[0]!.id,
    });
    expect(p.entries[0]!.description).toContain('2026-11-05');
    expect(p.entries[0]!.notes).toContain('5-Nov-2026');
    const c = p.categories.find((c) => c.loanId === phone.id)!;
    expect(defaultAmount(p, c, '2027-09')).toBe(500);
    expect(defaultAmount(p, c, '2027-10')).toBe(0);
    expect(() => validatePlan(p)).not.toThrow();
  });
  it('does not duplicate partial payments made ahead of the planned cash month', () => {
    const { p } = fixture();
    const row = p.loan.rows[2]!;
    saveOriginalPayment(p, row.id, '2026-11-10', 100);
    expect(planned(p, '2026-11').debt).toBe(1666.19);
    expect(planned(p, '2026-12').debt).toBe(1466.19);
  });
  it('keeps due-month mode compatible and final EMI exact', () => {
    const { p } = fixture();
    expect(forecast(p).find((r) => r.month === '2027-09')!.emi).toBe(p.loan.rows.at(-1)!.emi + 500);
    expect(forecast(p).find((r) => r.month === '2027-10')!.emi).toBe(0);
    p.settings.emiPreviousMonth = false;
    expect(forecast(p)[0]!.emi).toBe(0);
    expect(forecast(p)[1]!.emi).toBe(1566.19);
    expect(forecast(p)[0]!.reserve).toBe(1566.19);
  });
  it('does not charge the next installment as well as a current-month settlement', () => {
    const { p } = fixture();
    p.settings.closureMonth = '2027-03';
    p.settings.mode = 'Early closure';
    const row = forecast(p).find((r) => r.month === '2027-03')!;
    expect(row.emi).toBe(500);
    expect(row.cash).toBe(closureAnalysis(p).after);
  });
});
