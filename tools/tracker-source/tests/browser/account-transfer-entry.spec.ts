import { expect, test } from '@playwright/test';

test('dedicated Transfer action opens an account-to-account transfer form', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.goto('/tests/browser/harness.html');
  await expect(page.getByRole('heading', { name: 'Monthly snapshot', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Accounts & transactions', exact: true }).click();

  for (const [name, type, opening] of [['Source Bank', 'Bank account', '1000'], ['Destination Wallet', 'Wallet', '0']]) {
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await page.getByLabel('Account name', { exact: true }).fill(name);
    await page.getByLabel('Account type', { exact: true }).selectOption({ label: type });
    await page.getByLabel('Opening balance', { exact: true }).fill(opening);
    await page.getByRole('button', { name: 'Save account', exact: true }).click();
  }

  await page.getByRole('button', { name: 'Transfer', exact: true }).click();
  await expect(page.getByLabel('Type', { exact: true })).toHaveValue('transfer');
  await page.getByLabel('Date', { exact: true }).fill('2026-11-14');
  await page.getByLabel('Amount', { exact: true }).fill('125.50');
  await page.getByLabel('From account', { exact: true }).selectOption({ label: 'Source Bank' });
  await page.getByLabel('To account', { exact: true }).selectOption({ label: 'Destination Wallet' });
  await page.getByLabel('Description', { exact: true }).fill('Savings transfer');
  await page.getByRole('button', { name: 'Save transaction', exact: true }).click();

  await expect(page.getByText('Savings transfer', { exact: true })).toBeVisible();
  await expect(page.getByText('Transfer', { exact: true }).last()).toBeVisible();
});
