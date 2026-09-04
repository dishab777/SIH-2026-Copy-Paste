import { http } from 'msw';
import { addDays } from 'date-fns';
import { GATES, type GateId } from '@/config/gates';
import { policyNumber } from '@/config/policies';
import { ELIGIBILITY_RULES } from '@/config/rules';
import { digest } from '@/lib/ids';
import type { Challenge, GateRecord, SolutionLanguageFlag } from '@/types/models';
import { scenario } from '../scenarios';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { asScenarioGate, emptyIfScenario, fail, gate, notFound, ok, readBody, requirePermission } from './util';

const VENDOR_PATTERNS: readonly { pattern: RegExp; kind: SolutionLanguageFlag['kind']; why: string }[] = [
  {
    pattern: /\b(oracle|sap|microsoft|azure|aws|google cloud|salesforce|ibm|cisco|siemens|honeywell|schneider)\b/gi,
    kind: 'vendor_name',
    why: 'A named supplier in the challenge tells applicants which product to build against, and narrows the field before anyone has proposed anything.',
  },
  {
    pattern:
      /\b(blockchain|machine learning platform|deep learning|LoRaWAN|SCADA historian|digital twin platform|acoustic correlator loggers?|RFID tags?|drone fleet)\b/gi,
    kind: 'technology_prescription',
    why: 'Naming the technology decides the solution. Gate 1 requires an outcome-based challenge, not a specification.',
  },
  {
    pattern: /\b(must use|shall deploy|is required to install|only solutions using|vendor must supply)\b/gi,
    kind: 'solution_specific',
    why: 'Prescriptive wording turns an outcome into a specification, which is what gate 1 tests for.',
  },
];

function runLanguageCheck(challenge: Challenge): SolutionLanguageFlag[] {
  const sections: { section: string; fieldPath: string; text: string }[] = [
    { section: 'The problem', fieldPath: 'problem.whatHappensToday', text: challenge.problem.whatHappensToday },
    { section: 'The problem', fieldPath: 'problem.currentLimitations', text: challenge.problem.currentLimitations },
    { section: 'Outcome sought', fieldPath: 'outcome.statement', text: challenge.outcome.statement },
    { section: 'Outcome sought', fieldPath: 'outcome.method', text: challenge.outcome.method },
    {
      section: 'What the department provides',
      fieldPath: 'departmentProvides.systems',
      text: challenge.departmentProvides.systems.join(', '),
    },
    { section: 'What the department provides', fieldPath: 'departmentProvides.data', text: challenge.departmentProvides.data },
  ];

  const flags: SolutionLanguageFlag[] = [];
  sections.forEach((s) => {
    VENDOR_PATTERNS.forEach((p) => {
      const matches = s.text.match(p.pattern);
      if (!matches) return;
      matches.forEach((m) => {
        const id = `FLAG-${challenge.caseId}-${digest(`${s.fieldPath}-${m}`).slice(0, 6)}`;
        if (flags.some((f) => f.id === id)) return;
        const existing = challenge.languageFlags.find((f) => f.id === id);
        flags.push({
          id,
          section: s.section,
          fieldPath: s.fieldPath,
          matchedText: m,
          kind: p.kind,
          why: p.why,
          suggestion:
            p.kind === 'vendor_name'
              ? `Describe the capability instead of the supplier. For example: "a system of this type, with a documented read-only interface".`
              : p.kind === 'technology_prescription'
                ? `State the outcome you need rather than the method. For example: "${challenge.outcome.statement}"`
                : `Rewrite as an outcome the department will measure, not an instruction about how to build it.`,
          status: existing?.status ?? 'open',
          dismissReason: existing?.dismissReason,
        });
      });
    });
  });
  // Preserve any flags the author has already resolved, so history is not lost.
  challenge.languageFlags
    .filter((f) => f.status !== 'open' && !flags.some((n) => n.id === f.id))
    .forEach((f) => flags.push(f));
  return flags;
}

