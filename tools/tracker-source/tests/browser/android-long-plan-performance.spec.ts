import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'UTC' });

test('Android long-plan tabs stay responsive and charts load near the viewport', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 400 });
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.route('https://api.github.com/**', route => route.abort());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.dashboard-balance strong')).toBeVisible();
  await expect(page.locator('.dashboard-analytics')).toHaveCount(0);
  await page.evaluate(async () => {
    const storePath = '/src/store.ts', datesPath = '/src/domain/dates.ts';
    const { store } = await import(storePath);
    const { addMonths } = await import(datesPath);
    store.change('Synthetic long-plan performance scenario', (p: any) => {
      p.settings.planEnd = addMonths(p.settings.planStart, 287);
      p.settings.liveDate = false;
      p.settings.reportDate = p.settings.planEnd + '-01';
      p.entries = Array.from({ length: 1000 }, (_, i) => ({ id: 'perf-' + i, date: addMonths(p.settings.planStart, i % 288) + '-01', categoryId: i % 2 ? 'bill' : 'salary', amount: 10, payment: 'Bank', description: 'Synthetic benchmark', notes: '' }));
    });
  });
  await expect(page.locator('.dashboard-balance strong')).toHaveText('₹500.00');
  const fingerprint = () => page.evaluate(async () => {
    const path = '/src/store.ts'; const { store } = await import(path);
    return JSON.stringify(store.get().data);
  });
  const before = await fingerprint();
  const nav = page.getByRole('navigation', { name: 'Phone navigation' });
  const timings: { tab: string; ms: number }[] = [];
  for (const tab of ['Accounts', 'Activity', 'Home', 'Accounts', 'Home']) {
    const start = Date.now();
    await nav.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.locator('.main-scroll')).toHaveAttribute('data-page', tab === 'Home' ? 'dashboard' : tab === 'Accounts' ? 'accounts' : 'activity');
    await expect(page.locator('.screen-loading')).toHaveCount(0);
    await expect(page.locator('.main-scroll h1')).toHaveCount(1);
    const ms = Date.now() - start;
    timings.push({ tab, ms });
    expect(ms, `${tab} synthetic long-plan navigation`).toBeLessThan(2500);
  }
  await page.locator('.mobile-analysis > summary').click();
  const charts = page.locator('.dashboard-analytics [data-deferred-content]');
  await charts.scrollIntoViewIfNeeded();
  await expect(charts).toHaveAttribute('data-deferred-content', 'ready');
  await expect(page.locator('.dashboard-analytics .recharts-wrapper').first()).toBeVisible();
  expect(await fingerprint()).toBe(before);
  expect(errors).toEqual([]);
  await info.attach('long-plan-navigation.json', { body: JSON.stringify({ entries: 1000, months: 288, timings, scope: 'Synthetic Chromium Android shell; not physical-device timings' }), contentType: 'application/json' });
});

test('selected screen still refreshes on live-date rollover and plan edits', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-30T23:59:30Z') });
  await page.setViewportSize({ width: 390, height: 400 });
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.route('https://api.github.com/**', route => route.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.dashboard-balance strong')).toBeVisible();
  await page.evaluate(async () => {
    const path = '/src/store.ts'; const { store } = await import(path);
    store.change('Synthetic midnight test', (p: any) => {
      p.settings.liveDate = true;
      p.entries = [{ id: 'midnight', date: '2026-12-01', categoryId: 'salary', amount: 25, payment: 'Bank', description: 'Synthetic income', notes: '' }];
    });
  });
  await expect(page.locator('.dashboard-balance strong')).toHaveText('₹500.00');
  await page.clock.fastForward(65000);
  await expect(page.locator('.dashboard-balance strong')).toHaveText('₹525.00');
  await page.evaluate(async () => {
    const path = '/src/store.ts'; const { store } = await import(path);
    store.change('Synthetic edited income', (p: any) => { p.entries[0].amount = 50; });
  });
  await expect(page.locator('.dashboard-balance strong')).toHaveText('₹550.00');
});
