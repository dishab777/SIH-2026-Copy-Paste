import { http } from 'msw';
import { CONFIG_PARAMETERS, CITATIONS } from '@/config/policies';
import { ELIGIBILITY_RULES, RULE_FIELDS, RULE_OPERATORS, type EligibilityRuleDefinition } from '@/config/rules';
import { RUBRICS, rubricWeightTotal, type RubricDefinition } from '@/config/rubrics';
import { CLAUSES, DATA_TIERS, PATHWAYS, TEMPLATES } from '@/config/templates';
import { ACTIONS, RBAC, RESOURCES, ROLES } from '@/config/rbac';
import { GATES } from '@/config/gates';
import { STAGES } from '@/config/stages';
import { getDb } from '../store/db';
import { emptyIfScenario, fail, gate, notFound, ok, readBody, requirePermission } from './util';
import { inReach, worksOn } from './jurisdiction';

/**
 * Configuration is data. These handlers hold a mutable copy so the admin screens
 * can genuinely change the rules that the rest of the product reads.
 */
const liveRules: EligibilityRuleDefinition[] = ELIGIBILITY_RULES.map((r) => structuredClone(r));
const liveRubrics: RubricDefinition[] = RUBRICS.map((r) => structuredClone(r));
const liveConfig = CONFIG_PARAMETERS.map((c) => structuredClone(c));

