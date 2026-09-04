import { http } from 'msw';
import { ELIGIBILITY_RULES } from '@/config/rules';
import { digest } from '@/lib/ids';
import type { Application, EligibilityResult } from '@/types/models';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { emptyIfScenario, fail, gate, notFound, ok, readBody, requirePermission } from './util';

function summarise(results: EligibilityResult[]): Application['eligibilitySummary'] {
  const effective = results.map((r) => r.override?.result ?? r.result);
  if (effective.some((r) => r === 'fail')) return 'auto_fail';
  if (effective.some((r) => r === 'review')) return 'needs_review';
  return effective.length === 0 ? 'not_run' : 'auto_pass';
}

export const applicationHandlers = [
  http.get('/api/challenges/:id/applications', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const denied = requirePermission('view', 'application');
    if (denied) return denied;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');
    const items = db.applications
      .filter((a) => a.challengeId === challenge.id && a.status !== 'draft')
      .map((a) => ({
        application: a,
        startup: db.startups.find((s) => s.id === a.startupId)!,
      }));
    return ok({ challenge, items: emptyIfScenario(items) });
  }),

  http.get('/api/applications', async ({ request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const url = new URL(request.url);
    const user = currentUser();
    let items = db.applications.slice();
    // A startup only ever sees its own applications, enforced here rather than in the UI.
    if (user?.role === 'startup') items = items.filter((a) => a.startupId === user.startupId);
    const challengeId = url.searchParams.get('challengeId');
    if (challengeId) items = items.filter((a) => a.challengeId === challengeId);
    return ok(
      emptyIfScenario(
        items.map((a) => ({
          application: a,
          challenge: db.challenges.find((c) => c.id === a.challengeId)!,
          startup: db.startups.find((s) => s.id === a.startupId)!,
        })),
      ),
    );
  }),

  http.get('/api/applications/:id', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const application = db.applications.find((a) => a.id === params.id || a.caseId === params.id);
    if (!application) return notFound('That application');
    const user = currentUser();
    if (user?.role === 'startup' && application.startupId !== user.startupId) {
      return fail(403, 'FORBIDDEN', 'You can only open your own applications.');
    }
    return ok({
      application,
      challenge: db.challenges.find((c) => c.id === application.challengeId)!,
      startup: db.startups.find((s) => s.id === application.startupId)!,
      evaluations: db.evaluations.filter((e) => e.applicationId === application.id),
      coi: db.coi.filter((c) => c.applicationId === application.id),
    });
  }),

  http.post('/api/challenges/:id/applications', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('create', 'application');
    if (denied) return denied;
    const db = getDb();
    const user = currentUser()!;
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');

    if (!['open', 'closing_soon'].includes(challenge.status)) {
      return fail(409, 'CHALLENGE_CLOSED', 'This challenge is not accepting applications.', [
        'Applications closed on the date shown in the challenge timeline.',
      ]);
    }

    // A startup cannot apply twice to the same challenge.
    const existing = db.applications.find((a) => a.challengeId === challenge.id && a.startupId === user.startupId);
    if (existing) {
      return fail(409, 'DUPLICATE_APPLICATION', 'You already have an application against this challenge.', [
        `Reference ${existing.caseId}. Open it to continue where you left off.`,
      ]);
    }

    const n = db.applications.length + 1;
    const created: Application = {
      id: `APP-NEW-${n}`,
      caseId: `APP-2026-${String(200 + n).padStart(4, '0')}`,
      challengeId: challenge.id,
      startupId: user.startupId!,
      status: 'draft',
      lastSavedAt: db.now().toISOString(),
      currentStep: 1,
      solution: { problemUnderstanding: '', approach: '', existingSolution: '', proposedDevelopment: '', trl: 5 },
      pilotPlan: {
        durationDays: challenge.pilot.durationDays,
        milestones: challenge.pilot.milestones.map((m) => ({
          name: m.name,
          deliverable: '',
          acceptanceTest: m.acceptanceTest,
          dayOffset: m.dueDayOffset,
        })),
        dependencies: [],
      },
      commercials: {
        milestoneCostsPaise: challenge.pilot.milestones.map(() => 0),
        totalPaise: 0,
        costBasis: '',
      },
      dataSecurity: {
        dataRequested: [],
        tier: 'synthetic',
        processingLocation: '',
        subProcessors: [],
        certifications: [],
      },
      declarations: {
        conflict: false,
        debarred: false,
        blacklisted: false,
        startupDeclaration: false,
      },
      eligibility: [],
      eligibilitySummary: 'not_run',
      documents: [],
      clarifications: [],
      timeline: [{ at: db.now().toISOString(), label: 'Draft started', actor: user.name }],
    };
    db.applications.push(created);
    return ok(created, `Draft ${created.caseId} started. It saves as you go.`);
  }),

  http.patch('/api/applications/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const application = db.applications.find((a) => a.id === params.id);
    if (!application) return notFound('That application');
    const user = currentUser();
    if (user?.role === 'startup' && application.startupId !== user.startupId) {
      return fail(403, 'FORBIDDEN', 'You can only edit your own application.');
    }
    if (application.status !== 'draft') {
      return fail(409, 'APPLICATION_SUBMITTED', 'A submitted application cannot be edited.', [
        'Evaluators score what was submitted. Ask the department for a clarification instead.',
      ]);
    }
    const body = await readBody<Partial<Application>>(request);
    Object.assign(application, body);
    application.lastSavedAt = db.now().toISOString();
    return ok(application);
  }),

  http.post('/api/applications/:id/submit', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const application = db.applications.find((a) => a.id === params.id);
    if (!application) return notFound('That application');
    const challenge = db.challenges.find((c) => c.id === application.challengeId)!;

    // The closing time is the server's, never the browser's.
    const closesOn = challenge.timeline.closesOn ? new Date(challenge.timeline.closesOn) : null;
    if (!closesOn || closesOn < db.now() || !['open', 'closing_soon'].includes(challenge.status)) {
      return fail(409, 'APPLICATIONS_CLOSED', 'Applications for this challenge are now closed.', [
        'Your draft has been preserved and can still be downloaded.',
      ]);
    }
    if (application.status !== 'draft') {
      return fail(409, 'ALREADY_SUBMITTED', 'This application has already been submitted.', [
        `Reference ${application.referenceNumber ?? application.caseId}.`,
      ]);
    }

    const missing: string[] = [];
    if (!application.solution.problemUnderstanding) missing.push('Step 2 — your understanding of the problem');
    if (!application.solution.approach) missing.push('Step 2 — your approach');
    if (application.commercials.totalPaise <= 0) missing.push('Step 4 — cost per milestone');
    if (!application.dataSecurity.processingLocation) missing.push('Step 5 — processing location');
    if (!application.declarations.signatureName) missing.push('Step 6 — signature');
    if (missing.length) {
      return fail(422, 'VALIDATION_FAILED', 'This application is not complete.', missing);
    }

    const startup = db.startups.find((s) => s.id === application.startupId)!;
    const now = db.now();
    application.eligibility = ELIGIBILITY_RULES.filter((r) => r.status === 'active').map((r) => {
      let result: EligibilityResult['result'] = 'pass';
      let evidence = 'Verified against the profile record held on file.';
      const relaxationApplied = r.relief === 'relaxable' && startup.dpiit.status === 'recognised' ? true : undefined;
      if (relaxationApplied) evidence = `Relaxed under ${r.citation} on a live recognition.`;
      if (r.id === 'R-REC-01' && startup.dpiit.status !== 'recognised') {
        result = 'review';
        evidence = 'Recognition is not current. Routed to a human for an explicit decision.';
      }
      if (r.id === 'R-CON-01' && (application.declarations.debarred || application.declarations.blacklisted)) {
        result = 'fail';
        evidence = 'Debarment or blacklisting declared in the application. This is not relaxable.';
      }
      if (r.id === 'R-GST-01' && startup.gstStatus !== 'active') {
        result = 'review';
        evidence = 'GST registration is not active. A live registration is needed to raise an invoice.';
      }
      return {
        ruleId: r.id,
        ruleVersion: r.version,
        result,
        evidence,
        citation: r.citation,
        evaluatedAt: now.toISOString(),
        relaxationApplied,
      };
    });
    application.eligibilitySummary = summarise(application.eligibility);
    application.status = 'submitted';
    application.submittedAt = now.toISOString();
    application.referenceNumber = `${challenge.caseId}/${application.caseId}`;
    application.timeline.push(
      { at: now.toISOString(), label: 'Application submitted', actor: startup.tradeName },
      {
        at: now.toISOString(),
        label:
          application.eligibilitySummary === 'auto_pass'
            ? 'Eligibility rules passed'
            : application.eligibilitySummary === 'auto_fail'
              ? 'Eligibility rules failed'
              : 'Eligibility routed to review',
        actor: 'Rule engine',
      },
    );
    challenge.applicantCount += 1;

    return ok(
      { application, receipt: { reference: application.referenceNumber, at: now.toISOString(), hash: digest(application.id) } },
      `Submitted. Your reference is ${application.referenceNumber}.`,
    );
  }),

  http.post('/api/applications/:id/eligibility/:ruleId/override', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('edit', 'application');
    if (denied) return denied;
    const db = getDb();
    const application = db.applications.find((a) => a.id === params.id);
    if (!application) return notFound('That application');
    const result = application.eligibility.find((e) => e.ruleId === params.ruleId);
    if (!result) return notFound('That rule result');

    const body = await readBody<{ result: EligibilityResult['result']; justification: string }>(request);
    // An override of an automated result always carries a written justification.
    if (!body.justification || body.justification.trim().length < 20) {
      return fail(422, 'JUSTIFICATION_REQUIRED', 'An override needs a written justification.', [
        'Write at least 20 characters explaining why the automated result is being changed. This becomes part of the audit record.',
      ]);
    }
    const user = currentUser()!;
    result.override = {
      result: body.result,
      justification: body.justification,
      by: user.name,
      at: db.now().toISOString(),
    };
    application.eligibilitySummary = summarise(application.eligibility);
    application.status =
      application.eligibilitySummary === 'auto_fail'
        ? 'ineligible'
        : application.eligibilitySummary === 'needs_review'
          ? 'needs_review'
          : 'eligible';

    db.audit.unshift({
      id: `AUD-OVR-${application.id}-${params.ruleId}-${db.audit.length}`,
      entityType: 'application',
      entityId: application.id,
      caseId: application.caseId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'eligibility.overridden',
      summary: `Rule ${params.ruleId} overridden to ${body.result}. ${body.justification}`,
      before: result.result,
      after: body.result,
      at: db.now().toISOString(),
      hash: digest(`${application.id}-${params.ruleId}-override`),
    });

    return ok(application, 'Override recorded with your written justification.');
  }),

  http.post('/api/applications/:id/decision', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'application');
    if (denied) return denied;
    const db = getDb();
    const application = db.applications.find((a) => a.id === params.id);
    if (!application) return notFound('That application');
    const body = await readBody<{ status: Application['status']; note?: string }>(request);
    application.status = body.status;
    application.timeline.push({
      at: db.now().toISOString(),
      label: `${body.status.replace(/_/g, ' ')}${body.note ? ` — ${body.note}` : ''}`,
      actor: currentUser()?.name ?? 'Department',
    });
    return ok(application, 'Decision recorded and the applicant has been told.');
  }),
];
