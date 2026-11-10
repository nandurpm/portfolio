import { test, expect } from '@playwright/test';

test('Restored Android Accounts prevents rapid double-save of a synthetic transfer', async ({page}) => {
  await page.setViewportSize({width:393,height:873});
  await page.route('https://*.supabase.co/**',r=>r.abort());
  await page.route('https://api.github.com/**',r=>r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.dashboard-balance strong')).toBeVisible();
  await page.evaluate(async () => {
    const modulePath='/src/store.ts';
    const {store}=await import(modulePath) as typeof import('../../src/store');
    store.change('Synthetic local test accounts',d=>{
      d.accounts=[
        {id:'rollback-test-a',name:'Test Bank A',kind:'bank',openingBalance:500,active:true,note:''},
        {id:'rollback-test-b',name:'Test Bank B',kind:'bank',openingBalance:0,active:true,note:''},
      ];
      d.ledgerTransactions=[];
    });
  });
  await page.getByRole('navigation',{name:'Phone navigation'}).getByRole('button',{name:'Accounts',exact:true}).click();
  await page.getByRole('button',{name:'Transaction',exact:true}).click();
  await page.getByLabel('Type',{exact:true}).selectOption('transfer');
  await page.getByLabel('From account').selectOption('rollback-test-a');
  await page.getByLabel('To account').selectOption('rollback-test-b');
  await page.getByLabel('Amount',{exact:true}).fill('50');
  await page.evaluate(()=>{
    const btn=document.querySelector<HTMLButtonElement>('.accounts-page .modal-actions .button:not(.secondary)');
    if(!btn)throw Error('Save transaction button missing');
    btn.click(); btn.click();
  });
  await expect.poll(()=>page.evaluate(async ()=>{
    const modulePath='/src/store.ts';
    const {store}=await import(modulePath) as typeof import('../../src/store');
    return store.get().data.ledgerTransactions?.filter(row=>row.kind==='transfer'&&row.amount===50).length??0;
  })).toBe(1);
});
