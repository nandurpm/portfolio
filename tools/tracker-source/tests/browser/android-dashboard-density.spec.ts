import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [320, 360, 390, 412, 480]) {
  test(`compact Android reporting and full-width pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://*.supabase.co/**', r => r.abort());
    await page.route('https://api.github.com/**', r => r.abort());
    await page.goto('/tests/browser/harness.html?android=1');
    const context = page.locator('.dashboard-context');
    await expect(context).toBeVisible();
    const financial = () => page.evaluate(async () => {
      const modulePath = '/src/store.ts';
      const { store } = await import(modulePath);
      const { settings: _settings, celebrated: _celebrated, ...records } = store.get().data;
      // Paid badges are derived from the reporting cutoff; payment records remain authoritative.
      return JSON.parse(JSON.stringify(records, (key, value) =>
        ['paid', 'paidAmount', 'paidBeforeOpening', 'paidDate'].includes(key) ? undefined : value));
    });
    const records = await financial();
    const cash = await page.locator('.dashboard-balance strong').innerText();
    for (const theme of ['light', 'dark']) for (const scale of [1, 1.5]) {
      await page.evaluate(({theme, scale}) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.fontSize = `${scale * 16}px`;
      }, { theme, scale });
      const bounds = await context.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(width - 18);
      expect(bounds!.height).toBeLessThan(scale === 1 ? 215 : 330);
      // Nested activity cards should not accumulate panel + group gutters.
      const activityCard = await page.locator('.monthly-activity .checklist-card').first().boundingBox();
      expect(activityCard!.x).toBeGreaterThanOrEqual(6);
      expect(activityCard!.x).toBeLessThanOrEqual(18);
      expect(activityCard!.x + activityCard!.width).toBeGreaterThanOrEqual(width - 18);
      const hero = await page.locator('.dashboard-hero').boundingBox();
      expect(hero!.y).toBeLessThan(scale === 1 ? 400 : 540);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      for (const selector of ['select', 'input', '.range-mini', '.icon-button']) {
        for (const control of await context.locator(selector).all()) {
          if (!await control.isVisible()) continue;
          const box = await control.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(8);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width - 8);
        }
      }
      await expect(page.locator('.dashboard-balance strong')).toHaveText(cash);
      expect(await page.locator('.dashboard-hero').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      if (scale === 1) {
        const violations = (await new AxeBuilder({page}).include('.dashboard-context').analyze()).violations;
        expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
      }
      await page.screenshot({path: `test-results/dashboard-291-${width}-${theme}-${scale}.png`});
    }
    await page.evaluate(() => {document.documentElement.style.fontSize = '16px';});
    const month = page.getByLabel('Review month', {exact:true});
    await month.selectOption('2026-12');
    await expect(month).toHaveValue('2026-12');
    await page.getByLabel('Report through date', {exact:true}).fill('2026-11-03');
    await expect(page.getByLabel('Report through date', {exact:true})).toHaveValue('2026-11-03');
    await context.getByRole('button', {name: 'Reset report date to today'}).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('savings-expence-v1')!).data.settings.liveDate)).toBe(true);
    await expect(context.locator('.range-mini')).toBeHidden();
    await context.locator('summary').filter({hasText: 'Plan range'}).click();
    await context.locator('.range-mini').click();
    await expect(page.getByRole('heading', {name:'Choose a view range'})).toBeVisible();
    await page.getByLabel('Quick preset').selectOption('Full plan');
    await page.getByRole('button', {name:'Apply range'}).click();
    await expect(page.getByRole('heading', {name:'Choose a view range'})).toHaveCount(0);
    expect(await financial()).toEqual(records);
    for (const name of ['Transactions', 'Accounts', 'Budget', 'Home']) {
      await page.getByRole('navigation', {name:'Phone navigation'}).getByRole('button', {name, exact:true}).click();
      await expect(page.locator('.screen-loading')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}
