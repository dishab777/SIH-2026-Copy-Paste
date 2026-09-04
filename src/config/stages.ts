/** The nine operational stages, shown on how-it-works, case timelines and analytics. */

export interface StageDefinition {
  id: string;
  index: number;
  title: string;
  actor: string;
  gate: string;
  department: { happens: string; produces: string };
  startup: { happens: string; produces: string };
  typicalDurationDays: [number, number];
}

export const STAGES: readonly StageDefinition[] = [
  {
    id: 'S1',
    index: 1,
    title: 'Challenge intake and framing',
    actor: 'Department nodal officer',
    gate: 'G0',
    department: {
      happens:
        'You describe the operational problem, measure what it costs today, and turn it into an outcome someone else could be paid to achieve.',
      produces: 'A baseline, an outcome KPI, a budget head and a draft challenge.',
    },
    startup: {
      happens: 'Nothing yet. The department is still deciding whether the problem is real and funded.',
      produces: 'No public record until gate 1 clears.',
    },
    typicalDurationDays: [7, 14],
  },
  {
    id: 'S2',
    index: 2,
    title: 'Publication and demand signalling',
    actor: 'Programme management unit',
    gate: 'G1',
    department: {
      happens: 'The programme unit checks that you have asked for an outcome, not named a product.',
      produces: 'A published challenge with a rubric, an IP position and a data annexure.',
    },
    startup: {
      happens: 'The challenge appears on the demand board with its budget, deadline and evaluation rubric in the open.',
      produces: 'A public challenge you can read in full before deciding to spend a week on it.',
    },
    typicalDurationDays: [3, 5],
  },
  {
    id: 'S3',
    index: 3,
    title: 'Discovery and application',
    actor: 'Startups',
    gate: 'G1',
    department: {
      happens: 'Applications arrive. You answer clarification questions in public, within the configured window.',
      produces: 'An applicant pool and a published clarification record.',
    },
    startup: {
      happens:
        'You check eligibility against your verified profile before writing anything, then apply in six steps with autosave.',
      produces: 'A submitted application with a reference number and a timestamped receipt.',
    },
    typicalDurationDays: [21, 45],
  },
  {
    id: 'S4',
    index: 4,
    title: 'Eligibility screening',
    actor: 'Rule engine and screening committee',
    gate: 'G2',
    department: {
      happens:
        'Rules run automatically against verified facts. Anything the engine cannot decide goes to a human, who must write down why.',
      produces: 'An eligibility ledger with a result, evidence and a citation per rule.',
    },
    startup: {
      happens: 'You see exactly which rule you passed or failed, the evidence used and the rule cited.',
      produces: 'A written eligibility outcome. Never a silent rejection.',
    },
    typicalDurationDays: [7, 14],
  },
  {
    id: 'S5',
    index: 5,
    title: 'Expert evaluation and selection',
    actor: 'External evaluators',
    gate: 'G3',
    department: {
      happens:
        'Evaluators declare conflicts before they can open a proposal, then score against the published rubric with a written reason per criterion.',
      produces: 'Scores, rationales, variance flags and signed evaluation minutes.',
    },
    startup: {
      happens: 'You are scored against the same rubric you read before applying. Nothing is added afterwards.',
      produces: 'A result you can trace back to specific criteria.',
    },
    typicalDurationDays: [14, 21],
  },
  {
    id: 'S6',
    index: 6,
    title: 'Pilot design and milestone contracting',
    actor: 'Department and startup',
    gate: 'G3',
    department: {
      happens: 'You agree scope, milestones, acceptance tests, data tier and payment per milestone before work starts.',
      produces: 'A signed pilot agreement with an acceptance test attached to every rupee.',
    },
    startup: {
      happens: 'You read the clauses in plain language first, then the legal text, then sign in two steps.',
      produces: 'A countersigned contract and a milestone schedule you can plan against.',
    },
    typicalDurationDays: [10, 20],
  },
  {
    id: 'S7',
    index: 7,
    title: 'Pilot execution and measurement',
    actor: 'Startup and department',
    gate: 'G4',
    department: {
      happens: 'Evidence arrives against each milestone. You accept, return or reject it, explicitly, within the review window.',
      produces: 'Accepted milestones, KPI readings, a risk register and an incident log.',
    },
    startup: {
      happens: 'You submit evidence, and the payment clock starts the moment a milestone is accepted — visibly.',
      produces: 'Milestone acceptances and payment claims with an ageing clock anyone can see.',
    },
    typicalDurationDays: [60, 180],
  },
  {
    id: 'S8',
    index: 8,
    title: 'Independent validation',
    actor: 'Independent validator',
    gate: 'G5',
    department: {
      happens:
        'Someone outside the department re-derives the numbers from the raw records and reports against every success criterion.',
      produces: 'A hashed, published validation report, including where the pilot fell short.',
    },
    startup: {
      happens: 'Your claimed outcome is checked against raw data. A validated result becomes a verifiable reference.',
      produces: 'An independently validated deployment record.',
    },
    typicalDurationDays: [10, 15],
  },
  {
    id: 'S9',
    index: 9,
    title: 'Procurement, scale-up and replication',
    actor: 'Competent authority',
    gate: 'G6',
    department: {
      happens:
        'A successful pilot is not a purchase. You choose a procurement pathway and justify it against the rule that permits it.',
      produces: 'A pathway note, a value-for-money analysis and a replication package other departments can use.',
    },
    startup: {
      happens: 'You learn the pathway and the authority deciding it, with an indicative timeline.',
      produces: 'A procurement decision with reasons, published either way.',
    },
    typicalDurationDays: [30, 90],
  },
] as const;
