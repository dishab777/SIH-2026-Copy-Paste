import { buildAudit } from '../fixtures/buildAudit';
import { buildChallenges } from '../fixtures/buildChallenges';
import { buildCore } from '../fixtures/buildCore';
import { buildPilots } from '../fixtures/buildPilots';
import type { Database } from './types';
import { platformNow } from '@/config/clock';

/**
 * The in-memory store. It survives navigation for the life of the tab and is
 * mutated by the mock API exactly as a server would mutate a real database.
 * No browser storage API is used anywhere in PRAYOG.
 */

let db: Database | null = null;

export function createDatabase(): Database {
  const core = buildCore();
  const challengeData = buildChallenges(core.departments, core.users, core.startups);
  const pilotData = buildPilots(
    challengeData.challenges,
    challengeData.applications,
    core.startups,
    core.departments,
    core.users,
  );
  const auditData = buildAudit(
    challengeData.challenges,
    pilotData.pilots,
    challengeData.applications,
    pilotData.milestones,
    pilotData.claims,
    core.departments,
    core.users,
  );

  return {
    // A fixed clock keeps the seeded story internally consistent across a session.
    now: platformNow,
    users: core.users,
    departments: core.departments,
    startups: core.startups,
    startupDocuments: core.startupDocuments,
    challenges: challengeData.challenges,
    clarifications: challengeData.clarifications,
    applications: challengeData.applications,
    panels: challengeData.panels,
    coi: challengeData.coi,
    evaluations: challengeData.evaluations,
    ...pilotData,
    ...auditData,
  };
}


export function getDb(): Database {
  if (!db) db = createDatabase();
  return db;
}

export function resetDb(): Database {
  db = createDatabase();
  return db;
}
