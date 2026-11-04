const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
let code=fs.readFileSync(require('node:path').join(__dirname,'index.ts'),'utf8').replace(/^import .*;\n/gm,'');
code=stripTypeScriptTypes(code);
const sandbox={console,Intl,Date,TextEncoder,Uint8Array,Map,structuredClone,crypto:require('node:crypto').webcrypto,Response,Request,Blob,FormData,atob,AbortSignal,Deno:{env:{get:()=>undefined},serve:()=>{}}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const evaluate=x=>vm.runInContext(x,sandbox);
assert.equal(evaluate('validDate("2026-99-99")'),false);
assert.equal(evaluate('validDate("2026-02-29")'),false);
assert.equal(evaluate('validDate("2028-02-29")'),true);
assert.equal(evaluate('displayDate("2026-11-05")'),'05-Nov-2026');
assert.equal(evaluate('previousMonth("2026-01")'),'2025-12');
assert.equal(evaluate('owns({message:{chat:{type:"private",id:123},from:{id:123,is_bot:false}}},"123")'),true);
assert.equal(evaluate('owns({message:{chat:{type:"private",id:123},from:{id:999}}},"123")'),false);
assert.equal(evaluate('owns({callback_query:{message:{chat:{type:"group",id:123}},from:{id:123}}},"123")'),false);
assert.equal(evaluate('owns({callback_query:{message:{chat:{type:"private",id:123}},from:{id:123}}},"123")'),true);
assert.equal(evaluate('homeKeyboard().inline_keyboard.length'),5,'Compact menu: four rows and a website link');
assert.equal(evaluate('homeKeyboard().inline_keyboard.flat().filter(b=>b.callback_data==="accounts").length'),1);
assert.equal(evaluate('homeKeyboard().inline_keyboard.flat().filter(b=>b.callback_data==="entries").length'),0,'Entries appears under More');
assert.equal(evaluate('quickKeyboard().inline_keyboard.flat().some(b=>b.callback_data==="e:add")'),true,'PIN-protected entry remains accessible');
assert.equal(evaluate('moreKeyboard().inline_keyboard.flat().some(b=>b.callback_data==="entries")'),true);
assert.equal(evaluate('reportsKeyboard().inline_keyboard.flat().some(b=>b.callback_data==="ranges")'),true);
assert.equal(evaluate('isUnlocked({...defaultEditState("123"),pin_hash:"hash",unlocked_until:new Date(Date.now()-1).toISOString()})'),false);
evaluate('telegram=async(method,token,body)=>{globalThis.calls.push({method,body});if(method==="getMe")return {id:1};if(method==="getUserProfilePhotos")return {total_count:1};if(method==="getMyShortDescription")return {short_description:"Your private money dashboard"};return true;}');
sandbox.calls=[];sandbox.fetch=async()=>({json:async()=>({ok:true})});
(async()=>{
 Object.assign(sandbox,await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'finance.js')).href));
 sandbox.fixture={settings:{opening:100,planStart:'2020-01',planEnd:'2030-12',mode:'Scheduled',emiPreviousMonth:false},categories:[{id:'food',name:'Food',group:'Living',active:true,role:'regular',amount:0,timing:'Daily',day:1,months:[]}],entries:[{id:'old',date:'2026-11-05',categoryId:'food',amount:150}],provisions:[],overrides:{},loan:{rows:[],principal:0}};
 assert.equal(evaluate('possibleDuplicate(fixture,{id:"new",date:"2026-11-05",categoryId:"food",amount:150})'),true);
 assert.equal(evaluate('possibleDuplicate(fixture,{id:"new",date:"2026-11-05",categoryId:"food",amount:151})'),false);
 assert.match(evaluate('balanceText(fixture,"2026-10-29")'),/Opening savings/);
 assert.match(evaluate('updatePreview({pending:{action:"add",id:"new",date:"2026-11-05",categoryId:"food",amount:150,payment:"UPI",description:"Food"}},fixture)'),/Possible duplicate/);
 evaluate('globalThis.testState={...defaultEditState("123"),pin_hash:"hash",unlocked_until:new Date(Date.now()+600000).toISOString(),step:"description",pending:{action:"add",categoryId:"food",revision:1,id:"new",date:"2026-11-05",amount:150}}; editState=async()=>structuredClone(testState);writeEditState=async(s)=>{globalThis.testState=structuredClone(s)};syncedPlan=async()=>({plan:fixture,revision:1,userId:"owner"});');
 await evaluate('handleEdit({callback_query:{data:"e:skipdescription"}},"e:skipdescription","test","123")');
 assert.equal(evaluate('testState.step'),'payment');
 evaluate('testState.step="date"');
 await evaluate('handleEdit({callback_query:{data:"e:today"}},"e:today","test","123")');
 assert.equal(evaluate('testState.step'),'description');
 assert.equal(evaluate('testState.pending.date'),evaluate('keyDate()'));
 await evaluate('handleEdit({callback_query:{data:"e:skipdescription"}},"e:skipdescription","test","123")');
 assert.equal(evaluate('testState.pending.description'),'Food');
 await evaluate('handleEdit({callback_query:{data:"e:pay:UPI"}},"e:pay:UPI","test","123")');
 assert.equal(evaluate('testState.step'),'confirm');
 evaluate('saveEdit=async()=>true');
 await evaluate('handleEdit({callback_query:{data:"e:confirm"}},"e:confirm","test","123")');
 assert.equal(evaluate('testState.pending.undoId'),'new');
 sandbox.fixture.entries.push({id:'new',date:'2026-11-05',categoryId:'food',amount:150});
 await evaluate('handleEdit({callback_query:{data:"e:undo"}},"e:undo","test","123")');
 assert.equal(evaluate('testState.pending.action'),'delete');
 assert.equal(evaluate('testState.step'),'confirm');
 const result=await evaluate('configureBranding("test-token","123")');
 assert.equal(result.profile_verified,true);
 const command=sandbox.calls.find(c=>c.method==='setMyCommands');
 assert.equal(command.body.scope.type,'chat');assert.equal(command.body.scope.chat_id,123);
 assert.equal(sandbox.calls.filter(c=>c.method==='deleteMyCommands').length,4);
 assert.equal(command.body.commands.some(c=>c.command==='accounts'),true);
 assert.equal(command.body.commands.some(c=>c.command==='range'),true);
 assert.equal(command.body.commands.some(c=>c.command==='search'),true);
 assert.equal(command.body.commands.some(c=>c.command==='refreshmenu'),true);
 assert.equal(command.body.commands.every(c=>/^[a-z0-9_]+$/.test(c.command)),true);

 sandbox.ledgerFixture={
  settings:{opening:1000,planStart:'2026-11',planEnd:'2026-12',mode:'Scheduled',emiPreviousMonth:false},
  categories:[
   {id:'food',name:'Food',group:'Living',active:true,role:'regular',amount:0,timing:'Daily',day:1,months:[]},
   {id:'salary',name:'Salary',group:'Income',active:true,role:'regular',amount:0,timing:'Daily',day:1,months:[]}
  ],
  entries:[],overrides:{},provisions:[],loan:{rows:[],principal:0},additionalLoans:[],
  accounts:[
   {id:'bank',name:'Bank',kind:'bank',openingBalance:1000,active:true,note:''},
   {id:'cash',name:'Cash',kind:'cash',openingBalance:0,active:true,note:''},
   {id:'owed',name:'Money lent',kind:'receivable',openingBalance:0,active:true,note:''},
   {id:'fd',name:'FD',kind:'fixed-deposit',openingBalance:0,active:true,note:''},
   {id:'card',name:'Credit card',kind:'credit-card',openingBalance:0,active:true,note:''},
   {id:'debt',name:'Borrowing',kind:'liability',openingBalance:0,active:true,note:''}
  ],
  ledgerTransactions:[
   {id:'tr',date:'2026-11-01',kind:'transfer',amount:200,sourceAccountId:'bank',destinationAccountId:'cash',description:'Transfer'},
   {id:'lend',date:'2026-11-02',kind:'lend',amount:150,sourceAccountId:'cash',destinationAccountId:'owed',description:'Lent'},
   {id:'repay',date:'2026-11-03',kind:'repayment-received',amount:50,sourceAccountId:'owed',destinationAccountId:'cash',description:'Repayment'},
   {id:'deposit',date:'2026-11-04',kind:'fd-deposit',amount:300,sourceAccountId:'bank',destinationAccountId:'fd',description:'FD'},
   {id:'mature',date:'2026-11-05',kind:'fd-withdrawal',amount:300,interestAmount:20,feeAmount:5,sourceAccountId:'fd',destinationAccountId:'bank',description:'Maturity'},
   {id:'purchase',date:'2026-11-06',kind:'shopping',amount:100,sourceAccountId:'bank',expenseCategoryId:'food',description:'Shopping'},
   {id:'refund',date:'2026-11-07',kind:'refund',amount:40,destinationAccountId:'bank',originalTransactionId:'purchase',description:'Refund'},
   {id:'cardbuy',date:'2026-11-08',kind:'credit-card-purchase',amount:50,destinationAccountId:'card',expenseCategoryId:'food',description:'Card purchase'},
   {id:'cardpay',date:'2026-11-09',kind:'credit-card-payment',amount:50,sourceAccountId:'bank',destinationAccountId:'card',description:'Card payment'},
   {id:'income',date:'2026-11-10',kind:'income',amount:200,destinationAccountId:'bank',incomeCategoryId:'salary',description:'Income'},
   {id:'expense',date:'2026-11-11',kind:'expense',amount:30,sourceAccountId:'bank',expenseCategoryId:'food',description:'Expense'},
   {id:'borrow',date:'2026-11-12',kind:'borrow',amount:100,feeAmount:3,sourceAccountId:'debt',destinationAccountId:'bank',description:'Loan'},
   {id:'principal',date:'2026-11-13',kind:'principal-repayment',amount:40,interestAmount:4,feeAmount:1,sourceAccountId:'bank',destinationAccountId:'debt',description:'Principal'}
  ]
 };
 const finance = await import(require('node:url').pathToFileURL(require('node:path').join(__dirname,'finance.js')).href);
 const sum=finance.financialRange(sandbox.ledgerFixture,'2026-11-01','2026-11-30');
 assert.equal(sum.income,220,'FD interest and real income only');
 assert.equal(sum.expenses,153,'Purchase, refund, card, interest and fees without duplicate principal');
 assert.equal(sum.net,67,'Savings equals income less expenses');
 assert.equal(finance.financialCash(sandbox.ledgerFixture,'2026-11-30'),1027,'Principal transfers affect liquid cash without changing savings');
 assert.equal(sandbox.ledgerFixture.ledgerTransactions.length,13,'All account postings preserved');
 const positions=finance.financialAccounts(sandbox.ledgerFixture,'2026-11-30');
 assert.equal(positions.receivables,100,'Lending minus repayments');
 assert.equal(positions.liabilities,60,'Borrowed principal outstanding');
 assert.equal(positions.netWorth,1067,'Account net worth reconciles income minus expenses');
 assert.match(evaluate('accountsText(ledgerFixture,"2026-11-04")'),/Money receivable/);
 assert.equal(evaluate('homeKeyboard().inline_keyboard.flat().some(b=>b.callback_data==="accounts")'),true);

 assert.match(evaluate('entriesText(ledgerFixture,"2026-11-04")'),/Accounts/);
 assert.match(evaluate('reportText(ledgerFixture,"month","2026-11-30","2026-11-04")'),/220\.00/);
 assert.match(evaluate('pdfLines(ledgerFixture,"month","2026-11-30","2026-11-04").join(" ")'),/ACCOUNT MOVEMENTS/);

 assert.equal(evaluate('rangeValid("2026-11-01","2026-11-30")'),true);
 assert.equal(evaluate('rangeValid("2026-11-31","2026-12-01")'),false);
 assert.equal(evaluate('rangeValid("2026-12-01","2026-11-30")'),false);
 assert.equal(evaluate('rangeValid("2024-01-01","2026-11-30")'),false);
 assert.equal(evaluate('rangePreset("30","2026-11-30").from'),"2026-11-01");
 assert.equal(evaluate('rangePreset("fy","2026-11-30").from'),"2026-04-01");
 assert.match(evaluate('customRangeText(ledgerFixture,"2026-11-01","2026-11-30","2026-11-04")'),/220\.00/);
 assert.match(evaluate('pdfLines(ledgerFixture,"range","2026-11-30","2026-11-04","2026-11-01","2026-11-30").join(" ")'),/2026-11-01 to 2026-11-30/);
 assert.match(evaluate('searchTransactions(ledgerFixture,"Shopping","2026-11-04")'),/shopping/);
 assert.match(evaluate('searchTransactions(ledgerFixture,"madeupxyz","2026-11-04")'),/No matching/);
 assert.match(evaluate('lendingText(ledgerFixture,"2026-11-04")'),/100\.00/);
 assert.match(evaluate('investmentsText(ledgerFixture,"2026-11-04")'),/FD/);
 sandbox.emiFixture={...sandbox.ledgerFixture,settings:{...sandbox.ledgerFixture.settings,emiPreviousMonth:true,salaryDay:10},loan:{rows:[{id:'emi-1',dueDate:'2026-12-05',paid:false,paidBeforeOpening:false,emi:2000,paidAmount:0,paidDate:''}]},additionalLoans:[]};
 assert.equal(evaluate('plannedEmiDate(emiFixture,loanInstallments(emiFixture)[0])'),'2026-11-10');
 sandbox.emiFixtureNoAdvance={...sandbox.emiFixture,settings:{...sandbox.emiFixture.settings,emiPreviousMonth:false}};
 assert.equal(evaluate('plannedEmiDate(emiFixtureNoAdvance,loanInstallments(emiFixtureNoAdvance)[0])'),'2026-12-05','Do not invent a planned date after the contractual due');

 assert.match(evaluate('emiText(emiFixture,"2026-11-04")'),/Planned: 2026-11-10/);
 sandbox.quiet={alerts_enabled:true,sync_alerts:false,budget_alerts:false,emi_reminders:true,low_balance_alerts:false};
 assert.match(evaluate('alertItems(emiFixture,"2026-11-09",quiet,"2026-11-09").map(x=>x.html).join(" ")'),/ADVANCE EMI PLAN/);
 sandbox.emiFixture.loan.rows[0].paidAmount=2000;sandbox.emiFixture.loan.rows[0].paidDate="2026-11-09";
 assert.equal(evaluate('alertItems(emiFixture,"2026-11-09",quiet,"2026-11-09").filter(x=>x.key.startsWith("emi:")).length'),0,'Fully-paid EMI cannot remind again');


 console.log('Savings bot: privacy/edit, compact menu, reports, search, account ledger and advance EMI checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
