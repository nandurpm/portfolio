import { test, expect } from '@playwright/test';

async function openAndroid(page: import('@playwright/test').Page, width = 393) {
  await page.setViewportSize({ width, height: 873 });
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.route('https://api.github.com/**', route => route.abort());
  await page.goto('/tests/browser/harness.html?android=1');
  await expect(page.locator('.dashboard-balance strong')).toBeVisible();
}

const storedMoney = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const { settings: _settings, celebrated: _celebrated, ...financial } =
    JSON.parse(localStorage.getItem('savings-expence-v1')!).data;
  return financial;
});

for (const width of [320, 393, 480]) {
  test('Android Home is task-first and preserves records at ' + width + 'px', async ({page}) => {
    await openAndroid(page, width);
    const baseline = await storedMoney(page);
    const home = page.locator('[data-android-design="2.2.2"]');
    await expect(home.locator('.android-monthly-kpis .stat-card')).toHaveCount(3);
    await expect(home.locator('.android-budget-overview')).toBeVisible();
    await expect(home.locator('.mobile-recent')).toBeVisible();
    await expect(home.locator('.dashboard-deep-dive-body')).toHaveCount(0);
    await expect(home.getByRole('button', {name:'Transfer money'})).toBeVisible();
    const order = await page.evaluate(() => {
      const home = document.querySelector('[data-android-design="2.2.2"]')!;
      return ['.dashboard-hero', '.android-monthly-kpis', '.android-budget-overview', '.mobile-recent', '.dashboard-deep-dive']
        .map(selector => Array.from(home.children).indexOf(home.querySelector(selector)!));
    });
    expect(order).toEqual([...order].sort((a,b)=>a-b));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({path: 'test-results/android-daily-home-' + width + '.png'});
    await home.locator('.dashboard-deep-dive > summary').click();
    await expect(home.locator('.dashboard-deep-dive-body')).toBeVisible();
    await expect(home.locator('.dashboard-secondary-kpis .stat-card')).toHaveCount(2);
    await expect(home.getByRole('heading', {name:'Balance breakdown',exact:true})).toBeVisible();
    expect(await storedMoney(page)).toEqual(baseline);
  });
}

test('Home Transfer opens a blank account transfer without auto-saving', async ({page}) => {
  await openAndroid(page);
  const initial = await storedMoney(page);
  await page.getByRole('button', {name:'Transfer money'}).click();
  await expect(page.locator('.main-scroll')).toHaveAttribute('data-page','accounts');
  const form = page.locator('#account-transaction-form');
  await expect(form.getByRole('heading',{name:'Record a transaction'})).toBeVisible();
  await expect(form.getByLabel('Type',{exact:true})).toHaveValue('transfer');
  await expect(form.getByLabel('Amount',{exact:true})).toHaveValue('');
  expect(await storedMoney(page)).toEqual(initial);
});

test('Secondary totals and advanced budget/account settings are opt-in on Android', async ({page}) => {
  await openAndroid(page);
  const baseline = await storedMoney(page);
  const nav = page.getByRole('navigation',{name:'Phone navigation'});
  await nav.getByRole('button',{name:'Transactions',exact:true}).click();
  const totals = page.locator('.android-entry-overview');
  await expect(totals).toBeVisible();
  await expect(totals).not.toHaveAttribute('open','');
  await expect(page.locator('.quick-add')).toBeVisible();
  await totals.locator('summary').click();
  await expect(totals).toHaveAttribute('open','');
  await nav.getByRole('button',{name:'Budget',exact:true}).click();
  await expect(page.locator('.budget-snapshot')).toBeVisible();
  const settings = page.locator('.android-budget-settings');
  await expect(settings).toBeVisible();
  await expect(settings).not.toHaveAttribute('open','');
  await expect(page.locator('.android-budget-adjustments')).not.toHaveAttribute('open','');
  await settings.locator('summary').click();
  await expect(settings).toHaveAttribute('open','');
  await nav.getByRole('button',{name:'Accounts',exact:true}).click();
  const opening = page.locator('.android-account-settings');
  await expect(opening).toBeVisible();
  await expect(opening).not.toHaveAttribute('open','');
  await opening.locator('summary').click();
  await expect(opening).toHaveAttribute('open','');
  expect(await storedMoney(page)).toEqual(baseline);
});

test('Rapid duplicate Save clicks produce at most one synthetic ledger posting', async ({page}) => {
  await openAndroid(page);
  await page.evaluate(async () => {
    const modulePath = '/src/store.ts';
    const {store} = await import(modulePath) as typeof import('../../src/store');
    store.change('Synthetic test accounts', d => {
      d.accounts = [
        {id:'synthetic-a',name:'Synthetic A',kind:'bank',openingBalance:500,active:true,note:''},
        {id:'synthetic-b',name:'Synthetic B',kind:'bank',openingBalance:0,active:true,note:''},
      ];
    });
  });
  await page.getByRole('button', {name:'Transfer money'}).click();
  const form = page.locator('#account-transaction-form');
  await expect(form).toBeVisible();
  await form.getByLabel('From account').selectOption('synthetic-a');
  await form.getByLabel('To account').selectOption('synthetic-b');
  await form.getByLabel('Amount',{exact:true}).fill('50');
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('#account-transaction-form .modal-actions .button:not(.secondary)');
    if (!button) throw Error('Save transaction control is missing');
    button.click();
    button.click();
  });
  await expect.poll(() => page.evaluate(async () => {
    const modulePath = '/src/store.ts';
    const {store} = await import(modulePath) as typeof import('../../src/store');
    return store.get().data.ledgerTransactions?.filter(row => row.kind==='transfer' && row.amount===50).length ?? 0;
  })).toBe(1);
});
