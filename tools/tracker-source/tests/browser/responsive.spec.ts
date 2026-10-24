import { test, expect, type Page } from '@playwright/test';
const sizes = [
  [360, 800],
  [393, 873],
  [768, 1024],
  [1366, 768],
  [1920, 1080],
];
async function navigate(page: Page, name: string) {
  const normal = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name, exact: true });
  if (await normal.isVisible()) {
    await normal.click();
    return;
  }
  const phoneName = (
    {
      Dashboard: 'Home',
      'Daily Entries': 'Entries',
      'Budget & Plan': 'Budget',
      'Forecast & Month-by-month': 'Forecast',
    } as Record<string, string>
  )[name];
  if (phoneName) {
    await page
      .getByRole('navigation', { name: 'Phone navigation' })
      .getByRole('button', { name: phoneName, exact: true })
      .click();
    return;
  }
  await page.getByRole('button', { name: 'More screens', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toContainText('Saved locally');
  await page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
}
for (const [width, height] of sizes)
  test(`isolated fixture UI ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await page.route('https://*.supabase.co/**', (route) => route.abort());
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tests/browser/harness.html');
    await expect(
      page.getByRole('heading', { name: 'A little progress. Every day.' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
    ).toBe(true);
    await navigate(page, 'Forecast & Month-by-month');
    await expect(
      page.getByRole('heading', { name: 'Full-month forecast', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Showing 12 of 98 months/)).toBeVisible();
    await page.getByRole('button', { name: /VIEW RANGE/ }).click();
    await expect(page.getByRole('dialog', { name: 'Choose a view range' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Quick preset' }).selectOption('Full plan');
    await page.getByRole('button', { name: 'Apply range', exact: true }).click();
    await expect(page.getByText(/Showing 98 of 98 months/)).toBeVisible();
    await page.getByRole('button', { name: /VIEW RANGE/ }).click();
    await page.getByRole('combobox', { name: 'Quick preset' }).selectOption('Next 3 months');
    await page.getByRole('button', { name: 'Apply range', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await navigate(page, 'Daily Entries');
    await expect(page.getByRole('textbox', { name: 'New transaction description' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'New transaction amount', exact: true }).fill('120');
    await expect(page.getByText(/over budget\./)).toBeVisible();
    await page.getByRole('spinbutton', { name: 'New transaction amount', exact: true }).fill('');
    await navigate(page, 'Balances & provisions');
    await expect(
      page.getByRole('heading', {
        name: 'Balance reconciliation',
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('textbox', { name: 'Reconciliation payment methods' }).fill('Bank, UPI');
    await expect(page.getByRole('textbox', { name: 'Reconciliation payment methods' })).toHaveValue(
      'Bank, UPI',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/balances-${width}x${height}.png`,
      fullPage: true,
    });
    await navigate(page, 'Loan & Closure');
    await expect(
      page.getByRole('heading', { name: 'Your payment schedule', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/loan-${width}x${height}.png`,
      fullPage: true,
    });
    await expect(page.getByText('05-Nov-2026', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/20-Oct-2026/).first()).toBeVisible();
    await navigate(page, 'Settings');
    await expect(page.getByRole('heading', { name: 'Make it feel like you.' })).toBeVisible();
    await expect(page.getByText(/Version .*Web app/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reminders & desktop behaviour' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Choose backup folder' })).toHaveCount(0);
    await expect(page.getByText('Browser preview', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Calculation difference resolved/)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