export function evaluatePreconditions(
  entity: Challenge | { id: string },
  gateId: GateId,
): { key: string; result: 'pass' | 'fail' | 'review'; note: string; evidenceIds: string[] }[] {
  const db = getDb();
  const def = GATES.find((g) => g.id === gateId)!;
  const challenge = db.challenges.find((c) => c.id === entity.id);

  return def.preconditions.map((p) => {
    let result: 'pass' | 'fail' | 'review' = 'pass';
    let note = 'Verified against the record on file.';

    if (challenge) {
      switch (p.key) {
        case 'baseline':
          result = challenge.baseline.currentValue > 0 && challenge.baseline.method ? 'pass' : 'fail';
          note = result === 'pass'
            ? `${challenge.baseline.currentValue} ${challenge.baseline.unit}, measured by ${challenge.baseline.method}`
            : 'No baseline value or measurement method recorded.';
          break;
        case 'budget':
          result = challenge.pilot.budgetPaise > 0 && challenge.pilot.budgetHead ? 'pass' : 'fail';
          note = result === 'pass' ? challenge.pilot.budgetHead : 'No budget head assigned.';
          break;
        case 'outcomeKpi':
          result = challenge.kpis.length > 0 ? 'pass' : 'fail';
          note = result === 'pass'
            ? `${challenge.kpis.length} outcome KPI recorded with a failure threshold.`
            : 'No outcome KPI recorded.';
          break;
        case 'legalPreClearance':
          result = challenge.legal.legalPreClearance ? 'pass' : 'fail';
          note = challenge.legal.legalPreClearanceNote ?? 'Not recorded.';
          break;
        case 'noVendorNaming': {
          const open = challenge.languageFlags.filter((f) => f.status === 'open');
          result = open.length === 0 ? 'pass' : 'fail';
          note = open.length === 0
            ? 'Language check returns no unresolved flags.'
            : `${open.length} unresolved flag${open.length === 1 ? '' : 's'}: ${open.map((f) => `"${f.matchedText}" in ${f.section}`).join('; ')}`;
          break;
        }
        case 'ipWithinDefault':
          result = challenge.legal.ipPosition === 'startup_retains' ? 'pass' : 'review';
          note = challenge.legal.ipPosition === 'startup_retains'
            ? 'Startup retains its IP; government takes a purpose licence. This is the default position.'
            : 'A non-default IP position needs the approval level recorded against the clause.';
          break;
        case 'templatesAttached':
          result = challenge.legal.templateId ? 'pass' : 'fail';
          note = challenge.legal.templateId
            ? `Pilot agreement ${challenge.legal.templateId}, rubric ${challenge.rubricId}.`
            : 'No pilot agreement template attached.';
          break;
        case 'ruleEngineComplete': {
          const apps = db.applications.filter((a) => a.challengeId === challenge.id && a.status !== 'draft');
          const missing = apps.filter((a) => a.eligibility.length === 0);
          result = apps.length > 0 && missing.length === 0 ? 'pass' : apps.length === 0 ? 'fail' : 'fail';
          note = apps.length === 0
            ? 'No submitted applications to screen.'
            : `${apps.length - missing.length} of ${apps.length} applications carry an automated result.`;
          break;
        }
        case 'overridesDocumented': {
          const apps = db.applications.filter((a) => a.challengeId === challenge.id);
          const undocumented = apps.flatMap((a) => a.eligibility.filter((e) => e.override && !e.override.justification));
          result = undocumented.length === 0 ? 'pass' : 'fail';
          note = undocumented.length === 0
            ? 'Every override carries a written justification.'
            : `${undocumented.length} override${undocumented.length === 1 ? '' : 's'} without a written justification.`;
          break;
        }
        case 'needsReviewCleared': {
          const pending = db.applications.filter(
            (a) => a.challengeId === challenge.id && a.status === 'needs_review',
          );
          result = pending.length === 0 ? 'pass' : 'fail';
          note = pending.length === 0
            ? 'No application is left in needs review.'
            : `${pending.length} application${pending.length === 1 ? '' : 's'} still in needs review. Each needs an explicit decision.`;
          break;
        }
        case 'coiCleared': {
          const apps = db.applications.filter((a) => a.challengeId === challenge.id && a.status !== 'draft');
          const undeclared = db.coi.filter((c) => apps.some((a) => a.id === c.applicationId) && !c.declared);
          result = undeclared.length === 0 ? 'pass' : 'fail';
          note = undeclared.length === 0
            ? 'Every scoring evaluator has declared.'
            : `${undeclared.length} conflict declaration${undeclared.length === 1 ? '' : 's'} outstanding.`;
          break;
        }
        case 'scoringComplete': {
          const minEval = policyNumber('evaluation.minEvaluators');
          const shortlisted = db.applications.filter(
            (a) => a.challengeId === challenge.id && ['shortlisted', 'awarded', 'not_selected'].includes(a.status),
          );
          const short = shortlisted.filter(
            (a) => db.evaluations.filter((e) => e.applicationId === a.id && e.status === 'submitted').length < minEval,
          );
          result = shortlisted.length > 0 && short.length === 0 ? 'pass' : 'fail';
          note = shortlisted.length === 0
            ? 'No shortlisted applications.'
            : short.length === 0
              ? `All ${shortlisted.length} shortlisted applications carry at least ${minEval} completed scores.`
              : `${short.length} application${short.length === 1 ? '' : 's'} below the minimum of ${minEval} completed scores.`;
          break;
        }
        case 'minutesRecorded': {
          const panel = db.panels.find((p) => p.challengeId === challenge.id);
          result = panel?.minutes ? 'pass' : 'fail';
          note = panel?.minutes ? 'Evaluation minutes recorded.' : 'No evaluation minutes recorded.';
          break;
        }
        default:
          break;
      }
    }

    // Pilot-side preconditions.
    const pilot = db.pilots.find((p) => p.id === entity.id);
    if (pilot) {
      switch (p.key) {
        case 'milestoneEvidenceReviewed': {
          const ms = db.milestones.filter((m) => m.pilotId === pilot.id);
          const pendingReview = ms.filter((m) => m.status === 'submitted' || m.status === 'under_review');
          result = pendingReview.length === 0 ? 'pass' : 'fail';
          note = pendingReview.length === 0
            ? `All ${ms.length} milestones carry an explicit finding.`
            : `${pendingReview.length} milestone${pendingReview.length === 1 ? '' : 's'} awaiting a met, partially met or not met finding.`;
          break;
        }
        case 'riskRegisterReviewed': {
          const rs = db.risks.filter((r) => r.pilotId === pilot.id);
          const stale = rs.filter((r) => r.status !== 'closed' && !r.ownerId);
          result = rs.length > 0 && stale.length === 0 ? 'pass' : rs.length === 0 ? 'fail' : 'fail';
          note = rs.length === 0 ? 'No risk register on this pilot.' : `${rs.length} risks, each with an owner and a review date.`;
          break;
        }
        case 'incidentsResolved': {
          const open = db.incidents.filter((i) => i.pilotId === pilot.id && i.severity === 'high' && i.status === 'open');
          result = open.length === 0 ? 'pass' : 'fail';
          note = open.length === 0
            ? 'No unresolved high-severity incident.'
            : `${open.length} high-severity incident${open.length === 1 ? '' : 's'} open.`;
          break;
        }
        case 'baselineVsPilot': {
          const ks = db.kpis.filter((k) => k.pilotId === pilot.id);
          result = ks.length > 0 && ks.every((k) => k.series.length > 0) ? 'pass' : 'fail';
          note = `${ks.length} KPI series measured across the pilot period against the published baseline.`;
          break;
        }
        case 'securityAudit': {
          const v = db.validations.find((x) => x.pilotId === pilot.id);
          result = v?.securityAudit.done && v.securityAudit.findingsOpen === 0 ? 'pass' : v?.securityAudit.done ? 'review' : 'fail';
          note = v?.securityAudit.note ?? 'No security audit on file.';
          break;
        }
        case 'dataAttestation': {
          const v = db.validations.find((x) => x.pilotId === pilot.id);
          result = v?.dataAttestation.signed ? 'pass' : 'fail';
          note = v?.dataAttestation.note ?? 'No data-handling attestation on file.';
          break;
        }
        case 'attribution': {
          const attributed = db.audit.some(
            (a) => a.entityId === pilot.id && a.action === 'measurement.attribution_recorded',
          );
          result = attributed ? 'pass' : 'fail';
          note = attributed
            ? 'Attribution explained in writing on the measurement screen.'
            : 'The department has not yet explained why the change is attributable to the pilot.';
          break;
        }
        case 'pathwayNote': {
          const pc = db.procurement.find((x) => x.pilotId === pilot.id);
          result = pc?.pathwayJustification ? 'pass' : 'fail';
          note = pc?.pathwayJustification
            ? 'Pathway justification written.'
            : 'No pathway note. Select a pathway and write the justification.';
          break;
        }
        case 'vfm': {
          const pc = db.procurement.find((x) => x.pilotId === pilot.id);
          result = pc?.vfm ? 'pass' : 'fail';
          note = pc?.vfm
            ? `${pc.vfm.savingPercent.toFixed(1)} percent against the closest market alternative. ${pc.vfm.note}`
            : 'No value-for-money analysis attached.';
          break;
        }
        case 'replicationPackage': {
          const sc = db.scaleUps.find((x) => x.pilotId === pilot.id);
          result = sc ? 'pass' : 'fail';
          note = sc
            ? `${sc.replicationPackage.contents.length} artefacts packaged on ${sc.replicationPackage.generatedOn.slice(0, 10)}.`
            : 'No replication package generated.';
          break;
        }
        default:
          break;
      }
    }

    if (scenario() === 'rejected_gate' && p.key === def.preconditions[0]!.key) {
      result = 'fail';
      note = 'Scenario switcher is set to rejected gate.';
    }

    return { key: p.key, result, note, evidenceIds: [] };
  });
}

