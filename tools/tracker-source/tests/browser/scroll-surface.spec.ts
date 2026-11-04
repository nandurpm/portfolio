import { test, expect } from '@playwright/test';

// Structural scroll regressions: never use a large transformed compositing
// layer for the whole page. This is not a frame-time benchmark.
test('long dashboard scrolls in the intended container without a page transform', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await page.route('https://*.supabase.co/**', (r) => r.abort());
  await page.goto('/tests/browser/harness.html');
  await expect(page.getByRole('heading', { name: 'Monthly snapshot', exact: true })).toBeVisible();
  const before = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>('.main-scroll');
    const pageLayer = document.querySelector<HTMLElement>('.edit-controls > div');
    if (!scroller || !pageLayer) throw new Error('Missing main scroll container or page content');
    const style = getComputedStyle(scroller);
    return {
      overflowY: style.overflowY,
      gutter: style.scrollbarGutter,
      transform: getComputedStyle(pageLayer).transform,
      height: scroller.scrollHeight,
      visible: scroller.clientHeight,
    };
  });
  expect(before.overflowY).toBe('auto');
  expect(before.gutter).toContain('stable');
  expect(before.transform).toBe('none');
  expect(before.height).toBeGreaterThan(before.visible);
  await page.evaluate(() => document.querySelector<HTMLElement>('.main-scroll')!.scrollTo({ top: 400 }));
  await expect.poll(() => page.evaluate(() => document.querySelector<HTMLElement>('.main-scroll')?.scrollTop ?? 0)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
});
