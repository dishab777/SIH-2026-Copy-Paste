import { addDays, subDays } from 'date-fns';
import { digest, intBetween, makeRandom, pick, pickMany } from '@/lib/ids';
import { RUBRICS } from '@/config/rubrics';
import { ELIGIBILITY_RULES } from '@/config/rules';
import type { GateId } from '@/config/gates';
import type {
  Application,
  ApplicationStatus,
  Challenge,
  ChallengeStatus,
  ClarificationThread,
  CoiDeclaration,
  Department,
  EligibilityResult,
  Evaluation,
  EvaluationPanel,
  SolutionLanguageFlag,
  Startup,
  User,
} from '@/types/models';
import { NOW, iso } from './buildCore';
import { PROBLEM_LIBRARY } from './reference';

const LAKH = 100_000 * 100; // one lakh rupees, in paise

export interface ChallengeFixtures {
  challenges: Challenge[];
  clarifications: ClarificationThread[];
  applications: Application[];
  panels: EvaluationPanel[];
  coi: CoiDeclaration[];
  evaluations: Evaluation[];
}

const GATE_BY_INDEX: readonly GateId[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'];

/**
 * Where each of the 24 seeded challenges sits. Weighted towards gate 2 so the
 * public demand board has real volume, while still covering every gate and
 * leaving nine awarded cases for the nine seeded pilots. Index 13 is the demo
 * case, which is why it is pinned to gate 6.
 */
const GATE_DISTRIBUTION = [4, 1, 2, 3, 2, 4, 2, 5, 2, 6, 2, 0, 3, 6, 2, 3, 2, 4, 0, 2, 5, 1, 2, 3];

/** Two of the nine gate 2 cases have closed their window, so screening has something to screen. */
const CLOSED_AT_G2 = [19, 22];

/**
 * The problem library is walked twice across 24 challenges. The second pass is a
 * different slice of the same problem in the same department, which is what
 * actually happens — a city runs the same challenge for another zone.
 */
const SECOND_PASS_SCOPE = [
  'western zone',
  'phase two',
  'northern circle',
  'second corridor',
  'outer wards',
  'district extension',
  'peri-urban belt',
  'east division',
  'block cluster two',
  'ring road corridor',
  'south division',
  'satellite towns',
];

function statusForGate(gate: GateId, awarded: boolean, closesOn?: Date, now: Date = NOW): ChallengeStatus {
  if (gate === 'G0') return 'draft';
  if (gate === 'G1') return 'in_review';
  if (gate === 'G2') {
    if (!closesOn) return 'closed';
    const daysLeft = Math.ceil((closesOn.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft < 0) return 'closed';
    return daysLeft <= 10 ? 'closing_soon' : 'open';
  }
  return awarded ? 'awarded' : 'closed';
}

function milestonesFor(budgetPaise: number, durationDays: number, kind: string) {
  const split = [0.35, 0.35, 0.3];
  const names = [
    'Deployment and instrumentation complete',
    'Measurement period one complete',
    'Final measurement, handover and training complete',
  ];
  const requirements = [
    `Hardware and software deployed across the agreed sites, integrated with departmental systems, and producing readings the department can see.`,
    `First measurement window closed, with data quality reported and any gaps explained.`,
    `Full measurement period closed, results handed over with the raw records, and departmental staff trained to operate without the supplier present.`,
  ];
  const tests = [
    `Department can view live readings from at least 95 percent of installed points for seven consecutive days.`,
    `Measurement dataset covers the agreed window with under 5 percent missing readings, and the method matches the published measurement plan.`,
    `Two departmental staff independently complete the operating procedure unaided, and all raw records are transferred in an open format.`,
  ];
  return split.map((share, i) => ({
    id: `MST-${kind}-${i + 1}`,
    index: i + 1,
    name: names[i]!,
    requirement: requirements[i]!,
    acceptanceTest: tests[i]!,
    evidenceRequired:
      i === 0
        ? ['Installation report', 'Calibration record', 'Integration test log']
        : i === 1
          ? ['Measurement dataset', 'Data quality note', 'Field test report']
          : ['Final measurement dataset', 'Handover note', 'Training attendance record'],
    paymentPaise: Math.round(budgetPaise * share),
    dueDayOffset: Math.round((durationDays / 3) * (i + 1)),
  }));
}

function heroLanguageFlags(): SolutionLanguageFlag[] {
  return [
    {
      id: 'FLAG-0143-1',
      section: 'Outcome sought',
      fieldPath: 'outcome.statement',
      matchedText: 'acoustic correlator loggers',
      kind: 'technology_prescription',
      why: 'Naming the instrument decides the solution before anyone has proposed one. Gate 1 requires an outcome, not a specification.',
      suggestion:
        'Cut the time between a leak starting and a crew standing over it, without adding staff to the zone.',
      status: 'accepted',
    },
    {
      id: 'FLAG-0143-2',
      section: 'What the department provides',
      fieldPath: 'departmentProvides.systems',
      matchedText: 'SCADA historian, vendor-supplied',
      kind: 'vendor_name',
      why: 'A named product in the systems list tells applicants which supplier to build against.',
      suggestion: 'Supervisory control system historian, with a documented read-only interface.',
      status: 'accepted',
    },
  ];
}

export function buildChallenges(
  departments: Department[],
  users: User[],
  startups: Startup[],
): ChallengeFixtures {
  const rand = makeRandom(770143);
  const challenges: Challenge[] = [];
  const clarifications: ClarificationThread[] = [];
  const applications: Application[] = [];
  const panels: EvaluationPanel[] = [];
  const coi: CoiDeclaration[] = [];
  const evaluations: Evaluation[] = [];

  const evaluators = users.filter((u) => u.role === 'evaluator');
  const activeRules = ELIGIBILITY_RULES.filter((r) => r.status === 'active');

  // Twenty-four challenges. Case ids run from CH-2026-0130 so the demo case is CH-2026-0143.
  const CASE_START = 130;
  const specs = Array.from({ length: 24 }, (_, i) => {
    const problem = PROBLEM_LIBRARY[i % PROBLEM_LIBRARY.length]!;
    const dept = departments.find((d) => d.sector === problem.sector) ?? departments[i % departments.length]!;
    return { problem, dept, index: i };
  });

  // Put the water problem at the position that yields CH-2026-0143.
  const heroIndex = 13;
  const heroSpec = specs[heroIndex]!;
  heroSpec.problem = PROBLEM_LIBRARY[0]!;
  heroSpec.dept = departments[0]!;

  specs.forEach(({ problem, dept, index }) => {
    const isHero = index === heroIndex;
    const caseId = `CH-2026-${String(CASE_START + index).padStart(4, '0')}`;
    const id = `CHL-${String(index + 1).padStart(3, '0')}`;

    // Spread across all seven gates, with the required blocked and waiver cases.
    const gateIndex = isHero ? 6 : (GATE_DISTRIBUTION[index] ?? index % 7);
    const awarded = gateIndex >= 3;
    // A challenge is only ever at gates 0 to 3. Once it is awarded, the pilot
    // carries gates 4 to 6, so a challenge never sits at a gate it does not own.
    const gate = GATE_BY_INDEX[Math.min(gateIndex, 3)]!;
    const blocked = index === 11 || index === 19;
    const hasWaiver = index === 9;

    const durationDays = isHero || problem === PROBLEM_LIBRARY[0] ? 90 : pick(rand, [60, 90, 120, 150]);
    const budgetPaise = isHero ? 15 * LAKH : pick(rand, [8, 12, 15, 18, 22, 25, 30, 45]) * LAKH;

    // Gate 2 covers both "applications open" and "screening after close".
    // Half of the gate 2 cases are still inside their application window, so the
    // public demand board has live opportunities on it.
    const liveWindow = gateIndex === 2 && !CLOSED_AT_G2.includes(index);
    const createdOn = subDays(NOW, isHero ? 185 : liveWindow ? intBetween(rand, 26, 44) : intBetween(rand, 60, 240));
    const publishedOn = gateIndex >= 2 ? addDays(createdOn, intBetween(rand, 12, 20)) : undefined;
    const closesOn = publishedOn
      ? liveWindow
        ? addDays(NOW, intBetween(rand, 3, 40))
        : addDays(publishedOn, 31)
      : undefined;
    const awardedOn = awarded && publishedOn ? addDays(publishedOn, intBetween(rand, 48, 70)) : undefined;

    const nodalOfficer = users.find((u) => u.departmentId === dept.id && u.role === 'department_officer')!;

    const rubricId = problem.capabilities.includes('Machine learning') && index % 5 === 0 ? RUBRICS[1]!.id : RUBRICS[0]!.id;

    const applicantCount = gateIndex >= 2 ? (isHero ? 14 : intBetween(rand, 2, 12)) : 0;

    // Two passes over the library, so the second occurrence names its scope.
    // The demo case keeps the plain title. Every other run of the same problem
    // names the slice it covers, which is what a second challenge actually is.
    const occurrence = isHero ? 0 : Math.max(1, Math.floor(index / PROBLEM_LIBRARY.length));
    const scopeIndex = (index + Math.floor(index / PROBLEM_LIBRARY.length)) % SECOND_PASS_SCOPE.length;
    const title =
      occurrence === 0
        ? problem.title
        : `${problem.title} — ${SECOND_PASS_SCOPE[scopeIndex] ?? 'phase two'}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${dept.district
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${String(CASE_START + index)}`;

    const challenge: Challenge = {
      id,
      caseId,
      slug,
      title,
      departmentId: dept.id,
      ownerId: nodalOfficer.id,
      status: statusForGate(gate, awarded, closesOn),
      currentGate: gate,
      sector: problem.sector,
      state: dept.state,
      district: dept.district,
      capabilities: problem.capabilities,
      problem: {
        whoAffected: problem.whoAffected,
        whatHappensToday: problem.whatHappensToday,
        frequency: problem.frequency,
        costToday: problem.costToday,
        currentLimitations: problem.currentLimitations,
      },
      baseline: {
        metric: problem.baselineMetric,
        currentValue: problem.baselineValue,
        unit: problem.baselineUnit,
        method: problem.method,
        sourceOfTruth: problem.sourceOfTruth,
        period: '12 weeks ending 31 January 2026',
      },
      outcome: {
        statement: problem.outcomeStatement,
        targetMetric: problem.targetMetric,
        direction: problem.direction,
        magnitude: problem.magnitude,
        unit: problem.baselineUnit,
        method: problem.method,
        minimumAcceptable:
          problem.direction === 'decrease'
            ? Math.round((problem.baselineValue + problem.magnitude) / 2)
            : Math.round((problem.baselineValue + problem.magnitude) / 2),
        failureThreshold: problem.baselineValue,
      },
      departmentProvides: {
        data: `Historical records held by ${dept.shortName} covering the measurement period, plus live feeds where they exist.`,
        dataTier: index % 6 === 0 ? 'production' : index % 3 === 0 ? 'masked' : 'synthetic',
        fields: ['Timestamp', 'Location identifier', 'Reading value', 'Operator identifier', 'Status code'],
        volume: `About ${intBetween(rand, 4, 40)} lakh rows for the twelve-month window.`,
        accessMethod: 'Read-only interface inside the departmental sandbox. No export.',
        systems: ['Supervisory control system historian', 'Complaint register', 'Geographic information system'],
        siteAccess: `Escorted access to ${intBetween(rand, 3, 12)} sites on working days, arranged 48 hours in advance.`,
        users: `${intBetween(rand, 6, 40)} departmental staff available for training and feedback.`,
        staffTimeHoursPerWeek: intBetween(rand, 4, 12),
        willNotProvide: [
          'Personal data of citizens beyond the fields listed',
          'Network credentials outside the sandbox',
          'Hardware, power or connectivity at pilot sites',
          'Staff to operate the solution during the pilot',
        ],
      },
      eligibility: {
        ruleIds: activeRules.map((r) => r.id),
        relaxationsAvailable: true,
        relaxationNote:
          'Prior turnover and prior experience are relaxed for recognised startups. Technical, quality, security, safety and performance requirements are not relaxed.',
      },
      pilot: {
        durationDays,
        budgetPaise,
        budgetHead: `${dept.shortName} — ${problem.sector} innovation head, 2026-27`,
        approvalAuthority: 'Commissioner, within delegated financial powers',
        milestones: milestonesFor(budgetPaise, durationDays, caseId),
      },
      legal: {
        templateId: 'TPL-AGR-01',
        ipPosition: 'startup_retains',
        ipClauseIds: ['CL-IP-01', 'CL-IP-02'],
        dataClauseIds: ['CL-DATA-01', 'CL-DATA-02'],
        cyberLevel: index % 6 === 0 ? 'elevated' : 'standard',
        // The seeded blocked case at gate 0 is blocked because its data says so,
        // not because a flag says so. The precondition engine has to find it.
        legalPreClearance: !(index === 11 || (gateIndex === 0 && index % 3 === 0)),
        legalPreClearanceNote:
          index === 11 || (gateIndex === 0 && index % 3 === 0)
            ? 'Requested from the departmental legal cell. Awaiting sign-off on the data annexure.'
            : 'Cleared by the departmental legal cell against template v5.2.',
      },
      rubricId,
      kpis: [
        {
          id: `KPI-${caseId}-1`,
          name: problem.targetMetric,
          unit: problem.baselineUnit,
          baselineValue: problem.baselineValue,
          targetValue: problem.magnitude,
          direction: problem.direction,
          minimumAcceptable:
            problem.direction === 'decrease'
              ? Math.round((problem.baselineValue + problem.magnitude) / 2)
              : Math.round((problem.baselineValue + problem.magnitude) / 2),
          failureThreshold: problem.baselineValue,
          method: problem.method,
          sourceOfTruth: problem.sourceOfTruth,
          measurementPeriod: 'Pilot period, compared against the published baseline window',
          frequency: 'Weekly',
        },
      ],
      timeline: {
        createdOn: iso(createdOn),
        publishedOn: publishedOn ? iso(publishedOn) : undefined,
        closesOn: closesOn ? iso(closesOn) : undefined,
        awardedOn: awardedOn ? iso(awardedOn) : undefined,
      },
      applicantCount,
      gateEnteredOn: iso(subDays(NOW, isHero ? 6 : intBetween(rand, 2, 46))),
      blocked: blocked
        ? {
            reason:
              index === 11
                ? 'Legal pre-clearance has been pending with the departmental legal cell for 22 days. Gate 0 cannot clear without it.'
                : 'Two applications are still in needs review after a DPIIT status change. Gate 2 cannot clear while any application lacks an explicit decision.',
            since: iso(subDays(NOW, index === 11 ? 22 : 9)),
          }
        : undefined,
      waiver: hasWaiver
        ? {
            requestedOn: iso(subDays(NOW, 11)),
            authority: 'Secretary, administrative department',
            reason:
              'Site access could not be arranged for two of the eleven structures before the measurement window closed. A waiver of the complete-coverage precondition is sought for those two, with the reason recorded.',
            status: 'requested',
          }
        : undefined,
      languageFlags: isHero
        ? heroLanguageFlags()
        : index % 5 === 2
          ? [
              {
                id: `FLAG-${caseId}-1`,
                section: 'Outcome sought',
                fieldPath: 'outcome.statement',
                matchedText: 'machine learning platform',
                kind: 'technology_prescription',
                why: 'Naming the technology narrows the field before anyone has proposed anything. Gate 1 requires an outcome-based challenge.',
                suggestion: problem.outcomeStatement,
                status: 'open',
              },
            ]
          : [],
      coAuthors: isHero ? ['USR-D01-ADM'] : [],
      changeLog: [
        { at: iso(createdOn), by: nodalOfficer.name, summary: 'Draft created from the outcome-based problem statement template.' },
        ...(publishedOn
          ? [{ at: iso(publishedOn), by: 'A. Deshmukh', summary: 'Published after gate 1 cleared.' }]
          : []),
      ],
    };

    // The demo case carries the exact figures from the programme story.
    if (isHero) {
      challenge.title = 'Smart water leakage detection';
      challenge.slug = 'smart-water-leakage-detection-pune';
      challenge.pilot.durationDays = 90;
      challenge.pilot.budgetPaise = 15 * LAKH;
      challenge.pilot.milestones = milestonesFor(15 * LAKH, 90, caseId);
      challenge.departmentProvides.dataTier = 'masked';
      challenge.timeline = {
        createdOn: iso(subDays(NOW, 185)),
        publishedOn: iso(subDays(NOW, 163)),
        closesOn: iso(subDays(NOW, 132)),
        awardedOn: iso(subDays(NOW, 98)),
      };
      challenge.status = 'awarded';
      challenge.currentGate = 'G3';
      challenge.gateEnteredOn = iso(subDays(NOW, 98));
      challenge.applicantCount = 14;
    }

    challenges.push(challenge);
  });

  // Clarifications on published challenges.
  challenges
    .filter((c) => c.timeline.publishedOn)
    .forEach((c, i) => {
      const count = c.id === 'CHL-014' ? 4 : intBetween(rand, 0, 3);
      for (let q = 0; q < count; q += 1) {
        const askedOn = subDays(NOW, intBetween(rand, 40, 150));
        const answered = !(i % 7 === 3 && q === 0);
        clarifications.push({
          id: `CLR-${c.caseId}-${q + 1}`,
          challengeId: c.id,
          question: [
            'Will the department provide connectivity at the pilot sites, or is that within our scope?',
            'Is the baseline measurement dataset available before we submit, or only after award?',
            'Can a consortium of two companies apply jointly against this challenge?',
            'What happens to the sensors we install if the pilot is not taken forward?',
          ][q % 4]!,
          askedOn: iso(askedOn),
          askedByMasked: 'Applicant (identity withheld until award)',
          answer: answered
            ? [
                'Connectivity at pilot sites is not provided. It is listed under what the department will not provide, and should be priced into your milestones.',
                'The baseline dataset summary is published with this challenge. The row-level extract is released inside the sandbox after award, at the tier stated in the data annexure.',
                'Yes. One entity must be named as the lead applicant and hold the contract. The consortium agreement is submitted with the application.',
                'Installed hardware remains yours unless the pilot agreement schedule says otherwise. If the pilot is not taken forward, you remove it within thirty days at your cost, as set out in clause 12.3.',
              ][q % 4]!
            : undefined,
          answeredOn: answered ? iso(addDays(askedOn, intBetween(rand, 1, 4))) : undefined,
          answeredBy: answered ? users.find((u) => u.id === c.ownerId)?.name : undefined,
        });
      }
    });

  // One hundred and forty applications across published challenges.
  const publishedChallenges = challenges.filter((c) => c.timeline.publishedOn);
  let appCounter = 0;
  const targetApplications = 140;

  const heroChallenge = challenges[heroIndex]!;
  const heroStartup = startups[0]!;

  function buildEligibility(
    startup: Startup,
    outcome: 'auto_pass' | 'auto_fail' | 'needs_review',
    at: Date,
  ): EligibilityResult[] {
    return activeRules.map((r, idx) => {
      let result: EligibilityResult['result'] = 'pass';
      let evidence = 'Verified against the profile record held on file.';
      const relaxationApplied =
        r.relief === 'relaxable' && startup.dpiit.status === 'recognised' ? true : undefined;

      if (relaxationApplied) {
        evidence = `Relaxed under ${r.citation}. Recognition ${startup.dpiit.recognitionNumber} valid to the recorded date.`;
      }

      if (outcome === 'auto_fail' && idx === 8) {
        result = 'fail';
        evidence = 'Declaration of debarment recorded in the application. This is not relaxable.';
      }
      if (outcome === 'needs_review' && r.id === 'R-REC-01') {
        result = 'review';
        evidence = `Recognition expired on the recorded date. Routed to a human under the current version of this rule.`;
      }
      if (startup.gstStatus !== 'active' && r.id === 'R-GST-01') {
        result = 'review';
        evidence = 'GST registration is suspended. A live registration is needed to raise an invoice.';
      }
      if (startup.dpiit.status === 'not_a_startup' && r.id === 'R-ENT-02') {
        result = 'fail';
        evidence = 'Entity incorporated beyond the statutory age limit for startup recognition.';
      }

      return {
        ruleId: r.id,
        ruleVersion: r.version,
        result,
        evidence,
        citation: r.citation,
        evaluatedAt: iso(at),
        relaxationApplied,
      };
    });
  }

  function makeApplication(
    challenge: Challenge,
    startup: Startup,
    outcome: 'auto_pass' | 'auto_fail' | 'needs_review',
    status: ApplicationStatus,
    isHeroApp = false,
  ): Application {
    appCounter += 1;
    const caseId = `APP-2026-${String(appCounter + 73).padStart(4, '0')}`;
    const submittedAt = subDays(NOW, intBetween(rand, 40, 150));
    const overBudget = !isHeroApp && appCounter % 23 === 0;
    const costs = challenge.pilot.milestones.map((m) =>
      Math.round(m.paymentPaise * (overBudget ? 1.12 : 0.92 + rand() * 0.08)),
    );
    const total = costs.reduce((a, b) => a + b, 0);

    return {
      id: `APP-${String(appCounter).padStart(3, '0')}`,
      caseId: isHeroApp ? 'APP-2026-0087' : caseId,
      challengeId: challenge.id,
      startupId: startup.id,
      status,
      submittedAt: status === 'draft' ? undefined : iso(submittedAt),
      lastSavedAt: iso(status === 'draft' ? subDays(NOW, intBetween(rand, 0, 9)) : submittedAt),
      currentStep: status === 'draft' ? intBetween(rand, 2, 5) : 6,
      referenceNumber: status === 'draft' ? undefined : `${challenge.caseId}/${isHeroApp ? 'APP-2026-0087' : caseId}`,
      solution: {
        problemUnderstanding: isHeroApp
          ? 'The zone loses treated water continuously, but the department only learns about a leak when pressure drops far enough for a resident to notice. The cost is not the repair, it is the interval. On trunk mains under carriageway that interval is a full shift, and the crew spends most of it walking the line with an acoustic rod rather than fixing anything.'
          : `The department is measuring the right thing but learning about it too late to act. We have addressed this pattern in ${startup.deployments.length} prior deployments.`,
        approach: isHeroApp
          ? 'Permanent acoustic loggers at 30-metre spacing on the trunk network, correlated hourly against a pressure model built from the existing district meters. Localisation is to a segment, not a point, and is delivered into the existing complaint register so crews receive it in the workflow they already use.'
          : `Instrument the existing network, model the normal condition, and alert on deviation, delivered into the workflow staff already use.`,
        existingSolution: isHeroApp
          ? 'The correlation engine and logger firmware are in production at Nashik and Solapur. The pressure model is production code; the trunk-main segmentation is new for this network.'
          : 'Core platform is in production; departmental integration is configured per deployment.',
        proposedDevelopment: isHeroApp
          ? 'Trunk-main segmentation for this network topology, integration with the ward complaint register, and a crew-facing view that works on the handsets already issued.'
          : 'Integration adapters, a departmental view, and configuration for local conditions.',
        trl: isHeroApp ? 8 : intBetween(rand, 5, 9),
      },
      pilotPlan: {
        durationDays: challenge.pilot.durationDays,
        milestones: challenge.pilot.milestones.map((m) => ({
          name: m.name,
          deliverable: m.requirement,
          acceptanceTest: m.acceptanceTest,
          dayOffset: m.dueDayOffset,
        })),
        dependencies: [
          'Escorted site access on working days, arranged 48 hours ahead',
          'Read-only access to the complaint register inside the sandbox',
          'One departmental engineer available four hours a week',
        ],
      },
      commercials: {
        milestoneCostsPaise: costs,
        totalPaise: total,
        costBasis: isHeroApp
          ? 'Hardware at landed cost, engineering at published day rates, and a fixed integration fee. No licence fee is charged during the pilot.'
          : 'Hardware at cost, engineering at published day rates, fixed integration fee.',
        overBudgetJustification: overBudget
          ? 'The published budget assumes three sites. This proposal covers five, because the outcome cannot be measured on three without a confounded baseline. The department may reduce scope to three at a proportionate cost.'
          : undefined,
      },
      dataSecurity: {
        dataRequested: challenge.departmentProvides.fields,
        tier: challenge.departmentProvides.dataTier,
        processingLocation: 'Mumbai region, within India. No processing outside the territory.',
        subProcessors: isHeroApp ? ['Managed cloud hosting, Mumbai region'] : ['Managed cloud hosting, India region'],
        certifications: startup.certifications,
      },
      declarations: {
        conflict: false,
        debarred: outcome === 'auto_fail',
        blacklisted: false,
        startupDeclaration: startup.dpiit.status === 'recognised',
        signatureName: status === 'draft' ? undefined : 'Authorised signatory',
        signedAt: status === 'draft' ? undefined : iso(submittedAt),
      },
      eligibility: status === 'draft' ? [] : buildEligibility(startup, outcome, addDays(submittedAt, 1)),
      eligibilitySummary: status === 'draft' ? 'not_run' : outcome,
      documents: ['Application form', 'Technical proposal', 'Commercial proposal', 'Declarations'].map((t, d) => ({
        id: `APD-${appCounter}-${d}`,
        applicationId: `APP-${String(appCounter).padStart(3, '0')}`,
        type: t,
        fileName: `${t.toLowerCase().replace(/\s+/g, '-')}-${startup.slug}.pdf`,
        uploadedOn: iso(submittedAt),
        scan: appCounter % 37 === 11 && d === 1 ? 'failed' : 'clean',
        hash: digest(`${appCounter}-${t}`),
        sizeBytes: intBetween(rand, 120_000, 5_200_000),
      })),
      clarifications: [],
      timeline: [
        { at: iso(subDays(submittedAt, intBetween(rand, 3, 14))), label: 'Draft started', actor: startup.tradeName },
        ...(status === 'draft'
          ? []
          : [
              { at: iso(submittedAt), label: 'Application submitted', actor: startup.tradeName },
              {
                at: iso(addDays(submittedAt, 1)),
                label:
                  outcome === 'auto_pass'
                    ? 'Eligibility rules passed'
                    : outcome === 'auto_fail'
                      ? 'Eligibility rules failed'
                      : 'Eligibility routed to review',
                actor: 'Rule engine',
              },
            ]),
      ],
    };
  }

  // Hero application first, so it holds APP-2026-0087.
  appCounter = 13; // yields APP-2026-0087
  const heroApp = makeApplication(heroChallenge, heroStartup, 'auto_pass', 'awarded', true);
  heroApp.id = 'APP-HERO';
  heroApp.documents.forEach((d) => {
    d.applicationId = 'APP-HERO';
  });
  heroApp.scores = { weightedMean: 4.31, evaluatorCount: 3, released: true, rank: 1, outlierFlagged: false };
  heroApp.commercials.milestoneCostsPaise = heroChallenge.pilot.milestones.map((m) => m.paymentPaise);
  heroApp.commercials.totalPaise = 15 * LAKH;
  heroApp.timeline.push(
    { at: iso(subDays(NOW, 132)), label: 'Eligible — all rules passed, two relaxations applied', actor: 'Screening committee' },
    { at: iso(subDays(NOW, 126)), label: 'Shortlisted at gate 2', actor: 'Pune Municipal Corporation' },
    { at: iso(subDays(NOW, 104)), label: 'Evaluation complete, ranked first of fourteen', actor: 'Evaluation panel' },
    { at: iso(subDays(NOW, 98)), label: 'Pilot awarded at gate 3', actor: 'Procurement officer' },
  );
  applications.push(heroApp);

  // Remaining applications, distributed across published challenges.
  let autoFailsPlaced = 0;
  let needsReviewPlaced = 0;
  const used = new Set<string>([`${heroChallenge.id}:${heroStartup.id}`]);

  while (applications.length < targetApplications) {
    const challenge = pick(rand, publishedChallenges);
    const startup = pick(rand, startups);
    const key = `${challenge.id}:${startup.id}`;
    // A startup cannot apply twice to the same challenge. Enforced here and in the API.
    if (used.has(key)) continue;
    used.add(key);

    let outcome: 'auto_pass' | 'auto_fail' | 'needs_review' = 'auto_pass';
    if (autoFailsPlaced < 6 && (startup.dpiit.status === 'not_a_startup' || rand() < 0.05)) {
      outcome = 'auto_fail';
      autoFailsPlaced += 1;
    } else if (needsReviewPlaced < 4 && (startup.dpiit.status === 'expired' || rand() < 0.03)) {
      outcome = 'needs_review';
      needsReviewPlaced += 1;
    }

    let status: ApplicationStatus = 'submitted';
    const gIndex = GATE_BY_INDEX.indexOf(challenge.currentGate);
    if (challenge.status === 'open' || challenge.status === 'closing_soon') status = 'submitted';
    else if (gIndex === 2) status = outcome === 'auto_fail' ? 'ineligible' : outcome === 'needs_review' ? 'needs_review' : 'eligible';
    else if (gIndex >= 3) status = outcome === 'auto_fail' ? 'ineligible' : rand() < 0.25 ? 'shortlisted' : 'not_selected';
    if (rand() < 0.06) status = 'draft';

    const app = makeApplication(challenge, startup, outcome, status);
    if (status === 'shortlisted' || status === 'not_selected') {
      app.scores = {
        weightedMean: Number((2.1 + rand() * 2.2).toFixed(2)),
        evaluatorCount: 3,
        released: gIndex >= 3,
        outlierFlagged: rand() < 0.12,
      };
    }
    applications.push(app);
  }

  // The demo startup also holds the live pilot on the neighbouring water zone, so
  // its dashboard has work in flight as well as work already finished.
  const secondWater = challenges[0];
  if (secondWater) {
    const existing = applications.find((a) => a.challengeId === secondWater.id && a.startupId === heroStartup.id);
    if (existing) {
      existing.status = 'awarded';
    } else {
      applications.push(makeApplication(secondWater, heroStartup, 'auto_pass', 'awarded'));
      secondWater.applicantCount += 1;
    }
  }

  // The gate 2 case seeded as blocked must have applications genuinely in needs
  // review, otherwise the precondition engine would find nothing to block on.
  const blockedScreening = challenges[19];
  if (blockedScreening) {
    applications
      .filter((a) => a.challengeId === blockedScreening.id && a.status !== 'draft')
      .slice(0, 2)
      .forEach((app) => {
        app.eligibilitySummary = 'needs_review';
        app.status = 'needs_review';
        const rec = app.eligibility.find((e) => e.ruleId === 'R-REC-01');
        if (rec) {
          rec.result = 'review';
          rec.evidence =
            'Recognition expired after this application was submitted. Routed to a human for an explicit decision.';
          rec.changedSince = {
            what: 'DPIIT recognition moved from recognised to expired',
            at: iso(subDays(NOW, 9)),
          };
        }
      });
  }

  // Make sure at least four needs-review and six auto-fail cases exist even if random did not place them.
  let i = 0;
  while (needsReviewPlaced < 4 && i < applications.length) {
    const app = applications[i]!;
    if (app.eligibilitySummary === 'auto_pass' && app.status !== 'awarded' && app.status !== 'draft') {
      app.eligibilitySummary = 'needs_review';
      app.status = 'needs_review';
      const rec = app.eligibility.find((e) => e.ruleId === 'R-REC-01');
      if (rec) {
        rec.result = 'review';
        rec.evidence = 'Recognition expired after this application was submitted. Routed to a human for an explicit decision.';
        rec.changedSince = {
          what: 'DPIIT recognition moved from recognised to expired',
          at: iso(subDays(NOW, intBetween(rand, 3, 20))),
        };
      }
      needsReviewPlaced += 1;
    }
    i += 1;
  }

  // Challenges whose window has closed but which are not yet awarded carry live
  // evaluation work: a shortlist with nothing scored. Without this the evaluator
  // queue would only ever contain finished panels.
  CLOSED_AT_G2.forEach((idx) => {
    const challenge = challenges[idx];
    if (!challenge) return;
    applications
      .filter((a) => a.challengeId === challenge.id && a.eligibilitySummary === 'auto_pass' && a.status !== 'draft')
      .slice(0, 4)
      .forEach((a) => {
        a.status = 'shortlisted';
        a.timeline.push({ at: iso(subDays(NOW, 6)), label: 'Shortlisted at gate 2', actor: 'Screening committee' });
      });
  });

  // Panels, conflict declarations and evaluations for challenges at gate 3 or beyond.
  challenges
    .filter((c) => c.timeline.publishedOn)
    .forEach((c, ci) => {
      // The first evaluator account always sits on a live panel, so the account the
      // demo signs into actually has undeclared work waiting for it.
      const isLivePanel = !c.timeline.awardedOn;
      const panelEvaluators = isLivePanel
        ? [evaluators[0]!, ...pickMany(rand, evaluators.slice(1), 2)]
        : pickMany(rand, evaluators, 3);
      const chair = panelEvaluators[0]!;
      const shortlisted = applications.filter(
        (a) => a.challengeId === c.id && ['shortlisted', 'awarded', 'not_selected', 'under_evaluation'].includes(a.status),
      );
      if (shortlisted.length === 0) return;
      // The demo challenge gets a hand-built panel below. Building a second
      // one here would list every one of its applications twice in the
      // evaluator's queue.
      if (c.id === heroChallenge.id) return;

      const sessionDate = c.timeline.awardedOn ? subDays(new Date(c.timeline.awardedOn), 6) : addDays(NOW, 5);
      const resultsReleased = Boolean(c.timeline.awardedOn);

      panels.push({
        id: `PNL-${c.id}`,
        challengeId: c.id,
        chairEvaluatorId: chair.id,
        evaluatorIds: panelEvaluators.map((e) => e.id),
        rubricId: c.rubricId,
        sessionDate: iso(sessionDate),
        minutes: resultsReleased
          ? 'The panel reviewed all shortlisted proposals against the published rubric. Two criteria drew material disagreement, recorded below with the rationale of each evaluator. The consensus recommendation was reached without dissent.'
          : undefined,
        minutesRecordedAt: resultsReleased ? iso(sessionDate) : undefined,
        resultsReleased,
        slots: shortlisted.slice(0, 6).map((a, s) => ({
          applicationId: a.id,
          startsAt: iso(addDays(sessionDate, 0)),
          minutes: 30 + s * 0,
        })),
        consensus: resultsReleased
          ? shortlisted.slice(0, 3).map((a) => ({
              applicationId: a.id,
              score: Number((a.scores?.weightedMean ?? 3.4).toFixed(2)),
              varianceNote:
                'Variance on the measurability criterion was discussed. The lower score was retained after the evaluator explained the basis.',
              recordedBy: chair.name,
              at: iso(sessionDate),
            }))
          : undefined,
      });

      shortlisted.forEach((app, ai) => {
        panelEvaluators.forEach((ev, ei) => {
          // Two evaluators carry a declared conflict across the programme.
          const conflicted = (ci === 1 && ei === 2 && ai === 0) || (ci === 3 && ei === 1 && ai === 0);
          // On a live panel the first shortlisted application is still undeclared for
          // every evaluator, so the conflict interstitial has something to stand in front of.
          const declared = resultsReleased ? true : ai !== 0;

          coi.push({
            id: `COI-${app.id}-${ev.id}`,
            evaluatorId: ev.id,
            applicationId: app.id,
            declared,
            hasConflict: conflicted,
            natureOfConflict: conflicted
              ? 'Served on the technical advisory board of the applicant within the last twenty-four months.'
              : undefined,
            declaredAt: declared ? iso(subDays(sessionDate, intBetween(rand, 4, 20))) : undefined,
          });

          if (conflicted || !declared) return;

          const rubricDef = RUBRICS.find((r) => r.id === c.rubricId)!;
          // One evaluator across the programme scores consistently low, to exercise outlier detection.
          const isOutlierScorer = ev.id === evaluators[7]?.id;
          const base = app.scores?.weightedMean ?? 3.4;
          const scores = rubricDef.criteria.map((crit) => {
            const raw = Math.max(
              0,
              Math.min(5, Math.round(base + (rand() - 0.5) * 1.2 - (isOutlierScorer ? 1.6 : 0))),
            );
            return {
              criterionId: crit.id,
              score: raw,
              rationale:
                raw >= 4
                  ? `The proposal addresses this criterion with specifics rather than assurances, and the evidence cited supports the claim made.`
                  : raw === 3
                    ? `Adequate. The approach is sound but the proposal does not show how it holds under the department's stated constraints.`
                    : `Below the bar. The proposal asserts capability here without evidence a reviewer could check.`,
              evidenceReference: `Proposal section ${crit.id}, paragraph ${intBetween(rand, 1, 4)}`,
            };
          });
          const weighted =
            scores.reduce((sum, s) => {
              const crit = rubricDef.criteria.find((cr) => cr.id === s.criterionId)!;
              return sum + s.score * (crit.weightPercent / 100);
            }, 0) ?? 0;

          const submitted = resultsReleased || rand() > 0.35;
          // Status follows the scores rather than being drawn independently:
          // an evaluation with a score on it has plainly been started.
          const partialScores = submitted ? scores : scores.slice(0, intBetween(rand, 0, 3));
          const status = submitted ? 'submitted' : partialScores.length > 0 ? 'in_progress' : 'not_started';

          evaluations.push({
            id: `EVL-${app.id}-${ev.id}`,
            applicationId: app.id,
            evaluatorId: ev.id,
            rubricId: c.rubricId,
            status,
            scores: partialScores,
            weightedTotal: submitted ? Number(weighted.toFixed(2)) : undefined,
            submittedAt: submitted ? iso(subDays(sessionDate, intBetween(rand, 1, 8))) : undefined,
            lastCriterionId: submitted ? undefined : rubricDef.criteria[1]?.id,
            released: resultsReleased,
            outlier: isOutlierScorer && submitted
              ? {
                  deviation: Number((base - weighted).toFixed(2)),
                  rationaleRequested: true,
                  rationale:
                    'I applied the anchored descriptor strictly. The proposal claims a measurement method but does not state the sample size, which the descriptor requires at score four.',
                }
              : undefined,
          });
        });
      });
    });

  // Hero evaluations: three evaluators, complete, released, AquaSense first.
  const heroPanelEvaluators = evaluators.slice(0, 3);
  panels.push({
    id: 'PNL-HERO',
    challengeId: heroChallenge.id,
    chairEvaluatorId: heroPanelEvaluators[0]!.id,
    evaluatorIds: heroPanelEvaluators.map((e) => e.id),
    rubricId: heroChallenge.rubricId,
    sessionDate: iso(subDays(NOW, 104)),
    minutes:
      'Fourteen applications were received and eleven were eligible. Six were shortlisted at gate 2 and scored against rubric RUB-STD-2026 v3.1. AquaSense Technologies ranked first on a weighted mean of 4.31, ahead of Jal Nigrani Systems on 3.94. The panel noted that AquaSense was the only applicant to state a sample size for its measurement plan. One evaluator scored the commercial criterion materially below the panel mean and explained the basis on request; the score was retained. The panel recommends award to AquaSense Technologies.',
    minutesRecordedAt: iso(subDays(NOW, 104)),
    resultsReleased: true,
    consensus: [
      {
        applicationId: 'APP-HERO',
        score: 4.31,
        varianceNote: 'Commercial criterion varied by 1.6 points. Rationale requested and recorded; score retained.',
        recordedBy: heroPanelEvaluators[0]!.name,
        at: iso(subDays(NOW, 104)),
      },
    ],
  });

  heroPanelEvaluators.forEach((ev) => {
    coi.push({
      id: `COI-APP-HERO-${ev.id}`,
      evaluatorId: ev.id,
      applicationId: 'APP-HERO',
      declared: true,
      hasConflict: false,
      declaredAt: iso(subDays(NOW, 118)),
    });
    const rubricDef = RUBRICS.find((r) => r.id === heroChallenge.rubricId)!;
    const perCriterion = [5, 4, 5, 4, 4, 4, 3];
    const scores = rubricDef.criteria.map((crit, ci) => ({
      criterionId: crit.id,
      score: perCriterion[ci] ?? 4,
      rationale: [
        'The proposal restates the department’s own baseline and then names two constraints the challenge document did not: carriageway access windows and the crew handset estate. That is understanding, not restatement.',
        'Acoustic correlation against a pressure model is sound for trunk mains. The segmentation approach for this topology is new and is identified as such rather than glossed over.',
        'The only proposal to state a sample size and a confounder list. A third party could re-derive the claimed figure from the records described.',
        'Three milestones, each with a testable criterion. Dependencies on departmental site access are named with lead times.',
        'Masked tier requested with field-level justification. Sub-processor named and located in India. Retention and erasure stated.',
        'Two comparable municipal deployments, one independently validated. The critical path is covered by named staff.',
        'Priced at the published budget with no licence fee during the pilot. Comparison against the closest alternative is asserted but not evidenced.',
      ][ci]!,
      evidenceReference: `Technical proposal, section ${ci + 2}`,
    }));
    const weighted = scores.reduce((sum, s) => {
      const crit = rubricDef.criteria.find((cr) => cr.id === s.criterionId)!;
      return sum + s.score * (crit.weightPercent / 100);
    }, 0);
    evaluations.push({
      id: `EVL-APP-HERO-${ev.id}`,
      applicationId: 'APP-HERO',
      evaluatorId: ev.id,
      rubricId: heroChallenge.rubricId,
      status: 'submitted',
      scores,
      weightedTotal: Number(weighted.toFixed(2)),
      submittedAt: iso(subDays(NOW, 108)),
      released: true,
    });
  });

  // Roll department portfolio counters from the generated data.
  departments.forEach((d) => {
    const own = challenges.filter((c) => c.departmentId === d.id);
    d.openChallenges = own.filter((c) => c.status === 'open' || c.status === 'closing_soon' || c.status === 'in_review').length;
    d.committedPaise = own.reduce((sum, c) => sum + c.pilot.budgetPaise, 0);
  });

  return { challenges, clarifications, applications, panels, coi, evaluations };
}
