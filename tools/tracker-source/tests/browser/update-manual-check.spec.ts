import { expect, test } from '@playwright/test';

for (const android of [true, false]) {
  test('Settings exposes a manual update check on ' + (android ? 'Android' : 'Windows preview'), async ({ page }) => {
    await page.setViewportSize({ width: android ? 393 : 1380, height: 900 });
    await page.route('https://*.supabase.co/**', route => route.abort());
    await page.route('https://api.github.com/**', route => route.abort());
    await page.goto('/tests/browser/harness.html' + (android ? '?android=1' : ''));
    if (android) {
      await page.getByRole('navigation', { name: 'Phone navigation' })
        .getByRole('button', { name: 'More screens' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Settings', exact: true }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main navigation' })
        .getByRole('button', { name: 'Settings' }).click();
    }
    const button = page.getByRole('button', { name: 'Check for updates', exact: true });
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
