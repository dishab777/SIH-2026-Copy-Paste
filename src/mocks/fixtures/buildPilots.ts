import { addDays, subDays } from 'date-fns';
import { digest, intBetween, makeRandom, pick } from '@/lib/ids';
import { READINESS_WEIGHTS } from '@/config/rubrics';
import { policyNumber } from '@/config/policies';
import type {
  Application,
  CatalogueSolution,
  ChangeRequest,
  Challenge,
  Contract,
  Department,
  Evidence,
  Incident,
  Kpi,
  Milestone,
  PaymentClaim,
  Pilot,
  PilotStatus,
  ProcurementCase,
  ReadinessComponent,
  Risk,
  ScaleUpCase,
  Startup,
  User,
  ValidationReport,
} from '@/types/models';
import { NOW, iso } from './buildCore';
import { RISK_LIBRARY } from './reference';

export interface PilotFixtures {
  pilots: Pilot[];
  contracts: Contract[];
  milestones: Milestone[];
  kpis: Kpi[];
  evidence: Evidence[];
  risks: Risk[];
  incidents: Incident[];
  changeRequests: ChangeRequest[];
  claims: PaymentClaim[];
  validations: ValidationReport[];
  procurement: ProcurementCase[];
  scaleUps: ScaleUpCase[];
  catalogue: CatalogueSolution[];
}

const PILOT_PLAN: readonly { status: PilotStatus; gate: string; milestoneCount: number }[] = [
  { status: 'validated', gate: 'G6', milestoneCount: 3 }, // hero
  { status: 'executing', gate: 'G4', milestoneCount: 3 },
  { status: 'executing', gate: 'G4', milestoneCount: 3 },
  { status: 'executing', gate: 'G4', milestoneCount: 6 },
  { status: 'awaiting_validation', gate: 'G5', milestoneCount: 3 },
  { status: 'awaiting_validation', gate: 'G5', milestoneCount: 3 },
  { status: 'validated', gate: 'G6', milestoneCount: 3 },
  { status: 'not_validated', gate: 'G6', milestoneCount: 3 },
  { status: 'closed_after_pilot', gate: 'G6', milestoneCount: 3 },
];

