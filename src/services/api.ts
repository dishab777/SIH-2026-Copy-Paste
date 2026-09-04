import type { ApiError, ApiResponse } from '@/types/models';

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

async function call<T>(path: string, init?: RequestInit): Promise<Fetched<T>> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) throw new PrayogApiError(response.status, body.error);
  return { data: body.data, servedAt: body.servedAt, message: body.message };
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
