import {MutationIdentity} from '../src/cloud/mutation-identity';
import {financialRange as shippedRange,financialCash as shippedCash} from '../supabase/functions/savings-tracker-bot/finance.js';
import {canClearSignedOutCache} from '../src/cloud/cache-policy';
import {describe,it,expect} from 'vitest';
import {financialFixture} from './fixtures/financial';
import {addInstallmentLoan,applyLenderSchedule,saveInstallmentPayment} from '../src/domain/installments';
import {netWorthSnapshot} from '../src/domain/net-worth';
import {validatePlan} from '../src/domain/validation';
import {financialCash,financialRange} from '../src/domain/bot-finance';
import {cloudPlan,mergePlans,assertModernLedgerPreserved} from '../src/cloud/model';
function loanFixture(){const p=financialFixture().data; const l=addInstallmentLoan(p,{name:'Synthetic lender',principal:100,monthlyEmi:70,tenure:2,firstDueDate:'2026-12-05',note:''});return {p,l};}
describe('completion finance',()=>{
 it('uses contractual principal and a different final EMI without creating receipts',()=>{
  const {p,l}=loanFixture();applyLenderSchedule(p,l.id,'2026-12-05,60,10\n2027-01-05,40,5');
  expect(l.rows.map(r=>r.emi)).toEqual([70,45]);expect(p.entries).toHaveLength(0);validatePlan(p);
  const before=netWorthSnapshot(p,'2026-12-06').planLoans;
  saveInstallmentPayment(p,l.id,l.rows[0]!.id,'2026-12-05',70);
  expect(netWorthSnapshot(p,'2026-12-06').planLoans).toBe(before-60);
 });
 it('rejects incomplete principal totals and inconsistent imported allocations',()=>{
  const {p,l}=loanFixture();expect(()=>applyLenderSchedule(p,l.id,'2026-12-05,50,10\n2027-01-05,40,5')).toThrow('total');
  applyLenderSchedule(p,l.id,'2026-12-05,60,10\n2027-01-05,40,5');l.rows[0]!.balance=99;
  expect(()=>validatePlan(p)).toThrow('inconsistent');
 });
 it('blocks an older device dropping lender allocation',()=>{
  const {p,l}=loanFixture();applyLenderSchedule(p,l.id,'2026-12-05,60,10\n2027-01-05,40,5');const base=cloudPlan(p),remote=structuredClone(base);delete remote.additionalLoans![0]!.rows[0]!.principal;
  expect(()=>assertModernLedgerPreserved(base,p,remote)).toThrow('lender principal');
 });
 it('includes Accounts income, expense, transfer fees and borrowing without counting principal as income',()=>{
  const p=financialFixture().data;p.settings.opening=2000;p.accounts=['bank','wallet'].map(id=>({id,name:id,kind:'bank' as const,openingBalance:0,active:true,note:''}));p.accounts.push({id:'loan',name:'Debt',kind:'liability',openingBalance:0,active:true,note:''});
  p.ledgerTransactions=[{id:'expense',date:'2026-11-02',kind:'expense',sourceAccountId:'bank',amount:500,description:'Synthetic',note:''}, {id:'income',date:'2026-11-02',kind:'income',destinationAccountId:'bank',amount:300,description:'Synthetic',note:''}, {id:'transfer',date:'2026-11-02',kind:'transfer',sourceAccountId:'bank',destinationAccountId:'wallet',amount:300,feeAmount:5,description:'Synthetic',note:''}, {id:'borrow',date:'2026-11-02',kind:'borrow',sourceAccountId:'loan',destinationAccountId:'bank',amount:500,description:'Synthetic',note:''}];
  expect(financialRange(p,'2026-11-01','2026-11-04')).toMatchObject({income:300,expense:505,net:-205});expect(financialCash(p,'2026-11-04')).toBe(2295);expect(shippedCash(p,'2026-11-04')).toBe(2295);expect(shippedRange(p,'2026-11-01','2026-11-04')).toEqual(financialRange(p,'2026-11-01','2026-11-04'));
  expect(financialRange(p,'2026-11-01','2026-11-04').ledgerEntries).toHaveLength(3);
 });
});

it('clears only fully synchronized browser caches, retaining offline edits',()=>{
 const e=financialFixture();expect(canClearSignedOutCache(e)).toBe(false);
 e.sync={ownerId:'synthetic',revision:1,base:cloudPlan(e.data),lastSyncAt:'2026-11-01T00:00:00Z'};
 expect(canClearSignedOutCache(e)).toBe(true);e.data.settings.opening+=1;expect(canClearSignedOutCache(e)).toBe(false);
});
it('recovers from a committed save whose response was lost without duplicating receipts',()=>{
 const base=cloudPlan(financialFixture().data),local=structuredClone(base);
 local.entries.push({id:'stable-receipt',date:'2026-11-02',amount:25,categoryId:'bill',payment:'Bank',description:'Synthetic',notes:''});
 const remote=structuredClone(local);
 const retry=mergePlans(base,local,remote);expect(retry.conflicts).toEqual([]);expect(retry.plan.entries).toHaveLength(1);expect(retry.plan.entries[0]!.id).toBe('stable-receipt');
});

it('retains the mutation key across a lost response but isolates changed payloads and owners',()=>{
 const keys=new MutationIdentity(),p=cloudPlan(financialFixture().data);
 const first=keys.idFor('owner',1,p);expect(keys.idFor('owner',1,structuredClone(p))).toBe(first);
 p.settings.opening++;expect(keys.idFor('owner',1,p)).not.toBe(first);const edited=keys.idFor('owner',1,p);
 expect(keys.idFor('other-owner',1,p)).not.toBe(edited);
});
