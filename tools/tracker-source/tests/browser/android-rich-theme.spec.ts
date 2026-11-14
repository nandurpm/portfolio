import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark']) test(`rich Android surfaces preserve records and accessible flows in ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 873 });
  await page.route('https://*.supabase.co/**', r => r.abort());
  await page.route('https://api.github.com/**', r => r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.android-home')).toBeVisible();
  await page.evaluate(async theme => {
    const path='/src/store.ts'; const {store}=await import(path);
    store.change('Synthetic visual fixture',(p:any)=>{
      p.settings.theme=theme;
      p.accounts=[{id:'rich-bank',name:'Everyday Bank',kind:'bank',openingBalance:500,active:true,note:'Synthetic account'},{id:'rich-wallet',name:'Savings Wallet',kind:'wallet',openingBalance:0,active:true,note:''}];
      p.ledgerTransactions=[
        {id:'rich-income',kind:'income',destinationAccountId:'rich-bank',date:'2026-11-14',amount:100,description:'Income received',note:''},
        {id:'rich-expense',kind:'expense',sourceAccountId:'rich-bank',date:'2026-11-14',amount:25,description:'Groceries',note:''},
        {id:'rich-transfer',kind:'transfer',sourceAccountId:'rich-bank',destinationAccountId:'rich-wallet',date:'2026-11-14',amount:50,feeAmount:1,description:'Savings transfer',note:''},
      ];
    });
  },theme);
  const records=()=>page.evaluate(async()=>{const path='/src/store.ts';const {store}=await import(path);return JSON.stringify(store.get().data);});
  const before=await records();
  expect(await page.locator('.mobile-balance').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  const backgrounds=await page.locator('.mobile-summary .stat-card').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
  expect(new Set(backgrounds).size).toBe(3);
  const values=await page.locator('.mobile-summary .stat-card > strong').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));
  expect(Math.max(...values)-Math.min(...values)).toBeLessThan(2);
  const check=async(selector:string,name:string)=>{
    const violations=(await new AxeBuilder({page}).include(selector).analyze()).violations;
    expect(violations.filter(v=>['serious','critical'].includes(v.impact??'')),name).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:`test-results/android-rich-${name}-${theme}.png`});
  };
  await check('.android-home','home');
  const nav=page.getByRole('navigation',{name:'Phone navigation'});
  await nav.getByRole('button',{name:'Activity',exact:true}).click();
  await expect(page.locator('.unified-activity')).toContainText('Savings transfer');
  await check('.android-activity','activity');
  await nav.getByRole('button',{name:'Accounts',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your accounts',exact:true})).toBeVisible();
  await check('.mobile-accounts-list','accounts');
  await page.getByRole('button',{name:'Transfer',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Transfer between accounts'})).toBeVisible();
  await check('[role="dialog"]','transfer');
  await page.getByRole('button',{name:'Close dialog'}).click();
  await nav.getByRole('button',{name:'Home',exact:true}).click();
  await page.locator('.android-add').click();
  await check('[role="dialog"]','quick-actions');
  await page.getByRole('button',{name:'Close dialog'}).click();
  await nav.getByRole('button',{name:'More screens'}).click();
  await check('.android-more','more');
  expect(await records()).toBe(before);
});
