import { expect, test as base } from '@playwright/test';

export const test = base.extend({});
export { expect };

test.beforeEach(async ({}, testInfo) => {
  await test.step('Before hook · record API case and QA environment', async () => {
    await testInfo.attach('before-hook.json', {
      body: Buffer.from(JSON.stringify({
        phase: 'beforeEach',
        case: testInfo.title,
        project: testInfo.project.name,
        startedAt: new Date().toISOString(),
        apiBaseURL: process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1',
        evidence: 'API assertions and request/response results are recorded in the case steps; UI screenshot/video do not apply to API-only tests.',
      }, null, 2)),
      contentType: 'application/json',
    });
  });
});

test.afterEach(async ({}, testInfo) => {
  await test.step('After hook · record API outcome and timing', async () => {
    await testInfo.attach('after-hook.json', {
      body: Buffer.from(JSON.stringify({
        phase: 'afterEach',
        case: testInfo.title,
        status: testInfo.status,
        expectedStatus: testInfo.expectedStatus,
        durationMs: testInfo.duration,
        retry: testInfo.retry,
        errors: testInfo.errors.map(error => error.message),
        evidence: 'API response assertions and k6 measurements; no browser screen is involved.',
      }, null, 2)),
      contentType: 'application/json',
    });
  });
});
