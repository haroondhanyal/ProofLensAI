const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
]);

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiRootUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const options: RequestInit = { ...init, credentials: 'include' };
  let response = await fetch(apiUrl(path), options);

  if (response.status !== 401 || AUTH_PATHS_WITHOUT_REFRESH.has(path)) {
    return response;
  }

  const refreshed = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  });

  if (refreshed.ok) response = await fetch(apiUrl(path), options);
  return response;
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