export function buildPilots(
  challenges: Challenge[],
  applications: Application[],
  startups: Startup[],
  departments: Department[],
  users: User[],
): PilotFixtures {
  const rand = makeRandom(310026);
  const pilots: Pilot[] = [];
  const contracts: Contract[] = [];
  const milestones: Milestone[] = [];
  const kpis: Kpi[] = [];
  const evidence: Evidence[] = [];
  const risks: Risk[] = [];
  const incidents: Incident[] = [];
  const changeRequests: ChangeRequest[] = [];
  const claims: PaymentClaim[] = [];
  const validations: ValidationReport[] = [];
  const procurement: ProcurementCase[] = [];
  const scaleUps: ScaleUpCase[] = [];
  const catalogue: CatalogueSolution[] = [];

  const heroChallenge = challenges.find((c) => c.caseId === 'CH-2026-0143')!;
  const awardedChallenges = [
    heroChallenge,
    ...challenges.filter((c) => c.caseId !== 'CH-2026-0143' && c.status === 'awarded'),
  ].slice(0, PILOT_PLAN.length);

  const paymentLimitDays = policyNumber('payment.milestone.limit.days');

  let claimCount = 0;
  let incidentCount = 0;

  awardedChallenges.forEach((challenge, pi) => {
    const plan = PILOT_PLAN[pi]!;
    const isHero = pi === 0;
    const caseId = `PL-2026-${String(31 + pi * 3).padStart(4, '0')}`;
    const pilotId = isHero ? 'PIL-HERO' : `PIL-${String(pi + 1).padStart(3, '0')}`;

    const winner =
      applications.find((a) => a.challengeId === challenge.id && a.status === 'awarded') ??
      applications.find((a) => a.challengeId === challenge.id && a.status === 'shortlisted') ??
      applications.find((a) => a.challengeId === challenge.id)!;
    const startup = startups.find((s) => s.id === winner.startupId) ?? startups[pi + 1]!;
    const dept = departments.find((d) => d.id === challenge.departmentId)!;
    const deptOfficer = users.find((u) => u.departmentId === dept.id && u.role === 'department_officer')!;

    const duration = challenge.pilot.durationDays;
    // Executing pilots sit part way through; finished ones ended in the past.
    const dayOfPilot =
      plan.status === 'executing' ? (pi === 1 ? 52 : intBetween(rand, 30, 70)) : duration;
    const startedOn = subDays(NOW, isHero ? 92 : dayOfPilot + (plan.status === 'executing' ? 0 : intBetween(rand, 14, 60)));
    const endsOn = addDays(startedOn, duration);

    const budget = challenge.pilot.budgetPaise;

    // Milestones: split the budget exactly. Arithmetic is enforced, never approximated.
    const count = plan.milestoneCount;
    const shares =
      count === 3 ? [0.35, 0.35, 0.3] : [0.2, 0.2, 0.15, 0.15, 0.15, 0.15];
    const amounts = shares.slice(0, count).map((s) => Math.round(budget * s));
    amounts[amounts.length - 1] = budget - amounts.slice(0, -1).reduce((a, b) => a + b, 0);

    const pilotMilestones: Milestone[] = amounts.map((amount, mi) => {
      const template = challenge.pilot.milestones[Math.min(mi, challenge.pilot.milestones.length - 1)]!;
      const dueOn = addDays(startedOn, Math.round(((mi + 1) / count) * duration));
      const passed = dueOn < NOW;

      let status: Milestone['status'] = 'not_started';
      let acceptedOn: Date | undefined;
      let submittedOn: Date | undefined;
      let finding: Milestone['acceptanceFinding'] | undefined;

      if (plan.status === 'executing') {
        if (mi === 0) {
          status = 'paid';
          submittedOn = subDays(dueOn, 2);
          acceptedOn = addDays(dueOn, 3);
          finding = 'met';
        } else if (passed) {
          status = 'under_review';
          submittedOn = subDays(NOW, intBetween(rand, 2, 9));
        } else if (mi === 1) {
          status = 'in_progress';
        }
      } else {
        // Completed pilots: everything submitted and reviewed.
        submittedOn = subDays(dueOn, 2);
        acceptedOn = addDays(dueOn, intBetween(rand, 2, 8));
        if (plan.status === 'not_validated' && mi === 2) {
          status = 'approved';
          finding = 'partially_met';
        } else {
          status = mi === count - 1 && plan.status !== 'closed_after_pilot' ? 'approved' : 'paid';
          finding = 'met';
        }
      }

      // The hero pilot has a precise, told-in-the-demo state.
      if (isHero) {
        submittedOn = subDays(startedOn, -Math.round(((mi + 1) / count) * duration) + 2);
        if (mi === 0) {
          status = 'paid';
          acceptedOn = addDays(startedOn, 32);
          finding = 'met';
        } else if (mi === 1) {
          status = 'approved';
          acceptedOn = subDays(NOW, 34);
          finding = 'met';
        } else {
          status = 'approved';
          acceptedOn = subDays(NOW, 12);
          finding = 'met';
        }
      }

      return {
        id: `${pilotId}-M${mi + 1}`,
        caseId: `${caseId}/M${mi + 1}`,
        pilotId,
        index: mi + 1,
        name: template.name,
        requirement: template.requirement,
        acceptanceTest: template.acceptanceTest,
        evidenceRequired: template.evidenceRequired,
        paymentPaise: amount,
        dueOn: iso(dueOn),
        status,
        submittedOn: submittedOn ? iso(submittedOn) : undefined,
        acceptedOn: acceptedOn ? iso(acceptedOn) : undefined,
        reviewNote:
          finding === 'partially_met'
            ? 'Coverage reached 88 percent of installed points against a 95 percent acceptance criterion. Accepted in part; the shortfall is recorded against the validation findings.'
            : status === 'under_review'
              ? undefined
              : finding === 'met'
                ? 'Acceptance test met in full. Evidence verified against the submitted records.'
                : undefined,
        acceptanceFinding: finding,
        evidenceIds: [],
      };
    });

    milestones.push(...pilotMilestones);

    const spent = pilotMilestones
      .filter((m) => m.status === 'paid' || m.status === 'approved')
      .reduce((sum, m) => sum + m.paymentPaise, 0);

    const pilot: Pilot = {
      id: pilotId,
      caseId,
      challengeId: challenge.id,
      applicationId: winner.id,
      startupId: startup.id,
      departmentId: dept.id,
      title: challenge.title,
      status: plan.status,
      currentGate: plan.gate as Pilot['currentGate'],
      gateEnteredOn: iso(subDays(NOW, isHero ? 6 : intBetween(rand, 3, 30))),
      startedOn: iso(startedOn),
      endsOn: iso(endsOn),
      durationDays: duration,
      budgetPaise: budget,
      spentPaise: spent,
      scope: `${challenge.outcome.statement} Delivered across the sites listed in schedule A, measured by the method published with the challenge.`,
      successCriteria: [
        `${challenge.outcome.targetMetric} ${challenge.outcome.direction === 'decrease' ? 'reduced to' : 'raised to'} ${challenge.outcome.magnitude} ${challenge.outcome.unit} or better`,
        'Measurement method reproducible by an independent validator from the raw records',
        'No unresolved high-severity security incident at the close of the pilot',
        'Departmental staff able to operate the solution unaided at handover',
      ],
      contacts: [
        { name: deptOfficer.name, role: 'Department nodal officer', email: deptOfficer.email },
        { name: 'Authorised signatory', role: `${startup.tradeName} project lead`, email: `project@${startup.slug}.in` },
      ],
      contractId: `CTR-${pilotId}`,
      sandbox: {
        environment: `${dept.shortName} innovation sandbox, ${dept.district}`,
        dataTier: challenge.departmentProvides.dataTier,
        credentialExpiry: iso(addDays(startedOn, policyNumber('data.credential.maxDays'))),
        egressRules: [
          'No export of departmental data from the sandbox',
          'Outbound network restricted to the named model endpoint',
          'All queries logged with the requesting identity and retained in India',
        ],
        accessLog: Array.from({ length: 6 }, (_, l) => ({
          at: iso(subDays(NOW, l * 3 + 1)),
          actor: l % 2 === 0 ? `${startup.tradeName} engineer` : deptOfficer.name,
          action: l % 3 === 0 ? 'Query executed against the masked extract' : 'Sandbox session opened',
        })),
      },
      blocked:
        pi === 3
          ? {
              reason:
                'Milestone 3 evidence has been under review for 11 days against a 10-day review window. Gate 4 cannot clear until the department records an explicit finding.',
              since: iso(subDays(NOW, 11)),
            }
          : undefined,
    };
    pilots.push(pilot);

    // Contract.
    contracts.push({
      id: `CTR-${pilotId}`,
      caseId: `${caseId}/CTR`,
      pilotId,
      startupId: startup.id,
      templateId: 'TPL-AGR-01',
      templateVersion: 'v5.2',
      clauseIds: ['CL-IP-01', 'CL-IP-02', 'CL-DATA-01', 'CL-DATA-02', 'CL-PAY-01', 'CL-PAY-02', 'CL-CYBER-01', 'CL-EXIT-01'],
      deviations:
        pi === 2
          ? [
              {
                clauseId: 'CL-DATA-02',
                level: 'minor',
                reason:
                  'A second hosting region inside India was added to meet the availability requirement. Both regions are named in the sub-processor register.',
                approvedBy: 'Department data custodian',
              },
            ]
          : [],
      status: 'signed',
      generatedOn: iso(subDays(startedOn, 8)),
      signedOn: iso(subDays(startedOn, 3)),
      signature: {
        name: users.find((u) => u.startupId === startup.id)?.name ?? 'Authorised signatory',
        designation: 'Authorised signatory',
        method: 'Aadhaar eSign (mock provider — not a live government integration)',
        at: iso(subDays(startedOn, 3)),
        hash: digest(`${pilotId}-contract`),
      },
      totalPaise: budget,
    });

    // KPI. The hero pilot lands the demo figures exactly.
    const ck = challenge.kpis[0]!;
    const finalValue =
      plan.status === 'not_validated'
        ? ck.baselineValue * 0.94
        : ck.direction === 'decrease'
          ? ck.targetValue * (0.9 + rand() * 0.16)
          : ck.targetValue * (0.92 + rand() * 0.14);
    // A pilot still running has moved part of the way, not all of it. Showing a
    // finished figure at the halfway mark would be a lie the validator would catch.
    const progress = plan.status === 'executing' ? Math.min(1, dayOfPilot / duration) : 1;
    const achieved = isHero
      ? 113.4 // 180 -> 113.4 minutes, a 37 percent reduction against a 30 percent target
      : ck.baselineValue + (finalValue - ck.baselineValue) * progress;

    const weeks = Math.max(4, Math.round(dayOfPilot / 7));
    const series = Array.from({ length: weeks }, (_, w) => {
      const progress = (w + 1) / weeks;
      const value =
        ck.baselineValue + (achieved - ck.baselineValue) * Math.min(1, progress * 1.08) + (rand() - 0.5) * (ck.baselineValue * 0.03);
      return {
        at: iso(addDays(startedOn, (w + 1) * 7)),
        value: Number(value.toFixed(1)),
        sampleSize: intBetween(rand, 42, 220),
      };
    });

    kpis.push({
      id: `KPI-${pilotId}-1`,
      pilotId,
      name: ck.name,
      unit: ck.unit,
      kind: ck.unit === 'percent' ? 'percentage' : ck.unit === 'minutes' || ck.unit === 'hours' || ck.unit === 'days' ? 'time' : 'numeric',
      baseline: ck.baselineValue,
      target: ck.targetValue,
      current: Number(achieved.toFixed(1)),
      direction: ck.direction,
      method: ck.method,
      frequency: ck.frequency,
      ownerId: deptOfficer.id,
      evidenceIds: [],
      series,
    });

    if (isHero) {
      kpis.push({
        id: 'KPI-HERO-2',
        pilotId,
        name: 'Non-revenue water in the pilot zone',
        unit: 'percent',
        kind: 'percentage',
        baseline: 34,
        target: 28,
        current: 27.1,
        direction: 'decrease',
        method: 'Bulk inflow at the reservoir outlet against billed consumption, monthly, for the pilot zone only.',
        frequency: 'Monthly',
        ownerId: deptOfficer.id,
        evidenceIds: [],
        series: [
          { at: iso(addDays(startedOn, 30)), value: 33.1, sampleSize: 1 },
          { at: iso(addDays(startedOn, 60)), value: 30.4, sampleSize: 1 },
          { at: iso(addDays(startedOn, 90)), value: 27.1, sampleSize: 1 },
        ],
      });
      kpis.push({
        id: 'KPI-HERO-3',
        pilotId,
        name: 'Crew jobs closed on first visit',
        unit: 'percent',
        kind: 'percentage',
        baseline: 58,
        target: 75,
        current: 79.2,
        direction: 'increase',
        method: 'Crew job cards marked closed without a repeat visit, as a share of dispatched jobs.',
        frequency: 'Weekly',
        ownerId: deptOfficer.id,
        evidenceIds: [],
        series: Array.from({ length: 12 }, (_, w) => ({
          at: iso(addDays(startedOn, (w + 1) * 7)),
          value: Number((58 + (79.2 - 58) * ((w + 1) / 12) + (rand() - 0.5) * 2).toFixed(1)),
          sampleSize: intBetween(rand, 30, 70),
        })),
      });
    }

    // Evidence against submitted milestones.
    pilotMilestones
      .filter((m) => m.submittedOn)
      .forEach((m, mi) => {
        m.evidenceRequired.forEach((type, ei) => {
          const evId = `EVD-${pilotId}-${mi}-${ei}`;
          const scan: Evidence['scan'] = pi === 2 && mi === 1 && ei === 0 ? 'failed' : 'clean';
          evidence.push({
            id: evId,
            pilotId,
            milestoneId: m.id,
            fileName: `${type.toLowerCase().replace(/\s+/g, '-')}-m${mi + 1}-${startup.slug}.pdf`,
            type,
            sizeBytes: intBetween(rand, 240_000, 8_400_000),
            uploadedBy: `${startup.tradeName}`,
            uploadedAt: m.submittedOn!,
            hash: digest(evId),
            scan,
            verifiedBy: m.acceptedOn ? deptOfficer.name : undefined,
            verifiedAt: m.acceptedOn,
            verification: scan === 'failed' ? 'failed' : m.acceptedOn ? 'verified' : 'pending',
            version: scan === 'failed' ? 2 : 1,
            access: 'restricted',
          });
          m.evidenceIds.push(evId);
        });
      });

    // Risks.
    const riskCount = intBetween(rand, 3, 5);
    for (let r = 0; r < riskCount; r += 1) {
      const spec = RISK_LIBRARY[(pi * 3 + r) % RISK_LIBRARY.length]!;
      risks.push({
        id: `RSK-${pilotId}-${r + 1}`,
        pilotId,
        title: spec.title,
        category: spec.category,
        probability: intBetween(rand, 1, 4) as Risk['probability'],
        impact: intBetween(rand, 2, 5) as Risk['impact'],
        mitigation: spec.mitigation,
        ownerId: r % 2 === 0 ? deptOfficer.id : (users.find((u) => u.startupId === startup.id)?.id ?? deptOfficer.id),
        status: r === 0 ? 'mitigating' : r === riskCount - 1 ? 'closed' : 'open',
        reviewedOn: iso(subDays(NOW, intBetween(rand, 2, 20))),
      });
    }

    // Five incidents across the programme.
    if (incidentCount < 5 && (pi === 0 || pi === 1 || pi === 3 || pi === 6)) {
      const severity: Incident['severity'] = pi === 3 ? 'high' : pi === 0 ? 'low' : 'medium';
      const detected = subDays(NOW, intBetween(rand, 4, 40));
      const resolved = pi !== 3;
      incidentCount += 1;
      incidents.push({
        id: `INC-${pilotId}-1`,
        pilotId,
        title:
          pi === 3
            ? 'Sandbox credential shared outside the named engineering team'
            : pi === 0
              ? 'Logger firmware update pushed outside the agreed change window'
              : 'Unnotified sub-processor detected in the hosting register',
        severity,
        detectedAt: iso(detected),
        ownerId: deptOfficer.id,
        resolutionDeadline: iso(addDays(detected, severity === 'high' ? 2 : 7)),
        status: resolved ? 'resolved' : 'open',
        resolution: resolved
          ? 'Credential rotated, access log reviewed for the affected window, and the change window written into the sandbox operating procedure.'
          : undefined,
        resolvedAt: resolved ? iso(addDays(detected, intBetween(rand, 1, 5))) : undefined,
        evidenceIds: [],
      });
      if (pi === 0) {
        incidentCount += 1;
        incidents.push({
          id: `INC-${pilotId}-2`,
          pilotId,
          title: 'Masked extract query returned more rows than the agreed field list permits',
          severity: 'medium',
          detectedAt: iso(subDays(NOW, 61)),
          ownerId: deptOfficer.id,
          resolutionDeadline: iso(subDays(NOW, 54)),
          status: 'resolved',
          resolution:
            'Query rewritten to the agreed field list, sandbox view narrowed at the database level, and the incident reported to the department within the statutory window.',
          resolvedAt: iso(subDays(NOW, 58)),
          evidenceIds: [],
        });
      }
    }

    // One change request that moves both money and time.
    if (pi === 1) {
      changeRequests.push({
        id: `CHG-${pilotId}-1`,
        pilotId,
        title: 'Extend the measurement window by three weeks and add two depot sites',
        reason:
          'Monsoon restricted access to two depots for eleven working days during the first measurement window. Without the extension the measured period is not comparable to the published baseline.',
        raisedBy: startup.tradeName,
        raisedOn: iso(subDays(NOW, 24)),
        impact: {
          moneyPaise: 180_000 * 100,
          days: 21,
          scope: 'Two additional depot sites instrumented; measurement window extended from 60 to 81 days.',
        },
        status: 'approved',
        decidedBy: deptOfficer.name,
        decidedOn: iso(subDays(NOW, 19)),
        decisionNote:
          'Approved. The comparability of the measurement is a gate 5 precondition, so the extension is necessary rather than convenient. Additional cost drawn from the contingency line under the same budget head.',
      });
    }

    // Payment claims on accepted milestones.
    pilotMilestones
      .filter((m) => m.acceptedOn && claimCount < 14)
      .forEach((m, ci) => {
        claimCount += 1;
        const acceptedOn = new Date(m.acceptedOn!);
        const ageDays = Math.floor((NOW.getTime() - acceptedOn.getTime()) / 86_400_000);
        const overdue = ageDays > paymentLimitDays;
        const hasDeduction = isHero && ci === 1;
        const deduction = hasDeduction ? Math.round(m.paymentPaise * 0.04) : 0;

        let status: PaymentClaim['status'] = 'approved';
        if (m.status === 'paid') status = 'paid';
        else if (claimCount === 4) status = 'on_hold';
        else if (overdue) status = 'in_approval';

        claims.push({
          id: `CLM-${pilotId}-${ci + 1}`,
          caseId: `CLM-2026-${String(100 + claimCount).padStart(4, '0')}`,
          pilotId,
          milestoneId: m.id,
          startupId: startup.id,
          departmentId: dept.id,
          amountPaise: m.paymentPaise,
          deductionPaise: deduction,
          deductionReason: hasDeduction
            ? 'Liquidated damages for a nine-day delay in milestone 2 handover, applied at the rate in schedule B part 3.'
            : undefined,
          netPaise: m.paymentPaise - deduction,
          acceptedOn: m.acceptedOn!,
          invoiceNumber: `INV/${startup.slug.slice(0, 6).toUpperCase()}/2026/${String(claimCount).padStart(3, '0')}`,
          invoiceOn: iso(addDays(acceptedOn, 1)),
          status,
          approvalStep:
            status === 'paid'
              ? 'Paid'
              : status === 'on_hold'
                ? 'Held at accounts'
                : status === 'in_approval'
                  ? 'With the department finance officer'
                  : 'With the procurement officer for release',
          holdReason:
            status === 'on_hold'
              ? 'The GST registration on file shows as suspended. Accounts needs a current registration certificate before release.'
              : undefined,
          heldBy: status === 'on_hold' ? 'Accounts officer, ' + dept.shortName : undefined,
          paidOn: status === 'paid' ? iso(addDays(acceptedOn, intBetween(rand, 8, 26))) : undefined,
          paymentReference:
            status === 'paid' ? `PFMS/${dept.id}/2026/${intBetween(rand, 100000, 999999)}` : undefined,
          exception:
            status === 'on_hold'
              ? 'Supplier registration document expired'
              : hasDeduction
                ? 'Deduction applied — requires individual approval'
                : undefined,
        });
      });

    // Validation, procurement and scale-up for finished pilots.
    if (['awaiting_validation', 'validated', 'not_validated', 'closed_after_pilot'].includes(plan.status)) {
      const validatorUser = users.filter((u) => u.role === 'validator')[pi % 3]!;
      const signed = plan.status !== 'awaiting_validation';
      const outcome: ValidationReport['outcome'] =
        plan.status === 'validated'
          ? isHero
            ? 'validated'
            : 'validated_with_qualifications'
          : plan.status === 'not_validated'
            ? 'not_validated'
            : plan.status === 'closed_after_pilot'
              ? 'validated_with_qualifications'
              : undefined;

      const kpi = kpis.find((k) => k.pilotId === pilotId)!;
      const claimedPct = Math.abs(((kpi.baseline - kpi.current) / kpi.baseline) * 100);

      validations.push({
        id: `VAL-${pilotId}`,
        caseId: `VR-2026-${String(20 + pi).padStart(4, '0')}`,
        pilotId,
        validatorId: validatorUser.id,
        status: signed ? 'signed' : 'in_progress',
        outcome,
        findings: pilot.successCriteria.map((criterion, fi) => ({
          criterion,
          claimed:
            fi === 0
              ? `${claimedPct.toFixed(0)} percent improvement against baseline`
              : fi === 1
                ? 'Method published and reproducible'
                : fi === 2
                  ? 'No unresolved high-severity incident'
                  : 'Staff able to operate unaided',
          observed:
            fi === 0
              ? isHero
                ? '37 percent improvement reproduced from the raw crew job cards and logger records'
                : plan.status === 'not_validated'
                  ? '6 percent improvement, against a target of 18 percent'
                  : `${(claimedPct - 2).toFixed(0)} percent reproduced from the raw records`
              : fi === 1
                ? isHero
                  ? 'Re-derived independently from the complaint register and logger exports'
                  : 'Reproduced with a documented adjustment for two missing weeks'
                : fi === 2
                  ? 'Confirmed against the incident log'
                  : 'Two departmental staff completed the procedure unaided during the site visit',
          finding:
            plan.status === 'not_validated' && fi === 0
              ? 'not_met'
              : !isHero && fi === 1
                ? 'partially_met'
                : 'met',
          note:
            plan.status === 'not_validated' && fi === 0
              ? 'The observed improvement is within the ordinary seasonal variation of the baseline series and cannot be attributed to the pilot.'
              : isHero && fi === 0
                ? 'Median leak detection time fell from 180 minutes to 113.4 minutes across 1,146 dispatched jobs in the pilot period. The figure was re-derived from source records rather than accepted from the supplier dashboard.'
                : 'Consistent with the records provided.',
        })),
        rederivation: {
          records: isHero
            ? 'Ward complaint register export (1,146 rows), crew job card scans, acoustic logger event exports, and district meter readings for the pilot zone.'
            : 'Departmental register export and supplier measurement dataset for the pilot period.',
          reproduced: plan.status !== 'not_validated',
          note:
            plan.status === 'not_validated'
              ? 'The supplier figure could be reproduced arithmetically, but the comparison period is not equivalent to the baseline period. The claim does not survive that correction.'
              : isHero
                ? 'The claimed figure was reproduced to within 0.4 minutes using only departmental source records.'
                : 'Reproduced with a documented adjustment for two weeks of missing readings.',
        },
        securityAudit: {
          done: true,
          findingsOpen: plan.status === 'not_validated' ? 2 : 0,
          note:
            plan.status === 'not_validated'
              ? 'Two medium findings remain open at the close of the pilot: log retention below the statutory period, and a sub-processor added without prior notice.'
              : 'All findings closed before the close of the pilot. Log retention verified in India for the statutory period.',
        },
        dataAttestation: {
          signed: true,
          note: 'Masked tier only. Erasure certified within thirty days of the measurement window closing.',
        },
        qualifications:
          outcome === 'validated_with_qualifications'
            ? 'The outcome is validated for the pilot zone only. Two weeks of readings are missing from the middle of the measurement window and have been excluded rather than interpolated.'
            : undefined,
        signedAt: signed ? iso(subDays(NOW, isHero ? 9 : intBetween(rand, 10, 60))) : undefined,
        hash: signed ? digest(`${pilotId}-validation`) : undefined,
        publishedSummary: signed
          ? isHero
            ? 'Leak detection time fell 37 percent against a 30 percent target, reproduced independently from departmental records. Validated.'
            : plan.status === 'not_validated'
              ? 'The claimed improvement is within ordinary seasonal variation and could not be attributed to the pilot. Not validated.'
              : 'Outcome achieved with qualifications recorded on missing data.'
          : undefined,
      });

      if (plan.status !== 'awaiting_validation') {
        const components: ReadinessComponent[] = READINESS_WEIGHTS.map((w) => {
          const raw = isHero
            ? { kpi: 100, technical: 92, cost: 88, security: 100, satisfaction: 82, operations: 80, scalability: 86 }[w.key] ?? 80
            : plan.status === 'not_validated'
              ? { kpi: 28, technical: 60, cost: 55, security: 45, satisfaction: 50, operations: 55, scalability: 40 }[w.key] ?? 45
              : { kpi: 84, technical: 78, cost: 74, security: 90, satisfaction: 70, operations: 68, scalability: 72 }[w.key] ?? 72;
          return {
            key: w.key,
            label: w.label,
            weightPercent: w.weightPercent,
            rawScore: raw,
            weighted: Number(((raw * w.weightPercent) / 100).toFixed(1)),
            basis: w.basis,
            evidence: isHero
              ? {
                  kpi: 'Validation report VR-2026-0020, finding 1',
                  technical: 'Three milestones, all accepted with a met finding',
                  cost: 'Delivered inside the ₹15,00,000 budget, against ₹26,00,000 quoted for the closest alternative',
                  security: 'Security audit closed with no open findings',
                  satisfaction: 'Crew survey, 41 of 50 respondents, conducted in week 11',
                  operations: 'Two departmental staff operated the system unaided at handover',
                  scalability: 'Logger density model tested against three additional zone topologies',
                }[w.key] ?? 'Recorded in the pilot file'
              : 'Recorded in the pilot file',
          };
        });
        const total = Number(components.reduce((s, c) => s + c.weighted, 0).toFixed(0));

        const decided = plan.status === 'closed_after_pilot' || plan.status === 'not_validated';

        procurement.push({
          id: `PRC-${pilotId}`,
          caseId: `PC-2026-${String(10 + pi).padStart(4, '0')}`,
          pilotId,
          readiness: { total, components, computedAt: iso(subDays(NOW, isHero ? 6 : 20)) },
          pathwayId: decided ? 'close' : undefined,
          pathwayJustification: decided
            ? plan.status === 'not_validated'
              ? 'The outcome was not validated. Procuring on an unvalidated claim would not survive audit, and the recurring cost is not justified by a six percent movement inside seasonal variation. The learning is recorded and published.'
              : 'The outcome was achieved but the recurring cost per ward exceeds the value released at current volumes. Closed with the replication package published so another department with a larger network can reuse the work.'
            : undefined,
          reasonsAgainst: decided
            ? 'Closing forgoes a working capability that the department may need again within two years. The replication package mitigates this.'
            : undefined,
          vfm: {
            pilotCostPaise: budget,
            alternativeCostPaise: isHero ? 2_600_000 * 100 : Math.round(budget * 1.3),
            savingPercent: isHero
              ? Number((((2_600_000 * 100 - budget) / (2_600_000 * 100)) * 100).toFixed(1))
              : 23.1,
            note: isHero
              ? 'Compared against the quoted cost of a conventional district-metering retrofit for the same zone, which was the only comparable alternative available.'
              : 'Compared against the closest available market alternative on the state rate contract.',
          },
          decidedBy: decided ? users.find((u) => u.departmentId === dept.id && u.role === 'procurement_officer')?.name : undefined,
          decidedOn: decided ? iso(subDays(NOW, 14)) : undefined,
          status: decided ? 'decided' : 'assessing',
        });
      }
    }
  });

  // Hero scale-up and catalogue entry, ready for a gate 6 decision.
  const heroPilot = pilots[0]!;
  const heroStartup = startups.find((s) => s.id === heroPilot.startupId)!;
  const heroProcurement = procurement.find((p) => p.pilotId === heroPilot.id)!;

  scaleUps.push({
    id: 'SCL-HERO',
    caseId: 'SC-2026-0004',
    procurementCaseId: heroProcurement.id,
    pilotId: heroPilot.id,
    districts: [
      'Pune',
      'Pimpri-Chinchwad',
      'Nashik',
      'Nagpur',
      'Thane',
      'Kalyan-Dombivli',
      'Aurangabad',
      'Solapur',
      'Kolhapur',
      'Amravati',
    ],
    projectedValuePaise: 2_40_00_000 * 100,
    replicationPackage: {
      generatedOn: iso(subDays(NOW, 5)),
      contents: [
        'Challenge document as published, with the baseline method',
        'Eligibility rule set and the version in force at award',
        'Evaluation rubric v3.1 with anchored descriptors',
        'Pilot agreement v5.2 with the deviations recorded',
        'Milestone schedule and acceptance tests',
        'Measurement plan, sample sizes and confounder list',
        'Independent validation report VR-2026-0020 with its hash',
        'Security audit summary and data attestation',
        'Lessons: two things that cost time and how to avoid them',
      ],
      hash: digest('SCL-HERO-package'),
    },
    catalogueSolutionId: 'CAT-001',
    status: 'planned',
  });

  catalogue.push({
    id: 'CAT-001',
    slug: 'acoustic-leak-localisation',
    name: 'Acoustic leak localisation for water distribution networks',
    startupId: heroStartup.id,
    provedByDepartmentId: heroPilot.departmentId,
    pilotId: heroPilot.id,
    validatedMetrics: [
      { name: 'Average leak detection time', baseline: '180 minutes', result: '113.4 minutes', target: '120 minutes' },
      { name: 'Non-revenue water in the pilot zone', baseline: '34 percent', result: '27.1 percent', target: '28 percent' },
      { name: 'Crew jobs closed on first visit', baseline: '58 percent', result: '79.2 percent', target: '75 percent' },
    ],
    validatorName: 'Centre for Applied Measurement, Pune',
    validatedOn: iso(subDays(NOW, 9)),
    attestations: [
      'Security audit closed with no open findings',
      'Data-handling attestation signed, masked tier only',
      'Erasure certified within thirty days of the measurement window',
    ],
    adoptionPathway:
      'The replication package includes the challenge, rules, rubric, agreement and measurement plan. A department with a comparable trunk network can publish a challenge from it in a working week.',
    replicationPackageId: 'SCL-HERO',
    adoptedByDepartmentIds: [],
    summary:
      'Permanent acoustic loggers correlated against a pressure model, delivering leak localisation to a 30-metre segment into the existing complaint register.',
    sector: 'Water and sanitation',
  });

  // A second catalogue entry from another validated pilot, so the catalogue is not a single row.
  const secondValidated = pilots.find((p) => p.id !== heroPilot.id && p.status === 'validated');
  if (secondValidated) {
    const sv = validations.find((v) => v.pilotId === secondValidated.id);
    const svStartup = startups.find((s) => s.id === secondValidated.startupId)!;
    const svKpi = kpis.find((k) => k.pilotId === secondValidated.id)!;
    catalogue.push({
      id: 'CAT-002',
      slug: secondValidated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: secondValidated.title,
      startupId: svStartup.id,
      provedByDepartmentId: secondValidated.departmentId,
      pilotId: secondValidated.id,
      validatedMetrics: [
        {
          name: svKpi.name,
          baseline: `${svKpi.baseline} ${svKpi.unit}`,
          result: `${svKpi.current} ${svKpi.unit}`,
          target: `${svKpi.target} ${svKpi.unit}`,
        },
      ],
      validatorName: users.find((u) => u.id === sv?.validatorId)?.name ?? 'Independent validation body',
      validatedOn: sv?.signedAt ?? iso(subDays(NOW, 40)),
      attestations: ['Security audit closed', 'Data-handling attestation signed'],
      adoptionPathway:
        'Validated with qualifications. The replication package records which two weeks of data were missing and why, so an adopting department can plan around it.',
      replicationPackageId: 'SCL-HERO',
      adoptedByDepartmentIds: [],
      summary: secondValidated.scope,
      sector: pick(rand, ['Urban transport', 'Solid waste', 'Public works']),
    });
  }

  // Department portfolio counters.
  departments.forEach((d) => {
    d.livePilots = pilots.filter((p) => p.departmentId === d.id && p.status === 'executing').length;
    d.releasedPaise = claims
      .filter((c) => c.departmentId === d.id && c.status === 'paid')
      .reduce((sum, c) => sum + c.netPaise, 0);
  });

  return {
    pilots,
    contracts,
    milestones,
    kpis,
    evidence,
    risks,
    incidents,
    changeRequests,
    claims,
    validations,
    procurement,
    scaleUps,
    catalogue,
  };
}
