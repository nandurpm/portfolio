import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function navigate(page: Page, name: string) {
  const main = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name, exact: true });
  if (await main.isVisible()) {
    await main.click();
    return;
  }
  const names: Record<string, string> = {
    Dashboard: 'Home',
    'Daily Entries': 'Entries',
    'Budget & Plan': 'Budget',
    'Forecast & Month-by-month': 'Forecast',
  };
  if (names[name])
    await page
      .getByRole('navigation', { name: 'Phone navigation' })
      .getByRole('button', { name: names[name], exact: true })
      .click();
  else {
    await page.getByRole('button', { name: 'More screens', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
  }
}
for (const width of [320, 390, 768, 1366])
  test(`accessibility and cold loan route ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://*.supabase.co/**', (r) => r.abort());
    await page.goto('/tests/browser/harness.html');
    await expect(
      page.getByRole('heading', { name: 'A little progress. Every day.' }),
    ).toBeVisible();
    const t = Date.now();
    await navigate(page, 'Loan & Closure');
    await expect(
      page.getByRole('heading', { name: 'Your payment schedule', exact: true }),
    ).toBeVisible();
    const loadMs = Date.now() - t;
    // Generous hosted-runner smoke budget; not a universal device-performance guarantee.
    expect(loadMs).toBeLessThan(12000);
    await testInfo.attach('cold-loan-route.json', {
      body: JSON.stringify({ width, loadMs, budgetMs: 12000, scope: 'isolated synthetic fixture' }),
      contentType: 'application/json',
    });
    const screens = [
      ['Loan & Closure', 'Make room for a debt-free future.'],
      ['Balances & provisions', 'Compare your balance. Plan for your bills.'],
      ['Daily Entries', 'Small entries. Clearer money.'],
      ['Budget & Plan', 'Give every rupee a plan.'],
      ['Reports & Export/Import', 'Your data. Always yours.'],
      ['Settings', 'Make it feel like you.'],
      ['Forecast & Month-by-month', 'See where your plan takes you.'],
      ['Dashboard', 'A little progress. Every day.'],
    ];
    const issues: { screen: string; id: string; target: unknown; summary: string | undefined }[] =
      [];
    for (const [name, title] of screens) {
      if (name !== 'Loan & Closure') await navigate(page, name!);
      await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const serious = result.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      for (const violation of serious)
        for (const node of violation.nodes)
          issues.push({
            screen: name!,
            id: violation.id,
            target: node.target,
            summary: node.failureSummary,
          });
    }
    await testInfo.attach('axe-findings.json', {
      body: JSON.stringify(issues, null, 2),
      contentType: 'application/json',
    });
    expect(issues, JSON.stringify(issues)).toEqual([]);
    await navigate(page, 'Forecast & Month-by-month');
    await page.getByRole('button', { name: /VIEW RANGE/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a view range' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Apply range', exact: true }).focus();
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: /VIEW RANGE/ })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true,
    );
  });
