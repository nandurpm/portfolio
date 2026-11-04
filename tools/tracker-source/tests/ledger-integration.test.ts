import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { actual, cumulative, progress, savingsOverview } from '../src/domain/calculate';
import { ledgerCashEffect, ledgerSummary, validateLedger } from '../src/domain/ledger';
import { namedAccountBalances, netWorthSnapshot } from '../src/domain/net-worth';
import { reconciliationResult } from '../src/domain/balances';
import { commit, stepHistory } from '../src/domain/history';
import type { Account, LedgerTransaction } from '../src/domain/types';
const account = (id: string, kind: Account['kind'], openingBalance = 0): Account => ({ id, name: id, kind, openingBalance, active: true, note: '' });
const row = (id: string, kind: LedgerTransaction['kind'], amount: number, sourceAccountId?: string, destinationAccountId?: string): LedgerTransaction => ({ id, kind, amount, sourceAccountId, destinationAccountId, date:'2026-11-03', description:id, note:'' });
const plan = () => {
  const p = financialFixture().data;
  p.settings.opening=2000; p.settings.reportDate='2026-11-04'; p.settings.liveDate=false;
  p.entries=[]; p.accounts=[account('bank','bank',1300),account('wallet','wallet',700),account('card','credit-card'),account('fd','fixed-deposit'),account('loan','liability')]; p.ledgerTransactions=[];
  return p;
};
describe('unified account and dashboard balances',()=>{
  it('does not add named liquid opening balances twice',()=>{
    const p=plan(); p.entries=[{id:'food',date:'2026-11-02',categoryId:'bill',amount:594,payment:'UPI',description:'food',notes:''}];
    expect(cumulative(p).actualCash).toBe(1406);
    expect(netWorthSnapshot(p)).toMatchObject({cash:1406,unallocatedCash:-594});
    expect(savingsOverview(p,'2026-11').lifetime).toBe(-594);
  });
  it('assigns an Entry to a named account without posting a second expense',()=>{
    const p=plan(); p.entries=[{id:'food',date:'2026-11-02',categoryId:'bill',accountId:'bank',amount:594,payment:'UPI',description:'food',notes:''}];
    expect(namedAccountBalances(p).bank).toBe(706);
    expect(netWorthSnapshot(p)).toMatchObject({cash:1406,unallocatedCash:0});
    expect(actual(p,'2026-11-01','2026-11-04').expenses).toBe(594);
  });
  it('reflects account income/expense in dashboard, reports and monthly progress',()=>{
    const p=plan();p.ledgerTransactions=[row('income','income',500,undefined,'bank'),row('expense','expense',100,'bank')];
    expect(cumulative(p).actualCash).toBe(2400);
    expect(actual(p,'2026-11-01','2026-11-04')).toMatchObject({income:500,expenses:100,savings:400});
    expect(progress(p)[0]).toMatchObject({recordedCash:2400,count:2,actual:{income:500,expenses:100}});
    expect(reconciliationResult(p,{label:'all',fromDate:'2026-11-01',throughDate:'2026-11-04',openingBalance:2000,statementBalance:2400,methods:[],note:''}).difference).toBe(0);
  });
  it('excludes future account activity at the shared cutoff',()=>{
    const p=plan();p.ledgerTransactions=[{...row('future','expense',100,'bank'),date:'2026-11-05'}];
    expect(ledgerSummary(p,'2026-11-04').expenses).toBe(0);
    expect(cumulative(p).actualCash).toBe(2000);
    expect(cumulative(p,'2026-11-05').actualCash).toBe(1900);
  });
  it('transfers liquid money without changing total cash or net worth',()=>{
    const p=plan(),before=netWorthSnapshot(p).netWorth;p.ledgerTransactions=[row('transfer','transfer',300,'bank','wallet')];
    expect(cumulative(p).actualCash).toBe(2000);expect(netWorthSnapshot(p).netWorth).toBe(before);
    expect(ledgerSummary(p,'2026-11-04').balances.wallet).toBe(1000);
  });
  it('treats either opening sign as debt rather than an asset',()=>{
    const p=plan();p.accounts![2]!.openingBalance=5400;
    expect(ledgerSummary(p,'2026-11-04').liabilities).toBe(5400);
    p.accounts![2]!.openingBalance=-5400;
    expect(ledgerSummary(p,'2026-11-04').liabilities).toBe(5400);
  });
  it('records purchase once; card payment lowers cash and debt without a second expense',()=>{
    const p=plan(),before=netWorthSnapshot(p).netWorth;
    p.ledgerTransactions=[row('buy','credit-card-purchase',100,undefined,'card'),row('pay','credit-card-payment',100,'bank','card')];
    expect(cumulative(p).actualCash).toBe(1900);
    expect(actual(p,'2026-11-01','2026-11-04').expenses).toBe(100);
    expect(netWorthSnapshot(p).netWorth).toBe(before-100);
  });
  it('borrowing and FD withdrawals include fees; interest stays separate from principal',()=>{
    const p=plan();p.accounts![3]!.openingBalance=300;
    p.ledgerTransactions=[{...row('borrow','borrow',400,'loan','bank'),feeAmount:10},{...row('fd','fd-withdrawal',300,'fd','bank'),interestAmount:15,feeAmount:5}];
    expect(ledgerCashEffect(p,'2026-11-01','2026-11-04')).toBe(700);
    expect(cumulative(p).actualCash).toBe(2700);
    expect(actual(p,'2026-11-01','2026-11-04')).toMatchObject({income:15,expenses:15,savings:0});
  });
  it('supports a refund in a later month without needing the purchase inside that month',()=>{
    const p=plan();p.ledgerTransactions=[row('purchase','expense',100,'bank'),{...row('refund','refund',50,undefined,'bank'),date:'2026-12-03',originalTransactionId:'purchase'}];
    expect(ledgerCashEffect(p,'2026-12-01','2026-12-04')).toBe(50);
    expect(cumulative(p,'2026-12-04').actualCash).toBe(1950);
  });
  it('rejects wrong account types and invalid dates without mutating data',()=>{
    const p=plan();expect(()=>validateLedger(p.accounts!,[row('bad','lend',50,'bank','wallet')])).toThrow(/correct type/);
    expect(()=>validateLedger(p.accounts!,[{...row('bad','income',1,undefined,'bank'),date:'2026-02-30'}])).toThrow(/valid transaction date/);
  });
  it('includes PF and actual plan principal; links prevent duplicate loan liabilities',()=>{
    const p=plan();p.pfMovements=[{id:'pf',date:'2026-11-02',kind:'contribution',source:'payroll',amount:100,payment:'Bank',note:''}];
    const before=netWorthSnapshot(p);p.accounts!.push({...account('same-loan','liability',p.loan.principal),planLoanId:'original'});
    expect(netWorthSnapshot(p).netWorth).toBe(before.netWorth);
    expect(netWorthSnapshot(p).pf).toBe(100);
  });
  it('edits and removes preserve record IDs and support undo',()=>{
    let e=financialFixture();e.data=plan();
    e=commit(e,'edit account',p=>{p.accounts![0]!.name='SBI';});
    expect(e.data.accounts![0]!.id).toBe('bank');
    e=commit(e,'remove account',p=>{p.accounts=p.accounts!.filter(a=>a.id!=='wallet');});
    expect(stepHistory(e,'undo').data.accounts!.some(a=>a.id==='wallet')).toBe(true);
  });
});
