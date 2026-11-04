import { test, expect } from '@playwright/test';
for (const width of [360,1366]) test(`website progress uses full budgets with unfinished-month guidance at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.route('https://*.supabase.co/**',r=>r.abort());
  await page.goto('/tests/browser/harness.html');
  await expect(page.getByRole('heading',{name:'Monthly snapshot',exact:true})).toBeVisible();
  await page.getByLabel('Report through date',{exact:true}).fill('2026-11-03');
  await expect(page.getByRole('heading', { name: 'Full dashboard analysis' })).toBeVisible();
  await expect(page.locator('details.dashboard-deep-dive')).toHaveCount(0);
  const progress=page.getByRole('region',{name:'Recorded monthly progress',exact:true});
  await progress.scrollIntoViewIfNeeded();
  await expect(progress).toContainText('In progress');
  if(width===360){
    await expect(page.locator('.progress-month-card').first()).toContainText('November 2026');
    await expect(progress.locator('table')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  }else await expect(progress.locator('table')).toBeVisible();
  await page.getByLabel('Report through date',{exact:true}).fill('2026-11-30');
  await expect(progress).not.toContainText('In progress');
});
