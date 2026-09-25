const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const requestInit: RequestInit = { ...init, credentials: 'include' };
  const response = await fetch(input, requestInit);
  const authPaths = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];
  if (response.status !== 401 || authPaths.some((path) => url.includes(path))) return response;
  const refreshed = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!refreshed.ok) return response;
  return fetch(input, requestInit);
}