export const challengeHandlers = [
  http.get('/api/challenges', async ({ request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const url = new URL(request.url);
    const user = currentUser();
    const isPublicView = url.searchParams.get('view') === 'public';

    let items = db.challenges.slice();
    if (isPublicView) {
      items = items.filter((c) => ['open', 'closing_soon', 'closed', 'awarded'].includes(c.status));
    } else if (user?.departmentId && url.searchParams.get('scope') === 'department') {
      items = items.filter((c) => c.departmentId === user.departmentId);
    }

    const q = url.searchParams.get('q')?.toLowerCase();
    if (q) {
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.caseId.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q) ||
          c.capabilities.some((cap) => cap.toLowerCase().includes(q)),
      );
    }
    const sector = url.searchParams.getAll('sector');
    if (sector.length) items = items.filter((c) => sector.includes(c.sector));
    const state = url.searchParams.getAll('state');
    if (state.length) items = items.filter((c) => state.includes(c.state));
    const district = url.searchParams.getAll('district');
    if (district.length) items = items.filter((c) => district.includes(c.district));
    const dept = url.searchParams.getAll('department');
    if (dept.length) items = items.filter((c) => dept.includes(c.departmentId));
    const capability = url.searchParams.getAll('capability');
    if (capability.length) items = items.filter((c) => c.capabilities.some((x) => capability.includes(x)));
    const status = url.searchParams.getAll('status');
    if (status.length) items = items.filter((c) => status.includes(c.status));
    const minBudget = url.searchParams.get('minBudget');
    if (minBudget) items = items.filter((c) => c.pilot.budgetPaise >= Number(minBudget) * 100);
    const maxBudget = url.searchParams.get('maxBudget');
    if (maxBudget) items = items.filter((c) => c.pilot.budgetPaise <= Number(maxBudget) * 100);
    const closingWithin = url.searchParams.get('closingWithin');
    if (closingWithin) {
      const limit = addDays(db.now(), Number(closingWithin));
      items = items.filter((c) => c.timeline.closesOn && new Date(c.timeline.closesOn) <= limit);
    }
    if (url.searchParams.get('relaxation') === 'true') {
      items = items.filter((c) => c.eligibility.relaxationsAvailable);
    }

    const sort = url.searchParams.get('sort') ?? 'closing';
    items.sort((a, b) => {
      switch (sort) {
        case 'budget':
          return b.pilot.budgetPaise - a.pilot.budgetPaise;
        case 'newest':
          return (b.timeline.publishedOn ?? b.timeline.createdOn) < (a.timeline.publishedOn ?? a.timeline.createdOn) ? -1 : 1;
        case 'fewest':
          return a.applicantCount - b.applicantCount;
        default: {
          // Challenges still accepting applications come first; a closed window
          // is not "closing soonest", it has already gone.
          const live = (x: typeof a): number => (x.status === 'open' || x.status === 'closing_soon' ? 0 : 1);
          if (live(a) !== live(b)) return live(a) - live(b);
          return (a.timeline.closesOn ?? '9999') < (b.timeline.closesOn ?? '9999') ? -1 : 1;
        }
      }
    });

    return ok(emptyIfScenario(items));
  }),

  http.get('/api/challenges/:id', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const id = String(params.id);
    const challenge = db.challenges.find((c) => c.id === id || c.slug === id || c.caseId === id);
    if (!challenge) return notFound('That challenge');
    return ok({
      challenge,
      department: db.departments.find((d) => d.id === challenge.departmentId),
      owner: db.users.find((u) => u.id === challenge.ownerId),
      clarifications: db.clarifications.filter((q) => q.challengeId === challenge.id),
      gates: db.gates.filter((g) => g.entityType === 'challenge' && g.entityId === challenge.id).map(asScenarioGate),
      pilot: db.pilots.find((p) => p.challengeId === challenge.id) ?? null,
    });
  }),

  http.post('/api/challenges', async ({ request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('create', 'challenge');
    if (denied) return denied;
    const db = getDb();
    const user = currentUser()!;
    const body = await readBody<Partial<Challenge>>(request);

    const nextNumber = db.challenges.length + 130;
    const caseId = `CH-2026-${String(nextNumber + 1).padStart(4, '0')}`;
    const base = db.challenges[0]!;
    const created: Challenge = {
      ...structuredClone(base),
      ...body,
      id: `CHL-NEW-${db.challenges.length + 1}`,
      caseId,
      slug: (body.title ?? 'untitled-challenge').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: body.title ?? 'Untitled challenge',
      departmentId: user.departmentId ?? base.departmentId,
      ownerId: user.id,
      status: 'draft',
      currentGate: 'G0',
      applicantCount: 0,
      languageFlags: [],
      waiver: undefined,
      blocked: undefined,
      timeline: { createdOn: db.now().toISOString() },
      gateEnteredOn: db.now().toISOString(),
      changeLog: [
        { at: db.now().toISOString(), by: user.name, summary: 'Draft created.' },
      ],
    };
    created.languageFlags = runLanguageCheck(created);
    db.challenges.push(created);

    db.gates.push(
      ...GATES.map<GateRecord>((g, i) => ({
        id: `GTR-${created.id}-${g.id}`,
        entityType: 'challenge',
        entityId: created.id,
        caseId,
        gate: g.id,
        status: i === 0 ? 'open' : 'future',
        ownerId: user.id,
        enteredOn: db.now().toISOString(),
        preconditions: i === 0 ? evaluatePreconditions(created, g.id) : [],
        dwellDays: 0,
      })),
    );

    db.audit.unshift({
      id: `AUD-${created.id}-0`,
      entityType: 'challenge',
      entityId: created.id,
      caseId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'challenge.created',
      summary: 'Draft created.',
      at: db.now().toISOString(),
      hash: digest(`${created.id}-created`),
    });

    return ok(created, `Draft ${caseId} created.`);
  }),

  http.patch('/api/challenges/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('edit', 'challenge');
    if (denied) return denied;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');
    if (challenge.status !== 'draft' && challenge.status !== 'in_review') {
      return fail(409, 'CHALLENGE_PUBLISHED', 'A published challenge cannot be edited.', [
        'Published challenges are frozen so applicants are scored against what they read. Raise a corrigendum instead.',
      ]);
    }
    const body = await readBody<Partial<Challenge>>(request);
    Object.assign(challenge, body);
    challenge.languageFlags = runLanguageCheck(challenge);
    const user = currentUser();
    challenge.changeLog.push({
      at: db.now().toISOString(),
      by: user?.name ?? 'Unknown',
      summary: `Updated ${Object.keys(body).join(', ')}.`,
    });
    return ok(challenge, 'Draft saved.');
  }),

  http.post('/api/challenges/:id/language-check', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');
    challenge.languageFlags = runLanguageCheck(challenge);
    return ok(challenge.languageFlags);
  }),

  http.post('/api/challenges/:id/language-check/:flagId', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');
    const flag = challenge.languageFlags.find((f) => f.id === params.flagId);
    if (!flag) return notFound('That flag');
    const body = await readBody<{ status: SolutionLanguageFlag['status']; replacementText?: string; dismissReason?: string }>(
      request,
    );
    flag.status = body.status;
    flag.dismissReason = body.dismissReason;
    if (body.status === 'accepted' && body.replacementText && flag.fieldPath === 'outcome.statement') {
      challenge.outcome.statement = body.replacementText;
    }
    return ok(challenge.languageFlags, body.status === 'accepted' ? 'Suggestion applied to the draft.' : 'Flag updated.');
  }),

  http.post('/api/challenges/:id/publish', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('publish', 'challenge');
    if (denied) return denied;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');

    // Publication is a consequence of clearing gate 1, never a shortcut past it.
    const g1 = evaluatePreconditions(challenge, 'G1');
    const failed = g1.filter((p) => p.result !== 'pass');
    if (failed.length > 0) {
      return fail(409, 'CHALLENGE_NOT_READY', 'This challenge cannot be published.', [
        'Gate 1 preconditions are not met:',
        ...failed.map((f) => f.note),
      ]);
    }

    challenge.status = 'open';
    challenge.currentGate = 'G2';
    challenge.timeline.publishedOn = db.now().toISOString();
    challenge.timeline.closesOn = addDays(db.now(), 31).toISOString();
    challenge.gateEnteredOn = db.now().toISOString();
    return ok(challenge, `${challenge.caseId} is now public. Applications close on the date recorded in the timeline.`);
  }),

  http.post('/api/challenges/:id/close', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('publish', 'challenge');
    if (denied) return denied;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');
    challenge.status = 'closed';
    challenge.timeline.closesOn = db.now().toISOString();
    return ok(challenge, 'Applications are now closed. Drafts in progress are preserved.');
  }),

  http.delete('/api/challenges/:id', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const idx = db.challenges.findIndex((c) => c.id === params.id);
    if (idx < 0) return notFound('That challenge');
    const challenge = db.challenges[idx]!;
    if (challenge.status !== 'draft') {
      return fail(409, 'CHALLENGE_NOT_DRAFT', 'Only a draft can be deleted.', [
        'A published challenge is part of the public record. Close it instead.',
      ]);
    }
    db.challenges.splice(idx, 1);
    return ok({ deleted: true }, 'Draft deleted.');
  }),

  http.post('/api/challenges/:id/clarifications/:clarificationId/answer', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const thread = db.clarifications.find((c) => c.id === params.clarificationId);
    if (!thread) return notFound('That clarification');
    const body = await readBody<{ answer: string }>(request);
    if (!body.answer || body.answer.trim().length < 10) {
      return fail(422, 'VALIDATION_FAILED', 'The answer could not be published.', [
        'An answer must be at least 10 characters. It is published to every applicant.',
      ]);
    }
    thread.answer = body.answer;
    thread.answeredOn = db.now().toISOString();
    thread.answeredBy = currentUser()?.name;
    return ok(thread, 'Answer published to every applicant.');
  }),

  http.get('/api/rules', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    return ok(ELIGIBILITY_RULES);
  }),
];
