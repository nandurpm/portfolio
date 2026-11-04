import { test, expect } from '@playwright/test';

for (const width of [390, 1366]) {
  test(`dashboard keeps full analysis accessible while charts load near the viewport (${width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 840 });
    await page.route('https://*.supabase.co/**', (route) => route.abort());
    await page.goto('/tests/browser/harness.html');
    await expect(page.getByRole('heading', { name: 'Monthly snapshot', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Full dashboard analysis', exact: true })).toBeVisible();
    await expect(page.locator('.dashboard-deep-dive')).not.toHaveAttribute('open', '');
    const deferred = page.locator('.near-viewport');
    await expect(deferred).toHaveCount(3);

    // The long analysis is never hidden behind a button. Charts render ahead
    // of a user's scroll and remain mounted after first becoming visible.
    for (let i = 0; i < 3; i++) {
      await deferred.nth(i).scrollIntoViewIfNeeded();
      await expect(deferred.nth(i)).toHaveAttribute('data-ready', 'true');
    }
    await expect(page.getByRole('heading', { name: 'Month-by-month progress', exact: true })).toBeVisible();

    const metrics = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement>(
        innerWidth <= 600 ? '.workspace' : '.main-scroll',
      );
      if (!root) throw new Error('Missing application scroll container');
      root.scrollTop = 0;
      const samples: number[] = [];
      let previous = performance.now();
      for (let step = 0; step < 48; step++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const now = performance.now();
        samples.push(now - previous);
        previous = now;
        root.scrollTop = ((step + 1) / 48) * (root.scrollHeight - root.clientHeight);
      }
      return {
        frames: samples.length,
        maxFrameTimeMs: Math.round(Math.max(...samples) * 10) / 10,
        averageFrameTimeMs: Math.round((samples.reduce((sum, value) => sum + value, 0) / samples.length) * 10) / 10,
        scrollTop: root.scrollTop,
        hasOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      };
    });
    await testInfo.attach('scroll-frame-sample.json', {
      body: JSON.stringify({ width, ...metrics }, null, 2),
      contentType: 'application/json',
    });
    expect(metrics.frames).toBe(48);
    expect(metrics.scrollTop).toBeGreaterThan(0);
    expect(metrics.hasOverflow).toBe(false);
  });
}
