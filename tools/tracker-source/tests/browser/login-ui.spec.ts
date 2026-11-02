import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const [width, height] of [
  [360, 800],
  [390, 844],
  [768, 1024],
  [1280, 900],
  [1440, 1000],
  [360, 450],
]) {
  test(`signed-out login layout ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await page.route('https://*.supabase.co/**', (route) => route.abort());
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Sign in to your Savings Tracker/ }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Sign in · Savings Tracker');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const card = await page.locator('.cloud-gate-card').boundingBox();
    expect(card!.width).toBeLessThanOrEqual(520);
    expect(Math.abs(card!.x + card!.width / 2 - width! / 2)).toBeLessThan(2);
    for (const control of ['#signin-email', '#signin-password', '.signin-submit', '.signin-show']) {
      expect((await page.locator(control).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-password');
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
    await page.locator('.signin-submit').scrollIntoViewIfNeeded();
    await expect(page.locator('.signin-submit')).toBeInViewport();
    expect(
      await page
        .locator('.tracker-brand img')
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
}

test('inline validation, pending request and authentication errors use the real login form', async ({
  page,
}) => {
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('https://*.supabase.co/**', async (route) => {
    if (!route.request().url().includes('/token')) {
      await route.abort();
      return;
    }
    requests++;
    expect(route.request().postDataJSON()).toMatchObject({
      email: 'synthetic@example.invalid',
      password: 'Synthetic-password',
    });
    await pending;
    await route.fulfill({
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter your email address.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeFocused();
  expect(requests).toBe(0);
  await page.getByLabel('Email address').fill('not-an-email');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await page.getByLabel('Email address').fill('synthetic@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Use your app password (at least 8 characters).')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Signing in…', exact: true })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(requests).toBe(1);
  release();
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
});

test('bundle startup failure offers retry without a blank page', async ({ page }) => {
  await page.route('**/src/main.tsx', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'We couldn’t load the tracker. Check your connection and try again.',
  );
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await page.unroute('**/src/main.tsx');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /Sign in to your Savings Tracker/ }),
  ).toBeVisible();
});

for (const scenario of ['storage-failed', 'startup-stalled']) {
  test(`initialization ${scenario} offers a recovery screen`, async ({ page }) => {
    await page.route('https://*.supabase.co/**', (route) => route.abort());
    if (scenario === 'startup-stalled') await page.clock.install();
    await page.goto(`/tests/browser/auth-harness.html?mode=${scenario}`);
    if (scenario === 'startup-stalled') {
      await expect(page.getByText('Loading your tracker…', { exact: true })).toBeVisible();
      await page.clock.fastForward(20001);
    }
    await expect(page.getByRole('alert')).toContainText('We couldn’t load the tracker');
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Synthetic protected workspace' })).toHaveCount(
      0,
    );
  });
}

test('dark theme and keyboard focus remain accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('tracker-theme', 'dark'));
  await page.route('https://*.supabase.co/**', (route) => route.abort());
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Sign in to your Savings Tracker/ }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Email address').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show password' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('all palette combinations keep readable text at 360px and 1280px', async ({ page }) => {
  await page.route('https://*.supabase.co/**', (route) => route.abort());
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.addInitScript((t: string) => localStorage.setItem('tracker-theme', t), theme);
      await page.goto('/');
      for (const palette of ['indigo', 'ocean', 'emerald', 'rose', 'sunset']) {
        const ratio = await page.evaluate((name) => {
          document.documentElement.dataset.palette = name;
          const vars = getComputedStyle(document.documentElement);
          const fromHex = (hex: string) => {
            const nums = hex.trim().replace('#', '').match(/.{2}/g);
            if (!nums) throw new Error('Unexpected palette color');
            const channels = nums.slice(0, 3).map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
            return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
          };
          const fg = vars.getPropertyValue('--accent-ink').trim();
          const bg = vars.getPropertyValue('--surface').trim();
          const dark = vars.getPropertyValue('--accent-soft').trim();
          const l1 = fromHex(fg), l2 = fromHex(bg);
          return { ratio: (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05), soft: dark, overflow: document.documentElement.scrollWidth > innerWidth };
        }, palette);
        expect(ratio.ratio, `${theme} ${palette} @ ${width}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio.overflow, `${theme} ${palette} @ ${width}`).toBe(false);
      }
    }
  }
});