export const adminHandlers = [
  http.get('/api/admin/config', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    return ok({ parameters: liveConfig, citations: CITATIONS });
  }),

  http.patch('/api/admin/config/:key', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('edit', 'config');
    if (denied) return denied;
    const param = liveConfig.find((c) => c.key === params.key);
    if (!param) return notFound('That parameter');
    const body = await readBody<{ value: string | number | boolean; effectiveFrom: string; changeNote: string }>(request);
    if (!body.changeNote || body.changeNote.length < 15) {
      return fail(422, 'CHANGE_NOTE_REQUIRED', 'A configuration change needs a note.', [
        'Write at least 15 characters saying why. Every case decided after the effective date uses the new value.',
      ]);
    }
    param.previousValue = param.value;
    param.value = body.value;
    param.effectiveFrom = body.effectiveFrom;
    param.note = body.changeNote;
    return ok(param, 'Parameter updated. The previous value stays on the record.');
  }),

  http.get('/api/admin/rules', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    return ok({
      rules: liveRules.map((r) => ({
        rule: r,
        // A rule in use can never be deleted, only deprecated.
        usedByChallenges: db.challenges.filter((c) => c.eligibility.ruleIds.includes(r.id)).map((c) => c.caseId),
      })),
      fields: RULE_FIELDS,
      operators: RULE_OPERATORS,
    });
  }),

  http.post('/api/admin/rules/:id/test', async ({ params, request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const rule = liveRules.find((r) => r.id === params.id);
    if (!rule) return notFound('That rule');
    const body = await readBody<{ conditions?: typeof rule.conditions; logic?: 'all' | 'any' }>(request);
    const conditions = body.conditions ?? rule.conditions;
    const logic = body.logic ?? rule.logic;

    const results = db.startups.slice(0, 20).map((s) => {
      const values: Record<string, unknown> = {
        'entity.type': s.entityType,
        'entity.incorporationYears': Math.floor(
          (db.now().getTime() - new Date(s.incorporationDate).getTime()) / (365.25 * 86_400_000),
        ),
        'entity.turnoverCrore': s.turnoverCrore,
        'dpiit.status': s.dpiit.status,
        'dpiit.validTo': s.dpiit.validTo,
        'gst.status': s.gstStatus,
        'capability.tags': s.capabilities,
        'deployment.count': s.deployments.length,
        'deployment.governmentCount': s.deployments.filter((d) => d.isGovernment).length,
        'certification.list': s.certifications,
        'geography.states': s.statesServed,
        'declaration.debarred': false,
        'declaration.blacklisted': false,
        'documents.complete': db.startupDocuments.filter((d) => d.startupId === s.id).every((d) => d.scan === 'clean'),
      };

      const checks = conditions.map((c) => {
        const v = values[c.field];
        switch (c.operator) {
          case 'eq':
            return v === c.value;
          case 'neq':
            return v !== c.value;
          case 'gt':
            return Number(v) > Number(c.value);
          case 'gte':
            return Number(v) >= Number(c.value);
          case 'lt':
            return Number(v) < Number(c.value);
          case 'lte':
            return Number(v) <= Number(c.value);
          case 'includes':
            return Array.isArray(v) && (c.value === undefined || v.includes(c.value as string));
          case 'excludes':
            return Array.isArray(v) && !v.includes(c.value as string);
          case 'isTrue':
            return v === true;
          case 'isFalse':
            return v === false;
          case 'afterToday':
            return typeof v === 'string' && new Date(v) > db.now();
          case 'anyOf':
            return Array.isArray(c.value) && (c.value as string[]).includes(String(v));
          default:
            return false;
        }
      });
      const passed = logic === 'all' ? checks.every(Boolean) : checks.some(Boolean);
      return {
        startupId: s.id,
        name: s.tradeName,
        dpiit: s.dpiit.status,
        result: passed ? 'pass' : rule.onFail,
        failedConditions: conditions.filter((_, i) => !checks[i]).map((c) => `${c.field} ${c.operator} ${String(c.value ?? '')}`),
      };
    });

    return ok({
      results,
      summary: {
        pass: results.filter((r) => r.result === 'pass').length,
        fail: results.filter((r) => r.result === 'fail').length,
        review: results.filter((r) => r.result === 'review').length,
      },
    });
  }),

  http.patch('/api/admin/rules/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('edit', 'config');
    if (denied) return denied;
    const db = getDb();
    const rule = liveRules.find((r) => r.id === params.id);
    if (!rule) return notFound('That rule');
    const body = await readBody<Partial<EligibilityRuleDefinition> & { changeNote: string; effectiveFrom: string }>(request);
    if (!body.changeNote || body.changeNote.length < 15) {
      return fail(422, 'CHANGE_NOTE_REQUIRED', 'A rule change needs a note.', [
        'Write at least 15 characters. The note travels with the version.',
      ]);
    }
    const inUse = db.challenges.filter((c) => c.eligibility.ruleIds.includes(rule.id));
    Object.assign(rule, body, { version: rule.version + 1, changeNote: body.changeNote, effectiveFrom: body.effectiveFrom });
    return ok(
      { rule, impact: inUse.map((c) => c.caseId) },
      inUse.length
        ? `Saved as version ${rule.version}. ${inUse.length} live challenge${inUse.length === 1 ? '' : 's'} reference this rule and will be screened against the new version from the effective date.`
        : `Saved as version ${rule.version}.`,
    );
  }),

  http.delete('/api/admin/rules/:id', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const rule = liveRules.find((r) => r.id === params.id);
    if (!rule) return notFound('That rule');
    const inUse = db.challenges.filter((c) => c.eligibility.ruleIds.includes(rule.id));
    // Deleting a rule in use would break the challenges that cite it.
    if (inUse.length > 0) {
      return fail(409, 'RULE_IN_USE', 'This rule cannot be deleted.', [
        `${inUse.length} challenge${inUse.length === 1 ? '' : 's'} reference it: ${inUse.map((c) => c.caseId).join(', ')}.`,
        'Deprecate it instead. Deprecated rules stop applying to new challenges and keep working for existing ones.',
      ]);
    }
    rule.status = 'deprecated';
    return ok(rule, 'Rule deprecated.');
  }),

  http.get('/api/admin/rubrics', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    return ok(
      liveRubrics.map((r) => ({
        rubric: r,
        weightTotal: rubricWeightTotal(r.criteria),
        usedByChallenges: db.challenges.filter((c) => c.rubricId === r.id).map((c) => c.caseId),
      })),
    );
  }),

  http.patch('/api/admin/rubrics/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('edit', 'config');
    if (denied) return denied;
    const rubric = liveRubrics.find((r) => r.id === params.id);
    if (!rubric) return notFound('That rubric');
    const body = await readBody<{ criteria: RubricDefinition['criteria'] }>(request);
    const total = rubricWeightTotal(body.criteria);
    // Weights must total 100. This is checked on the server, not only in the form.
    if (total !== 100) {
      return fail(422, 'WEIGHTS_NOT_100', 'Evaluation criteria must total 100%.', [
        `They currently total ${total}%. Adjust the weights by ${total > 100 ? total - 100 : 100 - total} percentage points.`,
      ]);
    }
    rubric.criteria = body.criteria;
    return ok({ rubric, weightTotal: total }, 'Rubric saved.');
  }),

  http.get('/api/admin/templates', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    return ok({ templates: TEMPLATES, clauses: CLAUSES });
  }),

  http.get('/api/admin/users', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    return ok({
      users: emptyIfScenario(
        db.users.map((u) => ({
          user: u,
          department: db.departments.find((d) => d.id === u.departmentId)?.shortName ?? null,
          startup: db.startups.find((s) => s.id === u.startupId)?.tradeName ?? null,
        })),
      ),
      roles: ROLES,
      actions: ACTIONS,
      resources: RESOURCES,
      matrix: RBAC,
    });
  }),

  http.patch('/api/admin/users/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('edit', 'user');
    if (denied) return denied;
    const db = getDb();
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return notFound('That user');
    const body = await readBody<{ active?: boolean; role?: typeof user.role }>(request);
    Object.assign(user, body);
    return ok(user, 'User updated.');
  }),

  http.get('/api/admin/integrations', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    return ok(getDb().integrations);
  }),

  http.post('/api/admin/integrations/:id/sync', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const integration = db.integrations.find((i) => i.id === params.id);
    if (!integration) return notFound('That integration');
    if (integration.status === 'mock_down') {
      return fail(502, 'INTEGRATION_DOWN', `${integration.name} did not respond.`, [
        'This is a mock provider set to a failing state. No live government API is called by this build.',
      ]);
    }
    integration.lastSyncAt = db.now().toISOString();
    return ok(integration, `${integration.name} synced. Mock provider — no live government API was called.`);
  }),

  http.get('/api/admin/taxonomy', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    return ok({
      sectors: Array.from(new Set(db.challenges.map((c) => c.sector))).map((s) => ({
        name: s,
        challenges: db.challenges.filter((c) => c.sector === s).length,
      })),
      capabilities: Array.from(new Set(db.challenges.flatMap((c) => c.capabilities))).map((c) => ({
        name: c,
        challenges: db.challenges.filter((x) => x.capabilities.includes(c)).length,
        startups: db.startups.filter((s) => s.capabilities.includes(c)).length,
      })),
      states: Array.from(new Set(db.challenges.map((c) => c.state))).map((s) => ({
        name: s,
        districts: Array.from(new Set(db.challenges.filter((c) => c.state === s).map((c) => c.district))),
      })),
      dataTiers: DATA_TIERS,
      pathways: PATHWAYS,
      gates: GATES,
      stages: STAGES,
    });
  }),

  http.get('/api/audit', async ({ request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const entityType = url.searchParams.get('entityType');
    const actor = url.searchParams.get('actor');
    const action = url.searchParams.get('action');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    /*
     * The audit trail is the case file, and a case file is a department's.
     * Events on cases the reader does not work on are dropped before any of the
     * query filters run, so a filter can never widen what is returned.
     */
    let items = db.audit.filter(
      (a) =>
        (a.entityType === 'challenge' && worksOn('challenges', a.entityId)) ||
        (a.entityType === 'pilot' && worksOn('pilots', a.entityId)) ||
        (a.entityType === 'application' && worksOn('applications', a.entityId)),
    );
    if (entityId) items = items.filter((a) => a.entityId === entityId || a.caseId === entityId);
    if (entityType) items = items.filter((a) => a.entityType === entityType);
    if (actor) items = items.filter((a) => a.actorId === actor || a.actorName === actor);
    if (action) items = items.filter((a) => a.action === action);
    if (from) items = items.filter((a) => a.at >= from);
    if (to) items = items.filter((a) => a.at <= to);

    return ok({
      items: emptyIfScenario(items).slice(0, 400),
      actors: Array.from(new Set(db.audit.map((a) => a.actorName))),
      actions: Array.from(new Set(db.audit.map((a) => a.action))),
    });
  }),

  http.get('/api/reports/audit-pack/:caseId', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const denied = requirePermission('export', 'audit');
    if (denied) return denied;
    const db = getDb();
    const caseId = String(params.caseId);
    const challenge = db.challenges.find((c) => c.caseId === caseId);
    const pilot = challenge ? db.pilots.find((p) => p.challengeId === challenge.id) : db.pilots.find((p) => p.caseId === caseId);
    if (!challenge && !pilot) return notFound('That case');

    const entityIds = [challenge?.id, pilot?.id, ...db.applications.filter((a) => a.challengeId === challenge?.id).map((a) => a.id)].filter(
      (x): x is string => Boolean(x),
    );

    return ok({
      caseId,
      challenge: challenge ?? null,
      pilot: pilot ?? null,
      gates: db.gates.filter((g) => entityIds.includes(g.entityId)),
      evaluations: db.evaluations
        .filter((e) => entityIds.includes(e.applicationId))
        .map((e) => ({ ...e, evaluatorName: db.users.find((u) => u.id === e.evaluatorId)?.name ?? '' })),
      overrides: db.applications
        .filter((a) => entityIds.includes(a.id))
        .flatMap((a) => a.eligibility.filter((x) => x.override).map((x) => ({ applicationCaseId: a.caseId, ...x }))),
      milestones: pilot ? db.milestones.filter((m) => m.pilotId === pilot.id) : [],
      claims: pilot ? db.claims.filter((c) => c.pilotId === pilot.id) : [],
      evidence: pilot ? db.evidence.filter((e) => e.pilotId === pilot.id) : [],
      validation: pilot ? (db.validations.find((v) => v.pilotId === pilot.id) ?? null) : null,
      procurement: pilot ? (db.procurement.find((p) => p.pilotId === pilot.id) ?? null) : null,
      timeline: db.audit.filter((a) => entityIds.includes(a.entityId) || a.caseId === caseId).slice().reverse(),
    });
  }),

  http.get('/api/reports', async ({ request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const kind = new URL(request.url).searchParams.get('kind') ?? 'programme';
    switch (kind) {
      case 'payment':
        return ok({
          kind,
          columns: ['Claim', 'Startup', 'Accepted on', 'Amount', 'Deduction', 'Net', 'Status', 'Days elapsed'],
          rows: inReach(db.claims, (c) => ({ departmentId: c.departmentId, startupId: c.startupId })).map((c) => [
            c.caseId,
            db.startups.find((s) => s.id === c.startupId)?.tradeName ?? '',
            c.acceptedOn,
            c.amountPaise,
            c.deductionPaise,
            c.netPaise,
            c.status,
            Math.floor((db.now().getTime() - new Date(c.acceptedOn).getTime()) / 86_400_000),
          ]),
        });
      case 'pilot':
        return ok({
          kind,
          columns: ['Case', 'Pilot', 'Department', 'Status', 'Gate', 'Budget', 'Spent', 'Milestones accepted'],
          rows: inReach(db.pilots, (p) => ({ departmentId: p.departmentId, startupId: p.startupId })).map((p) => [
            p.caseId,
            p.title,
            db.departments.find((d) => d.id === p.departmentId)?.shortName ?? '',
            p.status,
            p.currentGate,
            p.budgetPaise,
            p.spentPaise,
            db.milestones.filter((m) => m.pilotId === p.id && (m.status === 'approved' || m.status === 'paid')).length,
          ]),
        });
      case 'outcome':
        return ok({
          kind,
          columns: ['Case', 'Measure', 'Baseline', 'Target', 'Result', 'Outcome'],
          rows: db.kpis.filter((k) => worksOn('pilots', k.pilotId)).map((k) => {
            const v = db.validations.find((x) => x.pilotId === k.pilotId);
            return [
              db.pilots.find((p) => p.id === k.pilotId)?.caseId ?? '',
              k.name,
              k.baseline,
              k.target,
              k.current,
              v?.outcome ?? 'in progress',
            ];
          }),
        });
      default:
        return ok({
          kind: 'programme',
          columns: ['Case', 'Challenge', 'Department', 'Status', 'Gate', 'Budget', 'Applicants'],
          rows: inReach(db.challenges, (c) => ({ departmentId: c.departmentId })).map((c) => [
            c.caseId,
            c.title,
            db.departments.find((d) => d.id === c.departmentId)?.shortName ?? '',
            c.status,
            c.currentGate,
            c.pilot.budgetPaise,
            c.applicantCount,
          ]),
        });
    }
  }),
];
