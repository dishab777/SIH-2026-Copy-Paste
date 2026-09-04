/**
 * Evaluation rubrics. Published before applications open, scored against afterwards,
 * and never edited once an evaluation is finalised.
 *
 * Weights must total 100. The rubric builder blocks on anything else.
 */

export interface RubricAnchor {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  descriptor: string;
}

export interface RubricCriterion {
  id: string;
  label: string;
  definition: string;
  weightPercent: number;
  anchors: readonly RubricAnchor[];
  evidenceHint: string;
}

export interface RubricDefinition {
  id: string;
  version: string;
  label: string;
  appliesTo: string;
  effectiveFrom: string;
  owner: string;
  criteria: readonly RubricCriterion[];
}

const anchors = (
  a0: string,
  a1: string,
  a2: string,
  a3: string,
  a4: string,
  a5: string,
): readonly RubricAnchor[] => [
  { score: 0, descriptor: a0 },
  { score: 1, descriptor: a1 },
  { score: 2, descriptor: a2 },
  { score: 3, descriptor: a3 },
  { score: 4, descriptor: a4 },
  { score: 5, descriptor: a5 },
];

export const RUBRICS: readonly RubricDefinition[] = [
  {
    id: 'RUB-STD-2026',
    version: 'v3.1',
    label: 'Standard innovation pilot rubric',
    appliesTo: 'All outcome-based challenges with a pilot budget under ₹50,00,000',
    effectiveFrom: '2026-04-01',
    owner: 'Programme management unit',
    criteria: [
      {
        id: 'C1',
        label: 'Understanding of the problem',
        definition:
          'Does the applicant understand the operational problem as the department experiences it, including its constraints?',
        weightPercent: 20,
        evidenceHint: 'Cite the paragraph in the proposal that shows this understanding.',
        anchors: anchors(
          'No evidence of understanding the problem.',
          'Restates the challenge without adding anything.',
          'Understands the surface problem, misses operational constraints.',
          'Understands the problem and names the main constraints.',
          'Understands the problem, its constraints, and why previous attempts failed.',
          'Understands the problem better than the challenge document states it, with evidence.',
        ),
      },
      {
        id: 'C2',
        label: 'Technical approach',
        definition: 'Is the proposed approach technically sound and appropriate to the outcome sought?',
        weightPercent: 20,
        evidenceHint: 'Reference the architecture or method section.',
        anchors: anchors(
          'No workable approach described.',
          'Approach described in marketing terms only.',
          'Plausible approach with significant unaddressed gaps.',
          'Sound approach with the main risks named.',
          'Sound approach, risks named and mitigated, appropriate to the constraint set.',
          'Sound approach with evidence it already works under comparable conditions.',
        ),
      },
      {
        id: 'C3',
        label: 'Measurability of the claimed outcome',
        definition: 'Can the claimed improvement actually be measured against the published baseline?',
        weightPercent: 15,
        evidenceHint: 'Reference the measurement plan.',
        anchors: anchors(
          'No measurement plan.',
          'Claims an outcome with no method attached.',
          'Method stated but not tied to the department baseline.',
          'Method tied to the baseline with a stated sample.',
          'Method tied to the baseline, sample justified, confounders named.',
          'Method a third party could independently re-derive from raw records.',
        ),
      },
      {
        id: 'C4',
        label: 'Pilot plan and acceptance tests',
        definition: 'Are the milestones real, sequenced and testable within the pilot window?',
        weightPercent: 15,
        evidenceHint: 'Reference the milestone table.',
        anchors: anchors(
          'No milestones.',
          'Milestones are activities, not results.',
          'Milestones are results but the acceptance tests are vague.',
          'Milestones with testable acceptance criteria.',
          'Milestones testable, sequenced, with dependencies named.',
          'Milestones testable and independently verifiable, with evidence specified per milestone.',
        ),
      },
      {
        id: 'C5',
        label: 'Data handling and cybersecurity',
        definition: 'Does the applicant handle departmental data at the right tier with the right safeguards?',
        weightPercent: 15,
        evidenceHint: 'Reference the data and security section.',
        anchors: anchors(
          'No data or security position stated.',
          'Generic assurances only.',
          'Tier stated, safeguards generic.',
          'Tier justified, safeguards specific, processing location stated.',
          'As above with sub-processors named and retention stated.',
          'As above with an independent audit already on record.',
        ),
      },
      {
        id: 'C6',
        label: 'Team capability',
        definition: 'Can this team actually do the work in the pilot window?',
        weightPercent: 10,
        evidenceHint: 'Reference team and prior deployments.',
        anchors: anchors(
          'No relevant capability shown.',
          'Capability claimed, not evidenced.',
          'Some relevant capability, thin on the critical path.',
          'Relevant capability across the critical path.',
          'Relevant capability with a comparable delivery on record.',
          'Relevant capability with a comparable government delivery independently verified.',
        ),
      },
      {
        id: 'C7',
        label: 'Value for money',
        definition: 'Is the cost proportionate to the outcome and the effort, against alternatives?',
        weightPercent: 5,
        evidenceHint: 'Reference the commercial section.',
        anchors: anchors(
          'Cost not explained.',
          'Cost stated with no basis.',
          'Cost basis stated but not proportionate.',
          'Cost basis stated and proportionate.',
          'Cost proportionate and compared with an alternative.',
          'Cost proportionate, compared, and structured so the department pays on evidence.',
        ),
      },
    ],
  },
  {
    id: 'RUB-DATA-2026',
    version: 'v1.2',
    label: 'Data-intensive pilot rubric',
    appliesTo: 'Challenges that require masked or production personal data',
    effectiveFrom: '2026-02-01',
    owner: 'Programme management unit',
    criteria: [
      {
        id: 'D1',
        label: 'Understanding of the problem',
        definition: 'Does the applicant understand the problem and the sensitivity of the data involved?',
        weightPercent: 15,
        evidenceHint: 'Reference the problem section.',
        anchors: anchors(
          'No understanding shown.',
          'Restates the challenge.',
          'Understands the problem, not the data sensitivity.',
          'Understands both.',
          'Understands both and designs around the sensitivity.',
          'Understands both and reduces the data needed.',
        ),
      },
      {
        id: 'D2',
        label: 'Data minimisation',
        definition: 'Does the applicant ask for the least data that can produce the outcome?',
        weightPercent: 25,
        evidenceHint: 'Reference the requested field list.',
        anchors: anchors(
          'Requests everything available.',
          'Requests more than needed with no justification.',
          'Requests more than needed with partial justification.',
          'Requests what is needed, field by field.',
          'Requests what is needed and proposes a synthetic first phase.',
          'Demonstrates the outcome is achievable at a lower data tier.',
        ),
      },
      {
        id: 'D3',
        label: 'Technical approach',
        definition: 'Is the approach sound given the data constraints?',
        weightPercent: 20,
        evidenceHint: 'Reference the method section.',
        anchors: anchors(
          'No workable approach.',
          'Approach unsuited to the data available.',
          'Approach workable with gaps.',
          'Approach sound.',
          'Approach sound and robust to missing data.',
          'Approach sound, robust, and already proven at this tier.',
        ),
      },
      {
        id: 'D4',
        label: 'Security controls',
        definition: 'Are the controls proportionate to the tier requested?',
        weightPercent: 25,
        evidenceHint: 'Reference the security annexure.',
        anchors: anchors(
          'No controls described.',
          'Generic controls.',
          'Controls described, not proportionate.',
          'Proportionate controls with an audit trail.',
          'Proportionate controls, audited, with an incident plan.',
          'As above and independently certified within the last year.',
        ),
      },
      {
        id: 'D5',
        label: 'Pilot plan and acceptance tests',
        definition: 'Are milestones testable inside the data constraints?',
        weightPercent: 15,
        evidenceHint: 'Reference the milestone table.',
        anchors: anchors(
          'No milestones.',
          'Activities, not results.',
          'Results with vague tests.',
          'Testable milestones.',
          'Testable and sequenced.',
          'Testable, sequenced and independently verifiable.',
        ),
      },
    ],
  },
] as const;

