import type { ApiError } from '@/types/models';

export class PrayogApiError extends Error {
  readonly code: string;
  readonly details: string[];
  readonly reference?: string;
  readonly status: number;

  constructor(status: number, error: ApiError['error']) {
    super(error.message);
    this.name = 'PrayogApiError';
    this.status = status;
    this.code = error.code;
    this.details = error.details ?? [];
    this.reference = error.reference;
  }
}

export interface Fetched<T> {
  data: T;
  servedAt: string;
  message?: string;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nexus_auth_token') || localStorage.getItem('prayog_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('nexus_auth_token', token);
  } else {
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('prayog_auth_token');
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<Fetched<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(path, {
    ...init,
    headers,
  });

  let rawBody: any;
  try {
    rawBody = await response.json();
  } catch {
    rawBody = {};
  }

  // 1. Enveloped mock or standardized error format
  if (rawBody && typeof rawBody === 'object' && rawBody.success === false) {
    throw new PrayogApiError(response.status, rawBody.error);
  }

  // 2. Direct HTTP error from backend (FastAPI { detail: ... } or generic)
  if (!response.ok) {
    const message =
      typeof rawBody?.detail === 'string'
        ? rawBody.detail
        : rawBody?.error?.message || response.statusText || 'Request failed';

    const details = Array.isArray(rawBody?.detail)
      ? rawBody.detail.map((d: any) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
      : [];

    throw new PrayogApiError(response.status, {
      code: `HTTP_${response.status}`,
      message,
      details,
    });
  }

  // 3. Enveloped success format
  if (rawBody && typeof rawBody === 'object' && rawBody.success === true && 'data' in rawBody) {
    return {
      data: rawBody.data,
      servedAt: rawBody.servedAt || new Date().toISOString(),
      message: rawBody.message,
    };
  }

  // 4. Direct FastAPI success format (unwrapped payload)
  return {
    data: rawBody as T,
    servedAt: new Date().toISOString(),
    message: rawBody?.message,
  };
}

export const api = {
  get: <T>(path: string): Promise<Fetched<T>> => call<T>(path),
  post: <T>(path: string, body?: unknown): Promise<Fetched<T>> =>
    call<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown): Promise<Fetched<T>> =>
    call<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string): Promise<Fetched<T>> => call<T>(path, { method: 'DELETE' }),
};

export function query(params: Record<string, string | number | boolean | string[] | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v));
    else search.set(key, String(value));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}
