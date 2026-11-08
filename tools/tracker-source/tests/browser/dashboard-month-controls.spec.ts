import { expect, test } from '@playwright/test';

// Phone web regression: the review-month picker was squeezed into a ~40px grid cell and clipped
// to "Nove", and its label painted a white block on the tinted reporting card.
for (const width of [320, 360, 390, 480]) {
  test(`dashboard month controls show the full month and stay inside the card at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://*.supabase.co/**', (route) => route.abort());
    await page.goto('/tests/browser/harness.html');
    const select = page.getByRole('combobox', { name: 'Review month' });
    await expect(select).toBeVisible();
    const m = await page.evaluate(() => {
      const sel = document.querySelector<HTMLSelectElement>('.dashboard-context select[aria-label="Review month"]')!;
      const card = document.querySelector<HTMLElement>('.dashboard-context')!.getBoundingClientRect();
      const label = sel.parentElement!;
      const style = getComputedStyle(label);
      const probe = document.createElement('span');
      const selStyle = getComputedStyle(sel);
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${selStyle.font}`;
      probe.textContent = sel.selectedOptions[0]!.textContent;
      document.body.append(probe);
      const needed = probe.getBoundingClientRect().width;
      probe.remove();
      const outside = [...document.querySelectorAll<HTMLElement>('.dashboard-context .month-controls > *')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.right > card.right + 0.5 || r.left < card.left - 0.5; }).length;
      return {
        selectWidth: sel.getBoundingClientRect().width, needed, outside,
        border: style.borderTopWidth, docWidth: document.documentElement.scrollWidth,
      };
    });
    expect(m.selectWidth, 'select must fit the selected month text plus its arrow').toBeGreaterThan(m.needed + 24);
    expect(m.outside, 'no control may overflow the card').toBe(0);
    expect(m.border, 'label is a bordered field, not a bare surface block').not.toBe('0px');
    expect(m.docWidth).toBeLessThanOrEqual(width + 1);
  });
}
