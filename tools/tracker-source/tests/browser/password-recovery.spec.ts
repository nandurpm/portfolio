import { test, expect } from '@playwright/test';

// No production password, reset email, API key, or user record is accessed.
// All HTTP requests to Supabase are intercepted with synthetic responses.
test('signed-out UI requests reset, exchanges PKCE callback, and updates password', async ({ page }) => {
  const requests = { recover: 0, exchange: 0, update: 0, signOut: 0 };
  const email = 'recovery-synthetic@example.invalid';
  const user = {
    id: '33333333-3333-4333-8333-333333333333',
    aud: 'authenticated', role: 'authenticated', email,
    app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  };
  const access = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800, role: 'authenticated' })).toString('base64url'),
    'synthetic-signature',
  ].join('.');
  await page.route('https://*.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recover')) {
      requests.recover++;
      expect(url.searchParams.get('redirect_to')).toContain('/track/?recovery=1');
      expect(route.request().postDataJSON()).toMatchObject({ email });
      await route.fulfill({ json: {} });
      return;
    }
    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'pkce') {
      requests.exchange++;
      const data = route.request().postDataJSON();
      expect(data).toMatchObject({ auth_code: 'synthetic-recovery-code' });
      expect(data.code_verifier).toBeTruthy();
      await route.fulfill({
        json: { access_token: access, refresh_token: 'synthetic-refresh', token_type: 'bearer',
          expires_in: 3600, expires_at: 4102444800, user },
      });
      return;
    }
    if (url.pathname.endsWith('/user') && route.request().method() === 'PUT') {
      requests.update++;
      expect(route.request().postDataJSON()).toMatchObject({ password: 'Synthetic-New-Password-9!' });
      await route.fulfill({ json: { user } });
      return;
    }
    if (url.pathname.endsWith('/logout')) {
      requests.signOut++;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.abort();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Sign in to your Savings Tracker/ })).toBeVisible();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter your email address');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByText(/a recovery link has been sent/i)).toBeVisible();
  expect(requests.recover).toBe(1);
  await page.goto('/track/?recovery=1&code=synthetic-recovery-code');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save new password' })).toBeDisabled();
  await page.getByLabel('New password').fill('Synthetic-New-Password-9!');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('heading', { name: /Sign in to your Savings Tracker/ })).toBeVisible();
  expect(requests.exchange).toBe(1);
  expect(requests.update).toBe(1);
  expect(requests.signOut).toBeGreaterThanOrEqual(1);
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);
  expect(new URL(page.url()).searchParams.has('recovery')).toBe(false);
});

test('invalid recovery URL never permits a password change or exposes financial pages', async ({ page }) => {
  await page.route('https://*.supabase.co/**', (route) => route.abort());
  await page.goto('/track/?recovery=1');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Recovery link is incomplete');
  await expect(page.getByRole('button', { name: 'Save new password' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
});

test('expired Supabase email link displays recovery guidance without changing credentials', async ({ page }) => {
  let networkUpdates = 0;
  await page.route('https://*.supabase.co/**', (route) => {
    if (route.request().method() === 'PUT') networkUpdates++;
    return route.abort();
  });
  await page.goto('/track/?recovery=1#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/link is invalid or expired/i);
  await expect(page.getByRole('button', { name: 'Save new password' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Return to sign in' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to sign in' }).click();
  await expect(page.getByRole('heading', { name: /Sign in to your Savings Tracker/ })).toBeVisible();
  expect(networkUpdates).toBe(0);
  expect(new URL(page.url()).hash).toBe('');
});
