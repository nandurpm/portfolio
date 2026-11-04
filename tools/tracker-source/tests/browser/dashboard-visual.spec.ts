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
    const reportsButton = quickActions.getByRole('button', { name: 'View reports' });
    await expect(reportsButton).toBeVisible();

    // Guard against the shared secondary-button style producing white-on-white text.
    const reportsStyle = await reportsButton.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        foreground: computed.color,
        background: computed.backgroundColor,
        fontSize: Number.parseFloat(computed.fontSize),
      };
    });
    expect(reportsStyle.foreground).toBe('rgb(255, 255, 255)');
    expect(reportsStyle.background).not.toBe('rgb(255, 255, 255)');
    expect(reportsStyle.fontSize).toBeGreaterThanOrEqual(14);

    // Cash description, dates and small hero labels remain legible on all sizes.
    const heroLabels = await page.locator(
      '.dashboard-overline, .dashboard-balance p, .dashboard-balance-meta, .dashboard-hero-insights span, .dashboard-hero-insights small',
    ).evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { fontSize: Number.parseFloat(style.fontSize), color: style.color };
    }));
    expect(heroLabels.length).toBeGreaterThan(0);
    for (const label of heroLabels) {
      expect(label.fontSize).toBeGreaterThanOrEqual(13);
      expect(label.color).toMatch(/^rgba?\\(255, 255, 255(?:, 0\\.9\\d*)?\\)$/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `test-results/dashboard-${viewport.name}.png`,
      fullPage: false,
    });
  });
}
