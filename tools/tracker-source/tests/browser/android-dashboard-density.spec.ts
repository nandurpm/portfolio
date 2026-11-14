import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [320, 360, 390, 412, 480]) {
  test(`compact Android Home and preserved reporting controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://*.supabase.co/**', r => r.abort());
    await page.route('https://api.github.com/**', r => r.abort());
    await page.goto('/tests/browser/harness.html?android=1');
    const home = page.locator('.android-home');
    await expect(home).toBeVisible();
    const financial = () => page.evaluate(async () => {
      const modulePath = '/src/store.ts';
      const { store } = await import(modulePath);
      const { settings: _settings, celebrated: _celebrated, ...records } = store.get().data;
      return JSON.parse(JSON.stringify(records, (key, value) =>
        ['paid', 'paidAmount', 'paidBeforeOpening', 'paidDate'].includes(key) ? undefined : value));
    });
    const records = await financial();
    const cash = await home.locator('.mobile-balance strong').innerText();
    for (const theme of ['light', 'dark']) for (const scale of [1, 1.5]) {
      await page.evaluate(({theme, scale}) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.fontSize = `${scale * 16}px`;
      }, { theme, scale });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(home.locator('.mobile-balance strong')).toHaveText(cash);
      for (const button of await page.getByRole('navigation', {name:'Phone navigation'}).getByRole('button').all()) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      }
      const violations = (await new AxeBuilder({page}).include('.android-home').analyze()).violations;
      expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
      await page.screenshot({path: `test-results/android-simple-${width}-${theme}-${scale}.png`});
    }
    await page.evaluate(() => {document.documentElement.style.fontSize = '16px';});
    await page.locator('.mobile-analysis > summary').click();
    const context = page.locator('.dashboard-context');
    await expect(context).toBeVisible();
    await page.getByLabel('Review month', {exact:true}).selectOption('2026-12');
    await expect(page.getByLabel('Review month', {exact:true})).toHaveValue('2026-12');
    await page.getByLabel('Report through date', {exact:true}).fill('2026-11-03');
    await context.getByRole('button', {name: 'Reset report date to today'}).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('savings-expence-v1')!).data.settings.liveDate)).toBe(true);
    await context.locator('summary').filter({hasText: 'View range'}).click();
    await context.locator('.range-mini').click();
    await expect(page.getByRole('heading', {name:'Choose a view range'})).toBeVisible();
    await page.getByLabel('Quick preset').selectOption('Full plan');
    await page.getByRole('button', {name:'Apply range'}).click();
    expect(await financial()).toEqual(records);
    for (const name of ['Activity', 'Accounts', 'Home']) {
      await page.getByRole('navigation', {name:'Phone navigation'}).getByRole('button', {name, exact:true}).click();
      await expect(page.locator('.screen-loading')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}
