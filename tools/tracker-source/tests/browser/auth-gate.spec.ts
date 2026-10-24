import { test, expect } from '@playwright/test';
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222';
for (const scenario of [
  'verified',
  'revoked',
  'wrong-user',
  'wrong-owner',
  'signed-out',
] as const) {
  test(`web authentication boundary: ${scenario} (mock HTTP only)`, async ({ page }) => {
    let passwordCalls = 0;
    await page.route('https://*.supabase.co/**', async (route) => {
      const url = new URL(route.request().url());
      const user = {
        id: scenario === 'wrong-user' || scenario === 'wrong-owner' ? b : a,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'synthetic@example.invalid',
        app_metadata: {},
        user_metadata: {},
        created_at: '2026-01-01T00:00:00Z',
      };
      if (url.pathname.endsWith('/user')) {
        await route.fulfill({
          status: scenario === 'revoked' ? 401 : 200,
          json:
            scenario === 'revoked'
              ? { message: 'Synthetic revoked token', error_code: 'bad_jwt' }
              : user,
        });
        return;
      }
      if (url.pathname.endsWith('/logout')) {
        await route.fulfill({ status: 204 });
        return;
      }
      if (url.pathname.endsWith('/token')) {
        passwordCalls++;
        const token = [
          Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
          Buffer.from(JSON.stringify({ sub: a, exp: 4102444800, role: 'authenticated' })).toString(
            'base64url',
          ),
          'synthetic-signature',
        ].join('.');
        await route.fulfill({
          json: {
            access_token: token,
            refresh_token: 'synthetic-refresh',
            expires_in: 2000000000,
            expires_at: 4102444800,
            token_type: 'bearer',
            user,
          },
        });
        return;
      }
      if (url.pathname === '/rest/v1/tracker_plans') {
        await route.fulfill({ json: [{ revision: 1 }] });
        return;
      }
      await route.abort();
    });
    await page.goto(`/tests/browser/auth-harness.html?mode=${scenario}`);
    if (scenario === 'verified') {
      await expect(
        page.getByRole('heading', { name: 'Synthetic protected workspace' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Synthetic sign out' }).click();
      await expect(page.getByRole('heading', { name: 'Your private tracker' })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('savings-expence-v1'))).toBeNull();
    } else if (scenario === 'signed-out') {
      await expect(
        page.getByRole('heading', { name: 'Synthetic protected workspace' }),
      ).toHaveCount(0);
      await page
        .getByRole('textbox', { name: 'Email', exact: true })
        .fill('synthetic@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill('Synthetic-test-password-only');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Synthetic protected workspace' }),
      ).toBeVisible();
      expect(passwordCalls).toBe(1);
    } else {
      await expect(page.getByRole('heading', { name: 'Your private tracker' })).toBeVisible();
      if (scenario === 'wrong-owner')
        await expect(page.getByText(/linked to another account/)).toBeVisible();
      else await expect(page.getByText(/Please sign in again to open your tracker/)).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Synthetic protected workspace' }),
      ).toHaveCount(0);
    }
  });
}
