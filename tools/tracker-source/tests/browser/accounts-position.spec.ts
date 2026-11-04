import { expect, test } from '@playwright/test';

test('account openings, shared position and reconciled reversal preserve original records', async ({page})=>{
  await page.setViewportSize({width:1366,height:900});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('/tests/browser/harness.html');
  await expect(page.getByRole('heading',{name:'Monthly snapshot',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Accounts & transactions',exact:true}).click();
  for(const [name,type,opening] of [['SBI','Bank account','2000'],['Railway Wallet','Wallet','700']]) {
    await page.getByRole('button',{name:'Account',exact:true}).click();
    await page.getByLabel('Account name',{exact:true}).fill(name!);
    await page.getByLabel('Account type',{exact:true}).selectOption({label:type!});
    await page.getByLabel('Opening balance',{exact:true}).fill(opening!);
    await page.getByRole('button',{name:'Save account',exact:true}).click();
  }
  await page.getByRole('button',{name:'Use account openings as total savings',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Use account openings',exact:true}).click();
  await page.getByText('Balance breakdown',{exact:true}).click();
  const position=page.getByRole('table',{name:'Cross-module balance reconciliation',exact:true});
  await expect(position.getByRole('row').filter({hasText:'Dashboard recorded liquid cash'})).toContainText('₹2,700.00');
  await page.getByRole('button',{name:'Transaction',exact:true}).click();
  await page.getByLabel('Date',{exact:true}).fill('2026-11-02');
  await page.getByLabel('Amount',{exact:true}).fill('100');
  await page.getByLabel('From account',{exact:true}).selectOption({label:'SBI'});
  await page.getByLabel('Description',{exact:true}).fill('Synthetic expense');
  await page.getByRole('button',{name:'Save transaction',exact:true}).click();
  await expect(position.getByRole('row').filter({hasText:'Dashboard recorded liquid cash'})).toContainText('₹2,600.00');
  await page.getByRole('button',{name:'Dashboard',exact:true}).click();
  await expect(page.getByRole('region',{name:'Calculated cash balance',exact:true})).toContainText('₹2,600.00');
  await page.getByRole('button',{name:'Balances & provisions',exact:true}).click();
  await page.getByLabel('Reconciliation label',{exact:true}).fill('Synthetic statement');
  await page.getByLabel('Reconciliation through date',{exact:true}).fill('2026-11-03');
  await page.getByLabel('Reconciliation opening balance',{exact:true}).fill('2700');
  await page.getByLabel('Statement balance',{exact:true}).fill('2600');
  await page.getByRole('button',{name:'Save comparison',exact:true}).click();
  await page.getByRole('button',{name:'Accounts & transactions',exact:true}).click();
  await expect(page.getByText('Protected posting',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Reverse transaction',exact:true}).click();
  await page.getByLabel('Reversal date',{exact:true}).fill('2026-11-04');
  await page.getByLabel('Correction reason',{exact:true}).fill('Synthetic correction');
  await page.getByRole('button',{name:'Save reversal',exact:true}).click();
  await page.getByText('Balance breakdown',{exact:true}).click();
  await expect(position.getByRole('row').filter({hasText:'Dashboard recorded liquid cash'})).toContainText('₹2,700.00');
  await expect(page.getByText('Reversal: Synthetic expense',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View account change history',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Account change history',exact:true})).toBeVisible();
});
