import { policyNumber } from '@/config/policies';
import { daysBetween, durationWords } from './format';
import { platformNow } from '@/config/clock';

export type ClockState = 'comfortable' | 'due_soon' | 'overdue';

export interface ClockReading {
  state: ClockState;
  /** Always words, never an abbreviation. */
  words: string;
  daysElapsed: number;
  daysRemaining: number;
  limitDays: number;
  fractionUsed: number;
}

/**
 * One clock for every deadline in the product.
 * The due-soon threshold is configured, not chosen by a component.
 */
export function readClock(startedOn: string, limitDays: number, now: Date = platformNow()): ClockReading {
  const elapsed = daysBetween(startedOn, now);
  const remaining = limitDays - elapsed;
  const fractionUsed = limitDays > 0 ? elapsed / limitDays : 1;
  const dueSoonRatio = policyNumber('sla.dueSoon.ratio');

  let state: ClockState = 'comfortable';
  if (remaining < 0) state = 'overdue';
  else if (limitDays > 0 && remaining / limitDays <= dueSoonRatio) state = 'due_soon';

  const words =
    remaining < 0
      ? `Overdue by ${durationWords(Math.abs(remaining))}`
      : remaining === 0
        ? 'Due today'
        : `Due in ${durationWords(remaining)}`;

  return { state, words, daysElapsed: elapsed, daysRemaining: remaining, limitDays, fractionUsed };
}

/** Payment ageing uses the configured milestone payment limit. */
export function readPaymentClock(acceptedOn: string, now: Date = platformNow()): ClockReading {
  return readClock(acceptedOn, policyNumber('payment.milestone.limit.days'), now);
}

export function clockToneClass(state: ClockState): string {
  switch (state) {
    case 'overdue':
      return 'text-seal';
    case 'due_soon':
      // --hold fails contrast at body size, so due-soon text stays ink.
      return 'text-ink';
    default:
      return 'text-ink-soft';
  }
}

export function clockWashClass(state: ClockState): string {
  switch (state) {
    case 'overdue':
      return 'bg-seal-wash';
    case 'due_soon':
      return 'bg-hold-wash';
    default:
      return '';
  }
}

export function clockMarkerClass(state: ClockState): string {
  switch (state) {
    case 'overdue':
      return 'border-l-2 border-l-seal';
    case 'due_soon':
      return 'border-l-2 border-l-hold';
    default:
      return 'border-l-2 border-l-transparent';
  }
}
