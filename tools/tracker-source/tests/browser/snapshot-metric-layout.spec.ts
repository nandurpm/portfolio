import { test, expect } from '@playwright/test';

for (const platform of ['web', 'windows']) {
  for (const width of [360, 1366]) {
    test(`${platform} snapshot metrics keep labels above amounts at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route('https://*.supabase.co/**', route => route.abort());
      await page.route('https://api.github.com/**', route => route.abort());
      await page.goto('/tests/browser/harness.html' + (platform === 'windows' ? '?windows=1' : ''));
      const screens = [
        ['Loan & Closure', '.loan-command-metrics'],
        ['Salary & PF', '.employment-metric-grid'],
        ['Daily Entries', '.entries-overview-grid'],
      ];
      for (const [name, selector] of screens) {
        const nav = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: name!, exact: true });
        if (await nav.isVisible()) await nav.click();
        else if (name === 'Daily Entries') {
          await page.getByRole('navigation', { name: 'Phone navigation' }).getByRole('button', { name: 'Transactions', exact: true }).click();
        } else {
          await page.getByRole('button', { name: 'More screens', exact: true }).click();
          await page.getByRole('dialog').getByRole('button', { name: name!, exact: true }).click();
        }
        const grid = page.locator(selector!);
        await expect(grid).toHaveCSS('display', 'grid');
        for (const card of await grid.locator(':scope > div').all()) {
          const label = await card.locator('span').first().boundingBox();
          const value = await card.locator('strong').first().boundingBox();
          expect(label).not.toBeNull();
          expect(value).not.toBeNull();
          expect(value!.y).toBeGreaterThanOrEqual(label!.y + label!.height + 3);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
        await page.screenshot({ path: `test-results/snapshot-${platform}-${width}-${name!.split(' ')[0]}.png` });
      }
    });
  }
}
