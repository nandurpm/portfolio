import {test,expect,type Page} from '@playwright/test';

async function snapshot(page:Page){
  return page.evaluate(async()=>{
    const [storePath,calcPath,netPath]=['/src/store.ts','/src/domain/calculate.ts','/src/domain/net-worth.ts'];
    const {store}=await import(storePath!);const calc=await import(calcPath!);const {netWorthSnapshot}=await import(netPath!);
    store.change('Synthetic parity scenario',(d:any)=>{
      d.settings.selectedMonth='2026-11';d.settings.liveDate=false;d.settings.reportDate='2026-11-15';
      d.accounts=[{id:'bank',name:'Bank',kind:'bank',openingBalance:300,active:true,note:''},{id:'wallet',name:'Cash',kind:'cash',openingBalance:200,active:true,note:''}];
      d.provisions=[{id:'reserve',categoryId:'bill',startMonth:'2026-11',firstDueMonth:'2026-12',everyMonths:2,monthlyAmount:150,billAmount:300,openingReserve:50,allocationDay:10,dueDay:25,enabled:true}];
      d.ledgerTransactions=[{id:'transfer',date:'2026-11-11',kind:'transfer',amount:25,feeAmount:2,sourceAccountId:'bank',destinationAccountId:'wallet',description:'Internal transfer',note:''},{id:'bill',date:'2026-11-12',kind:'expense',amount:10,sourceAccountId:'bank',expenseCategoryId:'bill',provisionId:'reserve',billDueMonth:'2026-12',description:'Early bill',note:''},{id:'income',date:'2026-11-13',kind:'income',amount:100,incomeCategoryId:'salary',destinationAccountId:'bank',description:'Income',note:''}];
    });
    const p=store.get().data,m=p.settings.selectedMonth,date=calc.reportDate(p);
    const worth=netWorthSnapshot(p);
    return {planned:calc.planned(p,m),actual:calc.actual(p,m+'-01',date),cumulative:calc.cumulative(p),savings:calc.savingsOverview(p,m,date),progress:calc.progress(p),forecast:calc.forecast(p),netWorth:worth.netWorth};
  });
}
test('Web, Windows shell simulation and Android return identical financial snapshots',async({page},info)=>{
  await page.route('https://*.supabase.co/**',r=>r.abort());await page.route('https://api.github.com/**',r=>r.abort());
  const outputs=[];
  for(const platform of ['web','windows','android']){
    await page.setViewportSize({width:platform==='android'?390:1366,height:900});
    await page.goto('/tests/browser/harness.html'+(platform==='web'?'':`?${platform}=1`));
    await expect(page.locator('.dashboard-balance strong')).toBeVisible();
    const output=await snapshot(page);outputs.push(output);
    await expect(page.locator('.dashboard-balance strong')).toHaveText('₹588.00');
    expect(output.actual.income).toBe(100);expect(output.actual.expenses).toBe(12);
    await page.screenshot({path:`test-results/parity-${platform}.png`});
  }
  expect(outputs[1]).toEqual(outputs[0]);expect(outputs[2]).toEqual(outputs[0]);
  await info.attach('financial-parity.json',{body:JSON.stringify(outputs[0]),contentType:'application/json'});
});
test('Android progress range remains valid after an incoming plan-range change',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.route('https://*.supabase.co/**',r=>r.abort());await page.route('https://api.github.com/**',r=>r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.dashboard-balance strong')).toBeVisible();
  await page.evaluate(async()=>{
    const modulePath='/src/store.ts';const {store}=await import(modulePath);
    store.change('Synthetic plan range change',(d:any)=>{d.settings.planStart='2030-01';d.settings.planEnd='2030-12';d.settings.selectedMonth='2030-01';d.settings.viewStart='2030-01';d.settings.viewEnd='2030-12';});
  });
  // The monthly progress form is now mounted on demand to keep the phone's Home light.
  await page.locator('.dashboard-deep-dive > summary').click();
  await expect(page.locator('.dashboard-deep-dive-body')).toBeVisible();
  for(const label of ['Progress range start','Progress range end']){
    const select=page.getByLabel(label,{exact:true});await expect(select).toHaveValue('2030-01');
  }
  const card=page.locator('.progress-month-card').last();
  await expect(card).toContainText('January 2030');
  await expect(card.locator('dl > div').filter({has:page.getByText('Income plan',{exact:true})})).toContainText('₹1,200.00');
  await expect(card.locator('dl > div').filter({has:page.getByText('Income received',{exact:true})})).toContainText('—');
});

test('Accounts rejects an off-cycle bill link before changing any platform records',async({page})=>{
  await page.route('https://*.supabase.co/**',r=>r.abort());await page.route('https://api.github.com/**',r=>r.abort());
  for(const platform of ['web','windows','android']){
    await page.setViewportSize({width:platform==='android'?390:1366,height:900});
    await page.goto('/tests/browser/harness.html'+(platform==='web'?'':`?${platform}=1`));
    await expect(page.locator('.dashboard-balance strong')).toBeVisible();await snapshot(page);
    await page.getByRole('navigation',{name:platform==='android'?'Phone navigation':'Main navigation'}).getByRole('button',{name:platform==='android'?'Accounts':'Accounts & transactions',exact:true}).click();
    await page.getByRole('button',{name:'Transaction',exact:true}).click();
    await page.getByLabel('Date',{exact:true}).fill('2027-01-11');
    await page.getByLabel('Amount',{exact:true}).fill('100');
    await page.getByLabel('From account',{exact:true}).selectOption('bank');
    await page.getByLabel('Expense category',{exact:true}).selectOption('bill');
    await expect(page.getByLabel('Bill due month',{exact:true})).toHaveValue('2027-02');
    await page.getByLabel('Bill due month',{exact:true}).fill('2027-01');
    await page.getByRole('button',{name:'Save transaction',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'provision schedule'})).toBeVisible();
    const rows=await page.evaluate(async()=>{const modulePath='/src/store.ts';const {store}=await import(modulePath);return store.get().data.ledgerTransactions;});
    expect(rows).toHaveLength(3);
  }
});
