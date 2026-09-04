/**
 * Development scenario switcher. Forces the mock API into a named condition so
 * every state in the product can be demonstrated on demand.
 */

export type ScenarioId =
  | 'normal'
  | 'empty'
  | 'loading'
  | 'slow'
  | 'forbidden'
  | 'server_error'
  | 'sla_breached'
  | 'rejected_gate'
  | 'partial_failure'
  | 'mutation_failure'
  | 'stale';

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  description: string;
}

export const SCENARIOS: readonly ScenarioDefinition[] = [
  { id: 'normal', label: 'Normal', description: 'Seeded data, realistic latency.' },
  { id: 'empty', label: 'Empty state', description: 'Every collection returns nothing, so empty states are visible.' },
  { id: 'loading', label: 'Loading', description: 'Requests never settle, so skeletons stay on screen.' },
  { id: 'slow', label: 'Slow network', description: 'Every request takes three to five seconds.' },
  { id: 'forbidden', label: '403 forbidden', description: 'The API refuses on authorisation grounds.' },
  { id: 'server_error', label: '500 server error', description: 'The API fails with a reference id.' },
  { id: 'sla_breached', label: 'SLA breached', description: 'Every clock is pushed past its limit.' },
  { id: 'rejected_gate', label: 'Rejected gate', description: 'The current gate on the demo case is recorded as rejected.' },
  {
    id: 'partial_failure',
    label: 'Partial data failure',
    description: 'Measurement and analytics endpoints fail while the rest of the page works.',
  },
  { id: 'mutation_failure', label: 'Mutation failure', description: 'Reads succeed; every write fails so form data preservation is visible.' },
  { id: 'stale', label: 'Stale data', description: 'Responses are stamped with an old server time.' },
];

let current: ScenarioId = 'normal';

export function scenario(): ScenarioId {
  return current;
}

export function setScenario(id: ScenarioId): void {
  current = id;
}

export function scenarioDelay(): number {
  switch (current) {
    case 'slow':
      return 3200 + Math.random() * 1800;
    case 'loading':
      return 1000 * 60 * 60;
    default:
      return 120 + Math.random() * 260;
  }
}
