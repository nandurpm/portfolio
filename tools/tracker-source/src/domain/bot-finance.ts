import {reconciliationResult} from './balances';
import type {Plan} from './types';
import {actual,cumulative,forecast,categoryPlan} from './calculate';
import {ledgerPostingFlow, reportCategories} from './ledger';
import {monthEnd} from './dates';
/** The bot ships a generated bundle of this adapter; no second money formula. */
export function financialRange(p:Plan,start:string,end:string) {
 const totals=actual(p,start,end);
 const categories=reportCategories(p);
 const byCat=new Map(categories.map(c=>[c.id,c.group==='Income'?actual(p,start,end,c.id).income:actual(p,start,end,c.id).expenses]));
 const ledgerEntries=(p.ledgerTransactions ?? []).filter(t=>t.date>=start && t.date<=end && t.date>=p.settings.planStart+'-01' && t.date<=monthEnd(p.settings.planEnd)).flatMap(t=>{const f=ledgerPostingFlow(p,t);return [{amount:f.income,categoryId:f.incomeCategoryId ?? 'ledger-uncategorized-income'},{amount:f.expenses,categoryId:f.expenseCategoryId ?? 'ledger-uncategorized-expense'}].filter(x=>x.amount!==0).map((x,i)=>({id:'ledger:'+t.id+':'+i,date:t.date,amount:x.amount,categoryId:x.categoryId ?? (i===0?'ledger-uncategorized-income':'ledger-uncategorized-expense'),description:'Accounts · '+t.kind+' · '+t.description,payment:'Accounts',notes:t.note ?? ''}));});
 return {ledgerEntries,...totals,expense:totals.expenses,net:totals.savings,byCat,map:new Map(categories.map(c=>[c.id,c]))};
}
export function financialCash(p:Plan,date:string) {
 return cumulative(p,date>monthEnd(p.settings.planEnd)?monthEnd(p.settings.planEnd):date).actualCash;
}

function botReportPlan(p:Plan):Plan {
 if (!p.settings.liveDate) return p;
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return {...p,settings:{...p.settings,liveDate:false,reportDate:date}};
}
export const financialForecast=(p:Plan)=>forecast(botReportPlan(p));
export const financialBudget=(p:Plan,c:Parameters<typeof categoryPlan>[1],month:string)=>categoryPlan(botReportPlan(p),c,month);
export const financialReconciliation=reconciliationResult;
