import { adminHandlers } from './admin';
import { applicationHandlers } from './applications';
import { authHandlers } from './auth';
import { challengeHandlers } from './challenges';
import { evaluationHandlers } from './evaluations';
import { gateHandlers } from './gates';
import { paymentHandlers } from './payments';
import { pilotHandlers } from './pilots';
import { portalHandlers } from './portals';
import { validationHandlers } from './validation';

export const handlers = [
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
