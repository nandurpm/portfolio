import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 393, height: 873, name: 'phone' },
  { width: 1366, height: 768, name: 'desktop' },
]) {
  test(`dashboard visual ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('https://*.supabase.co/**', (route) => route.abort());
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/tests/browser/harness.html');
    await expect(page.getByRole('heading', { name: 'Monthly snapshot' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Calculated cash balance' })).toBeVisible();
    const quickActions = page.getByRole('group', { name: 'Quick actions' });
    await expect(quickActions.getByRole('button', { name: 'Add income', exact: true })).toBeVisible();
    await expect(quickActions.getByRole('button', { name: 'Add expense', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `test-results/dashboard-${viewport.name}.png`,
      fullPage: false,
    });
  });
}
