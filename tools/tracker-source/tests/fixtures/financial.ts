import { freshEnvelope } from '../../src/domain/defaults';
export function financialFixture() {
  const e = freshEnvelope(),
    p = e.data;
  Object.assign(p.settings, {
    planStart: '2026-11',
    planEnd: '2027-02',
    selectedMonth: '2026-11',
    viewStart: '2026-11',
    viewEnd: '2027-02',
    opening: 500,
    salary31: 1000,
    raisedSalary: 1200,
    raiseStart: '2027-01',
    salaryDay: 10,
    liveDate: false,
    reportDate: '2027-02-28',
    mode: 'Scheduled',
    emiPreviousMonth: true,
  });
  p.entries = [];
  p.additionalLoans = [];
  p.overrides = {};
  p.source.originalStart = '2026-11';
  p.source.originalEnd = '2026-12';
  p.categories = [
    {
      id: 'salary',
      name: 'Salary',
      group: 'Income',
      role: 'salary',
      amount: 0,
      timing: 'Fixed day',
      day: 10,
      active: true,
      months: [],
      note: '',
    },
    {
      id: 'bill',
      name: 'Bill',
      group: 'Living',
      role: 'regular',
      amount: 100,
      timing: 'Daily',
      day: 1,
      active: true,
      months: [],
      note: '',
    },
    {
      id: 'emi',
      name: 'EMI',
      group: 'Debt',
      role: 'emi',
      amount: 0,
      timing: 'Fixed day',
      day: 5,
      active: true,
      months: [],
      note: '',
    },
    {
      id: 'closure',
      name: 'Closure',
      group: 'Debt',
      role: 'closure',
      amount: 0,
      timing: 'Fixed day',
      day: 10,
      active: true,
      months: [],
      note: '',
    },
  ];
  Object.assign(p.loan, {
    principal: 300,
    annualRate: 0,
    tenure: 3,
    regularEmi: 100,
    firstEmi: 100,
    firstInterest: 0,
    firstDueDate: '2026-11-05',
    dueDay: 5,
  });
  p.loan.rows = ['2026-11', '2026-12', '2027-01'].map((month, i) => ({
    id: 'row-' + i,
    month,
    dueDate: month + '-05',
    emi: 100,
    principal: 100,
    interest: 0,
    balance: 200 - i * 100,
    paid: false,
    paidBeforeOpening: false,
    paidAmount: 0,
    paidDate: '',
  }));
  return e;
}
