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
assert.equal(evaluate('homeKeyboard().inline_keyboard.flat().some(b=>b.callback_data==="e:add")'),true);
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
 assert.match(evaluate('entriesText(ledgerFixture,"2026-11-04")'),/Accounts/);
 assert.match(evaluate('reportText(ledgerFixture,"month","2026-11-30","2026-11-04")'),/220\.00/);
 assert.match(evaluate('pdfLines(ledgerFixture,"month","2026-11-30","2026-11-04").join(" ")'),/ACCOUNT MOVEMENTS/);

 console.log('Savings bot: 27 privacy/edit checks and 7 synthetic account-ledger regression checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
