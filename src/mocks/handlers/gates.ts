import { http } from 'msw';
import { GATES, nextGate, type GateDecision, type GateId } from '@/config/gates';
import { policy, policyNumber } from '@/config/policies';
import { digest } from '@/lib/ids';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { evaluatePreconditions } from './challenges';
import { asScenarioGate, fail, gate as scenarioGate, notFound, ok, readBody, requirePermission } from './util';
import { worksOn } from './jurisdiction';

export const gateHandlers = [
  http.get('/api/gates/:id', async ({ params }) => {
    const blocked = await scenarioGate('read');
    if (blocked) return blocked;
    const db = getDb();
    const record = db.gates.find((g) => g.id === params.id);
    if (!record) return notFound('That gate record');

    const entity =
      record.entityType === 'challenge'
        ? db.challenges.find((c) => c.id === record.entityId)
        : db.pilots.find((p) => p.id === record.entityId);
    if (!entity) return notFound('The case behind that gate');

    const def = GATES.find((g) => g.id === record.gate)!;
    // Preconditions are re-tested on every read. A stale pass is not a pass.
    const preconditions =
      record.status === 'cleared' || record.status === 'rejected'
        ? record.preconditions
        : evaluatePreconditions({ id: record.entityId }, record.gate);
    if (record.status !== 'cleared' && record.status !== 'rejected') record.preconditions = preconditions;

    const owner = db.users.find((u) => u.id === record.ownerId)!;
    const user = currentUser();

    return ok({
      record: asScenarioGate(record),
      definition: def,
      preconditions,
      owner,
      canDecide: Boolean(user && (user.role === def.ownerRole || user.role === 'pmu' || user.role === 'procurement_officer')),
      decisionRoleRequired: def.ownerRole,
      reasonMinChars: policyNumber('gate.decision.reason.minChars'),
      waiverAuthority: policy<string>('gate.waiver.authority'),
      entity: {
        id: record.entityId,
        type: record.entityType,
        caseId: record.caseId,
        title: 'title' in entity ? entity.title : record.caseId,
        departmentId: entity.departmentId,
        /* The cover of a file names the office, not its primary key. */
        departmentName: db.departments.find((d) => d.id === entity.departmentId)?.shortName ?? entity.departmentId,
        budgetPaise: 'pilot' in entity ? entity.pilot.budgetPaise : entity.budgetPaise,
      },
      ladder: db.gates
        .filter((g) => g.entityType === record.entityType && g.entityId === record.entityId)
        .sort((a, b) => a.gate.localeCompare(b.gate))
        .map(asScenarioGate),
      audit: db.audit.filter((a) => a.entityId === record.entityId).slice(0, 40),
    });
  }),

  http.post('/api/gates/:id/decision', async ({ params, request }) => {
    const blocked = await scenarioGate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'gate');
    if (denied) return denied;
    const db = getDb();
    const record = db.gates.find((g) => g.id === params.id);
    if (!record) return notFound('That gate record');
    const user = currentUser()!;

    const body = await readBody<{ decision: GateDecision; reason: string }>(request);
    const minChars = policyNumber('gate.decision.reason.minChars');
    if (!body.reason || body.reason.trim().length < minChars) {
      return fail(422, 'REASON_TOO_SHORT', 'A gate decision needs a written reason.', [
        `Write at least ${minChars} characters. This becomes part of the permanent record for this case.`,
      ]);
    }
    if (record.status === 'cleared') {
      return fail(409, 'ALREADY_DECIDED', 'This gate has already been decided.');
    }

    const preconditions = evaluatePreconditions({ id: record.entityId }, record.gate);
    const unmet = preconditions.filter((p) => p.result !== 'pass');

    // No role clears a gate with unmet preconditions. Not the department, not the PMU, not an admin.
    if (body.decision === 'clear' && unmet.length > 0) {
      const waived = record.waiver?.status === 'granted';
      if (!waived) {
        return fail(409, 'PRECONDITIONS_UNMET', `Gate ${record.gate} cannot clear.`, [
          ...unmet.map((u) => u.note),
          'A waiver from the configured authority is the only route past an unmet precondition, and it is recorded separately.',
        ]);
      }
    }

    const now = db.now();
    record.preconditions = preconditions;
    record.decision = body.decision;
    record.reason = body.reason;
    record.decidedOn = now.toISOString();
    record.status = body.decision === 'clear' ? 'cleared' : body.decision === 'reject' ? 'rejected' : 'open';

    if (body.decision === 'clear') {
      const next = nextGate(record.gate);
      const entityGates = db.gates.filter((g) => g.entityType === record.entityType && g.entityId === record.entityId);
      if (next) {
        const nextRecord = entityGates.find((g) => g.gate === next);
        if (nextRecord) {
          nextRecord.status = 'open';
          nextRecord.enteredOn = now.toISOString();
          nextRecord.preconditions = evaluatePreconditions({ id: record.entityId }, next);
        }
      }
      if (record.entityType === 'challenge') {
        const challenge = db.challenges.find((c) => c.id === record.entityId);
        if (challenge) {
          challenge.currentGate = (next ?? record.gate) as GateId;
          challenge.gateEnteredOn = now.toISOString();
          challenge.blocked = undefined;
          if (record.gate === 'G0') challenge.status = 'in_review';
          if (record.gate === 'G1') {
            challenge.status = 'open';
            challenge.timeline.publishedOn = now.toISOString();
            challenge.timeline.closesOn = new Date(now.getTime() + 31 * 86_400_000).toISOString();
          }
          if (record.gate === 'G3') challenge.status = 'awarded';
        }
      } else {
        const pilot = db.pilots.find((p) => p.id === record.entityId);
        if (pilot) {
          pilot.currentGate = (next ?? record.gate) as GateId;
          pilot.gateEnteredOn = now.toISOString();
          pilot.blocked = undefined;
          if (record.gate === 'G5') pilot.status = 'validated';
          if (record.gate === 'G6') pilot.status = 'scaled';
        }
      }
    }

    db.audit.unshift({
      id: `AUD-GATE-${record.id}-${db.audit.length}`,
      entityType: record.entityType,
      entityId: record.entityId,
      caseId: record.caseId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'gate.decision',
      summary: `${record.gate} — ${body.decision}. ${body.reason}`,
      before: `${record.gate} open`,
      after: `${record.gate} ${record.status}`,
      at: now.toISOString(),
      hash: digest(`${record.id}-${body.decision}-${now.toISOString()}`),
    });

    const def = GATES.find((g) => g.id === record.gate)!;
    return ok(
      { record, consequences: body.decision === 'clear' ? def.consequences : [], notified: def.notifies },
      body.decision === 'clear'
        ? `Gate ${record.gate.slice(1)} cleared. ${def.consequences.length} downstream changes have taken effect.`
        : 'Decision recorded with your written reason.',
    );
  }),

  http.post('/api/gates/:id/waiver', async ({ params, request }) => {
    const blocked = await scenarioGate('write');
    if (blocked) return blocked;
    const db = getDb();
    const record = db.gates.find((g) => g.id === params.id);
    if (!record) return notFound('That gate record');
    const body = await readBody<{ reason: string }>(request);
    if (!body.reason || body.reason.trim().length < 80) {
      return fail(422, 'VALIDATION_FAILED', 'A waiver request needs a full written case.', [
        'Write at least 80 characters. A waiver is an exception on the record, not a shortcut.',
      ]);
    }
    const user = currentUser()!;
    record.waiver = {
      requestedBy: user.name,
      authority: policy<string>('gate.waiver.authority'),
      reason: body.reason,
      status: 'requested',
      at: db.now().toISOString(),
    };
    db.audit.unshift({
      id: `AUD-WVR-${record.id}-${db.audit.length}`,
      entityType: record.entityType,
      entityId: record.entityId,
      caseId: record.caseId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'gate.waiver_requested',
      summary: `Waiver requested at ${record.gate}. ${body.reason}`,
      at: db.now().toISOString(),
      hash: digest(`${record.id}-waiver`),
    });
    return ok(
      record,
      `Waiver requested. It goes to the ${policy<string>('gate.waiver.authority')} and is recorded separately from the gate decision.`,
    );
  }),

  http.get('/api/gates', async ({ request }) => {
    const blocked = await scenarioGate('read');
    if (blocked) return blocked;
    const db = getDb();
    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    /*
     * A gate record names a case, an owner and a decision, so the ladder is
     * scoped to the cases the reader actually works on. Publishing a challenge
     * publishes the challenge, not the department's decisions about it.
     */
    const visible = (entityId ? db.gates.filter((g) => g.entityId === entityId) : db.gates).filter((g) =>
      worksOn(g.entityType === 'challenge' ? 'challenges' : 'pilots', g.entityId),
    );
    return ok(visible.map(asScenarioGate));
  }),
];
