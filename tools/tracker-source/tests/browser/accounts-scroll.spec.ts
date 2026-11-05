import { expect, test } from '@playwright/test';

for (const width of [1366, 1702, 2560]) {
  test(`Accounts scroll stays inside viewport on desktop ${width}px`, async ({ page }) => {
    const height = 895;
    await page.setViewportSize({ width, height });
    await page.route('https://*.supabase.co/**', (route) => route.abort());
    await page.goto('/tests/browser/harness.html');
    await expect(page.getByRole('heading', { name: 'Monthly snapshot' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Accounts & transactions' }).click();
    await expect(page.getByRole('heading', { name: 'Balance breakdown' })).toBeVisible();
    const main = page.locator('.main-scroll');
    await expect(main).toBeVisible();

    // Move to the bottom of the long ledger, then try scrolling the outer page.
    await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(page.locator('.app-footer')).toBeInViewport();
    await page.evaluate(() => window.scrollTo({ top: 5000, left: 5000 }));

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>('.app-shell')!;
      const sidebar = document.querySelector<HTMLElement>('.sidebar')!;
      const main = document.querySelector<HTMLElement>('.main-scroll')!;
      return {
        windowScrollX: window.scrollX,
        windowScrollY: window.scrollY,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        shellTop: shell.getBoundingClientRect().top,
        shellBottom: shell.getBoundingClientRect().bottom,
        sidebarTop: sidebar.getBoundingClientRect().top,
        sidebarBottom: sidebar.getBoundingClientRect().bottom,
        mainCanScroll: main.scrollHeight > main.clientHeight,
        mainScrolled: main.scrollTop > 0,
        mainHasHorizontalOverflow: main.scrollWidth > main.clientWidth + 2,
        bodyOverflow: getComputedStyle(document.body).overflow,
      };
    });
    expect(metrics.windowScrollX).toBe(0);
    expect(metrics.windowScrollY).toBe(0);
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(metrics.shellTop).toBeGreaterThanOrEqual(-2);
    expect(metrics.shellBottom).toBeLessThanOrEqual(height + 2);
    expect(metrics.sidebarTop).toBeGreaterThanOrEqual(-2);
    expect(metrics.sidebarBottom).toBeGreaterThanOrEqual(height - 2);
    // Responsive Accounts legitimately fits the viewport at some desktop widths.
    // When it does overflow, verify scrolling reaches its own footer; otherwise no scroll is expected.
    expect(metrics.mainScrolled).toBe(metrics.mainCanScroll);
    expect(metrics.mainHasHorizontalOverflow).toBe(false);
    expect(metrics.bodyOverflow).toBe('clip');

    await page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Full dashboard analysis' })).toBeVisible();
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(0);
  });
}

test('Accounts phone view scrolls in the workspace rather than the document', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://*.supabase.co/**', (route) => route.abort());
  await page.goto('/tests/browser/harness.html');
  await page.getByRole('navigation', { name: 'Phone navigation' })
    .getByRole('button', { name: 'Accounts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Balance breakdown' })).toBeVisible();
  const workspace = page.locator('.workspace');
  await workspace.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const values = await page.evaluate(() => ({
    docX: window.scrollX, docY: window.scrollY,
    workspaceScrolled: document.querySelector<HTMLElement>('.workspace')!.scrollTop > 0,
    width: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(values.docX).toBe(0);
  expect(values.docY).toBe(0);
  expect(values.workspaceScrolled).toBe(true);
  expect(values.width).toBeLessThanOrEqual(values.viewportWidth + 2);
});
