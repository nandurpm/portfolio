import {test, expect} from '@playwright/test';
for (const android of [false, true]) test(`animated tab switching keeps records intact (${android ? 'Android' : 'Web'})`, async ({page}, info) => {
  await page.setViewportSize({width:android ? 390:1366,height:900});
  await page.route('https://*.supabase.co/**',r=>r.abort());
  await page.route('https://api.github.com/**',r=>r.abort());
  await page.goto('/tests/browser/harness.html'+(android?'?android=1':''));
  await expect(page.locator('.dashboard-balance strong')).toBeVisible();
  const records = () => page.evaluate(async () => {
    const modulePath='/src/store.ts';const {store}=await import(modulePath);
    const {settings:_settings,celebrated:_celebrated,...data}=store.get().data;return data;
  });
  await page.evaluate(async () => {const modulePath='/src/store.ts';const {store}=await import(modulePath);store.change('Test animations', (d: {settings:{animations:boolean}})=>{d.settings.animations=true;});});
  const before=await records();const timings=[];
  for(const [id,desktop,phone] of [['accounts','Accounts & transactions','Accounts'],['budget','Budget & Plan','Budget'],['entries','Daily Entries','Transactions'],['dashboard','Dashboard','Home']]){
    const start=Date.now();
    await page.getByRole('navigation',{name:android?'Phone navigation':'Main navigation'}).getByRole('button',{name:android?phone:desktop,exact:true}).click();
    await expect(page.locator('.main-scroll')).toHaveAttribute('data-page',id!);
    await expect(page.locator('.screen-loading')).toHaveCount(0);
    await expect(page.locator('.main-scroll h1')).toHaveCount(1);
    timings.push({id,ms:Date.now()-start});
  }
  expect(await records()).toEqual(before);
  await info.attach('tab-switch-timings.json',{body:JSON.stringify({android,timings,scope:'Synthetic browser fixture; not physical hardware timings'}),contentType:'application/json'});
});
