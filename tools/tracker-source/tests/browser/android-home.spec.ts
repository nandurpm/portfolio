import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [360, 393, 768]) {
  test(`Android compact Home preserves full analysis at ${width}px without changing shared amounts`, async ({ page }) => {
    await page.setViewportSize({ width, height: 873 });
    await page.route('https://*.supabase.co/**', r => r.abort());
    await page.route('https://api.github.com/**', r => r.abort());
    await page.goto('/tests/browser/harness.html');
    await expect(page.getByRole('heading', { name: 'Calculated cash balance', exact: true })).toBeVisible();
    const sharedCash = await page.locator('.dashboard-balance strong').innerText();
    // The desktop stylesheet must not acquire Android's frozen presentation.
    expect(await page.locator('[data-android-design]').count()).toBe(0);
    await page.goto('/tests/browser/harness.html?android=1');
    const home = page.locator('.android-home');
    await expect(home).toBeVisible();

    await expect(home.locator('.mobile-balance strong')).toHaveText(sharedCash);
    await page.locator('.mobile-analysis > summary').click();
    await expect(page.getByRole('heading', { name: 'Full dashboard analysis', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Balance breakdown', exact: true })).toBeVisible();
    expect(await page.locator('.android-home').count()).toBe(1);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe('#6255df');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    await page.screenshot({ path: `test-results/android-restored-222-${width}.png`, fullPage: true });
    if (width < 761) {
      const nav = page.getByRole('navigation', { name: 'Phone navigation' });
      for (const name of ['Home', 'Activity', 'Accounts'])
        await expect(nav.getByRole('button', { name, exact: true })).toBeVisible();
      await nav.getByRole('button', { name: 'More screens', exact: true }).click();
      await expect(page.locator('.android-more').getByRole('button', { name: 'Reports', exact: true })).toBeVisible();
    }
  });
}

test('restored Android controls retain contrast across all palettes and themes', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 873 });
  await page.route('https://*.supabase.co/**', r => r.abort());
  await page.route('https://api.github.com/**', r => r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.android-home')).toBeVisible();
  for (const theme of ['light', 'dark']) for (const palette of ['violet', 'ocean', 'emerald', 'rose', 'sunset', 'indigo']) {
    await page.evaluate(({ theme, palette }) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.palette = palette;
    }, { theme, palette });
    const violations = (await new AxeBuilder({ page }).include('.android-home').analyze()).violations;
    expect(violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')), `${theme} / ${palette}`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
  }
});

test('Android Settings Lavender selection changes the actual UI from green to violet', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 873 });
  await page.route('https://*.supabase.co/**', r => r.abort());
  await page.route('https://api.github.com/**', r => r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.android-home')).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Phone navigation' });
  await nav.getByRole('button', { name: 'More screens' }).click();
  await page.locator('.android-more').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();

  const colours = async () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const navElement = document.querySelector<HTMLElement>('.phone-nav');
    const add = document.querySelector<HTMLElement>('.mobile-quick-add');
    return {
      palette: document.documentElement.dataset.palette,
      theme: document.documentElement.dataset.theme,
      accent: root.getPropertyValue('--accent').trim(),
      accentDeep: root.getPropertyValue('--accent-deep').trim(),
      sidebar: root.getPropertyValue('--sidebar-a').trim(),
      navGradient: navElement ? getComputedStyle(navElement).backgroundImage : '',
      quickAdd: add ? getComputedStyle(add).backgroundColor : '',
    };
  });

  await page.getByRole('button', { name: 'Emerald palette' }).click();
  await expect.poll(async () => (await colours()).accent).toBe('#08735e');
  const emerald = await colours();
  await page.getByRole('button', { name: 'Lavender palette' }).click();
  await expect(page.getByRole('button', { name: 'Lavender palette' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await colours()).accent).toBe('#6255df');
  const lavender = await colours();
  expect(lavender.palette).toBe('violet');
  expect(lavender.theme).toBe('light');
  expect(lavender.accentDeep).toBe('#4838ac');
  expect(lavender.sidebar).toBe('#33306b');
  expect(lavender.navGradient).toBe('none');
  expect(emerald.navGradient).toBe('none');
  expect(lavender.quickAdd).not.toBe(emerald.quickAdd);
  await page.screenshot({ path: 'test-results/android-lavender-light.png', fullPage: false });

  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect.poll(async () => (await colours()).accent).toBe('#a99cfb');
  const dark = await colours();
  expect(dark.palette).toBe('violet');
  expect(dark.sidebar).toBe('#25234f');
  expect(dark.accent).not.toBe('#78d3be');
  await page.screenshot({ path: 'test-results/android-lavender-dark.png', fullPage: false });
});

test('Android theme tokens follow all six palettes in light and dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 873 });
  await page.route('https://*.supabase.co/**', r => r.abort());
  await page.route('https://api.github.com/**', r => r.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.android-home')).toBeVisible();
  const expected: Record<string, { light: string; dark: string; sidebar: string }> = {
    violet: { light: '#6255df', dark: '#a99cfb', sidebar: '#33306b' },
    ocean: { light: '#176b93', dark: '#6dc2f2', sidebar: '#163850' },
    emerald: { light: '#08735e', dark: '#53d8b4', sidebar: '#174337' },
    rose: { light: '#aa3f6a', dark: '#f08aaf', sidebar: '#532d49' },
    sunset: { light: '#a95121', dark: '#f3ad77', sidebar: '#51342f' },
    indigo: { light: '#4867c4', dark: '#a99cfb', sidebar: '#202d52' },
  };
  for (const [palette, colours] of Object.entries(expected)) {
    for (const theme of ['light', 'dark'] as const) {
      const actual = await page.evaluate(({ palette, theme }) => {
        document.documentElement.dataset.palette = palette;
        document.documentElement.dataset.theme = theme;
        const style = getComputedStyle(document.documentElement);
        return {
          accent: style.getPropertyValue('--accent').trim(),
          sidebar: style.getPropertyValue('--sidebar-a').trim(),
        };
      }, { palette, theme });
      expect(actual.accent, `${palette} / ${theme}`).toBe(colours[theme]);
      if (theme === 'light') expect(actual.sidebar, `${palette} sidebar`).toBe(colours.sidebar);
    }
  }
});