export function rubric(id: string): RubricDefinition {
  const found = RUBRICS.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown rubric: ${id}`);
  return found;
}

export function rubricWeightTotal(criteria: readonly { weightPercent: number }[]): number {
  return criteria.reduce((sum, c) => sum + c.weightPercent, 0);
}

/** Startup matching weights. Deterministic, published, explained on every recommendation. */
export const MATCH_WEIGHTS: readonly { key: string; label: string; weightPercent: number }[] = [
  { key: 'technology', label: 'Technology similarity', weightPercent: 25 },
  { key: 'problem', label: 'Problem similarity', weightPercent: 25 },
  { key: 'deployment', label: 'Past deployment', weightPercent: 15 },
  { key: 'geography', label: 'Geography', weightPercent: 10 },
  { key: 'eligibility', label: 'Eligibility', weightPercent: 10 },
  { key: 'maturity', label: 'Product maturity', weightPercent: 5 },
  { key: 'budget', label: 'Budget suitability', weightPercent: 5 },
  { key: 'certification', label: 'Certification match', weightPercent: 5 },
] as const;

/** Procurement readiness weights. Every component is shown; there is no black box. */
export const READINESS_WEIGHTS: readonly { key: string; label: string; weightPercent: number; basis: string }[] = [
  {
    key: 'kpi',
    label: 'KPI achievement',
    weightPercent: 30,
    basis: 'Validated result against the published target, capped at 100 percent of target.',
  },
  {
    key: 'technical',
    label: 'Technical performance',
    weightPercent: 20,
    basis: 'Acceptance tests met, partially met or not met across all milestones.',
  },
  {
    key: 'cost',
    label: 'Cost effectiveness',
    weightPercent: 15,
    basis: 'Actual pilot cost against budget and against the closest market alternative.',
  },
  {
    key: 'security',
    label: 'Security compliance',
    weightPercent: 10,
    basis: 'Security audit findings closed, data attestation signed, incidents resolved in window.',
  },
  {
    key: 'satisfaction',
    label: 'User satisfaction',
    weightPercent: 10,
    basis: 'Departmental end-user survey conducted during the pilot period.',
  },
  {
    key: 'operations',
    label: 'Operational feasibility',
    weightPercent: 5,
    basis: 'Can departmental staff run this without the startup present.',
  },
  {
    key: 'scalability',
    label: 'Scalability',
    weightPercent: 10,
    basis: 'Evidence the approach holds at the volume of the proposed scale-up.',
  },
] as const;
