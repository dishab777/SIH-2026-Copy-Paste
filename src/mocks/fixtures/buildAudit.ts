import { addDays, subDays } from 'date-fns';
import { digest, intBetween, makeRandom } from '@/lib/ids';
import { GATES, gateSlaDays, type GateId } from '@/config/gates';
import type {
  Application,
  AuditEvent,
  Challenge,
  Department,
  GateRecord,
  IntegrationHealth,
  Milestone,
  Notification,
  PaymentClaim,
  Pilot,
  User,
} from '@/types/models';
import { NOW, iso } from './buildCore';

export interface AuditFixtures {
  gates: GateRecord[];
  audit: AuditEvent[];
  notifications: Notification[];
  integrations: IntegrationHealth[];
}

const GATE_ORDER: readonly GateId[] = GATES.map((g) => g.id);

function ownerFor(gate: GateId, users: User[], departmentId: string): User {
  const def = GATES.find((g) => g.id === gate)!;
  if (def.ownerRole === 'pmu') return users.find((u) => u.role === 'pmu')!;
  if (def.ownerRole === 'validator') return users.find((u) => u.role === 'validator')!;
  return (
    users.find((u) => u.departmentId === departmentId && u.role === def.ownerRole) ??
    users.find((u) => u.departmentId === departmentId && u.role === 'department_admin')!
  );
}

function buildGateRecords(
  entityType: 'challenge' | 'pilot',
  entityId: string,
  caseId: string,
  departmentId: string,
  currentGate: GateId,
  createdOn: Date,
  gateEnteredOn: Date,
  users: User[],
  blocked: { reason: string; since: string } | undefined,
  waiver: Challenge['waiver'],
  rand: () => number,
  /** An awarded challenge has cleared every gate it owns; the pilot carries the rest. */
  allCleared = false,
): GateRecord[] {
  // An awarded challenge has cleared everything it owns and has no open gate:
  // gates 4 to 6 sit on its pilot instead.
  const at = GATE_ORDER.indexOf(currentGate);
  const clearedThrough = allCleared ? at : at - 1;
  const openIndex = allCleared ? -1 : at;
  let cursor = createdOn;

  return GATE_ORDER.map((gate, i) => {
    const def = GATES.find((g) => g.id === gate)!;
    const owner = ownerFor(gate, users, departmentId);
    const sla = gateSlaDays(gate);

    let status: GateRecord['status'] = 'future';
    let decidedOn: Date | undefined;
    let dwell = 0;
    const enteredOn = cursor;

    if (i <= clearedThrough) {
      status = 'cleared';
      dwell = intBetween(rand, Math.max(1, Math.round(sla * 0.3)), Math.round(sla * 1.4));
      decidedOn = addDays(enteredOn, dwell);
      cursor = addDays(decidedOn, 1);
    } else if (i === openIndex) {
      status = blocked ? 'blocked' : 'open';
      dwell = Math.max(0, Math.floor((NOW.getTime() - gateEnteredOn.getTime()) / 86_400_000));
      cursor = gateEnteredOn;
    }

    const preconditions = def.preconditions.map((p) => {
      let result: 'pass' | 'fail' | 'review' = 'pass';
      let note = 'Verified against the record on file.';
      if (status === 'blocked') {
        if (p.key === 'legalPreClearance' || p.key === 'needsReviewCleared' || p.key === 'milestoneEvidenceReviewed') {
          result = 'fail';
          note = blocked?.reason ?? 'Not satisfied.';
        }
      }
      if (status === 'open' && waiver?.status === 'requested' && p.key === 'replicationPackage') {
        result = 'review';
        note = 'A waiver has been requested for this precondition. The waiver does not clear it.';
      }
      return { key: p.key, result, note, evidenceIds: [] };
    });

    return {
      id: `GTR-${entityId}-${gate}`,
      entityType,
      entityId,
      caseId,
      gate,
      status,
      ownerId: owner.id,
      enteredOn: iso(status === 'future' ? NOW : enteredOn),
      decidedOn: decidedOn ? iso(decidedOn) : undefined,
      decision: status === 'cleared' ? 'clear' : undefined,
      reason:
        status === 'cleared'
          ? `Preconditions tested and met. ${def.decides} The case proceeds on the evidence recorded against each precondition above.`
          : undefined,
      preconditions,
      waiver:
        waiver && i === openIndex
          ? {
              requestedBy: owner.name,
              authority: waiver.authority,
              reason: waiver.reason,
              status: waiver.status,
              at: waiver.requestedOn,
            }
          : undefined,
      dwellDays: dwell,
    };
  });
}

