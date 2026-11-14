import { describe, expect, it } from 'vitest';
import { pfActivityRows } from '../src/domain/activity';
import { envelopeFrom } from '../src/domain/history';
import { adjustedBudgetAmount } from '../src/domain/budget-adjustment';
import { ledgerSummary, reverseLedgerTransaction, validateLedger } from '../src/domain/ledger';
import { financialFixture } from './fixtures/financial';
import type { Account, LedgerTransaction } from '../src/domain/types';

const accounts: Account[] = [
 {id:'bank',name:'Bank',kind:'bank',openingBalance:1234567890.09,active:true,note:''},
 {id:'wallet',name:'Wallet',kind:'wallet',openingBalance:0,active:true,note:''},
];
const transfer: LedgerTransaction={id:'transfer',kind:'transfer',date:'2026-11-30',sourceAccountId:'bank',destinationAccountId:'wallet',amount:0.09,feeAmount:0.01,description:'Synthetic',note:''};
describe('Android audit: shared financial regressions',()=>{
 it.each([[1,0.5,1.01],[-1,0.5,-1.01],[10,5,10.5],[100,-100,0],[0,10000,0],[1,10000,101],[0.01,-50,0.01]])('budget %s adjusted by %s%% is %s', (amount,percent,expected)=>{
  expect(adjustedBudgetAmount(amount,percent)).toBe(expected);
 });
 it('accepts valid high-value paise and conserves transfer principal across a date boundary',()=>{
  expect(()=>validateLedger(accounts,[transfer])).not.toThrow();
  const before=ledgerSummary({accounts,ledgerTransactions:[transfer]},'2026-11-29');
  expect(before.netWorth).toBe(1234567890.09);
  const after=ledgerSummary({accounts,ledgerTransactions:[transfer]},'2026-11-30');
  expect(after.balances).toMatchObject({bank:1234567889.99,wallet:0.09});
  expect(after.income).toBe(0);expect(after.expenses).toBe(0.01);
  expect(after.netWorth).toBe(1234567890.08);
 });
 it.each([0,-1,NaN,Infinity,1e12+1,0.001,1234567890.091])('rejects invalid ledger amount %s',amount=>{
  expect(()=>validateLedger(accounts,[{...transfer,amount}])).toThrow();
 });
 it('rejects duplicate IDs and same-account transfers',()=>{
  expect(()=>validateLedger(accounts,[transfer,transfer])).toThrow(/unique/);
  expect(()=>validateLedger(accounts,[{...transfer,destinationAccountId:'bank'}])).toThrow(/differ/);
 });
 it('a dated reversal restores balances and fees without changing the original record',()=>{
  const p=financialFixture().data;p.accounts=structuredClone(accounts);p.ledgerTransactions=[structuredClone(transfer)];
  const original=JSON.stringify(p.ledgerTransactions[0]);
  reverseLedgerTransaction(p,transfer.id,'2026-12-01','Synthetic reversal');
  const result=ledgerSummary(p,'2026-12-01');
  expect(result.balances).toMatchObject({bank:1234567890.09,wallet:0});
  expect(result.income).toBe(0);expect(result.expenses).toBe(0);
  expect(JSON.stringify(p.ledgerTransactions[0])).toBe(original);
 });
});

it('full JSON backup round-trip preserves opening balances, dated transfers and report results',()=>{
 const envelope=financialFixture();envelope.data.accounts=structuredClone(accounts);envelope.data.ledgerTransactions=[structuredClone(transfer)];
 const restored=envelopeFrom(JSON.parse(JSON.stringify(envelope)));
 expect(restored.data.accounts).toEqual(envelope.data.accounts);
 expect(restored.data.ledgerTransactions).toEqual(envelope.data.ledgerTransactions);
 expect(ledgerSummary(restored.data,'2026-12-01')).toEqual(ledgerSummary(envelope.data,'2026-12-01'));
});

it('PF activity projects existing contributions and claims without income/expense classification or mutation',()=>{
 const p=financialFixture().data;
 p.pfMovements=[{id:'deposit',date:'2026-11-30',kind:'contribution',source:'cash',amount:25,payment:'Cash',note:''},{id:'claim',date:'2026-12-01',kind:'claim',source:'cash',amount:5,payment:'Cash',note:''}];
 const before=JSON.stringify(p);
 expect(pfActivityRows(p).map(row=>[row.type,row.amount])).toEqual([['pf-contribution',25],['pf-claim',5]]);
 expect(JSON.stringify(p)).toBe(before);
});
