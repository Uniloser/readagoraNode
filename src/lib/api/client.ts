export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'ApiError'; }
}

const apiBaseUrl = () => (process.env.READAGORA_API_URL || '').replace(/\/$/, '');

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new Error('Set READAGORA_API_URL to the mobile app API base URL.');
  const response = await fetch(`${base}${path}`, { ...init, headers: { Accept: 'application/json', ...init?.headers }, cache: 'no-store' });
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    if (body && typeof body === 'object') {
      const data = body as Record<string, unknown>;
      const error = data.error;
      message = typeof error === 'string' ? error : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : typeof data.message === 'string' ? data.message : message;
    }
    throw new ApiError(message, response.status);
  }
  if (body && typeof body === 'object' && 'data' in body) return (body as { data: T }).data;
  return body as T;
}
