/**
 * Typed analytics events. In this build they are written to the console;
 * the call sites and payloads are the deliverable.
 */

export type AnalyticsEvent =
  | { name: 'challenge_draft_started'; challengeId: string; fromTemplate?: string }
  | { name: 'challenge_step_completed'; challengeId: string; step: number; stepName: string }
  | { name: 'challenge_published'; challengeId: string; caseId: string; budgetPaise: number }
  | { name: 'solution_language_flag_shown'; challengeId: string; flagId: string; kind: string }
  | { name: 'solution_language_flag_accepted'; challengeId: string; flagId: string }
  | { name: 'solution_language_flag_edited'; challengeId: string; flagId: string }
  | { name: 'application_started'; applicationId: string; challengeId: string }
  | { name: 'application_step_completed'; applicationId: string; step: number }
  | { name: 'application_submitted'; applicationId: string; referenceNumber: string }
  | { name: 'application_abandoned'; applicationId: string; atStep: number }
  | { name: 'coi_signed'; evaluatorId: string; applicationId: string }
  | { name: 'coi_conflict_declared'; evaluatorId: string; applicationId: string }
  | { name: 'criterion_scored'; evaluationId: string; criterionId: string; score: number }
  | { name: 'evaluation_submitted'; evaluationId: string; applicationId: string }
  | { name: 'gate_decision_recorded'; caseId: string; gate: string; decision: string }
  | { name: 'milestone_evidence_submitted'; milestoneId: string; evidenceCount: number }
  | { name: 'milestone_accepted'; milestoneId: string; amountPaise: number }
  | { name: 'milestone_returned'; milestoneId: string; finding: string }
  | { name: 'claim_raised'; claimId: string; amountPaise: number }
  | { name: 'claim_approved'; claimId: string; amountPaise: number }
  | { name: 'claim_paid'; claimId: string; amountPaise: number; reference: string }
  | { name: 'validation_outcome_recorded'; pilotId: string; outcome: string }
  | { name: 'pathway_selected'; pilotId: string; pathwayId: string }
  | { name: 'sla_breached'; caseId: string; kind: string; overdueDays: number };

export type AnalyticsEventName = AnalyticsEvent['name'];

const log: AnalyticsEvent[] = [];

export function track(event: AnalyticsEvent): void {
  log.push(event);
  const { name, ...payload } = event;
  // eslint-disable-next-line no-console
  console.info(`[prayog:analytics] ${name}`, payload);
}

export function analyticsLog(): readonly AnalyticsEvent[] {
  return log;
}
