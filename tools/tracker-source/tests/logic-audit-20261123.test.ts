import { expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { financialFixture } from './fixtures/financial';
import { readCSV, readWorkbook } from '../src/io/import';
import { exportWorkbook } from '../src/io/export';
import { closureAnalysis, fullAmount } from '../src/domain/calculate';
import { saveOriginalPayment } from '../src/domain/installments';
import { namedAccountBalances, netWorthSnapshot } from '../src/domain/net-worth';
import { monthlyChecklistView } from '../src/domain/monthly-checklist';
import { commit } from '../src/domain/history';
import { reverseLedgerTransaction } from '../src/domain/ledger';
import { financialAccounts } from '../src/domain/bot-finance';

const atNovemberEnd = '2026-11-30';
const bank = { id: 'bank', name: 'Test Bank', kind: 'bank' as const, openingBalance: 500, active: true, note: '' };
const entry = { id: 'entry', categoryId: 'bill', date: '2026-11-15', description: 'Fixture', notes: '', amount: 100, payment: 'UPI' };

it('reads quoted decimal commas and INR grouping and warns about malformed amounts', () => {
  const plan = financialFixture().data;
  const csv = [
    'Date,Category,Amount',
    '2026-11-10,Bill,"12,50"',
    '2026-11-11,Bill,"₹ 1,23,456.78"',
    '2026-11-12,Bill,"1,234"',
    '2026-11-13,Bill,"12,50,0"',
    '2026-11-14,Bill,12,50',
  ].join('\n');
  const preview = readCSV(csv, plan);
  expect(preview.plan.entries.map(({ amount }) => amount)).toEqual([12.50, 123456.78, 1234]);
  expect(preview.warnings).toEqual([
    expect.stringContaining('Invalid amount'),
    expect.stringContaining('Quote amounts containing commas'),
  ]);
});

it('applies recorded original-loan settlement on the receipt date and counts cash once', () => {
  const plan = financialFixture().data;
  saveOriginalPayment(plan, plan.loan.rows[0]!.id, '2026-11-05', 100, '__unallocated');
  plan.entries.push({ ...entry, categoryId: 'closure', amount: 200, date: '2026-11-20' });
  expect(netWorthSnapshot(plan, '2026-11-19')).toMatchObject({ cash: 400, liabilities: 200, netWorth: 200 });
  expect(netWorthSnapshot(plan, '2026-11-20')).toMatchObject({ cash: 200, liabilities: 0, netWorth: 200 });
  plan.entries[1]!.amount = 100;
  expect(netWorthSnapshot(plan, atNovemberEnd)).toMatchObject({ cash: 300, liabilities: 200, estimated: true });
  saveOriginalPayment(plan, plan.loan.rows[1]!.id, '2026-12-05', 100, '__unallocated');
  expect(netWorthSnapshot(plan, '2026-12-05')).toMatchObject({ cash: 200, liabilities: 100 });
  plan.entries.push({ ...entry, id: 'remaining-settlement', categoryId: 'closure', amount: 20, date: '2026-12-10' });
  expect(netWorthSnapshot(plan, '2026-12-10')).toMatchObject({ cash: 180, liabilities: 0 });
});

it('uses the actual lender quote to show savings or extra cost', () => {
  const plan = financialFixture().data;
  plan.settings.closureMonth = '2026-11';
  plan.settings.lenderQuote = 275;
  plan.loan.rows[1] = { ...plan.loan.rows[1]!, emi: 140, interest: 40 };
  plan.loan.rows[2] = { ...plan.loan.rows[2]!, emi: 120, interest: 20 };
  expect(closureAnalysis(plan)).toMatchObject({ principal: 200, quote: 275, settlementSavings: -15 });
  plan.settings.lenderQuote = 235;
  expect(closureAnalysis(plan).settlementSavings).toBe(25);
  plan.settings.lenderQuote = 0;
  plan.settings.fees = 10;
  plan.settings.accruedInterest = 5;
  expect(closureAnalysis(plan)).toMatchObject({ quote: 215, settlementSavings: 45 });
});

it('excludes installment receipts paid by the selected closure month from remaining scheduled payments', () => {
  const plan = financialFixture().data;
  plan.settings.closureMonth = '2026-11';
  plan.settings.lenderQuote = 275;
  plan.loan.rows[1] = { ...plan.loan.rows[1]!, emi: 140, interest: 40 };
  plan.loan.rows[2] = { ...plan.loan.rows[2]!, emi: 120, interest: 20 };
  saveOriginalPayment(plan, plan.loan.rows[1]!.id, '2026-11-25', 50, '__unallocated');
  expect(closureAnalysis(plan).settlementSavings).toBe(-65);
});

it('exports effective budgets while restoring dormant overrides and edited named-account entries', async () => {
  const plan = financialFixture().data;
  const bill = plan.categories.find((category) => category.id === 'bill')!;
  bill.active = false;
  plan.overrides['2026-11|bill'] = 127.55;
  plan.accounts = [bank];
  plan.ledgerTransactions = [];
  plan.entries = [{ ...entry, accountId: 'bank' }];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await exportWorkbook(plan, '2026-11', '2026-11')) as never);
  expect(workbook.getWorksheet('Budget')!.getCell('D55').value).toEqual({ formula: '0' });
  workbook.getWorksheet('Daily entries')!.getCell('D8').value = 110;
  const result = await readWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer()), plan);
  expect(result.plan.overrides['2026-11|bill']).toBe(127.55);
  const restored = result.plan.categories.find((category) => category.id === 'bill')!;
  expect(fullAmount(result.plan, restored, '2026-11')).toBe(0);
  expect(result.plan.entries[0]).toMatchObject({ id: entry.id, accountId: 'bank', amount: 110 });
  expect(namedAccountBalances(result.plan, atNovemberEnd).bank).toBe(390);
});

