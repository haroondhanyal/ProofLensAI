import { expect, test } from './fixtures/ui-test';

test.describe('UI • Public site and account entry', () => {
  test('landing page presents ProofLens identity and safety promise', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ProofLens AI/);
    await expect(page.getByRole('heading', { name: /Check before you trust/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /ProofLensAI/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'What you can check' })).toBeVisible();
  });

  test('browser tab advertises the ProofLens favicon', async ({ page, request }) => {
    await page.goto('/');
    const icon = page.locator('link[rel="icon"]').first();
    await expect(icon).toHaveAttribute('href', /icon\.svg/);
    const response = await request.get('/icon.svg');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('image/svg+xml');
    expect(await response.text()).toContain('<svg');
  });

  test('signup form exposes optional phone and password confirmation controls', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Create account/ }).first().click();
    await expect(page.getByRole('textbox', { name: 'Full name' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel(/Country calling code/)).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.locator('input[placeholder="At least 10 characters"]')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Show confirmation' }).click();
    await expect(page.locator('input[placeholder="Repeat your password"]')).toHaveAttribute('type', 'text');
  });

  test('forgot-password flow gives the same privacy-preserving confirmation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await page.getByLabel('Email address').fill(`unknown-${Date.now()}@example.com`);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('status')).toContainText('If the account exists');
  });

  test('sample workspace clearly labels reports as fictional and read only', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: /Explore sample workspace/ }).click();
    await expect(page.getByText('Sample reports only')).toBeVisible();
    await expect(page.getByText('LIMITED EDITION').first()).toBeVisible();
    await page.getByRole('button', { name: /URL · EXAMPLE/ }).first().click();
    await expect(page.getByText('SAMPLE REPORT · NOT A LIVE CHECK')).toBeVisible();
    await expect(page.getByText(/Sample report only: saving, sharing, and deleting are disabled/)).toBeVisible();
  });

  test('sample history filters and shows synthetic message checks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: /Explore sample workspace/ }).click();
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Scan history' })).toBeVisible();
    await expect(page.getByText('DEMO-MESSAGE')).toBeVisible();
    await expect(page.getByText(/SAMPLE ONLY/).first()).toBeVisible();
  });

  test('help and privacy pages explain limits and data handling', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: /Explore sample workspace/ }).click();
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Use ProofLens with care.' })).toBeVisible();
    await page.getByRole('button', { name: 'Privacy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Know what happens to a check.' })).toBeVisible();
  });
});
