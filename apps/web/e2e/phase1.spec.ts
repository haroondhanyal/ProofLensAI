import { expect, test } from '@playwright/test';

const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `phase1-${unique}@example.com`;
const password = 'Phase1-safe-password-123';

test('signup, analyze, filter history, share and revoke, then delete account', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your name').fill('Phase One');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your digital safety, at a glance.' })).toBeVisible();

  await page.getByLabel('Paste the website address').fill('http://example.com/login');
  await page.getByRole('button', { name: 'Analyze safely' }).click();
  await expect(page.getByText('PROOFLENS ASSESSMENT')).toBeVisible();
  await page.getByRole('button', { name: 'Create private report link' }).click();
  await expect(page.getByText(/Anyone with this link can view/)).toBeVisible();
  await page.getByRole('button', { name: 'Revoke' }).click();

  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Scan history' })).toBeVisible();
  await page.getByLabel('Type', { exact: true }).selectOption('URL');
  await page.getByLabel('Search checks').fill('example.com');
  await expect(page.getByText(/URL check/)).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Current password').fill(password);
  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByRole('button', { name: 'Permanently delete my account' }).click();
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
});

test('login and request a privacy-preserving password reset', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email address').fill(`unknown-${unique}@example.com`);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If the account exists');
});

test('demo workspace is labeled synthetic and sample records are read-only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore sample workspace' }).click();
  await expect(page.getByText('SAMPLE DATA · NOT LIVE ANALYSIS')).toBeVisible();
  await expect(page.getByText('SAMPLE REPORT · NOT LIVE')).toBeVisible();
  await expect(page.getByText('DEMO-URL-SAFE')).toBeVisible();
  await expect(page.getByText('saving, sharing and deleting are disabled')).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('DEMO-MESSAGE')).toBeVisible();
});
