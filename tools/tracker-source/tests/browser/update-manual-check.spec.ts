import { expect, test } from '@playwright/test';

for (const android of [true, false]) {
  test('Settings update button visibility on ' + (android ? 'Android simulation' : 'Web preview'), async ({ page }) => {
    await page.setViewportSize({ width: android ? 393 : 1380, height: 900 });
    await page.route('https://*.supabase.co/**', route => route.abort());
    await page.route('https://api.github.com/**', route => route.abort());
    await page.goto('/tests/browser/harness.html' + (android ? '?android=1' : ''));
    if (android) {
      await page.getByRole('navigation', { name: 'Phone navigation' })
        .getByRole('button', { name: 'More screens' }).click();
      await page.locator('.android-more-card').filter({ has: page.getByText('Settings', { exact: true }) }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main navigation' })
        .getByRole('button', { name: 'Settings' }).click();
    }
    const button = page.getByRole('button', { name: 'Check for updates', exact: true });
    if (!android) {
      // The browser-only website never offers native APK installation controls.
      await expect(button).toHaveCount(0);
      return;
    }
    await expect(button).toBeVisible();
    await page.evaluate(() => {
      (window as typeof window & { testUpdateChecks?: number }).testUpdateChecks = 0;
      window.addEventListener('tracker:check-for-updates', () => {
        const target = window as typeof window & { testUpdateChecks?: number };
        target.testUpdateChecks = (target.testUpdateChecks ?? 0) + 1;
      });
    });
    await button.click();
    await expect.poll(() => page.evaluate(
      () => (window as typeof window & { testUpdateChecks?: number }).testUpdateChecks,
    )).toBe(1);
  });
}
