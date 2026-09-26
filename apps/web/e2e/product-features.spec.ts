import { expect, test } from './fixtures/ui-test';
import type { APIRequestContext, Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const api = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1';
let password = `ProofLens-QA-${randomUUID()}-Pass!`;
const email = `prooflens-ui-${randomUUID()}@example.com`;
const image = readFileSync(resolve(process.cwd(), 'e2e/assets/sample-image.png'));
const textFile = readFileSync(resolve(process.cwd(), 'e2e/assets/sample-upload.txt'));
let apiRequest: APIRequestContext;
let accessToken = '';

async function openWorkspace(page: Page) {
  const host = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001').hostname;
  await page.context().addCookies([{
    name: 'prooflens_access', value: accessToken, domain: host, path: '/api/v1',
    expires: -1, httpOnly: true, secure: false, sameSite: 'Lax',
  }]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your digital safety, at a glance.' })).toBeVisible();
}

async function analyze(page: Page, label: string, fill: () => Promise<void>, expectedType: string) {
  await page.getByRole('tab', { name: label, exact: true }).click();
  await fill();
  await page.getByRole('button', { name: 'Analyze safely' }).click();
  const report = page.locator('.result-box');
  await expect(report).toContainText('PROOFLENS ASSESSMENT', { timeout: 45_000 });
  await expect(page.locator('.scan-row').first()).toContainText(`${expectedType} check`);
}

test.describe('ProofLens AI · live product feature flows', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ playwright }) => {
    apiRequest = await playwright.request.newContext();
    const response = await apiRequest.post(`${api}/auth/mobile/register`, {
      data: { email, password, display_name: 'ProofLens Feature QA' },
    });
    if (response.status() !== 201) throw new Error(`ProofLens test account setup failed: ${response.status()} ${await response.text()}`);
    accessToken = (await response.json()).data.access_token;
  });

  test.afterAll(async () => {
    if (apiRequest && accessToken) {
      await apiRequest.delete(`${api}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }, data: { password },
      }).catch(() => undefined);
      await apiRequest.dispose();
    }
  });

  test('URL, message, store, product and claim analyzers create their own report types', async ({ page }) => {
    await openWorkspace(page);
    await analyze(page, 'URL', async () => {
      await page.getByLabel('Paste the website address').fill('https://example.com/prooflens-ui');
    }, 'URL');
    await analyze(page, 'Message', async () => {
      await page.getByLabel('Paste the suspicious message').fill('Synthetic QA note: verify the sender through https://example.com before sharing a code.');
    }, 'MESSAGE');
    await analyze(page, 'Store', async () => {
      await page.getByLabel('Paste the online store address').fill('https://example.com/store');
      await page.getByLabel('Store details you want checked (optional)').fill('Fictional store: synthetic QA terms.');
    }, 'STORE');
    await analyze(page, 'Product', async () => {
      await page.getByLabel('Listing description').fill('Fictional QA headphones listing with seller warranty claims.');
      await page.getByLabel('Price', { exact: true }).fill('49');
      await page.getByLabel('Reference price').fill('99');
    }, 'PRODUCT');
    await analyze(page, 'Claim', async () => {
      await page.getByLabel('Enter a claim to verify').fill('Synthetic QA claim: Example City announced a fictional service update.');
      await page.getByLabel('Optional source URLs (up to 3, one per line)').fill('');
    }, 'CLAIM');
  });

  test('screenshot, QR, image and file uploads produce ProofLens reports', async ({ page }) => {
    test.setTimeout(180_000);
    await openWorkspace(page);
    for (const [mode, type] of [['Screenshot', 'SCREENSHOT'], ['QR', 'QR'], ['Image', 'IMAGE']] as const) {
      await analyze(page, mode, async () => {
        await page.locator('#image-upload').setInputFiles({ name: 'prooflens-qa.png', mimeType: 'image/png', buffer: image });
      }, type);
    }
    await analyze(page, 'File', async () => {
      await page.locator('#image-upload').setInputFiles({ name: 'prooflens-qa.txt', mimeType: 'text/plain', buffer: textFile });
    }, 'FILE');
  });

  test('report save, history, PDF export, share privacy and revoke lifecycle', async ({ page, request }) => {
    await openWorkspace(page);
    await analyze(page, 'URL', async () => {
      await page.getByLabel('Paste the website address').fill('https://example.com/prooflens-report-lifecycle');
    }, 'URL');
    await page.getByRole('button', { name: 'Save check' }).click();
    await expect(page.getByText(/saved/i).last()).toBeVisible();
    const pdfResponsePromise = page.waitForResponse(response => response.url().includes('/reports/') && response.url().endsWith('/pdf'));
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const pdfResponse = await pdfResponsePromise;
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf');
    await page.getByRole('button', { name: 'Create private report link' }).click();
    const sharedLink = page.locator('.share-link a');
    await expect(sharedLink).toBeVisible();
    const shareId = new URL(await sharedLink.getAttribute('href')!).pathname.split('/').at(-1);
    expect(shareId).toBeTruthy();
    const publicReportPath = `${api}/public/reports/${shareId}`;
    const publicReport = await request.get(publicReportPath);
    expect(publicReport.status()).toBe(200);
    const publicBody = await publicReport.json();
    expect(JSON.stringify(publicBody)).not.toContain('prooflens-report-lifecycle');
    const revokePromise = page.waitForResponse(response =>
      response.request().method() === 'DELETE' && response.url().includes('/reports/') && response.url().endsWith('/share'),
    );
    await page.getByRole('button', { name: 'Revoke' }).click();
    const revokeResponse = await revokePromise;
    expect(revokeResponse.status()).toBe(200);
    await expect(page.locator('.share-link')).toHaveCount(0);
    await expect.poll(async () => (await request.get(publicReportPath)).status()).toBe(404);
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Scan history' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'URL assessment' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your reports' })).toBeVisible();
    await page.getByRole('button', { name: 'Saved', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Saved/ })).toBeVisible();
  });

  test('profile, avatar, privacy retention, themes and password update settings', async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole('button', { name: /Account & settings/ }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await page.getByLabel('Full name').fill('ProofLens QA Updated');
    await page.getByLabel('Country calling code').selectOption('United States');
    await page.locator('input[placeholder="300 1234567"]').fill('4155550182');
    await page.locator('input[type="file"]').setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: image });
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile update ho gayi.').first()).toBeVisible();
    await expect(page.locator('.header-profile')).toContainText('ProofLens QA Updated');

    await page.getByLabel('Keep scan history for').selectOption('180');
    await page.getByRole('button', { name: 'Save privacy settings' }).click();
    await expect(page.getByLabel('Keep scan history for')).toHaveValue('180');
    for (const theme of ['Ocean', 'Dark', 'Gray', 'High contrast', 'Light']) {
      await page.getByRole('button', { name: new RegExp(theme) }).click();
      await expect(page.getByRole('button', { name: new RegExp(theme) })).toHaveAttribute('aria-pressed', 'true');
    }

    const newPassword = `ProofLens-Updated-${randomUUID()}-Pass!`;
    await page.getByRole('textbox', { name: 'Current password', exact: true }).fill(password);
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm new password').fill(newPassword);
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText(/Password update ho gaya/).first()).toBeVisible();
    password = newPassword;
  });

  test('help, privacy, threat center guides and sign out are reachable', async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Threat Center', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Common ways people get targeted' })).toBeVisible();
    await expect(page.locator('.threat-guide-card')).toHaveCount(10);
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Use ProofLens with care.' })).toBeVisible();
    await page.getByRole('button', { name: 'Privacy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Know what happens to a check.' })).toBeVisible();
    await page.getByRole('button', { name: /Sign out/ }).click();
    await expect(page.getByRole('heading', { name: /Check before you trust/ })).toBeVisible();
  });
});