export function buildAudit(
  challenges: Challenge[],
  pilots: Pilot[],
  applications: Application[],
  milestones: Milestone[],
  claims: PaymentClaim[],
  departments: Department[],
  users: User[],
): AuditFixtures {
  const rand = makeRandom(9081726);
  const gates: GateRecord[] = [];
  const audit: AuditEvent[] = [];
  const notifications: Notification[] = [];

  challenges.forEach((c) => {
    gates.push(
      ...buildGateRecords(
        'challenge',
        c.id,
        c.caseId,
        c.departmentId,
        c.currentGate,
        new Date(c.timeline.createdOn),
        new Date(c.gateEnteredOn),
        users,
        c.blocked,
        c.waiver,
        rand,
        c.status === 'awarded',
      ),
    );
  });

  pilots.forEach((p) => {
    gates.push(
      ...buildGateRecords(
        'pilot',
        p.id,
        p.caseId,
        p.departmentId,
        p.currentGate,
        new Date(p.startedOn),
        new Date(p.gateEnteredOn),
        users,
        p.blocked,
        undefined,
        rand,
      ),
    );
  });

  // A complete, reconstructable audit trail on the exemplary case.
  const hero = challenges.find((c) => c.caseId === 'CH-2026-0143')!;
  const heroPilot = pilots.find((p) => p.challengeId === hero.id)!;
  const heroApp = applications.find((a) => a.id === 'APP-HERO')!;
  const nodal = users.find((u) => u.id === hero.ownerId)!;
  const admin = users.find((u) => u.departmentId === hero.departmentId && u.role === 'department_admin')!;
  const proc = users.find((u) => u.departmentId === hero.departmentId && u.role === 'procurement_officer')!;
  const pmu = users.find((u) => u.role === 'pmu')!;
  const validator = users.find((u) => u.role === 'validator')!;
  const startupUser = users.find((u) => u.startupId === heroApp.startupId)!;

  const trail: [number, User, string, string, string?, string?][] = [
    [185, nodal, 'challenge.created', 'Draft created from the outcome-based problem statement template.', undefined, 'Draft CH-2026-0143'],
    [
      182,
      nodal,
      'challenge.baseline.recorded',
      'Baseline recorded: 180 minutes median leak detection time, from the ward complaint register over 12 weeks.',
      'No baseline',
      '180 minutes, ward complaint register, 12 weeks to 31 Jan 2026',
    ],
    [
      179,
      nodal,
      'challenge.outcome.recorded',
      'Outcome set: reduce median leak detection time to 120 minutes or better.',
      undefined,
      'Target 120 minutes, failure threshold 180 minutes',
    ],
    [
      178,
      nodal,
      'language_check.flag_accepted',
      'Solution language check flagged "acoustic correlator loggers" in the outcome. The suggested outcome-based rewrite was accepted.',
      'Deploy acoustic correlator loggers across the trunk network',
      'Cut the time between a leak starting and a crew standing over it, without adding staff to the zone.',
    ],
    [
      177,
      nodal,
      'language_check.flag_accepted',
      'Solution language check flagged a named product in the systems list. Replaced with a capability description.',
      'SCADA historian, vendor-supplied',
      'Supervisory control system historian, with a documented read-only interface',
    ],
    [
      174,
      nodal,
      'challenge.budget.assigned',
      'Budget head assigned: water and sanitation innovation head, 2026-27. Pilot budget ₹15,00,000.',
      undefined,
      '₹15,00,000',
    ],
    [172, nodal, 'challenge.legal.precleared', 'Departmental legal cell cleared the IP, data and cyber positions against template v5.2.'],
    [
      171,
      admin,
      'gate.decision',
      'Gate 0 cleared. Baseline captured, budget head assigned, outcome KPIs defined and legal pre-clearance recorded.',
      'G0 open',
      'G0 cleared',
    ],
    [
      163,
      pmu,
      'gate.decision',
      'Gate 1 cleared. No unresolved language flags, IP clause within default boundaries, required templates attached at current version.',
      'G1 open',
      'G1 cleared — challenge published',
    ],
    [163, pmu, 'challenge.published', 'Challenge published to the demand board. Application window opened, closing 24 Apr 2026. 14 matched startups notified.'],
    [156, nodal, 'clarification.answered', 'Answered a published clarification on site connectivity within the configured window.'],
    [
      145,
      startupUser,
      'application.submitted',
      'AquaSense Technologies submitted application APP-2026-0087 against CH-2026-0143.',
      undefined,
      'Submitted, reference CH-2026-0143/APP-2026-0087',
    ],
    [
      144,
      pmu,
      'eligibility.evaluated',
      'Rule engine evaluated 11 active rules. All passed. Prior turnover and prior experience relaxed under GFR 2017 Rule 173(i) on a live recognition.',
      undefined,
      'auto_pass, 2 relaxations applied',
    ],
    [
      132,
      admin,
      'gate.decision',
      'Gate 2 cleared. 14 applications received, 11 eligible, 6 shortlisted. Two eligibility overrides recorded with written justification.',
      'G2 open',
      'G2 cleared — 6 shortlisted',
    ],
    [118, users.find((u) => u.role === 'evaluator')!, 'coi.declared', 'Three panel evaluators declared no conflict against APP-2026-0087.'],
    [
      108,
      users.find((u) => u.role === 'evaluator')!,
      'evaluation.submitted',
      'Evaluation submitted against rubric RUB-STD-2026 v3.1. Weighted total 4.31.',
      undefined,
      '4.31 of 5',
    ],
    [104, users.find((u) => u.role === 'evaluator')!, 'panel.minutes_recorded', 'Evaluation minutes recorded. AquaSense ranked first of six shortlisted. One outlier score explained and retained.'],
    [
      98,
      proc,
      'gate.decision',
      'Gate 3 cleared. Conflict declarations complete, scoring complete against the published rubric, minutes recorded. Pilot awarded to AquaSense Technologies.',
      'G3 open',
      'G3 cleared — pilot PL-2026-0031 created',
    ],
    [95, startupUser, 'contract.signed', 'Pilot agreement v5.2 signed. Startup retains IP; government purpose licence granted under clause 7.2.'],
    [92, nodal, 'pilot.started', 'Pilot started. 90-day duration, masked data tier, sandbox credentials issued with a 90-day expiry.'],
    [
      61,
      nodal,
      'incident.reported',
      'Incident reported: masked extract query returned more rows than the agreed field list permits. Reported inside the statutory window.',
      undefined,
      'Open, medium severity',
    ],
    [58, nodal, 'incident.resolved', 'Incident closed. Sandbox view narrowed at the database level and the query rewritten to the agreed field list.'],
    [
      60,
      startupUser,
      'milestone.evidence_submitted',
      'Milestone 1 evidence submitted: installation report, calibration record and integration test log.',
    ],
    [
      57,
      nodal,
      'milestone.accepted',
      'Milestone 1 accepted. Acceptance test met in full. Payment ageing clock started on ₹5,25,000.',
      'Under review',
      'Approved — clock started',
    ],
    [40, proc, 'claim.paid', 'Milestone 1 claim paid. Reference recorded against the payment.'],
    [
      36,
      startupUser,
      'milestone.evidence_submitted',
      'Milestone 2 evidence submitted: measurement dataset, data quality note and field test report.',
    ],
    [
      34,
      nodal,
      'milestone.accepted',
      'Milestone 2 accepted with a deduction. Acceptance test met; liquidated damages applied for a nine-day handover delay.',
      'Under review',
      'Approved with a 4 percent deduction',
    ],
    [
      14,
      startupUser,
      'milestone.evidence_submitted',
      'Milestone 3 evidence submitted: final measurement dataset, handover note and training attendance record.',
    ],
    [12, nodal, 'milestone.accepted', 'Milestone 3 accepted. Two departmental staff completed the operating procedure unaided.'],
    [
      11,
      nodal,
      'measurement.attribution_recorded',
      'Attribution explained: the improvement tracks logger installation zone by zone, and the two uninstrumented control zones show no comparable movement over the same period.',
    ],
    [
      10,
      validator,
      'validation.rederived',
      'Claim re-derived independently from the ward complaint register, crew job cards and logger exports. 1,146 dispatched jobs in the pilot period.',
      'Claimed 37 percent reduction',
      'Reproduced to within 0.4 minutes',
    ],
    [
      9,
      validator,
      'validation.signed',
      'Validation report VR-2026-0020 signed. Outcome: validated. Median leak detection time 180 → 113.4 minutes against a 120-minute target.',
      undefined,
      'Validated',
    ],
    [
      6,
      pmu,
      'gate.decision',
      'Gate 5 cleared. Baseline versus pilot measurement complete, security audit closed with no open findings, data-handling attestation signed, attribution explained in writing.',
      'G5 open',
      'G5 cleared',
    ],
    [
      6,
      proc,
      'readiness.computed',
      'Procurement readiness computed at 92 of 100 from seven published components. Advisory only — the pathway decision has not been taken.',
      undefined,
      '92 / 100',
    ],
    [5, proc, 'replication.package_generated', 'Replication package generated with nine artefacts and a checksum.'],
  ];

  trail.forEach(([daysAgo, actor, action, summary, before, after], i) => {
    const at = subDays(NOW, daysAgo);
    audit.push({
      id: `AUD-HERO-${String(i + 1).padStart(3, '0')}`,
      entityType: action.startsWith('milestone') || action.startsWith('claim') || action.startsWith('validation') || action.startsWith('incident') || action.startsWith('measurement') || action.startsWith('readiness') || action.startsWith('replication') || action.startsWith('pilot') || action.startsWith('contract') ? 'pilot' : action.startsWith('application') || action.startsWith('eligibility') || action.startsWith('coi') || action.startsWith('evaluation') || action.startsWith('panel') ? 'application' : 'challenge',
      entityId: action.startsWith('milestone') || action.startsWith('claim') || action.startsWith('validation') || action.startsWith('incident') || action.startsWith('measurement') || action.startsWith('readiness') || action.startsWith('replication') || action.startsWith('pilot') || action.startsWith('contract') ? heroPilot.id : action.startsWith('application') || action.startsWith('eligibility') || action.startsWith('coi') || action.startsWith('evaluation') || action.startsWith('panel') ? heroApp.id : hero.id,
      caseId: hero.caseId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      summary,
      before,
      after,
      at: iso(at),
      hash: digest(`hero-${i}-${action}`),
    });
  });

  // A lighter trail on every other case, so no screen is empty.
  challenges
    .filter((c) => c.caseId !== 'CH-2026-0143')
    .forEach((c, ci) => {
      const owner = users.find((u) => u.id === c.ownerId)!;
      const events: [number, string, string][] = [
        [intBetween(rand, 60, 200), 'challenge.created', 'Draft created from the outcome-based problem statement template.'],
        ...(c.timeline.publishedOn
          ? ([[intBetween(rand, 30, 120), 'challenge.published', 'Challenge published to the demand board after gate 1 cleared.']] as [number, string, string][])
          : []),
        ...(c.blocked
          ? ([[intBetween(rand, 2, 20), 'gate.blocked', c.blocked.reason]] as [number, string, string][])
          : []),
      ];
      events.forEach(([daysAgo, action, summary], ei) => {
        audit.push({
          id: `AUD-${c.id}-${ei}`,
          entityType: 'challenge',
          entityId: c.id,
          caseId: c.caseId,
          actorId: owner.id,
          actorName: owner.name,
          actorRole: owner.role,
          action,
          summary,
          at: iso(subDays(NOW, daysAgo)),
          hash: digest(`${c.id}-${ei}`),
        });
      });
      void ci;
    });

  gates
    .filter((g) => g.status === 'cleared')
    .forEach((g, gi) => {
      const owner = users.find((u) => u.id === g.ownerId)!;
      audit.push({
        id: `AUD-GATE-${g.id}-${gi}`,
        entityType: g.entityType,
        entityId: g.entityId,
        caseId: g.caseId,
        actorId: owner.id,
        actorName: owner.name,
        actorRole: owner.role,
        action: 'gate.decision',
        summary: `${g.gate} cleared. ${g.reason ?? ''}`.trim(),
        before: `${g.gate} open`,
        after: `${g.gate} cleared`,
        at: g.decidedOn ?? g.enteredOn,
        hash: digest(`${g.id}-cleared`),
      });
    });

  audit.sort((a, b) => (a.at < b.at ? 1 : -1));

  // Notifications, split into what is waiting on you and what is information.
  function notify(
    userId: string,
    kind: Notification['kind'],
    waitingOnYou: boolean,
    title: string,
    detail: string,
    href: string,
    daysAgo: number,
    caseId?: string,
    dueOn?: string,
  ): void {
    notifications.push({
      id: `NTF-${notifications.length + 1}`,
      userId,
      kind,
      waitingOnYou,
      title,
      detail,
      href,
      at: iso(subDays(NOW, daysAgo)),
      read: daysAgo > 6,
      caseId,
      dueOn,
    });
  }

  notify(
    nodal.id,
    'milestone_submitted',
    true,
    'Milestone 3 evidence is waiting for your finding',
    'AquaSense submitted the final measurement dataset, handover note and training record. Record met, partially met or not met.',
    `/d/pilots/${heroPilot.id}`,
    1,
    heroPilot.caseId,
    iso(addDays(NOW, 3)),
  );
  notify(
    proc.id,
    'scale_decision_required',
    true,
    'Gate 6 is open on CH-2026-0143',
    'Validation is signed and readiness is computed at 92 of 100. A procurement pathway decision is needed. This is not automatic.',
    `/d/gates/GTR-${heroPilot.id}-G6`,
    6,
    hero.caseId,
    iso(addDays(NOW, 24)),
  );
  notify(
    startupUser.id,
    'payment_delayed',
    false,
    'Milestone 2 payment is past the configured limit',
    'Accepted 34 days ago against a 30-day limit. The claim is with the department finance officer.',
    '/s/payments',
    2,
    heroPilot.caseId,
  );
  notify(
    startupUser.id,
    'validation_completed',
    false,
    'Independent validation is complete',
    'Outcome: validated. Median leak detection time fell from 180 to 113.4 minutes against a 120-minute target.',
    `/s/pilots/${heroPilot.id}`,
    9,
    heroPilot.caseId,
  );

  users
    .filter((u) => u.role === 'department_admin' || u.role === 'department_officer')
    .slice(0, 6)
    .forEach((u, i) => {
      const deptChallenges = challenges.filter((c) => c.departmentId === u.departmentId);
      const blockedOne = deptChallenges.find((c) => c.blocked);
      if (blockedOne) {
        notify(
          u.id,
          'evaluation_due',
          true,
          `${blockedOne.caseId} is blocked at ${blockedOne.currentGate}`,
          blockedOne.blocked!.reason,
          `/d/challenges/${blockedOne.id}`,
          intBetween(rand, 1, 5),
          blockedOne.caseId,
        );
      }
      const c = deptChallenges[i % Math.max(1, deptChallenges.length)];
      if (c) {
        notify(
          u.id,
          'application_received',
          false,
          `${c.applicantCount} applications on ${c.caseId}`,
          `${c.title} — applications are visible in the screening ledger.`,
          `/d/challenges/${c.id}/applications`,
          intBetween(rand, 2, 20),
          c.caseId,
        );
      }
    });

  users
    .filter((u) => u.role === 'evaluator')
    .slice(0, 5)
    .forEach((u, i) => {
      notify(
        u.id,
        'coi_required',
        true,
        'Declare conflicts before you can open these proposals',
        'You cannot see an applicant’s identity or proposal until the declaration is recorded.',
        '/e',
        intBetween(rand, 1, 9),
      );
      void i;
    });

  users
    .filter((u) => u.role === 'validator')
    .forEach((u) => {
      const awaiting = pilots.find((p) => p.status === 'awaiting_validation');
      if (awaiting) {
        notify(
          u.id,
          'validation_requested',
          true,
          `${awaiting.caseId} is waiting for independent validation`,
          'Raw records, security audit and the data attestation are in the evidence dock.',
          `/v/validate/${awaiting.id}`,
          intBetween(rand, 1, 8),
          awaiting.caseId,
        );
      }
    });

  // Startup notifications for milestones due and claims ageing.
  milestones
    .filter((m) => m.status === 'in_progress' || m.status === 'under_review')
    .slice(0, 8)
    .forEach((m) => {
      const pilot = pilots.find((p) => p.id === m.pilotId)!;
      const su = users.find((u) => u.startupId === pilot.startupId);
      if (!su) return;
      notify(
        su.id,
        m.status === 'in_progress' ? 'milestone_due' : 'milestone_submitted',
        m.status === 'in_progress',
        m.status === 'in_progress' ? `Milestone ${m.index} evidence is due` : `Milestone ${m.index} is under review`,
        m.status === 'in_progress'
          ? `${m.name}. The acceptance test is: ${m.acceptanceTest}`
          : 'The department has the evidence. A finding is due inside the review window.',
        `/s/pilots/${pilot.id}`,
        intBetween(rand, 0, 6),
        pilot.caseId,
        m.dueOn,
      );
    });

  claims
    .filter((c) => c.status === 'on_hold')
    .forEach((c) => {
      const su = users.find((u) => u.startupId === c.startupId);
      if (!su) return;
      notify(
        su.id,
        'payment_delayed',
        true,
        `${c.caseId} is on hold at accounts`,
        c.holdReason ?? 'The claim is held. Open it to see what is needed.',
        '/s/payments',
        3,
        c.caseId,
      );
    });

  const integrations: IntegrationHealth[] = [
    {
      id: 'INT-DPIIT',
      name: 'DPIIT / Startup India recognition',
      purpose: 'Checks a startup’s recognition number and validity when a profile is saved and again at screening.',
      status: 'mock_healthy',
      lastSyncAt: iso(subDays(NOW, 0)),
      failureCount: 0,
      pendingVerification: 4,
      note: 'Mock provider. No live government API is called by this build.',
    },
    {
      id: 'INT-GEM',
      name: 'Government e-Marketplace',
      purpose: 'Publishes a validated solution as a catalogue item after a gate 6 decision.',
      status: 'not_configured',
      failureCount: 0,
      pendingVerification: 0,
      note: 'Mock provider, not configured for this department. No live government API is called by this build.',
    },
    {
      id: 'INT-PFMS',
      name: 'Public Financial Management System',
      purpose: 'Records payment references against approved claims.',
      status: 'mock_degraded',
      lastSyncAt: iso(subDays(NOW, 2)),
      failureCount: 3,
      pendingVerification: 2,
      note: 'Mock provider returning intermittent failures so the error path can be demonstrated. Not a live integration.',
    },
    {
      id: 'INT-GSTN',
      name: 'GST Network',
      purpose: 'Confirms a live GST registration before a claim is released.',
      status: 'mock_healthy',
      lastSyncAt: iso(subDays(NOW, 1)),
      failureCount: 0,
      pendingVerification: 1,
      note: 'Mock provider. No live government API is called by this build.',
    },
    {
      id: 'INT-ESIGN',
      name: 'Aadhaar eSign',
      purpose: 'Signs the pilot agreement and the validation report.',
      status: 'mock_healthy',
      lastSyncAt: iso(subDays(NOW, 3)),
      failureCount: 0,
      pendingVerification: 0,
      note: 'Mock provider. Signatures in this build are demonstration records, not legally executed signatures.',
    },
    {
      id: 'INT-SSO',
      name: 'Government single sign-on',
      purpose: 'Authenticates departmental users.',
      status: 'mock_healthy',
      lastSyncAt: iso(subDays(NOW, 0)),
      failureCount: 0,
      pendingVerification: 0,
      note: 'Mock provider. The demo role switcher stands in for it.',
    },
    {
      id: 'INT-EMAIL',
      name: 'Email notification service',
      purpose: 'Sends the notifications listed in the notification centre.',
      status: 'mock_healthy',
      lastSyncAt: iso(subDays(NOW, 0)),
      failureCount: 1,
      pendingVerification: 0,
      note: 'Mock provider. Nothing is actually sent by this build.',
    },
    {
      id: 'INT-SMS',
      name: 'SMS gateway',
      purpose: 'Sends deadline reminders to field users.',
      status: 'mock_down',
      lastSyncAt: iso(subDays(NOW, 6)),
      failureCount: 12,
      pendingVerification: 0,
      note: 'Mock provider set to a failing state so the degraded path is visible. Not a live integration.',
    },
  ];

  void departments;

  return { gates, audit, notifications, integrations };
}
