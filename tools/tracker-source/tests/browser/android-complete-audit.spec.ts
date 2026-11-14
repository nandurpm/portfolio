import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-14T12:00:00Z'));
 await page.setViewportSize({width:393,height:873});
 await page.route('https://*.supabase.co/**',r=>r.abort());
 await page.route('https://api.github.com/**',r=>r.abort());
 await page.goto('/tests/browser/harness.html?android=1');
 await expect(page.locator('.android-home')).toBeVisible();
});

test('expanded Home has one recent activity surface and unique IDs',async({page})=>{
 const value=await page.locator('.mobile-balance > strong').innerText();
 await page.locator('.mobile-analysis > summary').click();
 await expect(page.locator('.dashboard-context')).toBeVisible();
 await expect(page.locator('.mobile-recent')).toHaveCount(1);
 const duplicate=await page.locator('[id]').evaluateAll(nodes=>{
  const ids=nodes.map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);
 });
 expect(duplicate).toEqual([]);
 await expect(page.locator('.mobile-balance > strong')).toHaveText(value);
});

test('asset movements remain neutral on Home and Activity without changing report totals',async({page})=>{
 await page.evaluate(async()=>{
  const module='/src/store.ts';const {store}=await import(module);
  store.change('Synthetic asset entry',(p:any)=>{
   p.categories.push({id:'audit-asset',name:'Asset movement',group:'Asset',role:'regular',amount:0,timing:'Daily',day:1,active:true,months:[],note:''});
   p.entries.push({id:'audit-asset-entry',categoryId:'audit-asset',date:'2027-02-28',amount:25,description:'Synthetic asset record',payment:'Cash',notes:''});
  });
 });
 const row=page.locator('.mobile-recent li').filter({hasText:'Synthetic asset record'});
 await expect(row.locator('.mobile-recent-amount')).toHaveClass(/movement/);
 await expect(row.locator('.mobile-recent-amount')).toHaveText('asset movement');
 await page.getByRole('navigation',{name:'Phone navigation'}).getByRole('button',{name:'Activity',exact:true}).click();
 await expect(page.locator('.unified-activity li').filter({hasText:'Synthetic asset record'})).toContainText('asset movement');
});

for(const theme of ['light','dark'])test(`Android design surfaces and forms at phone/tablet widths in ${theme}`,async({page})=>{
 await page.evaluate(async theme=>{const module='/src/store.ts';const {store}=await import(module);store.change('Synthetic theme',(p:any)=>{p.settings.theme=theme;});},theme);
 const nav=page.getByRole('navigation',{name:'Phone navigation'});
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('savings-expence-v1')!).data);
 for(const width of [320,360,393,430,768]){
  await page.setViewportSize({width,height:873});
  await nav.getByRole('button',{name:'Home',exact:true}).click();
  await expect(page.locator('.mobile-balance-link')).toBeVisible();
  for(const destination of ['Home','Activity','Accounts']){
   await nav.getByRole('button',{name:destination,exact:true}).click();
   await expect(page.locator('.screen-loading')).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await page.screenshot({path:`test-results/android-audit-${destination}-${theme}-${width}.png`});
  }
 }
 await nav.getByRole('button',{name:'More screens'}).click();
 await expect(page.locator('.android-more-groups > section')).toHaveCount(3);
 // Every existing destination is retained; import now has a distinct, focused section.
 const titles=await page.locator('.android-more-copy strong').allTextContents();expect(new Set(titles).size).toBe(titles.length);expect(titles.length).toBe(14);
 await page.screenshot({path:`test-results/android-audit-More-${theme}.png`});
 await page.locator('.android-more-card').filter({has:page.getByText('Import and Export',{exact:true})}).click();
 await expect(page.getByRole('heading',{name:'Bring your Excel plan with you',exact:true})).toBeInViewport();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('savings-expence-v1')!).data);
 expect(after).toEqual(before);
 await nav.getByRole('button',{name:'Home',exact:true}).click();
 const result=await new AxeBuilder({page}).include('.android-home').analyze();
 expect(result.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
});
