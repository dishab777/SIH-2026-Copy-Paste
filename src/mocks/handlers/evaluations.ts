import { http } from 'msw';
import { policyNumber } from '@/config/policies';
import { rubric } from '@/config/rubrics';
import type { Evaluation, EvaluationScore } from '@/types/models';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { emptyIfScenario, fail, gate, notFound, ok, readBody, requirePermission } from './util';

function weightedTotal(rubricId: string, scores: EvaluationScore[]): number {
  const def = rubric(rubricId);
  return Number(
    scores
      .reduce((sum, s) => {
        const crit = def.criteria.find((c) => c.id === s.criterionId);
        return crit ? sum + s.score * (crit.weightPercent / 100) : sum;
      }, 0)
      .toFixed(2),
  );
}

export const evaluationHandlers = [
  http.get('/api/evaluator/queue', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    if (!user || user.role !== 'evaluator') return fail(403, 'FORBIDDEN', 'Only an assigned evaluator can open this queue.');

    const panels = db.panels.filter((p) => p.evaluatorIds.includes(user.id));
    const items = panels.flatMap((panel) => {
      const challenge = db.challenges.find((c) => c.id === panel.challengeId)!;
      const applications = db.applications.filter(
        (a) => a.challengeId === panel.challengeId && ['shortlisted', 'under_evaluation', 'awarded', 'not_selected'].includes(a.status),
      );
      return applications.map((a) => {
        const coi = db.coi.find((c) => c.applicationId === a.id && c.evaluatorId === user.id);
        const evaluation = db.evaluations.find((e) => e.applicationId === a.id && e.evaluatorId === user.id);
        return {
          panelId: panel.id,
          challengeCaseId: challenge.caseId,
          challengeTitle: challenge.title,
          challengeId: challenge.id,
          applicationId: a.id,
          applicationCaseId: a.caseId,
          // The applicant identity is withheld until the declaration is recorded.
          applicantLabel: coi?.declared ? db.startups.find((s) => s.id === a.startupId)!.tradeName : 'Identity withheld',
          coiDeclared: Boolean(coi?.declared),
          coiConflict: Boolean(coi?.hasConflict),
          deadline: panel.sessionDate,
          rubricId: panel.rubricId,
          criteriaTotal: rubric(panel.rubricId).criteria.length,
          criteriaScored: evaluation?.scores.length ?? 0,
          status: evaluation?.status ?? 'not_started',
        };
      });
    });
    return ok(emptyIfScenario(items));
  }),

  http.get('/api/coi/:applicationId', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const application = db.applications.find((a) => a.id === params.applicationId);
    if (!application) return notFound('That application');
    const startup = db.startups.find((s) => s.id === application.startupId)!;
    const declaration = db.coi.find((c) => c.applicationId === application.id && c.evaluatorId === user?.id);
    return ok({
      applicationId: application.id,
      applicationCaseId: application.caseId,
      // Enough to declare against, and nothing more.
      applicant: {
        legalName: startup.legalName,
        tradeName: startup.tradeName,
        state: startup.state,
        directors: ['Authorised signatory', 'Technical director'],
        investors: ['Seed fund, Mumbai', 'Angel syndicate'],
        relationships: [
          'Advisory board membership in the last twenty-four months',
          'Employment or consultancy in the last twenty-four months',
          'Financial interest, direct or through an immediate family member',
          'Joint publication or funded project in the last three years',
        ],
      },
      declaration: declaration ?? null,
    });
  }),

  http.post('/api/coi/:applicationId', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    if (!user || user.role !== 'evaluator') return fail(403, 'FORBIDDEN', 'Only an evaluator can record a declaration.');
    const body = await readBody<{ hasConflict: boolean; natureOfConflict?: string }>(request);
    if (body.hasConflict && (!body.natureOfConflict || body.natureOfConflict.trim().length < 15)) {
      return fail(422, 'VALIDATION_FAILED', 'A declared conflict needs its nature described.', [
        'Describe the relationship in at least 15 characters. The programme management unit reads this.',
      ]);
    }
    let declaration = db.coi.find((c) => c.applicationId === params.applicationId && c.evaluatorId === user.id);
    if (!declaration) {
      declaration = {
        id: `COI-${params.applicationId}-${user.id}`,
        evaluatorId: user.id,
        applicationId: String(params.applicationId),
        declared: false,
        hasConflict: false,
      };
      db.coi.push(declaration);
    }
    declaration.declared = true;
    declaration.hasConflict = body.hasConflict;
    declaration.natureOfConflict = body.natureOfConflict;
    declaration.declaredAt = db.now().toISOString();

    return ok(
      declaration,
      body.hasConflict
        ? 'Conflict recorded. You are recused from this application and the programme management unit has been notified.'
        : 'Declaration recorded. You can now open the proposal.',
    );
  }),

  http.get('/api/applications/:id/evaluation', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const application = db.applications.find((a) => a.id === params.id);
    if (!application) return notFound('That application');
    const coi = db.coi.find((c) => c.applicationId === application.id && c.evaluatorId === user?.id);

    if (user?.role === 'evaluator') {
      // No proposal content before the declaration is recorded.
      if (!coi?.declared) {
        return fail(403, 'COI_REQUIRED', 'Declare conflicts before opening this proposal.', [
          'You cannot see the applicant or the proposal until your declaration is recorded.',
        ]);
      }
      if (coi.hasConflict) {
        return fail(403, 'RECUSED', 'You are recused from this application.', [
          'A conflict was declared on the date recorded. The programme management unit has been notified.',
        ]);
      }
    }

    const own = db.evaluations.find((e) => e.applicationId === application.id && e.evaluatorId === user?.id);
    const all = db.evaluations.filter((e) => e.applicationId === application.id);
    const released = all.some((e) => e.released);

    return ok({
      application,
      challenge: db.challenges.find((c) => c.id === application.challengeId)!,
      rubric: rubric(db.challenges.find((c) => c.id === application.challengeId)!.rubricId),
      own: own ?? null,
      // Other evaluators' scores stay hidden until results are released.
      others: released ? all.filter((e) => e.evaluatorId !== user?.id) : [],
      othersHiddenCount: released ? 0 : all.filter((e) => e.evaluatorId !== user?.id).length,
      rationaleMinChars: policyNumber('evaluation.rationale.minChars'),
    });
  }),

  http.post('/api/evaluations', async ({ request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    if (!user || user.role !== 'evaluator') return fail(403, 'FORBIDDEN', 'Only an evaluator can score.');
    const body = await readBody<{ applicationId: string }>(request);
    const application = db.applications.find((a) => a.id === body.applicationId);
    if (!application) return notFound('That application');
    const coi = db.coi.find((c) => c.applicationId === application.id && c.evaluatorId === user.id);
    if (!coi?.declared || coi.hasConflict) {
      return fail(403, 'COI_REQUIRED', 'You cannot score this application.', [
        coi?.hasConflict ? 'You declared a conflict and are recused.' : 'Record your conflict declaration first.',
      ]);
    }
    const existing = db.evaluations.find((e) => e.applicationId === application.id && e.evaluatorId === user.id);
    if (existing) return ok(existing);

    const challenge = db.challenges.find((c) => c.id === application.challengeId)!;
    const created: Evaluation = {
      id: `EVL-${application.id}-${user.id}`,
      applicationId: application.id,
      evaluatorId: user.id,
      rubricId: challenge.rubricId,
      status: 'in_progress',
      scores: [],
      released: false,
    };
    db.evaluations.push(created);
    return ok(created);
  }),

  http.patch('/api/evaluations/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const evaluation = db.evaluations.find((e) => e.id === params.id);
    if (!evaluation) return notFound('That evaluation');
    if (evaluation.evaluatorId !== user?.id) {
      return fail(403, 'FORBIDDEN', 'You can only change your own scores.', [
        'A finalised evaluation cannot be edited by anyone, including the department.',
      ]);
    }
    if (evaluation.status === 'submitted') {
      return fail(409, 'EVALUATION_FINAL', 'This evaluation has been submitted and is final.', [
        'Submitted scores are part of the record. Ask the panel chair to note a correction in the minutes.',
      ]);
    }
    const body = await readBody<{ score: EvaluationScore }>(request);
    const min = policyNumber('evaluation.rationale.minChars');
    if (!body.score.rationale || body.score.rationale.trim().length < min) {
      return fail(422, 'RATIONALE_TOO_SHORT', 'A score needs a written reason.', [
        `Write at least ${min} characters explaining this score. A score without a reason is not defensible.`,
      ]);
    }
    const idx = evaluation.scores.findIndex((s) => s.criterionId === body.score.criterionId);
    if (idx >= 0) evaluation.scores[idx] = body.score;
    else evaluation.scores.push(body.score);
    evaluation.lastCriterionId = body.score.criterionId;
    evaluation.weightedTotal = weightedTotal(evaluation.rubricId, evaluation.scores);
    return ok(evaluation);
  }),

  http.post('/api/evaluations/:id/submit', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const evaluation = db.evaluations.find((e) => e.id === params.id);
    if (!evaluation) return notFound('That evaluation');
    if (evaluation.evaluatorId !== user?.id) return fail(403, 'FORBIDDEN', 'You can only submit your own evaluation.');
    // An evaluator cannot submit twice.
    if (evaluation.status === 'submitted') {
      return fail(409, 'ALREADY_SUBMITTED', 'You have already submitted this evaluation.', [
        `Submitted on the date recorded. Your weighted total was ${evaluation.weightedTotal ?? 0}.`,
      ]);
    }
    const def = rubric(evaluation.rubricId);
    const missing = def.criteria.filter((c) => !evaluation.scores.some((s) => s.criterionId === c.id));
    if (missing.length) {
      return fail(422, 'INCOMPLETE', 'Every criterion needs a score and a written reason.', [
        `Not yet scored: ${missing.map((m) => m.label).join(', ')}.`,
      ]);
    }
    evaluation.status = 'submitted';
    evaluation.submittedAt = db.now().toISOString();
    evaluation.weightedTotal = weightedTotal(evaluation.rubricId, evaluation.scores);
    return ok(evaluation, 'Evaluation submitted. It is final and cannot be edited.');
  }),

  http.get('/api/challenges/:id/evaluation', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const denied = requirePermission('view', 'evaluation');
    if (denied) return denied;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');
    const panel = db.panels.find((p) => p.challengeId === challenge.id);
    const applications = db.applications.filter(
      (a) => a.challengeId === challenge.id && ['shortlisted', 'under_evaluation', 'awarded', 'not_selected'].includes(a.status),
    );
    const evaluations = db.evaluations.filter((e) => applications.some((a) => a.id === e.applicationId));
    const threshold = policyNumber('evaluation.outlier.threshold');

    const scored = applications.map((a) => {
      const evals = evaluations.filter((e) => e.applicationId === a.id && e.status === 'submitted');
      const mean = evals.length ? evals.reduce((s, e) => s + (e.weightedTotal ?? 0), 0) / evals.length : 0;
      return {
        application: a,
        startup: db.startups.find((s) => s.id === a.startupId)!,
        evaluations: evals.map((e) => ({
          ...e,
          evaluatorName: db.users.find((u) => u.id === e.evaluatorId)?.name ?? 'Evaluator',
          deviation: Number(((e.weightedTotal ?? 0) - mean).toFixed(2)),
          isOutlier: Math.abs((e.weightedTotal ?? 0) - mean) > threshold,
        })),
        mean: Number(mean.toFixed(2)),
        complete: evals.length >= policyNumber('evaluation.minEvaluators'),
      };
    });
    scored.sort((a, b) => b.mean - a.mean);

    return ok({
      challenge,
      panel: panel ?? null,
      evaluators: (panel?.evaluatorIds ?? []).map((id) => {
        const u = db.users.find((x) => x.id === id)!;
        const declarations = db.coi.filter((c) => c.evaluatorId === id && applications.some((a) => a.id === c.applicationId));
        return {
          user: u,
          declaredCount: declarations.filter((d) => d.declared).length,
          conflictCount: declarations.filter((d) => d.hasConflict).length,
          totalAssigned: applications.length,
          submitted: evaluations.filter((e) => e.evaluatorId === id && e.status === 'submitted').length,
        };
      }),
      results: scored,
      outlierThreshold: threshold,
      minEvaluators: policyNumber('evaluation.minEvaluators'),
    });
  }),

  http.post('/api/panels/:id/release', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'gate');
    if (denied) return denied;
    const db = getDb();
    const panel = db.panels.find((p) => p.id === params.id);
    if (!panel) return notFound('That panel');
    if (!panel.minutes) {
      return fail(409, 'MINUTES_REQUIRED', 'Results cannot be released before the minutes are recorded.', [
        'The minutes are what makes the result defensible afterwards.',
      ]);
    }
    panel.resultsReleased = true;
    db.evaluations
      .filter((e) => db.applications.some((a) => a.id === e.applicationId && a.challengeId === panel.challengeId))
      .forEach((e) => {
        e.released = true;
      });
    return ok(panel, 'Results released. Scores and the rubric outcome are now visible to applicants and evaluators.');
  }),

  http.post('/api/panels/:id/minutes', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const panel = db.panels.find((p) => p.id === params.id);
    if (!panel) return notFound('That panel');
    const body = await readBody<{ minutes: string }>(request);
    if (!body.minutes || body.minutes.trim().length < 80) {
      return fail(422, 'VALIDATION_FAILED', 'Minutes could not be recorded.', [
        'Write at least 80 characters. The minutes are a gate 3 precondition.',
      ]);
    }
    panel.minutes = body.minutes;
    panel.minutesRecordedAt = db.now().toISOString();
    return ok(panel, 'Minutes recorded.');
  }),

  http.post('/api/panels/:id/consensus', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const panel = db.panels.find((p) => p.id === params.id);
    if (!panel) return notFound('That panel');
    // Only the panel chair records a consensus score.
    if (panel.chairEvaluatorId !== user?.id) {
      return fail(403, 'CHAIR_ONLY', 'Only the panel chair can record a consensus score.', [
        `The chair for this panel is ${db.users.find((u) => u.id === panel.chairEvaluatorId)?.name ?? 'unknown'}.`,
      ]);
    }
    const body = await readBody<{ applicationId: string; score: number; varianceNote: string }>(request);
    panel.consensus = panel.consensus ?? [];
    panel.consensus.push({
      applicationId: body.applicationId,
      score: body.score,
      varianceNote: body.varianceNote,
      recordedBy: user.name,
      at: db.now().toISOString(),
    });
    return ok(panel, 'Consensus score recorded.');
  }),

  http.post('/api/evaluations/:id/rationale-request', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const evaluation = db.evaluations.find((e) => e.id === params.id);
    if (!evaluation) return notFound('That evaluation');
    evaluation.outlier = { deviation: evaluation.outlier?.deviation ?? 0, rationaleRequested: true, rationale: evaluation.outlier?.rationale };
    return ok(evaluation, 'The evaluator has been asked to explain the score in writing.');
  }),
];
