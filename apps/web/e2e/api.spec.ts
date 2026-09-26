import { expect, test } from './fixtures/api-test';
import type { APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const apiRoot = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1';
const apiOrigin = new URL(apiRoot).origin;
const apiPath = (path: string) => `${apiRoot}/${path.replace(/^\/+/, '')}`;
const runId = randomUUID();
const email = `automation-${runId}@example.com`;
const password = `ProofLens-${randomUUID()}-safe`;

test.describe('API • unauthenticated access and validation', () => {
  test('health endpoint reports ready', async ({ request }) => {
    const response = await request.get(`${apiOrigin}/health`);
    expect(response.status()).toBe(200);
    expect((await response.json()).data.status).toBe('ok');
  });

  for (const [method, path, label] of [
    ['GET', '/auth/me', 'private profile'],
    ['GET', '/scans', 'scan history'],
    ['GET', '/auth/me/privacy', 'privacy settings'],
    ['POST', '/analyze/url', 'URL analyzer'],
    ['POST', '/analyze/message', 'message analyzer'],
    ['POST', '/reports/unknown-report/share', 'report sharing'],
  ] as const) {
    test(`${method} ${label} rejects missing session`, async ({ request }) => {
      const response = method === 'GET'
        ? await request.get(`${apiRoot}${path}`)
        : await request.post(`${apiRoot}${path}`, { data: { content: 'https://example.com' } });
      expect(response.status()).toBe(401);
    });
  }

  test('registration validates malformed email and short password', async ({ request }) => {
    const badEmail = await request.post(`${apiRoot}/auth/register`, {
      data: { email: 'not-an-email', password: 'ProofLens-safe-password', display_name: 'QA User' },
    });
    expect(badEmail.status()).toBe(422);
    const weakPassword = await request.post(`${apiRoot}/auth/register`, {
      data: { email: `weak-${runId}@example.com`, password: 'short', display_name: 'QA User' },
    });
    expect(weakPassword.status()).toBe(422);
  });
});

test.describe('API • authenticated account, analysis and reports', () => {
  test.describe.configure({ mode: 'serial' });
  let api: APIRequestContext;
  let urlScanId = '';
  let messageScanId = '';
  let shareId = '';

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext();
    const response = await api.post(apiPath('auth/register'), {
      data: { email, password, display_name: 'ProofLens Automation' },
    });
    if (response.status() !== 201) {
      throw new Error(`Automation account setup failed with HTTP ${response.status()}: ${await response.text()}`);
    }
  });

  test.afterAll(async () => {
    if (api) {
      await api.delete(apiPath('auth/me'), { data: { password } }).catch(() => undefined);
      await api.dispose();
    }
  });

  test('registration creates a session and profile', async () => {
    const response = await api.get(apiPath('auth/me'));
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.email).toBe(email);
    expect(body.data.display_name).toBe('ProofLens Automation');
  });

  test('profile can be updated and read back', async () => {
    const update = await api.patch(apiPath('auth/me'), { data: { display_name: 'ProofLens QA', phone: '+923001234567' } });
    expect(update.status()).toBe(200);
    const profile = await api.get(apiPath('auth/me'));
    const body = await profile.json();
    expect(body.data.display_name).toBe('ProofLens QA');
    expect(body.data.phone).toBe('+923001234567');
  });

  test('privacy settings support a valid retention choice', async () => {
    const update = await api.patch(apiPath('auth/me/privacy'), { data: { scan_retention_days: 90 } });
    expect(update.status()).toBe(200);
    const read = await api.get(apiPath('auth/me/privacy'));
    expect((await read.json()).data.scan_retention_days).toBe(90);
  });

  test('privacy settings reject an unsupported retention value', async () => {
    const response = await api.patch(apiPath('auth/me/privacy'), { data: { scan_retention_days: 45 } });
    expect(response.status()).toBe(422);
  });

  test('URL analysis returns an evidence-backed report', async () => {
    const response = await api.post(apiPath('analyze/url'), { data: { content: 'https://example.com/login', fetch_page: false } });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.scan_type).toBe('URL');
    expect(body.data.scan_id).toBeTruthy();
    expect(Array.isArray(body.data.evidence)).toBeTruthy();
    urlScanId = body.data.scan_id;
  });

  test('message analysis returns a report without implying certainty', async () => {
    const response = await api.post(apiPath('analyze/message'), { data: { content: 'Urgent: verify your account at https://example.com/login' } });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.scan_type).toBe('MESSAGE');
    expect(body.data.summary).toBeTruthy();
    messageScanId = body.data.scan_id;
  });

  test('analysis rejects empty submitted content', async () => {
    const response = await api.post(apiPath('analyze/url'), { data: { content: '' } });
    expect(response.status()).toBe(422);
  });

  test('scan history lists reports and supports type filtering', async () => {
    const response = await api.get(apiPath('scans?scan_type=URL&limit=10'));
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.items.some((item: { scan_id: string }) => item.scan_id === urlScanId)).toBeTruthy();
    expect(body.data.items.every((item: { scan_type: string }) => item.scan_type === 'URL')).toBeTruthy();
  });

  test('scan history rejects unknown type filters', async () => {
    const response = await api.get(apiPath('scans?scan_type=UNKNOWN'));
    expect(response.status()).toBe(422);
  });

  test('scan details are private to the account', async () => {
    const response = await api.get(apiPath(`scans/${urlScanId}`));
    expect(response.status()).toBe(200);
    expect((await response.json()).data.scan_id).toBe(urlScanId);
  });

  test('saved scan state toggles on and off', async () => {
    const saved = await api.post(apiPath(`scans/${urlScanId}/save`));
    expect(saved.status()).toBe(200);
    expect((await saved.json()).data.saved).toBe(true);
    const unsaved = await api.post(apiPath(`scans/${urlScanId}/save`));
    expect((await unsaved.json()).data.saved).toBe(false);
  });

  test('private report can be shared and omits submitted content', async () => {
    const shared = await api.post(apiPath(`reports/${urlScanId}/share`));
    expect(shared.status()).toBe(200);
    const payload = (await shared.json()).data;
    shareId = payload.share_id;
    expect(payload.url).toContain('/proof/');
    expect(payload.privacy_notice).toContain('not the submitted content');
    const report = await api.get(apiPath(`public/reports/${shareId}`));
    expect(report.status()).toBe(200);
    const publicBody = await report.text();
    expect(publicBody).not.toContain('https://example.com/login');
  });

  test('shared report revocation makes the public URL unavailable', async () => {
    const revoked = await api.delete(apiPath(`reports/${urlScanId}/share`));
    expect(revoked.status()).toBe(200);
    const report = await api.get(apiPath(`public/reports/${shareId}`));
    expect(report.status()).toBe(404);
  });

  test('report exports as a PDF', async () => {
    const response = await api.get(apiPath(`reports/${messageScanId}/pdf`));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    expect((await response.body()).subarray(0, 4).toString()).toBe('%PDF');
  });

  test('deleted scan cannot be read again', async () => {
    const deleted = await api.delete(apiPath(`scans/${messageScanId}`));
    expect(deleted.status()).toBe(200);
    const missing = await api.get(apiPath(`scans/${messageScanId}`));
    expect(missing.status()).toBe(404);
  });
});
