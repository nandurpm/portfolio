import { expect, test } from '@playwright/test';
import type { Plan } from '../../src/domain/types';

for (const android of [false, true]) {
  test(`budget tools preserve inactive overrides on the ${android ? 'Android' : 'Web'} layout`, async ({ page }) => {
    await page.setViewportSize({ width: android ? 393 : 1366, height: 850 });
    await page.route('https://*.supabase.co/**', route => route.abort());
    await page.route('https://api.github.com/**', route => route.abort());
    await page.goto('/tests/browser/harness.html' + (android ? '?android=1' : ''));
    if (android) {
      await page.getByRole('navigation', { name: 'Phone navigation' })
        .getByRole('button', { name: 'More screens' }).click();
      await page.locator('.android-more-card').filter({ hasText: 'Budgets' }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main navigation' })
        .getByRole('button', { name: 'Budget & Plan', exact: true }).click();
    }
    await expect(page.getByRole('button', { name: 'Apply %', exact: true })).toBeVisible();
    await page.evaluate(async () => {
      const storePath = '/src/store.ts';
      const { store } = await import(storePath);
      store.change('Synthetic budget history', (plan: Plan) => {
        const bill = plan.categories.find(category => category.id === 'bill')!;
        bill.amount = 0.15;
        const index = plan.categories.indexOf(bill);
        plan.categories.splice(index + 1, 0, { ...bill, id: 'retired', name: 'Retired category', active: false });
        plan.overrides['2026-11|retired'] = 12.75;
        plan.overrides['2026-12|retired'] = 24.50;
      });
    });
    const overrides = () => page.evaluate(async () => {
      const storePath = '/src/store.ts';
      const { store } = await import(storePath);
      return store.get().data.overrides;
    });

    await page.getByLabel('Budget percentage change').fill('50');
    await page.getByRole('button', { name: 'Apply %', exact: true }).click();
    expect(await overrides()).toMatchObject({ '2026-11|bill': 0.23, '2026-11|retired': 12.75 });
    await page.getByRole('button', { name: '+10%', exact: true }).click();
    expect(await overrides()).toMatchObject({ '2026-11|bill': 0.25, '2026-11|retired': 12.75 });

    await page.getByLabel('Target end', { exact: true }).selectOption('2026-12');
    await page.getByLabel('Target start', { exact: true }).selectOption('2026-12');
    await page.getByRole('button', { name: 'Copy month', exact: true }).click();
    await page.getByRole('dialog', { name: 'Copy a month’s budget?' })
      .getByRole('button', { name: 'Continue', exact: true }).click();
    expect(await overrides()).toMatchObject({ '2026-12|bill': 0.25, '2026-12|retired': 24.50 });

    if (android) {
      await page.getByRole('button', { name: 'Select Bill for budget tools', exact: true }).click();
      await page.getByRole('button', { name: 'Copy to following categories', exact: true }).click();
      expect(await overrides()).toMatchObject({ '2026-11|retired': 12.75, '2026-11|emi': 0.25 });
      await page.getByRole('button', { name: 'Reset this month', exact: true }).click();
    } else {
      await page.getByLabel('Bill 2026-11 budget', { exact: true }).click();
      await page.getByRole('button', { name: 'Reset month', exact: true }).click();
    }
    const saved = await overrides();
    expect(saved['2026-11|bill']).toBeUndefined();
    expect(saved).toMatchObject({ '2026-11|retired': 12.75, '2026-12|retired': 24.50 });
  });
}
