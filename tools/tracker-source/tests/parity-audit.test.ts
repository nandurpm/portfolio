import { expect, test } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { round, regenerateLoan, actual, fullAmount } from '../src/domain/calculate';
import { compactMoney, formatMoney } from '../src/domain/format-money';
import { assertEditedBillLinks, isBillDueMonth, nextBillDueMonth, offScheduleBillLinks } from '../src/domain/bill-schedule';
import { validatePlan } from '../src/domain/validation';

for (const [input, expected] of [[10.075,10.08],[1.005,1.01],[-10.075,-10.08],[-1.005,-1.01],[0.005,0.01],[-0.005,-0.01],[1e-7,0],[1.2345e3,1234.5],[0.1+0.2,0.3]]) {
  test(`all calculation/display paths agree on paise rounding for ${input}`, () => {
    expect(round(input!)).toBe(expected);
    expect(formatMoney(round(input!))).toBe(formatMoney(input!));
    if (Math.abs(input!) < 999) expect(compactMoney(input!)).toBe(compactMoney(expected!));
  });
}
test('loan half-paise interest rounds consistently without rewriting the stored lender schedule', () => {
  const p=financialFixture().data, saved=structuredClone(p.loan.rows);
  Object.assign(p.loan,{principal:2500,annualRate:5,tenure:100,firstEmi:82,firstInterest:0,regularEmi:100,firstDueDate:'2026-11-05',dueDay:5});
  const rows=regenerateLoan(p);
  expect(rows[1]).toMatchObject({interest:10.08,principal:89.92,balance:2328.08});
  expect(p.loan.rows).toEqual(saved);
});
function billPlan() {
  const p=financialFixture().data;
  p.settings.reportDate='2026-11-15';
  p.accounts=[{id:'bank',name:'Bank',kind:'bank',openingBalance:500,active:true,note:''}];
  p.provisions=[{id:'reserve',categoryId:'bill',startMonth:'2026-11',firstDueMonth:'2026-12',everyMonths:2,monthlyAmount:150,billAmount:300,openingReserve:50,allocationDay:10,dueDay:25,enabled:true}];
  p.ledgerTransactions=[];return p;
}
const payment={id:'payment',date:'2026-11-11',kind:'expense' as const,amount:100,sourceAccountId:'bank',expenseCategoryId:'bill',provisionId:'reserve',billDueMonth:'2027-01',description:'bill',note:''};
test('new Accounts and Daily Entry bill links reject the same off-cycle month', () => {
  const before=billPlan(),after=structuredClone(before);after.ledgerTransactions!.push(payment);
  expect(()=>assertEditedBillLinks(before,after)).toThrow('provision schedule');
  const entries=structuredClone(before);entries.entries.push({id:'receipt',date:payment.date,categoryId:'bill',amount:100,description:'Bill receipt',payment:'Bank',notes:'',provisionId:'reserve',billDueMonth:'2027-01'});
  expect(()=>validatePlan(entries)).toThrow('Invalid bill liability link');
});
test('valid early Accounts bill receipt uses its cash month and reduces the correct due budget', () => {
  const before=billPlan(),after=structuredClone(before);after.ledgerTransactions!.push({...payment,billDueMonth:'2026-12'});
  expect(()=>assertEditedBillLinks(before,after)).not.toThrow();
  expect(actual(after,'2026-11-01','2026-11-15').expenses).toBe(100);
  expect(fullAmount(after,after.categories.find(c=>c.id==='bill')!,'2026-11')).toBe(100);
  expect(fullAmount(after,after.categories.find(c=>c.id==='bill')!,'2026-12')).toBe(200);
});
test('legacy off-cycle records remain readable and unrelated edits stay possible', () => {
  const before=billPlan();before.ledgerTransactions!.push(payment);
  expect(()=>validatePlan(before)).not.toThrow();
  expect(offScheduleBillLinks(before)).toHaveLength(1);
  const after=structuredClone(before);after.settings.palette='emerald';after.ledgerTransactions![0]!.description='Clarified note';
  expect(()=>assertEditedBillLinks(before,after)).not.toThrow();
  after.ledgerTransactions![0]!.amount=120;
  expect(()=>assertEditedBillLinks(before,after)).toThrow('provision schedule');
});
test('recurrence defaults skip off-cycle months and permit valid future advance links', () => {
  const provision=billPlan().provisions![0]!;
  expect(nextBillDueMonth(provision,'2026-11')).toBe('2026-12');
  expect(nextBillDueMonth(provision,'2027-01')).toBe('2027-02');
  expect(isBillDueMonth(provision,'2026-10')).toBe(false);
  expect(isBillDueMonth(provision,'2027-02')).toBe(true);
});
