import { policyNumber } from './policies';

/**
 * The seven gates. A gate is not a status; it is an auditable decision record.
 * Preconditions, owners, consequences and SLAs all come from here.
 */

export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

export type GateStatus = 'cleared' | 'open' | 'blocked' | 'future' | 'rejected';

export type PreconditionResult = 'pass' | 'fail' | 'review';

export interface GatePrecondition {
  key: string;
  label: string;
  detail: string;
  citation: string;
  /** Where in the product the user goes to satisfy this. */
  fixHint: string;
}

export interface GateDefinition {
  id: GateId;
  index: number;
  name: string;
  decides: string;
  ownerRole: string;
  slaKey: string;
  preconditions: readonly GatePrecondition[];
  /** Plain-language consequences shown before confirmation. */
  consequences: readonly string[];
  notifies: readonly string[];
}

export const GATES: readonly GateDefinition[] = [
  {
    id: 'G0',
    index: 0,
    name: 'Problem is real and funded',
    decides:
      'Whether this is a genuine operational problem, framed as an outcome, with a measured baseline and money behind it.',
    ownerRole: 'department_admin',
    slaKey: 'sla.gate.g0.days',
    preconditions: [
      {
        key: 'baseline',
        label: 'Baseline metric captured',
        detail: 'A current value, a measurement method and a named source of truth.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Challenge studio, step 2 — the baseline',
      },
      {
        key: 'budget',
        label: 'Budget head assigned',
        detail: 'A specific budget head with an approving authority named.',
        citation: 'PRAYOG-SOP-9',
        fixHint: 'Challenge studio, step 6 — pilot and money',
      },
      {
        key: 'outcomeKpi',
        label: 'Outcome KPIs defined',
        detail: 'A target metric, a direction, a magnitude and a failure threshold.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Challenge studio, step 3 — outcome sought',
      },
      {
        key: 'legalPreClearance',
        label: 'Legal pre-clearance recorded',
        detail: 'Departmental legal cell has seen the IP, data and cyber positions.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Challenge studio, step 7 — legal, IP, data and cyber',
      },
    ],
    consequences: [
      'The challenge enters publication review',
      'The programme management unit is asked to check it for public release',
      'Committed pilot money is reserved against the named budget head',
    ],
    notifies: ['Programme management unit', 'Department finance officer'],
  },
  {
    id: 'G1',
    index: 1,
    name: 'Fit for public release',
    decides: 'Whether this challenge can be published to the public without prescribing a solution.',
    ownerRole: 'pmu',
    slaKey: 'sla.gate.g1.days',
    preconditions: [
      {
        key: 'noVendorNaming',
        label: 'No vendor-naming or solution prescription',
        detail: 'The solution language check returns no unresolved flags.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Challenge studio, step 3 — solution language check',
      },
      {
        key: 'ipWithinDefault',
        label: 'IP clause within default boundaries',
        detail: 'The startup retains its IP; government takes a defined purpose licence.',
        citation: 'GFR-2017-173',
        fixHint: 'Challenge studio, step 7 — IP position',
      },
      {
        key: 'templatesAttached',
        label: 'Required templates attached',
        detail: 'Pilot agreement, evaluation rubric and data annexure are attached at their current version.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Challenge studio, step 7 — templates',
      },
    ],
    consequences: [
      'The challenge becomes public and appears on the demand board',
      'The application window opens',
      'Matched startups are notified',
      'Clarification questions can be asked and must be answered within the configured window',
    ],
    notifies: ['Matched startups', 'Department nodal officer', 'Public demand board'],
  },
  {
    id: 'G2',
    index: 2,
    name: 'Shortlist candidates',
    decides: 'Which applicants are eligible and which proceed to expert evaluation.',
    ownerRole: 'department_admin',
    slaKey: 'sla.gate.g2.days',
    preconditions: [
      {
        key: 'ruleEngineComplete',
        label: 'Eligibility rules run on every application',
        detail: 'Every submitted application carries an automated result with evidence and a timestamp.',
        citation: 'GFR-2017-173',
        fixHint: 'Application screening — eligibility ledger',
      },
      {
        key: 'overridesDocumented',
        label: 'Every override carries a written justification',
        detail: 'No automated eligibility result has been changed without a recorded reason.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Application screening — overrides',
      },
      {
        key: 'needsReviewCleared',
        label: 'No application left in needs review',
        detail: 'Each flagged application has an explicit human decision.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Application screening — needs review queue',
      },
    ],
    consequences: [
      'Shortlisted applicants move to expert evaluation',
      'Applicants who are not shortlisted are told why, in writing',
      'The evaluation panel is asked to declare conflicts of interest',
    ],
    notifies: ['All applicants', 'Assigned evaluators', 'Programme management unit'],
  },
  {
    id: 'G3',
    index: 3,
    name: 'Award pilot',
    decides: 'Which applicant is awarded the pilot, and on what recorded grounds.',
    ownerRole: 'procurement_officer',
    slaKey: 'sla.gate.g3.days',
    preconditions: [
      {
        key: 'coiCleared',
        label: 'Conflict-of-interest declarations complete',
        detail: 'Every scoring evaluator has declared, and any conflicted evaluator has been recused.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Evaluation panel — conflict declarations',
      },
      {
        key: 'scoringComplete',
        label: 'Scoring complete against the published rubric',
        detail: 'Minimum evaluators reached, every criterion scored with a written rationale.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Evaluation panel — scoring progress',
      },
      {
        key: 'minutesRecorded',
        label: 'Evaluation minutes recorded',
        detail: 'Consensus, variance notes and the panel recommendation are written down.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Evaluation panel — minutes',
      },
    ],
    consequences: [
      'A pilot case is created with milestones and acceptance tests',
      'A contract is generated from the current pilot agreement template',
      'The awarded startup is asked to sign',
      'Unsuccessful applicants receive their result and the published rubric outcome',
    ],
    notifies: ['Awarded startup', 'Unsuccessful applicants', 'Department finance officer', 'Programme management unit'],
  },
  {
    id: 'G4',
    index: 4,
    name: 'Continue or stop the pilot',
    decides: 'Whether the pilot continues, on the evidence produced so far.',
    ownerRole: 'department_admin',
    slaKey: 'sla.gate.g4.days',
    preconditions: [
      {
        key: 'milestoneEvidenceReviewed',
        label: 'Milestone evidence reviewed',
        detail: 'Every submitted milestone has an explicit met, partially met or not met finding.',
        citation: 'PRAYOG-SOP-9',
        fixHint: 'Pilot workspace — milestones',
      },
      {
        key: 'riskRegisterReviewed',
        label: 'Risk register reviewed in this period',
        detail: 'Open risks have owners, mitigations and a current severity.',
        citation: 'PRAYOG-SOP-4',
        fixHint: 'Pilot workspace — risks',
      },
      {
        key: 'incidentsResolved',
        label: 'No unresolved high-severity incident',
        detail: 'Any high-severity incident is closed or has an accepted containment.',
        citation: 'CERTIN-2022-DIR',
        fixHint: 'Pilot workspace — incident log',
      },
    ],
    consequences: [
      'The pilot proceeds to its measurement period',
      'Remaining milestone payments stay committed',
      'The startup and department are told the decision and its grounds',
    ],
    notifies: ['Startup', 'Department nodal officer', 'Department finance officer'],
  },
  {
    id: 'G5',
    index: 5,
    name: 'Pilot succeeded',
    decides: 'Whether the pilot met its outcome, on independently validated evidence.',
    ownerRole: 'validator',
    slaKey: 'sla.gate.g5.days',
    preconditions: [
      {
        key: 'baselineVsPilot',
        label: 'Baseline versus pilot measurement complete',
        detail: 'Both periods measured by the stated method with a stated sample size.',
        citation: 'PRAYOG-SOP-12',
        fixHint: 'Pilot measurement',
      },
      {
        key: 'securityAudit',
        label: 'Security audit complete',
        detail: 'An audit report exists with findings closed or accepted.',
        citation: 'CERTIN-2022-DIR',
        fixHint: 'Validator workspace — security audit',
      },
      {
        key: 'dataAttestation',
        label: 'Data-handling attestation signed',
        detail: 'Data tier, retention, processing location and sub-processors attested.',
        citation: 'DPDP-2023-S8',
        fixHint: 'Validator workspace — data attestation',
      },
      {
        key: 'attribution',
        label: 'Attribution explained in writing',
        detail: 'The department has explained why the change is attributable to the pilot.',
        citation: 'PRAYOG-SOP-12',
        fixHint: 'Pilot measurement — attribution',
      },
    ],
    consequences: [
      'The validation report is published with its hash',
      'A procurement readiness assessment is produced',
      'The case moves to a pathway decision — this is not itself a purchase',
    ],
    notifies: ['Department', 'Startup', 'Programme management unit', 'Public results page'],
  },
  {
    id: 'G6',
    index: 6,
    name: 'Scale, procure, re-tender or close',
    decides: 'What happens next: procurement, scale-up, a fresh tender, or closure.',
    ownerRole: 'procurement_officer',
    slaKey: 'sla.gate.g6.days',
    preconditions: [
      {
        key: 'pathwayNote',
        label: 'Pathway note written',
        detail: 'The selected pathway is justified in writing against the rule cited.',
        citation: 'PRAYOG-SOP-12',
        fixHint: 'Scale-up pathway advisor',
      },
      {
        key: 'vfm',
        label: 'Value-for-money analysis attached',
        detail: 'Compared against the closest market alternative available.',
        citation: 'PRAYOG-SOP-12',
        fixHint: 'Scale-up pathway advisor — value for money',
      },
      {
        key: 'replicationPackage',
        label: 'Replication package generated',
        detail: 'Everything another department needs to repeat this, packaged.',
        citation: 'PRAYOG-SOP-12',
        fixHint: 'Scale-up pathway advisor — replication package',
      },
    ],
    consequences: [
      'The solution is added to the validated catalogue',
      'The replication package becomes available to other departments',
      'A procurement case opens on the selected pathway',
    ],
    notifies: ['Competent authority', 'Startup', 'Other departments', 'Public catalogue'],
  },
] as const;

