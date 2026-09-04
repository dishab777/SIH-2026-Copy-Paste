import { HttpResponse, delay } from 'msw';
import { subHours } from 'date-fns';
import { can, type Action, type Resource } from '@/config/rbac';
import { errorReference } from '@/lib/ids';
import type { ApiError, ApiSuccess } from '@/types/models';
import { scenario, scenarioDelay } from '../scenarios';
import { getDb } from '../store/db';
import { currentRole } from '../store/session';

export function servedAt(): string {
  const now = getDb().now();
  // The stale scenario stamps responses with an old server clock so the
  // freshness line and the refresh action have something to show.
  return (scenario() === 'stale' ? subHours(now, 3) : now).toISOString();
}

export function ok<T>(data: T, message?: string): Response {
  const body: ApiSuccess<T> = { success: true, data, servedAt: servedAt(), ...(message ? { message } : {}) };
  return HttpResponse.json(body, { status: 200 });
}

export function fail(status: number, code: string, message: string, details?: string[]): Response {
  const body: ApiError = {
    success: false,
    error: { code, message, details, reference: errorReference() },
    servedAt: servedAt(),
  };
  return HttpResponse.json(body, { status });
}

export function forbidden(action: Action, resource: Resource): Response {
  return fail(
    403,
    'FORBIDDEN',
    `Your role cannot ${action} this ${resource}.`,
    ['The frontend is never the only check. This request was refused by the API.'],
  );
}

export function notFound(what: string): Response {
  return fail(404, 'NOT_FOUND', `${what} does not exist, or you cannot see it.`);
}

/**
 * Every handler passes through here first. It applies the active scenario before
 * any real work happens, so error, empty, slow and forbidden states are genuine
 * API behaviour rather than component-level pretence.
 */
export async function gate(kind: 'read' | 'write'): Promise<Response | null> {
  await delay(scenarioDelay());
  const s = scenario();
  if (s === 'forbidden') {
    return fail(403, 'FORBIDDEN', 'This account cannot perform that action.', [
      'Scenario switcher is set to 403 forbidden.',
    ]);
  }
  if (s === 'server_error') {
    return fail(500, 'SERVER_ERROR', 'The service did not complete the request.', [
      'Scenario switcher is set to 500 server error.',
    ]);
  }
  if (s === 'mutation_failure' && kind === 'write') {
    return fail(503, 'MUTATION_FAILED', 'The change could not be saved.', [
      'Your changes are preserved in the form. Try again.',
    ]);
  }
  return null;
}

/** Endpoints that fail only under the partial-failure scenario. */
export function partialFailure(widget: string): Response | null {
  if (scenario() !== 'partial_failure') return null;
  // The page supplies its own title for this failure, so the message says
  // what the reader needs next instead of repeating it: how far the failure
  // reaches, and that the panel can be retried on its own.
  return fail(500, 'WIDGET_FAILED', 'This was the only request that failed. Retry the panel rather than reloading the page.', [
    `Everything on this page except ${widget} loaded normally.`,
  ]);
}

/**
 * The rejected-gate scenario shows what a refused decision looks like without
 * writing one into the store: the open gate on a case is presented as rejected,
 * with the reason a real refusal would carry. Switching back to normal restores
 * the record untouched.
 */
export function asScenarioGate<T extends { status: string; decidedOn?: string; decision?: string; reason?: string; enteredOn: string }>(
  record: T,
): T {
  if (scenario() !== 'rejected_gate') return record;
  if (record.status !== 'open' && record.status !== 'blocked') return record;
  return {
    ...record,
    status: 'rejected',
    decision: 'reject',
    decidedOn: getDb().now().toISOString(),
    reason:
      'Refused. The baseline submitted with this case could not be reconciled with the departmental records it cites, so the improvement claimed cannot be measured against anything. Resubmit with the source extract attached. (Scenario switcher is set to rejected gate.)',
  };
}

export function emptyIfScenario<T>(items: T[]): T[] {
  return scenario() === 'empty' ? [] : items;
}

export function requirePermission(action: Action, resource: Resource): Response | null {
  return can(currentRole(), action, resource) ? null : forbidden(action, resource);
}

export function page<T>(items: T[], url: URL): { items: T[]; total: number; page: number; pageSize: number } {
  const p = Number(url.searchParams.get('page') ?? '1');
  const size = Number(url.searchParams.get('pageSize') ?? '50');
  const start = (p - 1) * size;
  return { items: items.slice(start, start + size), total: items.length, page: p, pageSize: size };
}

export async function readBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
