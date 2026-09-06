import { http } from 'msw';
import { PATHWAYS } from '@/config/templates';
import { READINESS_WEIGHTS } from '@/config/rubrics';
import { policyNumber } from '@/config/policies';
import { digest } from '@/lib/ids';
import type { ReadinessComponent, ValidationReport } from '@/types/models';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { fail, gate, notFound, ok, readBody, requirePermission } from './util';
import { inReach } from './jurisdiction';

export const validationHandlers = [
  http.get('/api/pilots/:id/validation', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.id);
    if (!pilot) return notFound('That pilot');
    const report = db.validations.find((v) => v.pilotId === pilot.id) ?? null;
    return ok({
      pilot,
      report,
      challenge: db.challenges.find((c) => c.id === pilot.challengeId)!,
      startup: db.startups.find((s) => s.id === pilot.startupId)!,
      kpis: db.kpis.filter((k) => k.pilotId === pilot.id),
      milestones: db.milestones.filter((m) => m.pilotId === pilot.id),
      evidence: db.evidence.filter((e) => e.pilotId === pilot.id),
      incidents: db.incidents.filter((i) => i.pilotId === pilot.id),
      // The raw records a validator re-derives from, rather than a supplier dashboard.
      rawRecords: db.kpis
        .filter((k) => k.pilotId === pilot.id)
        .map((k) => ({
          kpiId: k.id,
          name: k.name,
          unit: k.unit,
          baseline: k.baseline,
          rows: k.series.map((s) => ({ at: s.at, value: s.value, sampleSize: s.sampleSize })),
          derived: {
            mean: Number((k.series.reduce((sum, s) => sum + s.value, 0) / Math.max(1, k.series.length)).toFixed(2)),
            totalSample: k.series.reduce((sum, s) => sum + s.sampleSize, 0),
            changePercent: Number((((k.current - k.baseline) / k.baseline) * 100).toFixed(1)),
          },
        })),
    });
  }),

  http.post('/api/pilots/:id/validation', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('create', 'validation');
    if (denied) return denied;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.id);
    if (!pilot) return notFound('That pilot');
    const body = await readBody<Partial<ValidationReport>>(request);
    let report = db.validations.find((v) => v.pilotId === pilot.id);
    if (!report) {
      report = {
        id: `VAL-${pilot.id}`,
        caseId: `VR-2026-${String(50 + db.validations.length).padStart(4, '0')}`,
        pilotId: pilot.id,
        validatorId: currentUser()?.id ?? '',
        status: 'in_progress',
        findings: [],
        rederivation: { records: '', reproduced: false, note: '' },
        securityAudit: { done: false, findingsOpen: 0, note: '' },
        dataAttestation: { signed: false, note: '' },
      };
      db.validations.push(report);
    }
    if (report.status === 'signed') {
      return fail(409, 'ALREADY_SIGNED', 'This validation report has been signed and cannot be changed.');
    }
    Object.assign(report, body, { status: 'in_progress' as const });
    return ok(report, 'Draft saved.');
  }),

  http.post('/api/validation/:id/sign', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('validate', 'validation');
    if (denied) return denied;
    const db = getDb();
    const report = db.validations.find((v) => v.id === params.id);
    if (!report) return notFound('That validation report');
    if (report.status === 'signed') return fail(409, 'ALREADY_SIGNED', 'This report has already been signed.');
    const body = await readBody<{ outcome: ValidationReport['outcome']; qualifications?: string }>(request);
    const pilot = db.pilots.find((p) => p.id === report.pilotId)!;

    // Every success criterion needs a finding before a report can be signed.
    const missing = pilot.successCriteria.filter((c) => !report.findings.some((f) => f.criterion === c));
    if (missing.length > 0) {
      return fail(422, 'FINDINGS_INCOMPLETE', 'Every success criterion needs a finding.', missing);
    }
    if (body.outcome === 'validated_with_qualifications' && !body.qualifications) {
      return fail(422, 'QUALIFICATIONS_REQUIRED', 'Qualifications must be written down.', [
        'State exactly what qualifies the validation, so a reader knows what was and was not proved.',
      ]);
    }

    const now = db.now();
    report.outcome = body.outcome;
    report.qualifications = body.qualifications;
    report.status = 'signed';
    report.signedAt = now.toISOString();
    report.hash = digest(`${report.id}-${now.toISOString()}`);
    report.publishedSummary =
      body.outcome === 'validated'
        ? 'Outcome achieved and independently reproduced from raw records.'
        : body.outcome === 'validated_with_qualifications'
          ? `Outcome achieved with qualifications. ${body.qualifications ?? ''}`
          : 'The claimed outcome could not be reproduced from the raw records. Not validated.';

    pilot.status = body.outcome === 'not_validated' ? 'not_validated' : 'validated';

    db.audit.unshift({
      id: `AUD-VAL-${report.id}-${db.audit.length}`,
      entityType: 'pilot',
      entityId: pilot.id,
      caseId: pilot.caseId,
      actorId: currentUser()?.id ?? '',
      actorName: currentUser()?.name ?? 'Validator',
      actorRole: 'validator',
      action: 'validation.signed',
      summary: `Validation signed. Outcome: ${body.outcome?.replace(/_/g, ' ')}.`,
      after: body.outcome,
      at: now.toISOString(),
      hash: report.hash,
    });

    return ok(report, 'Validation report signed and published with its checksum.');
  }),

  http.get('/api/procurement', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    return ok(
      inReach(db.procurement, (p) => {
        const pilot = db.pilots.find((x) => x.id === p.pilotId);
        return { departmentId: pilot?.departmentId, startupId: pilot?.startupId };
      }).map((p) => ({
        procurement: p,
        pilot: db.pilots.find((x) => x.id === p.pilotId)!,
        validation: db.validations.find((v) => v.pilotId === p.pilotId) ?? null,
      })),
    );
  }),

  http.get('/api/procurement/:pilotId', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.pilotId);
    if (!pilot) return notFound('That pilot');
    let record = db.procurement.find((p) => p.pilotId === pilot.id);
    const validation = db.validations.find((v) => v.pilotId === pilot.id);

    if (!record) {
      // Readiness is computed from published components, never asserted as a single number.
      const kpis = db.kpis.filter((k) => k.pilotId === pilot.id);
      const milestones = db.milestones.filter((m) => m.pilotId === pilot.id);
      const components: ReadinessComponent[] = READINESS_WEIGHTS.map((w) => {
        let raw = 60;
        if (w.key === 'kpi' && kpis.length) {
          const achievement =
            kpis.reduce((sum, k) => {
              const span = Math.abs(k.baseline - k.target) || 1;
              const gained = Math.abs(k.baseline - k.current);
              return sum + Math.min(1, gained / span);
            }, 0) / kpis.length;
          raw = Math.round(achievement * 100);
        }
        if (w.key === 'technical' && milestones.length) {
          const met = milestones.filter((m) => m.acceptanceFinding === 'met').length;
          const partial = milestones.filter((m) => m.acceptanceFinding === 'partially_met').length;
          raw = Math.round(((met + partial * 0.5) / milestones.length) * 100);
        }
        if (w.key === 'security') {
          raw = validation?.securityAudit.findingsOpen === 0 ? 100 : 45;
        }
        return {
          key: w.key,
          label: w.label,
          weightPercent: w.weightPercent,
          rawScore: raw,
          weighted: Number(((raw * w.weightPercent) / 100).toFixed(1)),
          basis: w.basis,
          evidence: 'Computed from the pilot record.',
        };
      });
      record = {
        id: `PRC-${pilot.id}`,
        caseId: `PC-2026-${String(60 + db.procurement.length).padStart(4, '0')}`,
        pilotId: pilot.id,
        readiness: {
          total: Number(components.reduce((s, c) => s + c.weighted, 0).toFixed(0)),
          components,
          computedAt: db.now().toISOString(),
        },
        status: 'assessing',
      };
      db.procurement.push(record);
    }

    const threshold = policyNumber('procurement.readiness.recommendThreshold');
    // Advisory ranking of pathways. The officer's justification is the decision.
    const advice = PATHWAYS.map((p) => {
      const validated = validation?.outcome === 'validated';
      let fit = 0;
      if (p.id === 'gem-listing' && validated && record!.readiness.total >= threshold) fit += 3;
      if (p.id === 'limited-tender' && record!.readiness.total >= threshold) fit += 2;
      if (p.id === 'single-source' && validated && record!.readiness.total >= 90) fit += 2;
      if (p.id === 'innovation-partnership' && validation?.outcome === 'validated_with_qualifications') fit += 3;
      if (p.id === 'close' && validation?.outcome === 'not_validated') fit += 4;
      if (p.id === 'open-tender' && (record!.vfm?.savingPercent ?? 0) < policyNumber('procurement.vfm.minSavingPercent')) fit += 1;
      return { pathway: p, fit };
    }).sort((a, b) => b.fit - a.fit);

    return ok({
      procurement: record,
      pilot,
      validation: validation ?? null,
      challenge: db.challenges.find((c) => c.id === pilot.challengeId)!,
      startup: db.startups.find((s) => s.id === pilot.startupId)!,
      scaleUp: db.scaleUps.find((s) => s.pilotId === pilot.id) ?? null,
      advice,
      recommended: advice[0]?.pathway ?? null,
      threshold,
      vfmMinSaving: policyNumber('procurement.vfm.minSavingPercent'),
    });
  }),

  http.post('/api/procurement/:pilotId/pathway', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'procurement');
    if (denied) return denied;
    const db = getDb();
    const record = db.procurement.find((p) => p.pilotId === params.pilotId);
    if (!record) return notFound('That procurement case');
    const body = await readBody<{ pathwayId: string; justification: string; reasonsAgainst: string }>(request);
    if (!PATHWAYS.some((p) => p.id === body.pathwayId)) {
      return fail(422, 'UNKNOWN_PATHWAY', 'That is not a configured procurement pathway.');
    }
    if (!body.justification || body.justification.trim().length < 80) {
      return fail(422, 'JUSTIFICATION_REQUIRED', 'A pathway decision needs a written justification.', [
        'Write at least 80 characters against the rule that permits this pathway. The recommendation is advisory; this is the decision.',
      ]);
    }
    if (!body.reasonsAgainst || body.reasonsAgainst.trim().length < 30) {
      return fail(422, 'REASONS_AGAINST_REQUIRED', 'Record the case against this pathway too.', [
        'Writing down the counter-argument is what makes the decision defensible later. At least 30 characters.',
      ]);
    }
    record.pathwayId = body.pathwayId;
    record.pathwayJustification = body.justification;
    record.reasonsAgainst = body.reasonsAgainst;
    record.decidedBy = currentUser()?.name;
    record.decidedOn = db.now().toISOString();
    record.status = 'decided';
    return ok(record, 'Pathway recorded with your justification and the reasons against.');
  }),

  http.post('/api/procurement/:pilotId/generate-package', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('export', 'procurement');
    if (denied) return denied;
    const db = getDb();
    const pilot = db.pilots.find((p) => p.id === params.pilotId);
    if (!pilot) return notFound('That pilot');
    const record = db.procurement.find((p) => p.pilotId === pilot.id);
    if (!record?.pathwayJustification) {
      return fail(409, 'PATHWAY_REQUIRED', 'Select a pathway and write the justification first.', [
        'The package is built around the pathway note.',
      ]);
    }
    let scaleUp = db.scaleUps.find((s) => s.pilotId === pilot.id);
    const contents = [
      'Challenge document as published, with the baseline method',
      'Eligibility rule set and the version in force at award',
      'Evaluation rubric with anchored descriptors',
      'Pilot agreement with the deviations recorded',
      'Milestone schedule and acceptance tests',
      'Measurement plan, sample sizes and confounder list',
      'Independent validation report with its checksum',
      'Security audit summary and data attestation',
      'Pathway note and value-for-money analysis',
    ];
    if (!scaleUp) {
      scaleUp = {
        id: `SCL-${pilot.id}`,
        caseId: `SC-2026-${String(20 + db.scaleUps.length).padStart(4, '0')}`,
        procurementCaseId: record.id,
        pilotId: pilot.id,
        districts: [],
        projectedValuePaise: pilot.budgetPaise * 16,
        replicationPackage: {
          generatedOn: db.now().toISOString(),
          contents,
          hash: digest(`${pilot.id}-package`),
        },
        status: 'planned',
      };
      db.scaleUps.push(scaleUp);
    } else {
      scaleUp.replicationPackage = {
        generatedOn: db.now().toISOString(),
        contents,
        hash: digest(`${pilot.id}-package-${db.now().toISOString()}`),
      };
    }
    record.packageGeneratedOn = db.now().toISOString();
    record.status = 'package_ready';
    return ok(scaleUp, `Replication package generated with ${contents.length} artefacts and a checksum.`);
  }),

  http.post('/api/scale/:pilotId', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const scaleUp = db.scaleUps.find((s) => s.pilotId === params.pilotId);
    if (!scaleUp) return notFound('That scale-up case');
    const body = await readBody<{ districts: string[]; projectedValuePaise: number }>(request);
    scaleUp.districts = body.districts;
    scaleUp.projectedValuePaise = body.projectedValuePaise;
    scaleUp.status = 'in_progress';
    return ok(scaleUp, `Scale-up planned across ${body.districts.length} districts.`);
  }),
];
