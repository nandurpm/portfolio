import { expect, test } from '@playwright/test';

const repoPages = [
  'Accounts & transactions',
  'Daily Entries',
  'Budget & Plan',
  'Loan & Closure',
  'Salary & PF',
  'Balances & provisions',
  'Forecast & Month-by-month',
  'Reports & Export/Import',
] as const;

test('wide desktop layout fills the workspace and all pages honour the selected palette', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1000 });
  await page.route('https://*.supabase.co/**', (route) => route.abort());
  await page.goto('/tests/browser/harness.html');
  await expect(page.getByRole('heading', { name: 'Monthly snapshot' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.main-scroll')!;
    const content = main.querySelector<HTMLElement>(':scope > .edit-controls')!;
    return {
      contentWidth: content.getBoundingClientRect().width,
      mainWidth: main.getBoundingClientRect().width,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  expect(layout.contentWidth / layout.mainWidth).toBeGreaterThan(0.9);
  expect(layout.documentWidth).toBeLessThanOrEqual(2562);

  // The hero's secondary action must not render white text on an opaque white button.
  const heroAction = page.getByRole('button', { name: 'View reports' });
  await expect(heroAction).toBeVisible();
  const actionColors = await heroAction.evaluate((element) => {
    const style = getComputedStyle(element);
    return { foreground: style.color, background: style.backgroundColor };
  });
  expect(actionColors.foreground).toBe('rgb(255, 255, 255)');
  expect(actionColors.background).not.toBe('rgb(255, 255, 255)');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Make it feel like you.' })).toBeVisible();

  // Check real palette changes rather than merely asserting the default violet value.
  await page.getByRole('button', { name: 'Emerald palette' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.palette)).toBe('emerald');
  await page.getByRole('button', { name: 'Lavender palette' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.palette)).toBe('violet');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tracker-palette'))).toBe('violet');

  for (const name of repoPages) {
    await nav.getByRole('button', { name }).click();
    await expect.poll(() => page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('.main-scroll')!;
      const style = getComputedStyle(main);
      return style.getPropertyValue('--page-tone').trim() === style.getPropertyValue('--accent').trim();
    })).toBe(true);
  }
  await nav.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Monthly snapshot' })).toBeVisible();
});
