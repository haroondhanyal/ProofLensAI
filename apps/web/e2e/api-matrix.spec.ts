import { expect, test } from './fixtures/api-test';
import type { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiRoot = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1';
const apiPath = (path: string) => `${apiRoot}/${path.replace(/^\/+/, '')}`;
const runId = randomUUID();

test.describe('API matrix · 97 validation, security, and integration cases', () => {
  test.describe.configure({ mode: 'serial' });
  let authenticated: APIRequestContext;
  let accountEmail = '';
  const accountPassword = `QA-${randomUUID()}-Password!`;

  test.beforeAll(async ({ playwright }) => {
    authenticated = await playwright.request.newContext();
    accountEmail = `qa-${runId}@example.com`;
    const created = await authenticated.post(apiPath('auth/register'), {
      data: { email: accountEmail, password: accountPassword, display_name: faker.person.fullName() },
    });
    if (created.status() !== 201) throw new Error(`QA account setup failed: ${created.status()} ${await created.text()}`);
  });

  test.afterAll(async () => {
    if (authenticated) {
      await authenticated.delete(apiPath('auth/me'), { data: { password: accountPassword } }).catch(() => undefined);
      await authenticated.dispose();
    }
  });

  test.describe('API negative · request validation', () => {
    const invalidEmail = Array.from({ length: 1 }, (_, index) => ({ id: index + 1, email: `qa-invalid-${index + 1}-example.com` }));
    for (const item of invalidEmail) {
      test(`API-NEG-REGISTER-EMAIL-${String(item.id).padStart(2, '0')} · invalid email is rejected`, async ({ request }) => {
        const response = await request.post(apiPath('auth/register'), {
          data: { email: item.email, password: 'Valid-QA-Password-2026!', display_name: faker.person.fullName() },
        });
        expect(response.status()).toBe(422);
      });
    }

    for (let index = 0; index < 1; index += 1) {
      const value = faker.string.alphanumeric({ length: index % 10 });
      test(`API-NEG-REGISTER-PASSWORD-${String(index + 1).padStart(2, '0')} · short password is rejected`, async ({ request }) => {
        const response = await request.post(apiPath('auth/register'), {
          data: { email: `short-${index}-${runId}@example.com`, password: value, display_name: faker.person.fullName() },
        });
        expect(response.status()).toBe(422);
      });
    }
  });

  test.describe('API security · 20 anonymous access cases', () => {
    const protectedResources = [
      ['GET', '/auth/me', undefined], ['GET', '/auth/me/privacy', undefined], ['GET', '/auth/me/avatar', undefined],
      ['GET', '/scans', undefined], ['GET', '/scans?limit=5', undefined], ['GET', '/scans?scan_type=URL', undefined],
      ['GET', '/scans/qa-missing-scan', undefined], ['GET', '/reports/qa-missing-scan/pdf', undefined],
      ['POST', '/auth/logout', {}], ['POST', '/auth/mobile/logout', { refresh_token: 'qa-invalid-refresh-token-value-00000000000000000000' }],
      ['POST', '/auth/refresh', {}], ['POST', '/auth/mobile/refresh', { refresh_token: 'qa-invalid-refresh-token-value-00000000000000000000' }],
      ['POST', '/auth/change-password', { current_password: 'invalid', new_password: 'Another-QA-Password-2026!' }],
      ['DELETE', '/auth/me', { password: 'invalid' }], ['POST', '/scans/qa-missing-scan/save', {}],
      ['POST', '/reports/qa-missing-scan/share', {}], ['DELETE', '/reports/qa-missing-scan/share', {}],
      ['POST', '/analyze/url', { content: 'https://example.com', fetch_page: false }],
      ['POST', '/analyze/message', { content: 'Synthetic QA text' }], ['POST', '/analyze/claim', { claim: 'Synthetic QA claim' }],
    ] as const;
    protectedResources.forEach(([method, path, data], index) => {
      test(`API-SEC-${String(index + 1).padStart(2, '0')} · ${method} ${path} requires a session`, async ({ request }) => {
        const response = method === 'GET'
          ? await request.get(apiPath(path))
          : method === 'DELETE'
            ? await request.delete(apiPath(path), { data })
            : await request.post(apiPath(path), { data });
        expect(response.status()).toBe(401);
      });
    });
  });

  test.describe('API authentication · valid login', () => {
    test('API-AUTH-LOGIN · registered QA account can sign in', async () => {
      const response = await authenticated.post(apiPath('auth/login'), { data: { email: accountEmail, password: accountPassword } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.user.email).toBe(accountEmail);
    });
  });

  test.describe('API account · 12 profile and privacy cases', () => {
    const names = Array.from({ length: 3 }, () => faker.person.fullName());
    names.forEach((displayName, index) => {
      test(`API-PROFILE-${index + 1} · profile update round-trips generated name`, async () => {
        const updated = await authenticated.patch(apiPath('auth/me'), { data: { display_name: displayName, phone: `+1${faker.string.numeric(10)}` } });
        expect(updated.status()).toBe(200);
        const read = await authenticated.get(apiPath('auth/me'));
        expect((await read.json()).data.display_name).toBe(displayName);
      });
    });
    for (const days of [30, 90, 180, 365] as const) {
      test(`API-PRIVACY-${days} · accepted retention value is persisted`, async () => {
        const response = await authenticated.patch(apiPath('auth/me/privacy'), { data: { scan_retention_days: days } });
        expect(response.status()).toBe(200);
        expect((await (await authenticated.get(apiPath('auth/me/privacy'))).json()).data.scan_retention_days).toBe(days);
      });
    }
    for (const value of [0, 1, 45, 91] as const) {
      test(`API-PRIVACY-INVALID-${value} · unsupported retention value is rejected`, async () => {
        const response = await authenticated.patch(apiPath('auth/me/privacy'), { data: { scan_retention_days: value } });
        expect(response.status()).toBe(422);
      });
    }
    test('API-PRIVACY-UNTIL-DELETE · null retention means user-controlled deletion', async () => {
      const response = await authenticated.patch(apiPath('auth/me/privacy'), { data: { scan_retention_days: null } });
      expect(response.status()).toBe(200);
      expect((await (await authenticated.get(apiPath('auth/me/privacy'))).json()).data.scan_retention_days).toBeNull();
    });
  });

  test.describe('API analyzers · 10 content boundary cases', () => {
    const invalidBodies = [
      { endpoint: 'analyze/url', content: '' }, { endpoint: 'analyze/message', content: '' },
      { endpoint: 'analyze/url', content: 'x'.repeat(12_001) }, { endpoint: 'analyze/message', content: 'x'.repeat(12_001) },
      { endpoint: 'analyze/store', content: '' }, { endpoint: 'analyze/store', content: 'x'.repeat(8_001) },
      { endpoint: 'analyze/product', content: 'x'.repeat(8_001) }, { endpoint: 'analyze/claim', content: '' },
      { endpoint: 'analyze/claim', content: 'x'.repeat(4_001) }, { endpoint: 'analyze/product', content: '', price: -1 },
    ];
    invalidBodies.forEach((body, index) => {
      test(`API-VALIDATE-${String(index + 1).padStart(2, '0')} · rejects invalid ${body.endpoint} input`, async () => {
        const response = await authenticated.post(apiPath(body.endpoint), { data: { content: body.content, url: body.content, claim: body.content, description: body.content, price: body.price } });
        expect(response.status()).toBe(422);
      });
    });
  });

  test.describe('API analyzers · 8 positive modalities and fixtures', () => {
    const imageBuffer = readFileSync(resolve(process.cwd(), 'e2e/assets/sample-image.png'));
    const textBuffer = readFileSync(resolve(process.cwd(), 'e2e/assets/sample-upload.txt'));
    const imageUpload = (scanKind: string) => ({
      file: { name: 'sample-image.png', mimeType: 'image/png', buffer: imageBuffer },
      scan_kind: scanKind,
    });
    test('API-POS-URL · reserved example URL returns a report', async () => {
      const response = await authenticated.post(apiPath('analyze/url'), { data: { content: 'https://example.com/qa', fetch_page: false } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.scan_type).toBe('URL');
    });
    test('API-POS-MESSAGE · generated synthetic message returns a report', async () => {
      const response = await authenticated.post(apiPath('analyze/message'), { data: { content: `Synthetic QA note: ${faker.lorem.sentence()} verify only at https://example.com` } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.scan_type).toBe('MESSAGE');
    });
    test('API-POS-STORE · reserved example store URL is analyzed', async () => {
      const response = await authenticated.post(apiPath('analyze/store'), { data: { url: 'https://example.com/store', context: 'Synthetic QA store fixture', fetch_page: false } });
      const body = await response.text();
      expect(response.status(), body).toBe(200);
      expect(JSON.parse(body).data.scan_type).toBe('STORE');
    });
    test('API-POS-PRODUCT · product description with synthetic prices is analyzed', async () => {
      const response = await authenticated.post(apiPath('analyze/product'), { data: { description: 'Fictional QA headphones product', price: 49, reference_price: 99 } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.scan_type).toBe('PRODUCT');
    });
    test('API-POS-CLAIM · synthetic claim returns a qualified report', async () => {
      const response = await authenticated.post(apiPath('analyze/claim'), { data: { claim: 'A fictional QA example city plans to plant 10 million trees next year.', organization: 'ProofLens QA Example Group', location: 'Example City', source_urls: [] } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.scan_type).toBe('CLAIM');
    });
    test('API-POS-FILE · benign text asset is inspected without execution', async () => {
      const response = await authenticated.post(apiPath('analyze/file'), { multipart: { file: { name: 'sample-upload.txt', mimeType: 'text/plain', buffer: textBuffer } } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.scan_type).toBe('FILE');
    });
    test('API-POS-IMAGE · benign PNG asset is accepted as image input', async () => {
      const response = await authenticated.post(apiPath('analyze/image'), { multipart: imageUpload('IMAGE') });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.scan_type).toBe('IMAGE');
    });
    test('API-POS-QR · benign PNG asset produces qualified QR analysis', async () => {
      const response = await authenticated.post(apiPath('analyze/qr'), { multipart: imageUpload('QR') });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.scan_type).toBe('QR');
    });
  });

  test.describe('API recovery and report privacy · 2 cases', () => {
    test('API-REPORT-MISSING-PDF · authenticated missing report is not found', async () => {
      const response = await authenticated.get(apiPath('reports/not-a-real-report/pdf'));
      expect(response.status()).toBe(404);
    });
    test('API-REPORT-INVALID-SHARE · unknown public share is not found', async ({ request }) => {
      const response = await request.get(apiPath('public/reports/not-a-real-share'));
      expect(response.status()).toBe(404);
    });
  });

  test.describe('API history filters · 41 generated query cases', () => {
    const scanTypes = ['URL', 'MESSAGE', 'SCREENSHOT', 'QR', 'IMAGE', 'FILE', 'STORE', 'PRODUCT', 'CLAIM'];
    for (const scanType of scanTypes) {
      const variants = [
        { name: 'first page', query: 'limit=1&offset=0' },
        { name: 'maximum page', query: 'limit=100&offset=0' },
        { name: 'search match', query: 'query=QA&limit=10' },
        { name: 'saved only', query: 'saved_only=true&limit=10' },
      ];
      for (const variant of variants) {
        test(`API-LIST-${scanType}-${variant.name.replaceAll(' ', '-')} · returns only requested type`, async () => {
          const response = await authenticated.get(apiPath(`scans?scan_type=${scanType}&${variant.query}`));
          expect(response.status()).toBe(200);
          const body = await response.json();
          expect(Array.isArray(body.data.items)).toBeTruthy();
          expect(body.data.items.every((item: { scan_type: string }) => item.scan_type === scanType)).toBeTruthy();
          expect(body.data.total).toBeGreaterThanOrEqual(body.data.items.length);
        });
      }
    }
    for (const risk of ['LOW', 'CAUTION', 'HIGH', 'CRITICAL']) {
      test(`API-LIST-RISK-${risk} · risk filter returns matching results`, async () => {
        const response = await authenticated.get(apiPath(`scans?risk_level=${risk}&limit=10`));
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.data.items.every((item: { risk_level: string }) => item.risk_level === risk)).toBeTruthy();
      });
    }
    test('API-LIST-RISK-INVALID · unsupported risk filter returns validation error', async () => {
      const response = await authenticated.get(apiPath('scans?risk_level=UNKNOWN'));
      expect(response.status()).toBe(422);
    });
    test('API-LIST-PAGINATION-CLAMP · page size and negative offset are safely clamped', async () => {
      const response = await authenticated.get(apiPath('scans?limit=500&offset=-2'));
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.limit).toBe(100);
      expect(body.data.offset).toBe(0);
    });
  });
});
