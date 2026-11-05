import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [360, 393, 768]) {
  test(`Android restores 2.2.2 presentation at ${width}px without changing shared amounts`, async ({ page }) => {
    await page.setViewportSize({ width, height: 873 });
    await page.route('https://*.supabase.co/**', r => r.abort());
    await page.route('https://api.github.com/**', r => r.abort());
    await page.goto('/tests/browser/harness.html');
    await expect(page.getByRole('heading', { name: 'Calculated cash balance', exact: true })).toBeVisible();
    const sharedCash = await page.locator('.dashboard-balance strong').innerText();
    // The desktop stylesheet must not acquire Android's frozen presentation.
    expect(await page.locator('[data-android-design]').count()).toBe(0);
    await page.goto('/tests/browser/harness.html?android=1');
    const home = page.locator('[data-android-design="2.2.2"]');
    await expect(home).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Monthly snapshot', exact: true })).toBeVisible();
    await expect(home.locator('.dashboard-balance strong')).toHaveText(sharedCash);
    await expect(page.getByRole('heading', { name: 'Full dashboard analysis', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Balance breakdown', exact: true })).toBeVisible();
    expect(await page.locator('.android-home').count()).toBe(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe('#168b78');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    await page.screenshot({ path: `test-results/android-restored-222-${width}.png`, fullPage: true });
    if (width < 761) {
      const nav = page.getByRole('navigation', { name: 'Phone navigation' });
      for (const name of ['Home', 'Transactions', 'Accounts', 'Budget'])
        await expect(nav.getByRole('button', { name, exact: true })).toBeVisible();
      await nav.getByRole('button', { name: 'More screens', exact: true }).click();
      await expect(page.getByRole('dialog').getByRole('button', { name: 'Reports & Export/Import', exact: true })).toBeVisible();
    }
  });
}

test('restored Android controls retain contrast across all palettes and themes', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 873 });
  await page.route('https://*.supabase.co/**', r => r.abort());
  await page.route('https://api.github.com/**', r => r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('[data-android-design="2.2.2"]')).toBeVisible();
  for (const theme of ['light', 'dark']) for (const palette of ['violet', 'ocean', 'emerald', 'rose', 'sunset', 'indigo']) {
    await page.evaluate(({ theme, palette }) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.palette = palette;
    }, { theme, palette });
    const violations = (await new AxeBuilder({ page }).include('.dashboard-hero').analyze()).violations;
    expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')), `${theme} / ${palette}`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
  }
});
