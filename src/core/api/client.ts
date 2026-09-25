import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const ACCESS_TOKEN_KEY = 'prooflens.mobile.access-token';
const REFRESH_TOKEN_KEY = 'prooflens.mobile.refresh-token';
type MobileRefreshResult =
  | { status: 'success'; accessToken: string; refreshToken: string }
  | { status: 'invalid' | 'unavailable' };
let mobileRefreshInFlight: Promise<MobileRefreshResult> | null = null;

const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/mobile/login',
  '/auth/mobile/register',
]);

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiRootUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const native = Platform.OS !== 'web';
  const accessToken = native ? await SecureStore.getItemAsync(ACCESS_TOKEN_KEY).catch(() => null) : null;
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const options: RequestInit = { ...init, headers, credentials: 'include' };
  let response = await fetch(apiUrl(path), options);

  if (response.status !== 401 || AUTH_PATHS_WITHOUT_REFRESH.has(path) || path === '/auth/mobile/refresh' || path === '/auth/mobile/logout') {
    return response;
  }

  if (native) {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
    if (!refreshToken) return response;
    const pendingRefresh = mobileRefreshInFlight ??= refreshMobileSession(refreshToken);
    const tokens = await pendingRefresh;
    if (mobileRefreshInFlight === pendingRefresh) mobileRefreshInFlight = null;
    if (tokens.status !== 'success') {
      if (tokens.status === 'invalid') await clearMobileCredentials();
      return response;
    }
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set('Authorization', `Bearer ${tokens.accessToken}`);
    response = await fetch(apiUrl(path), { ...init, headers: retryHeaders, credentials: 'include' });
    return response;
  }

  const refreshed = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  });

  if (refreshed.ok) response = await fetch(apiUrl(path), options);
  return response;
}

async function refreshMobileSession(refreshToken: string): Promise<MobileRefreshResult> {
  try {
    const response = await fetch(apiUrl('/auth/mobile/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include',
    });
    if (response.status === 401 || response.status === 403) return { status: 'invalid' };
    if (!response.ok) return { status: 'unavailable' };
    const body = await response.json() as ApiEnvelope<{ access_token: string; refresh_token: string }>;
    const tokens = { accessToken: body.data.access_token, refreshToken: body.data.refresh_token };
    await saveMobileCredentials(tokens.accessToken, tokens.refreshToken);
    return { status: 'success', ...tokens };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function saveMobileCredentials(accessToken: string, refreshToken: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    await clearMobileCredentials();
    throw error;
  }
}

export async function clearMobileCredentials(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
  ]);
}

export async function getMobileRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
}

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};

export async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json() as ApiEnvelope<unknown> & { detail?: string };
    return new Error(body.error?.message || body.detail || fallback);
  } catch {
    return new Error(fallback);
  }
}
