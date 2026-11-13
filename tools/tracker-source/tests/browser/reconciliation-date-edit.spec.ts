import { test, expect } from '@playwright/test';

test('reconciliation remains usable while dates are cleared or reversed', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route('https://*.supabase.co/**', route => route.abort());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/browser/harness.html');
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Balances & provisions', exact: true }).click();
  const from = page.getByLabel('Reconciliation from date', { exact: true });
  const through = page.getByLabel('Reconciliation through date', { exact: true });
  const save = page.getByRole('button', { name: 'Save comparison', exact: true });
  await from.fill('');
  await expect(page.getByText('Choose a valid date range to preview the recorded balance.')).toBeVisible();
  await expect(save).toBeDisabled();
  await from.fill('2026-11-02');
  await through.fill('');
  await expect(save).toBeDisabled();
  await through.fill('2026-11-01');
  await expect(save).toBeDisabled();
  await through.fill('2026-11-02');
  await expect(save).toBeEnabled();
  await expect(page.getByText('Recorded balance:', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