it('shows archived-category activity and refund-only categories through the report cutoff', () => {
  const plan = financialFixture().data;
  const bill = plan.categories.find((category) => category.id === 'bill')!;
  bill.active = false;
  plan.accounts = [bank];
  plan.entries = [{ ...entry, accountId: 'bank' }];
  plan.ledgerTransactions = [
    { id: 'purchase', kind: 'expense', date: atNovemberEnd, amount: 100, categoryId: 'bill', sourceAccountId: 'bank', description: '', note: '' },
    { id: 'refund', kind: 'refund', date: '2026-12-02', amount: 100, originalTransactionId: 'purchase', destinationAccountId: 'bank', description: '', note: '' },
  ];
  expect(monthlyChecklistView(plan, '2026-11').spending).toEqual([
    expect.objectContaining({ id: 'bill', planned: 0, recorded: 200 }),
  ]);
  expect(monthlyChecklistView(plan, '2026-12', '2026-12-01').spending).toEqual([]);
  expect(monthlyChecklistView(plan, '2026-12', '2026-12-02').spending).toEqual([
    expect.objectContaining({ id: 'bill', recorded: -100, status: 'Net refund or reversal' }),
  ]);
});

it('matches bot named-account balances to the app without counting unassigned expenses in named cash', () => {
  const plan = financialFixture().data;
  plan.accounts = [bank];
  plan.ledgerTransactions = [];
  plan.entries = [{ ...entry, accountId: 'bank' }, { ...entry, id: 'unassigned' }];
  expect(financialAccounts(plan, atNovemberEnd)).toMatchObject({ balances: { bank: 400 }, assets: 400, netWorth: 400 });
  expect(financialAccounts(plan, atNovemberEnd).balances).toEqual(namedAccountBalances(plan, atNovemberEnd));
});

it('prevents reversing a purchase before an earlier linked refund is reversed', () => {
  let envelope = financialFixture();
  envelope.data.accounts = [bank];
  envelope.data.ledgerTransactions = [
    { id: 'purchase', kind: 'expense', date: '2026-11-10', amount: 100, sourceAccountId: 'bank', description: '', note: '' },
    { id: 'refund', kind: 'refund', date: '2026-11-11', amount: 60, originalTransactionId: 'purchase', destinationAccountId: 'bank', description: '', note: '' },
  ];
  envelope = commit(envelope, 'Reverse refund', (plan) =>
    reverseLedgerTransaction(plan, 'refund', '2026-11-15', 'Synthetic correction'),
  );
  const reversePurchase = (date: string) => commit(envelope, 'Reverse purchase', (plan) =>
    reverseLedgerTransaction(plan, 'purchase', date, 'Synthetic correction'),
  );
  expect(() => reversePurchase('2026-11-14')).toThrow('on or before');
  expect(reversePurchase('2026-11-15').data.ledgerTransactions).toHaveLength(4);
});
