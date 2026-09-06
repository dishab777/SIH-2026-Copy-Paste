import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * MSW's minimal runnable surface. Typed structurally rather than imported so the
 * fallback below does not depend on internals that may move between versions.
 */
interface RunnableHandler {
  run(args: { request: Request; requestId: string }): Promise<{ response?: Response } | null>;
}

/**
 * The patched fetch has to survive module reloads. A hot update re-evaluates
 * this file with a fresh set of handlers, and without somewhere outside the
 * module to keep the original fetch, each reload would wrap the previous
 * wrapper until the stack ran out.
 */
interface MockGlobals {
  __prayogOriginalFetch?: typeof window.fetch;
  __prayogHandlers?: RunnableHandler[];
  __prayogFallbackInstalled?: boolean;
}

const globals = window as unknown as Window & MockGlobals;

function requestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Some embedded and sandboxed browsers refuse to register a service worker.
 * Rather than showing a blank page, the same handlers are run against a patched
 * fetch. The API behaves identically; only the interception point moves.
 */
function startFetchFallback(): void {
  globals.__prayogHandlers = handlers as unknown as RunnableHandler[];
  if (globals.__prayogFallbackInstalled) return;

  globals.__prayogFallbackInstalled = true;
  const original = globals.__prayogOriginalFetch ?? window.fetch.bind(window);
  globals.__prayogOriginalFetch = original;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input as RequestInfo, init);
    const url = new URL(request.url, window.location.origin);

    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
      for (const handler of globals.__prayogHandlers ?? []) {
        const result = await handler.run({ request: request.clone(), requestId: requestId() });
        if (result?.response) return result.response;
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: `No mock handler matches ${url.pathname}.` },
          servedAt: new Date().toISOString(),
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return original(input as RequestInfo, init);
  };
}

/**
 * Does the mock API actually answer?
 *
 * `worker.start()` resolving says the registration succeeded. It does not say
 * the worker is controlling this page yet — after a hard reload, or while a
 * previous worker is shutting down, there is a window where requests go
 * straight past it to the dev server, which returns `index.html` for every
 * unknown path. One probe settles it.
 */
async function intercepts(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', { headers: { Accept: 'application/json' } });
    return (response.headers.get('content-type') ?? '').includes('json');
  } catch {
    return false;
  }
}

export async function startMockApi(): Promise<void> {
  try {
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  } catch (error) {
    console.warn('[prayog] Service worker unavailable; running the mock API through fetch instead.', error);
    startFetchFallback();
    return;
  }

  /*
   * Started is not the same as intercepting. Give the worker a moment to take
   * control, then check — and if it is not answering, use the fetch path
   * rather than letting the first screen of the session fetch HTML and report
   * an outage that is not happening.
   */
  if (await intercepts()) return;
  await new Promise((resolve) => {
    window.setTimeout(resolve, 120);
  });
  if (await intercepts()) return;

  console.warn('[prayog] The service worker started but is not intercepting; running the mock API through fetch.');
  startFetchFallback();
}

// Editing a handler replaces this module but not the running interceptor, which
// would leave the app talking to a server that no longer exists. Re-arm both
// paths with the new handlers instead of making the developer reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    globals.__prayogHandlers = handlers as unknown as RunnableHandler[];
    worker.resetHandlers(...handlers);
    void startMockApi();
  });
}
