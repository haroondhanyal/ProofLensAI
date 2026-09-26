import { expect, test as base } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';

export const test = base.extend({});
export { expect };

test.beforeEach(async ({ page }, testInfo) => {
  await test.step('Before hook · open the ProofLens baseline and capture evidence', async () => {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await testInfo.attach('before-hook.json', {
      body: Buffer.from(JSON.stringify({
        phase: 'beforeEach',
        case: testInfo.title,
        project: testInfo.project.name,
        startedAt: new Date().toISOString(),
        baseURL,
        viewport: page.viewportSize(),
      }, null, 2)),
      contentType: 'application/json',
    });
    await testInfo.attach('before-screenshot.png', {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  await test.step('After hook · record final UI state and outcome', async () => {
    let screenshotError: string | undefined;
    if (!page.isClosed()) {
      try {
        await testInfo.attach('after-screenshot.png', {
          body: await page.screenshot({ animations: 'disabled' }),
          contentType: 'image/png',
        });
      } catch (error) {
        screenshotError = error instanceof Error ? error.message : String(error);
      }
    } else {
      screenshotError = 'Page was already closed before the after hook.';
    }
    await testInfo.attach('after-hook.json', {
      body: Buffer.from(JSON.stringify({
        phase: 'afterEach',
        case: testInfo.title,
        status: testInfo.status,
        expectedStatus: testInfo.expectedStatus,
        durationMs: testInfo.duration,
        retry: testInfo.retry,
        errors: testInfo.errors.map(error => error.message),
        screenshotError,
        video: 'enabled for this browser test; attached by the Allure Playwright reporter',
      }, null, 2)),
      contentType: 'application/json',
    });
  });
});