const gateIndex = new Map(GATES.map((g) => [g.id, g]));

export function gate(id: GateId): GateDefinition {
  const found = gateIndex.get(id);
  if (!found) throw new Error(`Unknown gate: ${id}`);
  return found;
}

export function gateSlaDays(id: GateId): number {
  return policyNumber(gate(id).slaKey);
}

export const GATE_IDS: readonly GateId[] = GATES.map((g) => g.id);

export function nextGate(id: GateId): GateId | null {
  const i = gate(id).index;
  return i < GATES.length - 1 ? (GATES[i + 1]!.id as GateId) : null;
}

export type GateDecision = 'clear' | 'return' | 'reject' | 'defer';

export const GATE_DECISIONS: readonly { value: GateDecision; label: string; consequence: string }[] = [
  {
    value: 'clear',
    label: 'Clear the gate',
    consequence: 'The case moves forward and the downstream effects below take place.',
  },
  {
    value: 'return',
    label: 'Return with observations',
    consequence: 'The case goes back to its owner with your written observations. Nothing downstream changes.',
  },
  {
    value: 'reject',
    label: 'Reject',
    consequence: 'The case is closed at this gate. Reopening requires a fresh submission.',
  },
  {
    value: 'defer',
    label: 'Defer',
    consequence: 'The decision is postponed. The gate clock keeps running and the delay is recorded.',
  },
] as const;
