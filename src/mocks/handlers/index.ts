import { http, HttpResponse } from 'msw';

import { adminHandlers } from './admin';
import { applicationHandlers } from './applications';
import { authHandlers } from './auth';
import { challengeHandlers } from './challenges';
import { evaluationHandlers } from './evaluations';
import { gateHandlers } from './gates';
import { jurisdictionHandlers } from './jurisdiction';
import { paymentHandlers } from './payments';
import { pilotHandlers } from './pilots';
import { portalHandlers } from './portals';
import { validationHandlers } from './validation';

/**
 * Is the mock API answering?
 *
 * The one endpoint that touches nothing — no store, no session, no
 * jurisdiction — so a probe for it can only fail if the request never reached
 * a handler at all. `startMockApi` uses it to tell "the worker registered" from
 * "the worker is intercepting", which are not the same thing and used to be
 * indistinguishable until a screen fetched HTML and reported an outage.
 */
const healthHandlers = [
  http.get('/api/health', () => HttpResponse.json({ success: true, data: { ok: true }, servedAt: new Date().toISOString() })),
];

export const handlers = [
  /*
   * First, and it matters that it is first: it refuses a request for a record
   * the signed-in account has no standing over, whatever route, notification or
   * pasted link produced it. Everything below it may then assume the reader is
   * entitled to the case, and go on checking what they may do inside it.
   */
  ...healthHandlers,
  ...jurisdictionHandlers,
  ...authHandlers,
  ...challengeHandlers,
  ...applicationHandlers,
  ...evaluationHandlers,
  ...gateHandlers,
  ...pilotHandlers,
  ...paymentHandlers,
  ...validationHandlers,
  ...portalHandlers,
  ...adminHandlers,
];
