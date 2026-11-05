import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const destinations = [
  ['Loans & EMI', 'loan'], ['Salary & PF', 'employment'], ['Forecast', 'forecast'],
  ['Reports', 'reports'], ['Reconciliation', 'balances'], ['Transfers & Activity', 'accounts'],
  ['Provisions & Reserves', 'balances'], ['Financial Position', 'accounts'],
  ['Balances & Provisions', 'balances'], ['Forecast (Month-by-Month)', 'forecast'],
  ['Settings', 'settings'], ['Backup & Sync', 'settings'],
] as const;
const openMore = async (page: import('@playwright/test').Page) => {
  await page.getByRole('navigation', { name: 'Phone navigation' }).getByRole('button', { name: 'More screens' }).click();
  await expect(page.locator('.android-more')).toBeVisible();
};
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 873 });
  await page.route('https://*.supabase.co/**', r => r.abort());
  await page.route('https://api.github.com/**', r => r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.splash')).toHaveCount(0);
  await expect(page.locator('.dashboard-balance strong')).toBeVisible();
});

test('all twelve cards open existing destinations without changing financial records', async ({ page }) => {
  const financial = () => page.evaluate(() => {
    const { settings: _settings, celebrated: _celebrated, ...data } = JSON.parse(localStorage.getItem('savings-expence-v1')!).data;
    return data;
  });
  const before = await financial();
  for (const [title, destination] of destinations) {
    await openMore(page);
    await page.locator('.android-more-card').filter({ has: page.getByText(title, { exact: true }) }).click();
    await expect(page.locator('.android-more')).toHaveCount(0);
    await expect(page.locator('.main-scroll')).toHaveAttribute('data-page', destination);
    await expect(page.locator('.screen-loading')).toHaveCount(0);
    if (title === 'Reconciliation') await expect(page.getByRole('heading', { name: 'Balance reconciliation', exact: true })).toBeInViewport();
    if (title === 'Financial Position') await expect(page.getByRole('heading', { name: 'Your money at a glance', exact: true })).toBeInViewport();
    if (title === 'Forecast (Month-by-Month)') await expect(page.getByRole('heading', { name: 'Full-month forecast', exact: true })).toBeInViewport();
  }
  expect(await financial()).toEqual(before);
});

test('search, Back, bottom navigation, undo and redo preserve existing history', async ({ page }) => {
  await openMore(page);
  const more = page.locator('.android-more');
  await expect(more.getByRole('button', { name: 'Redo', exact: true })).toBeDisabled();
  await more.getByRole('button', { name: 'Search screens and tools' }).click();
  await more.getByRole('searchbox').fill('salary');
  await expect(more.locator('.android-more-card')).toHaveCount(1);
  await more.getByRole('searchbox').fill('no matching tool');
  await expect(more.getByRole('status')).toHaveText('No tools found. Try a different search.');
  await page.keyboard.press('Escape');
  await expect(more).toHaveCount(0);
  await openMore(page);
  await more.getByRole('button', { name: 'Back from More' }).click();
  await expect(more).toHaveCount(0);
  await openMore(page);
  await more.locator('.android-more-card').filter({ has: page.getByText('Settings', { exact: true }) }).click();
  await page.getByRole('button', { name: 'Emerald palette' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'emerald');
  await openMore(page);
  await more.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'violet');
  await more.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'emerald');
  await page.getByRole('navigation', { name: 'Phone navigation' }).getByRole('button', { name: 'Home', exact: true }).click();
  await expect(more).toHaveCount(0);
});

test('small screens, large text and every palette retain accessible light and dark cards', async ({ page }) => {
  await openMore(page);
  for (const width of [320, 360, 393, 600]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 740 });
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    await page.locator('html').evaluate(el => { el.style.fontSize = '24px'; });
    expect(await page.locator('.android-more-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.locator('.android-more-history').scrollIntoViewIfNeeded();
    await expect(page.locator('.android-more-history')).toBeInViewport();
  }
  await page.setViewportSize({ width: 393, height: 873 });
  await page.locator('html').evaluate(el => { el.style.fontSize = ''; });
  for (const theme of ['light', 'dark']) for (const palette of ['violet', 'ocean', 'emerald', 'rose', 'sunset', 'indigo']) {
    await page.evaluate(({ theme, palette }) => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.palette = palette; }, { theme, palette });
    const violations = (await new AxeBuilder({ page }).include('.android-more').analyze()).violations;
    expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')), `${theme}/${palette}`).toEqual([]);
    if (palette === 'violet') {
      await page.locator('.android-more-content').evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: `test-results/android-more-${theme}.png` });
    }
  }
});
