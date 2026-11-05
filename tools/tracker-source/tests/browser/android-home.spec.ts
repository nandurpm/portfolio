import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [360, 393, 768]) {
  test(`Android presentation ${width}px uses shared balances and keeps tools reachable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 873 });
    await page.route('https://*.supabase.co/**', r => r.abort());
    await page.route('https://api.github.com/**', r => r.abort());
    await page.goto('/tests/browser/harness.html');
    await expect(page.getByRole('heading', { name: 'Monthly snapshot', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/android-home-before-shared-layout-${width}.png`, fullPage: true });
    await page.goto('/tests/browser/harness.html?android=1');
    await expect(page.locator('.android-home h1')).toHaveText('Home');
    await expect(page.getByRole('region', { name: 'Available balance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Latest money movements' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Full dashboard analysis' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    await page.screenshot({ path: `test-results/android-home-after-${width}.png`, fullPage: true });
    const violations = (await new AxeBuilder({ page }).include('.android-home').analyze()).violations;
    expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
    await page.getByRole('button', { name: 'View balance breakdown', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Accounts & transactions', exact: true })).toBeVisible();
    if (width < 761) {
      await page.getByRole('button', { name: 'More screens', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('button', { name: 'Provisions & reserves', exact: true })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Reports & Export/Import', exact: true })).toBeVisible();
    }
  });
}

test('desktop dashboard retains full analysis and balance breakdown', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route('https://*.supabase.co/**', r => r.abort());
  await page.goto('/tests/browser/harness.html');
  await expect(page.getByRole('heading', { name: 'Full dashboard analysis', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Balance breakdown', exact: true })).toBeVisible();
  expect(await page.locator('.android-home').count()).toBe(0);
});
