import { http } from 'msw';
import { addDays } from 'date-fns';
import { policyNumber } from '@/config/policies';
import { digest } from '@/lib/ids';
import type { Evidence, Kpi, Milestone, PaymentClaim } from '@/types/models';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { asScenarioGate, emptyIfScenario, fail, gate, notFound, ok, partialFailure, readBody, requirePermission } from './util';

export const pilotHandlers = [
  http.get('/api/pilots', async ({ request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const url = new URL(request.url);
    const user = currentUser();
    let items = db.pilots.slice();
    if (user?.role === 'startup') items = items.filter((p) => p.startupId === user.startupId);
    else if (user?.departmentId && url.searchParams.get('scope') !== 'all') {
      items = items.filter((p) => p.departmentId === user.departmentId);
    }
    if (user?.role === 'validator') {
      items = db.pilots.filter((p) => ['awaiting_validation', 'validated', 'not_validated'].includes(p.status));
    }
    return ok(
      emptyIfScenario(
        items.map((p) => ({
          pilot: p,
          startup: db.startups.find((s) => s.id === p.startupId)!,
          department: db.departments.find((d) => d.id === p.departmentId)!,
          milestones: db.milestones.filter((m) => m.pilotId === p.id),
          kpis: db.kpis.filter((k) => k.pilotId === p.id),
        })),
      ),
    );
  }),

  http.get('/api/pilots/:id', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.id || p.caseId === params.id);
    if (!pilot) return notFound('That pilot');
    const user = currentUser();
    if (user?.role === 'startup' && pilot.startupId !== user.startupId) {
      return fail(403, 'FORBIDDEN', 'You can only open your own pilots.');
    }
    return ok({
      pilot,
      challenge: db.challenges.find((c) => c.id === pilot.challengeId)!,
      startup: db.startups.find((s) => s.id === pilot.startupId)!,
      department: db.departments.find((d) => d.id === pilot.departmentId)!,
      contract: db.contracts.find((c) => c.pilotId === pilot.id) ?? null,
      milestones: db.milestones.filter((m) => m.pilotId === pilot.id).sort((a, b) => a.index - b.index),
      kpis: db.kpis.filter((k) => k.pilotId === pilot.id),
      evidence: db.evidence.filter((e) => e.pilotId === pilot.id),
      risks: db.risks.filter((r) => r.pilotId === pilot.id),
      incidents: db.incidents.filter((i) => i.pilotId === pilot.id),
      changeRequests: db.changeRequests.filter((c) => c.pilotId === pilot.id),
      claims: db.claims.filter((c) => c.pilotId === pilot.id),
      gates: db.gates.filter((g) => g.entityType === 'pilot' && g.entityId === pilot.id).map(asScenarioGate),
      validation: db.validations.find((v) => v.pilotId === pilot.id) ?? null,
      procurement: db.procurement.find((p2) => p2.pilotId === pilot.id) ?? null,
      scaleUp: db.scaleUps.find((s) => s.pilotId === pilot.id) ?? null,
    });
  }),

  http.get('/api/pilots/:id/milestones', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    return ok(db.milestones.filter((m) => m.pilotId === params.id).sort((a, b) => a.index - b.index));
  }),

  http.post('/api/pilots/:id/milestones', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('edit', 'pilot');
    if (denied) return denied;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.id);
    if (!pilot) return notFound('That pilot');
    const body = await readBody<Partial<Milestone>>(request);
    const existing = db.milestones.filter((m) => m.pilotId === pilot.id);

    const maxCount = policyNumber('pilot.milestone.maxCount');
    if (existing.length >= maxCount) {
      return fail(409, 'TOO_MANY_MILESTONES', 'This pilot already has the maximum number of milestones.', [
        `The configured maximum is ${maxCount}.`,
      ]);
    }
    // Milestone payments can never exceed the pilot budget.
    const committed = existing.reduce((s, m) => s + m.paymentPaise, 0) + (body.paymentPaise ?? 0);
    if (committed > pilot.budgetPaise) {
      return fail(409, 'BUDGET_EXCEEDED', 'Milestone payments cannot exceed the pilot budget.', [
        `Committed would be ₹${(committed / 100).toLocaleString('en-IN')} against a budget of ₹${(pilot.budgetPaise / 100).toLocaleString('en-IN')}.`,
      ]);
    }

    const created: Milestone = {
      id: `${pilot.id}-M${existing.length + 1}`,
      caseId: `${pilot.caseId}/M${existing.length + 1}`,
      pilotId: pilot.id,
      index: existing.length + 1,
      name: body.name ?? 'Untitled milestone',
      requirement: body.requirement ?? '',
      acceptanceTest: body.acceptanceTest ?? '',
      evidenceRequired: body.evidenceRequired ?? [],
      paymentPaise: body.paymentPaise ?? 0,
      dueOn: body.dueOn ?? addDays(db.now(), 30).toISOString(),
      status: 'not_started',
      evidenceIds: [],
    };
    db.milestones.push(created);
    return ok(created, 'Milestone added.');
  }),

  http.patch('/api/milestones/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const milestone = db.milestones.find((m) => m.id === params.id);
    if (!milestone) return notFound('That milestone');
    const pilot = db.pilots.find((p) => p.id === milestone.pilotId)!;
    const body = await readBody<Partial<Milestone>>(request);
    if (body.paymentPaise !== undefined) {
      const others = db.milestones
        .filter((m) => m.pilotId === pilot.id && m.id !== milestone.id)
        .reduce((s, m) => s + m.paymentPaise, 0);
      if (others + body.paymentPaise > pilot.budgetPaise) {
        return fail(409, 'BUDGET_EXCEEDED', 'Milestone payments cannot exceed the pilot budget.', [
          `That change would commit ₹${((others + body.paymentPaise) / 100).toLocaleString('en-IN')} against a budget of ₹${(pilot.budgetPaise / 100).toLocaleString('en-IN')}.`,
        ]);
      }
    }
    Object.assign(milestone, body);
    return ok(milestone);
  }),

  http.post('/api/milestones/:id/submit', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const milestone = db.milestones.find((m) => m.id === params.id);
    if (!milestone) return notFound('That milestone');
    const pilot = db.pilots.find((p) => p.id === milestone.pilotId)!;
    if (user?.role === 'startup' && pilot.startupId !== user.startupId) {
      return fail(403, 'FORBIDDEN', 'You can only submit evidence on your own pilot.');
    }
    if (milestone.status === 'approved' || milestone.status === 'paid') {
      return fail(409, 'ALREADY_ACCEPTED', 'This milestone has already been accepted.');
    }
    const body = await readBody<{ evidence: { fileName: string; type: string; sizeBytes: number }[] }>(request);
    if (!body.evidence?.length) {
      return fail(422, 'EVIDENCE_REQUIRED', 'Evidence is required to submit a milestone.', [
        `This milestone requires: ${milestone.evidenceRequired.join(', ')}.`,
      ]);
    }
    const now = db.now();
    body.evidence.forEach((file, i) => {
      const id = `EVD-${milestone.id}-${db.evidence.length + i}`;
      const record: Evidence = {
        id,
        pilotId: pilot.id,
        milestoneId: milestone.id,
        fileName: file.fileName,
        type: file.type,
        sizeBytes: file.sizeBytes,
        uploadedBy: user?.name ?? 'Startup',
        uploadedAt: now.toISOString(),
        hash: digest(id),
        // A real scan is asynchronous; this mirrors that.
        scan: 'pending',
        verification: 'pending',
        version: 1,
        access: 'restricted',
      };
      db.evidence.push(record);
      milestone.evidenceIds.push(id);
    });
    milestone.status = 'submitted';
    milestone.submittedOn = now.toISOString();
    return ok(milestone, 'Evidence submitted. The department has the configured review window to record a finding.');
  }),

  http.post('/api/evidence/:id/scan', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const record = db.evidence.find((e) => e.id === params.id);
    if (!record) return notFound('That file');
    record.scan = record.fileName.includes('.exe') ? 'failed' : 'clean';
    return ok(record);
  }),

  http.post('/api/milestones/:id/approve', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'milestone');
    if (denied) return denied;
    const db = getDb();
    const milestone = db.milestones.find((m) => m.id === params.id);
    if (!milestone) return notFound('That milestone');
    const body = await readBody<{ finding: 'met' | 'partially_met'; note: string }>(request);
    if (!body.note || body.note.trim().length < 20) {
      return fail(422, 'VALIDATION_FAILED', 'An acceptance needs a written finding.', [
        'Write at least 20 characters stating how the acceptance test was met.',
      ]);
    }
    const now = db.now();
    milestone.status = 'approved';
    milestone.acceptanceFinding = body.finding;
    milestone.reviewNote = body.note;
    milestone.acceptedOn = now.toISOString();
    db.evidence
      .filter((e) => e.milestoneId === milestone.id)
      .forEach((e) => {
        e.verification = 'verified';
        e.verifiedBy = currentUser()?.name;
        e.verifiedAt = now.toISOString();
      });

    // Acceptance is what starts the payment ageing clock.
    const pilot = db.pilots.find((p) => p.id === milestone.pilotId)!;
    const claim: PaymentClaim = {
      id: `CLM-${milestone.id}`,
      caseId: `CLM-2026-${String(200 + db.claims.length).padStart(4, '0')}`,
      pilotId: pilot.id,
      milestoneId: milestone.id,
      startupId: pilot.startupId,
      departmentId: pilot.departmentId,
      amountPaise: milestone.paymentPaise,
      deductionPaise: 0,
      netPaise: milestone.paymentPaise,
      acceptedOn: now.toISOString(),
      invoiceNumber: `INV/AUTO/2026/${db.claims.length + 1}`,
      invoiceOn: now.toISOString(),
      status: 'raised',
      approvalStep: 'With the department finance officer',
    };
    db.claims.push(claim);

    db.audit.unshift({
      id: `AUD-MST-${milestone.id}-${db.audit.length}`,
      entityType: 'pilot',
      entityId: pilot.id,
      caseId: pilot.caseId,
      actorId: currentUser()?.id ?? 'system',
      actorName: currentUser()?.name ?? 'System',
      actorRole: currentUser()?.role ?? 'department_admin',
      action: 'milestone.accepted',
      summary: `Milestone ${milestone.index} accepted (${body.finding.replace('_', ' ')}). ${body.note}`,
      before: 'Under review',
      after: 'Approved — payment ageing clock started',
      at: now.toISOString(),
      hash: digest(`${milestone.id}-accepted`),
    });

    return ok(
      { milestone, claim },
      `Milestone ${milestone.index} accepted. The payment clock has started against a ${policyNumber('payment.milestone.limit.days')}-day limit.`,
    );
  }),

  http.post('/api/milestones/:id/reject', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('reject', 'milestone');
    if (denied) return denied;
    const db = getDb();
    const milestone = db.milestones.find((m) => m.id === params.id);
    if (!milestone) return notFound('That milestone');
    const body = await readBody<{ note: string; revisionRequired?: boolean }>(request);
    if (!body.note || body.note.trim().length < 20) {
      return fail(422, 'VALIDATION_FAILED', 'A rejection must state the acceptance criteria that were not met.', [
        'Write at least 20 characters. The startup is entitled to know exactly what to fix.',
      ]);
    }
    milestone.status = body.revisionRequired ? 'revision_required' : 'rejected';
    milestone.acceptanceFinding = 'not_met';
    milestone.reviewNote = body.note;
    milestone.rejectedOn = db.now().toISOString();
    return ok(milestone, body.revisionRequired ? 'Returned for revision with your written findings.' : 'Rejected with written findings.');
  }),

  http.get('/api/pilots/:id/kpis', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const failure = partialFailure('the measurement panel');
    if (failure) return failure;
    const db = getDb();
    return ok(db.kpis.filter((k) => k.pilotId === params.id));
  }),

  http.post('/api/kpis/:id/update', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const kpi = db.kpis.find((k) => k.id === params.id);
    if (!kpi) return notFound('That KPI');
    const body = await readBody<{ value: number; sampleSize: number }>(request);
    kpi.series.push({ at: db.now().toISOString(), value: body.value, sampleSize: body.sampleSize });
    kpi.current = body.value;
    return ok(kpi, 'Reading recorded.');
  }),

  http.post('/api/pilots/:id/kpis', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const body = await readBody<Partial<Kpi>>(request);
    const created: Kpi = {
      id: `KPI-${params.id}-${db.kpis.length + 1}`,
      pilotId: String(params.id),
      name: body.name ?? 'Untitled measure',
      unit: body.unit ?? '',
      kind: body.kind ?? 'numeric',
      baseline: body.baseline ?? 0,
      target: body.target ?? 0,
      current: body.baseline ?? 0,
      direction: body.direction ?? 'decrease',
      method: body.method ?? '',
      frequency: body.frequency ?? 'Weekly',
      ownerId: currentUser()?.id ?? '',
      evidenceIds: [],
      series: [],
    };
    db.kpis.push(created);
    return ok(created, 'Measure added.');
  }),

  http.get('/api/pilots/:id/measurement', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const failure = partialFailure('the measurement chart');
    if (failure) return failure;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.id);
    if (!pilot) return notFound('That pilot');
    const kpis = db.kpis.filter((k) => k.pilotId === pilot.id);
    const attribution = db.audit.find((a) => a.entityId === pilot.id && a.action === 'measurement.attribution_recorded');
    return ok({
      pilot,
      kpis,
      dataQuality: kpis.map((k) => ({
        kpiId: k.id,
        expectedReadings: Math.round(pilot.durationDays / 7),
        actualReadings: k.series.length,
        missing: Math.max(0, Math.round(pilot.durationDays / 7) - k.series.length),
        outliers: k.series.filter((s) => Math.abs(s.value - k.current) > k.baseline * 0.4).length,
        gaps: k.series.length > 1 ? 0 : 1,
        note:
          k.series.length >= Math.round(pilot.durationDays / 7)
            ? 'Complete series for the measurement window.'
            : 'Some readings are missing. They are excluded rather than interpolated.',
      })),
      confounders: [
        'Two uninstrumented control zones showed no comparable movement over the same period.',
        'Seasonal demand seal 6 percent over the pilot window, which would push detection time up, not down.',
        'No change to crew establishment or shift pattern during the pilot.',
      ],
      attribution: attribution?.summary ?? null,
    });
  }),

  http.post('/api/pilots/:id/attribution', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.id);
    if (!pilot) return notFound('That pilot');
    const body = await readBody<{ explanation: string }>(request);
    if (!body.explanation || body.explanation.trim().length < 60) {
      return fail(422, 'VALIDATION_FAILED', 'Attribution needs a written explanation.', [
        'Write at least 60 characters explaining why the observed change is attributable to the pilot rather than to something else.',
      ]);
    }
    const user = currentUser();
    db.audit.unshift({
      id: `AUD-ATT-${pilot.id}-${db.audit.length}`,
      entityType: 'pilot',
      entityId: pilot.id,
      caseId: pilot.caseId,
      actorId: user?.id ?? 'system',
      actorName: user?.name ?? 'Department',
      actorRole: user?.role ?? 'department_officer',
      action: 'measurement.attribution_recorded',
      summary: body.explanation,
      at: db.now().toISOString(),
      hash: digest(`${pilot.id}-attribution`),
    });
    return ok({ recorded: true }, 'Attribution recorded. It is a gate 5 precondition.');
  }),

  http.post('/api/pilots/:id/risks', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const body = await readBody<{ title: string; category: string; probability: number; impact: number; mitigation: string }>(
      request,
    );
    const created = {
      id: `RSK-${params.id}-${db.risks.length + 1}`,
      pilotId: String(params.id),
      title: body.title,
      category: body.category as 'delivery',
      probability: body.probability as 1,
      impact: body.impact as 1,
      mitigation: body.mitigation,
      ownerId: currentUser()?.id ?? '',
      status: 'open' as const,
      reviewedOn: db.now().toISOString(),
    };
    db.risks.push(created);
    return ok(created, 'Risk added to the register.');
  }),

  http.patch('/api/risks/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const risk = db.risks.find((r) => r.id === params.id);
    if (!risk) return notFound('That risk');
    Object.assign(risk, await readBody<Record<string, unknown>>(request));
    risk.reviewedOn = db.now().toISOString();
    return ok(risk);
  }),

  http.patch('/api/incidents/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const incident = db.incidents.find((i) => i.id === params.id);
    if (!incident) return notFound('That incident');
    const body = await readBody<{ status: 'open' | 'contained' | 'resolved'; resolution?: string }>(request);
    if (body.status === 'resolved' && (!body.resolution || body.resolution.length < 20)) {
      return fail(422, 'VALIDATION_FAILED', 'Closing an incident needs a written resolution.', [
        'Write at least 20 characters describing what was done.',
      ]);
    }
    incident.status = body.status;
    incident.resolution = body.resolution;
    if (body.status === 'resolved') incident.resolvedAt = db.now().toISOString();
    return ok(incident, 'Incident updated.');
  }),

  http.post('/api/pilots/:id/change-requests', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const body = await readBody<{ title: string; reason: string; moneyPaise: number; days: number; scope: string }>(request);
    const created = {
      id: `CHG-${params.id}-${db.changeRequests.length + 1}`,
      pilotId: String(params.id),
      title: body.title,
      reason: body.reason,
      raisedBy: currentUser()?.name ?? 'Unknown',
      raisedOn: db.now().toISOString(),
      impact: { moneyPaise: body.moneyPaise, days: body.days, scope: body.scope },
      status: 'requested' as const,
    };
    db.changeRequests.push(created);
    return ok(created, 'Change request raised. It shows its impact on money, time and scope.');
  }),

  http.post('/api/change-requests/:id/decide', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'pilot');
    if (denied) return denied;
    const db = getDb();
    const change = db.changeRequests.find((c) => c.id === params.id);
    if (!change) return notFound('That change request');
    const body = await readBody<{ status: 'approved' | 'refused'; note: string }>(request);
    if (!body.note || body.note.length < 20) {
      return fail(422, 'VALIDATION_FAILED', 'A change decision needs a written reason.', [
        'Write at least 20 characters. This moves money and time.',
      ]);
    }
    change.status = body.status;
    change.decisionNote = body.note;
    change.decidedBy = currentUser()?.name;
    change.decidedOn = db.now().toISOString();
    if (body.status === 'approved') {
      const pilot = db.pilots.find((p) => p.id === change.pilotId);
      if (pilot) {
        pilot.budgetPaise += change.impact.moneyPaise;
        pilot.endsOn = addDays(new Date(pilot.endsOn), change.impact.days).toISOString();
        pilot.durationDays += change.impact.days;
      }
    }
    return ok(change, body.status === 'approved' ? 'Change approved. Budget and end date updated.' : 'Change refused with reasons.');
  }),
];
