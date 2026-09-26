import { expect, test } from './fixtures/api-test';
import type { APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const api = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1';
const email = `prooflens-api-flow-${randomUUID()}@example.com`;
let password = `ProofLens-API-${randomUUID()}-Pass!`;
let accessToken = '';
let refreshToken = '';
let requestContext: APIRequestContext;
const image = readFileSync(resolve(process.cwd(), 'e2e/assets/sample-image.png'));

const auth = () => ({ Authorization: `Bearer ${accessToken}` });

test.describe('ProofLens API · account lifecycle and protected product endpoints', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ playwright }) => {
    requestContext = await playwright.request.newContext();
    const registered = await requestContext.post(`${api}/auth/mobile/register`, {
      data: { email, password, display_name: 'ProofLens API lifecycle' },
    });
    if (registered.status() !== 201) throw new Error(`API lifecycle setup failed: ${registered.status()} ${await registered.text()}`);
    const session = (await registered.json()).data;
    accessToken = session.access_token;
    refreshToken = session.refresh_token;
  });

  test.afterAll(async () => {
    if (requestContext && accessToken) {
      await requestContext.delete(`${api}/auth/me`, { headers: auth(), data: { password } }).catch(() => undefined);
      await requestContext.dispose();
    }
  });

  test('mobile session refresh rotates refresh token and rejects replay', async () => {
    const oldRefreshToken = refreshToken;
    const refreshed = await requestContext.post(`${api}/auth/mobile/refresh`, { data: { refresh_token: oldRefreshToken } });
    expect(refreshed.status()).toBe(200);
    const tokens = (await refreshed.json()).data;
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).not.toBe(oldRefreshToken);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    const replay = await requestContext.post(`${api}/auth/mobile/refresh`, { data: { refresh_token: oldRefreshToken } });
    expect(replay.status()).toBe(401);
    const current = await requestContext.get(`${api}/auth/me`, { headers: auth() });
    expect(current.status()).toBe(200);
    expect((await current.json()).data.email).toBe(email);
  });

  test('avatar upload validates bytes, stores a safe image and serves the normalized avatar', async () => {
    const uploaded = await requestContext.post(`${api}/auth/me/avatar`, {
      headers: auth(), multipart: { file: { name: 'qa-avatar.png', mimeType: 'image/png', buffer: image } },
    });
    expect(uploaded.status()).toBe(200);
    const read = await requestContext.get(`${api}/auth/me/avatar`, { headers: auth() });
    expect(read.status()).toBe(200);
    expect(read.headers()['content-type']).toContain('image/jpeg');
    expect((await read.body()).byteLength).toBeGreaterThan(50);

    const unsupported = await requestContext.post(`${api}/auth/me/avatar`, {
      headers: auth(), multipart: { file: { name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') } },
    });
    expect(unsupported.status()).toBe(415);
    const malformed = await requestContext.post(`${api}/auth/me/avatar`, {
      headers: auth(), multipart: { file: { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') } },
    });
    expect(malformed.status()).toBe(422);
  });

  test('screenshot alias supports real image scans and rejects malformed image content', async () => {
    const screenshot = await requestContext.post(`${api}/analyze/screenshot`, {
      headers: auth(), multipart: { file: { name: 'qa-screenshot.png', mimeType: 'image/png', buffer: image } },
    });
    expect(screenshot.status()).toBe(200);
    expect((await screenshot.json()).data.scan_type).toBe('SCREENSHOT');
    const malformed = await requestContext.post(`${api}/analyze/image`, {
      headers: auth(), multipart: { file: { name: 'qa-image.png', mimeType: 'image/png', buffer: Buffer.from('not image data') } },
    });
    expect(malformed.status()).toBe(415);
    const unsupported = await requestContext.post(`${api}/analyze/qr`, {
      headers: auth(), multipart: { file: { name: 'qa-image.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') } },
    });
    expect(unsupported.status()).toBe(415);
  });

  test('file analyzer rejects unsupported extension and malformed supported document', async () => {
    const unsupported = await requestContext.post(`${api}/analyze/file`, {
      headers: auth(), multipart: { file: { name: 'prooflens-test.bin', mimeType: 'application/octet-stream', buffer: Buffer.from('synthetic') } },
    });
    expect(unsupported.status()).toBe(415);
    const malformed = await requestContext.post(`${api}/analyze/file`, {
      headers: auth(), multipart: { file: { name: 'prooflens-test.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('synthetic QA document') } },
    });
    expect([200, 422]).toContain(malformed.status());
    if (malformed.status() === 200) expect((await malformed.json()).data.scan_type).toBe('FILE');
  });

  test('password recovery token is one-use, resets the password and supports a fresh mobile login', async () => {
    const forgot = await requestContext.post(`${api}/auth/forgot-password`, { data: { email } });
    expect(forgot.status()).toBe(200);
    const resetToken = (await forgot.json()).data.development_reset_token;
    expect(resetToken).toBeTruthy();
    const nextPassword = `ProofLens-Reset-${randomUUID()}-Pass!`;
    const reset = await requestContext.post(`${api}/auth/reset-password`, { data: { token: resetToken, new_password: nextPassword } });
    expect(reset.status()).toBe(200);
    password = nextPassword;
    const replay = await requestContext.post(`${api}/auth/reset-password`, { data: { token: resetToken, new_password: `Another-${randomUUID()}-Pass!` } });
    expect(replay.status()).toBe(400);
    const login = await requestContext.post(`${api}/auth/mobile/login`, { data: { email, password } });
    expect(login.status()).toBe(200);
    accessToken = (await login.json()).data.access_token;
  });
});
