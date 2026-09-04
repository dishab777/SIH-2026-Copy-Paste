/**
 * The demonstration clock.
 *
 * Every seeded date — gate entry, milestone due date, payment acceptance —
 * is written relative to a fixed instant so the same figures appear on every
 * run and a screenshot taken today still reads correctly next month. The mock
 * server stamps its responses from this clock, so the interface has to read
 * the time from the same place. A component that asks the browser for the
 * wall clock instead will disagree with the server about what day it is.
 *
 * In a real deployment this module returns the system time and nothing else
 * changes: every caller already goes through `platformNow()`.
 */
export const DEMO_NOW = new Date('2026-09-03T10:42:00+05:30');

const bootedAt = Date.now();

/** The current time on the platform clock. Advances in real time from boot. */
export function platformNow(): Date {
  return new Date(DEMO_NOW.getTime() + (Date.now() - bootedAt));
}

/** The current time as an ISO string, for anything that stamps a record. */
export function platformNowIso(): string {
  return platformNow().toISOString();
}
