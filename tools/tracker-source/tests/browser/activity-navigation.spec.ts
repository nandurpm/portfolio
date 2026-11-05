import { expect, test } from '@playwright/test';

for (const native of [false, true]) {
  test(`recent activity routes to each real history on ${native ? 'Android' : 'Web mobile'}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 873 });
    await page.route('https://*.supabase.co/**', route => route.abort());
    await page.route('https://api.github.com/**', route => route.abort());
    await page.goto('/tests/browser/harness.html' + (native ? '?android=1' : ''));
    await expect(page.getByRole('heading', { name: 'Latest money movements' })).toBeVisible();

    const activity = page.locator('.mobile-recent');
    const actions = activity.getByRole('group', { name: 'Activity history' });
    const daily = actions.getByRole('button', { name: 'Daily entries', exact: true });
    const accounts = actions.getByRole('button', { name: 'Account activity', exact: true });
    await expect(daily).toBeVisible();
    await expect(accounts).toBeVisible();
    await expect(activity.getByRole('button', { name: 'View all' })).toHaveCount(0);
    for (const action of [daily, accounts]) {
      const h = await action.evaluate(element => element.getBoundingClientRect().height);
      expect(h).toBeGreaterThanOrEqual(44);
    }
    const style = await activity.evaluate(element => getComputedStyle(element).borderTopWidth);
    expect(Number.parseFloat(style)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);

    await accounts.click();
    await expect(page.getByRole('heading', { name: 'Accounts & transactions' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Phone navigation' })
      .getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Latest money movements' })).toBeVisible();
    await page.locator('.mobile-recent')
      .getByRole('group', { name: 'Activity history' })
      .getByRole('button', { name: 'Daily entries', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Small entries. Clearer money.' })).toBeVisible();
  });
}
