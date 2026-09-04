/**
 * Templates and clauses. Legal text lives here, versioned and cited — never inside a component.
 * The clause reader renders `legalText` in Tiro; the plain-language `position` is what the
 * user sees first.
 */

export type DeviationLevel = 'default' | 'minor' | 'material';

export interface ClauseDefinition {
  id: string;
  number: string;
  title: string;
  /** Plain language, shown first. */
  position: string;
  /** Authoritative text. Never machine-translated silently. */
  legalText: string;
  riskNote: string;
  deviation: DeviationLevel;
  approvalLevel: string;
  citation: string;
}

export interface TemplateDefinition {
  id: string;
  label: string;
  kind:
    | 'problem_statement'
    | 'evaluation_rubric'
    | 'pilot_agreement'
    | 'ip_clause'
    | 'data_clause'
    | 'cyber_annexure'
    | 'risk_register'
    | 'milestone_schedule'
    | 'validation_report'
    | 'gate_note'
    | 'pathway_justification';
  version: string;
  effectiveFrom: string;
  updatedOn: string;
  owner: string;
  format: 'Document' | 'Spreadsheet' | 'Form';
  summary: string;
  usageCount: number;
  changeDiff: string;
  clauses?: readonly string[];
  previewSections: readonly { heading: string; body: string }[];
}

export const CLAUSES: readonly ClauseDefinition[] = [
  {
    id: 'CL-IP-01',
    number: '7.1',
    title: 'Ownership of background and foreground intellectual property',
    position:
      'You keep everything you brought with you, and everything you build during the pilot. The government does not take ownership.',
    legalText:
      'All Background Intellectual Property shall remain the sole property of the Party introducing the same. All Foreground Intellectual Property created by the Startup in the course of performance of this Agreement shall vest in and remain the sole property of the Startup, save as expressly provided in Clause 7.2. Nothing in this Agreement shall operate to assign, transfer or otherwise dispose of any Intellectual Property Rights of the Startup to the Department.',
    riskNote: 'This is the default position. Departing from it requires an order from the competent authority.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'PRAYOG-SOP-4',
  },
  {
    id: 'CL-IP-02',
    number: '7.2',
    title: 'Government purpose licence',
    position:
      'Government gets a permanent, paid-up licence to use what you built, for government purposes, within the departments named in the agreement. It cannot resell it or license it commercially.',
    legalText:
      'The Startup hereby grants to the Department a non-exclusive, irrevocable, royalty-free, perpetual licence to use, reproduce, modify and have modified the Foreground Intellectual Property solely for Government Purposes within the Scheduled Entities. The said licence shall not extend to any commercial exploitation, sub-licensing for consideration, or transfer to any third party other than a Scheduled Entity or a contractor acting solely on behalf of a Scheduled Entity.',
    riskNote:
      'Scope depends on the Scheduled Entities listed in Schedule C. A scale-up to further departments needs Schedule C amended.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'PRAYOG-SOP-4',
  },
  {
    id: 'CL-IP-03',
    number: '7.3',
    title: 'Assignment of intellectual property to government',
    position:
      'A non-standard alternative: the government takes ownership. Used only where a statutory function requires it.',
    legalText:
      'Notwithstanding Clause 7.1, the Startup shall assign to the Department, absolutely and free of encumbrance, all right, title and interest in the Foreground Intellectual Property arising from the Pilot, together with the right to bring proceedings for past infringement.',
    riskNote:
      'A material deviation. It removes the startup’s ability to commercialise and materially raises the price the department will pay.',
    deviation: 'material',
    approvalLevel: 'Secretary of the administrative department, with written reasons.',
    citation: 'PRAYOG-SOP-4',
  },
  {
    id: 'CL-DATA-01',
    number: '9.1',
    title: 'Data tier and purpose limitation',
    position:
      'You may use departmental data only for the pilot purpose written into the agreement, at the tier granted, and for no longer than the stated period.',
    legalText:
      'The Startup shall process Department Data solely for the Permitted Purpose specified in Schedule D, at the Data Tier granted thereunder, and shall not process, retain, combine or disclose such data for any other purpose. Upon the earlier of completion of the Pilot or termination of this Agreement, the Startup shall securely erase all Department Data within thirty (30) days and shall certify such erasure in writing.',
    riskNote: 'Erasure certification is a gate 5 precondition. Missing it blocks validation.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'DPDP-2023-S8',
  },
  {
    id: 'CL-DATA-02',
    number: '9.4',
    title: 'Sub-processors and processing location',
    position:
      'You must name every sub-processor and every place the data is processed, before you start. Changes need written approval first.',
    legalText:
      'The Startup shall not engage any sub-processor, nor process Department Data outside the territory of India, without the prior written consent of the Department. The Startup shall maintain and furnish on demand a current register of sub-processors specifying the identity, function and processing location of each.',
    riskNote: 'An unnotified sub-processor is a reportable incident, not a contract variation.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'DPDP-2023-S8',
  },
  {
    id: 'CL-PAY-01',
    number: '5.2',
    title: 'Milestone acceptance and payment',
    position:
      'Money follows evidence. Once the department accepts a milestone in writing, the payment clock starts and runs in public.',
    legalText:
      'Payment of the sum specified against each Milestone in Schedule B shall become due upon written acceptance by the Department of the deliverables and evidence prescribed for that Milestone. The Department shall effect payment within thirty (30) calendar days of such acceptance. Acceptance shall not be unreasonably withheld and any rejection shall state, in writing, the acceptance criteria not met.',
    riskNote:
      'The thirty-day figure is configured at payment.milestone.limit.days and is reflected on every ageing bar in the product.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'PRAYOG-SOP-9',
  },
  {
    id: 'CL-PAY-02',
    number: '5.5',
    title: 'Deductions',
    position:
      'The department can deduct only for a reason on the published list, and must show you the recomputed amount before it pays.',
    legalText:
      'The Department may deduct from any sum otherwise due only such amounts as are attributable to a Deduction Ground set out in Schedule B Part 3, and shall communicate to the Startup the ground relied upon and the recomputed amount not less than seven (7) days prior to effecting payment.',
    riskNote: 'A deduction above the configured maximum requires a separate competent-authority order.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'PRAYOG-SOP-9',
  },
  {
    id: 'CL-EXIT-01',
    number: '12.3',
    title: 'Exit and transition',
    position:
      'If the pilot stops, you hand over data and documentation in an open format within thirty days, and you get paid for milestones already accepted.',
    legalText:
      'Upon expiry or termination, the Startup shall, within thirty (30) days, deliver to the Department all Department Data and all documentation reasonably required for continuity, in a non-proprietary machine-readable format, and shall provide reasonable transition assistance for a period not exceeding sixty (60) days. Sums due in respect of Milestones accepted prior to termination shall remain payable.',
    riskNote: 'Transition assistance is unpriced by default; price it in Schedule B if a long handover is likely.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'PRAYOG-SOP-4',
  },
  {
    id: 'CL-CYBER-01',
    number: '10.1',
    title: 'Incident reporting',
    position:
      'A cyber incident must be reported to the department and to CERT-In within the statutory window from the moment you detect it.',
    legalText:
      'The Startup shall report any cyber security incident affecting Department Data or the Pilot environment to the Department and to the Indian Computer Emergency Response Team within six (6) hours of noticing such incident or being brought to notice about such incident, and shall retain all logs for a rolling period of one hundred and eighty (180) days within the territory of India.',
    riskNote: 'The six-hour window is statutory and drives the incident resolution clock on the pilot workspace.',
    deviation: 'default',
    approvalLevel: 'None. This is the standard clause.',
    citation: 'CERTIN-2022-DIR',
  },
] as const;

export const TEMPLATES: readonly TemplateDefinition[] = [
  {
    id: 'TPL-PROB-01',
    label: 'Outcome-based problem statement',
    kind: 'problem_statement',
    version: 'v4.0',
    effectiveFrom: '2026-04-01',
    updatedOn: '2026-03-24',
    owner: 'Programme management unit',
    format: 'Form',
    summary:
      'Turns an operational complaint into a measurable outcome. Splits the problem into who is affected, what happens today, how often, and what it costs.',
    usageCount: 61,
    changeDiff:
      'v4.0 separates the baseline from the outcome so the two cannot be confused. v3.2 combined them in one field, which produced unmeasurable challenges.',
    previewSections: [
      {
        heading: 'Who is affected',
        body: 'Name the people who experience the problem, and how many of them there are. Avoid the phrase "the department".',
      },
      {
        heading: 'What happens today',
        body: 'Describe the current process end to end, including the manual steps and the point at which it fails.',
      },
      {
        heading: 'What it costs',
        body: 'State the cost in money, time, or harm. If it has never been measured, say so — that itself is a finding.',
      },
    ],
  },
  {
    id: 'TPL-RUB-01',
    label: 'Standard evaluation rubric',
    kind: 'evaluation_rubric',
    version: 'v3.1',
    effectiveFrom: '2026-04-01',
    updatedOn: '2026-03-24',
    owner: 'Programme management unit',
    format: 'Spreadsheet',
    summary:
      'Seven weighted criteria with anchored descriptors at every score. Published with the challenge so applicants can read it before they write.',
    usageCount: 58,
    changeDiff: 'v3.1 raised data handling from 10 to 15 percent and reduced value for money from 10 to 5.',
    previewSections: [
      { heading: 'Weights', body: 'Understanding 20, technical 20, measurability 15, pilot plan 15, data 15, team 10, value 5.' },
      { heading: 'Anchors', body: 'Every criterion carries a written descriptor at each of the six score points.' },
      { heading: 'Rationale', body: 'A score without a written reason of at least the configured length cannot be submitted.' },
    ],
  },
  {
    id: 'TPL-AGR-01',
    label: 'Pilot agreement',
    kind: 'pilot_agreement',
    version: 'v5.2',
    effectiveFrom: '2026-04-01',
    updatedOn: '2026-04-02',
    owner: 'Department of Law and Justice, model contracts cell',
    format: 'Document',
    summary:
      'The full pilot contract. Startup keeps its IP; government takes a purpose licence; money moves against accepted milestones.',
    usageCount: 34,
    changeDiff:
      'v5.2 adds Clause 9.4 on sub-processors and processing location, following the DPDP Act 2023 rules notification.',
    clauses: ['CL-IP-01', 'CL-IP-02', 'CL-DATA-01', 'CL-DATA-02', 'CL-PAY-01', 'CL-PAY-02', 'CL-CYBER-01', 'CL-EXIT-01'],
    previewSections: [
      { heading: 'Clause 5.2', body: 'Payment follows written acceptance of milestone evidence.' },
      { heading: 'Clause 7.1', body: 'Foreground IP vests in the startup.' },
      { heading: 'Clause 9.1', body: 'Data used only for the permitted purpose, at the granted tier.' },
    ],
  },
  {
    id: 'TPL-IP-01',
    label: 'IP clause set',
    kind: 'ip_clause',
    version: 'v2.1',
    effectiveFrom: '2026-04-01',
    updatedOn: '2026-03-18',
    owner: 'Department of Law and Justice, model contracts cell',
    format: 'Document',
    summary: 'Three positions: startup retains (default), joint, and assignment to government. Each with its approval level.',
    usageCount: 34,
    changeDiff: 'v2.1 marks assignment as a material deviation requiring Secretary approval with written reasons.',
    clauses: ['CL-IP-01', 'CL-IP-02', 'CL-IP-03'],
    previewSections: [
      { heading: 'Default', body: 'Startup retains ownership; government receives a purpose licence.' },
      { heading: 'Material deviation', body: 'Assignment to government. Rarely justified; always priced.' },
    ],
  },
  {
    id: 'TPL-DATA-01',
    label: 'Data clause set and annexure',
    kind: 'data_clause',
    version: 'v3.0',
    effectiveFrom: '2026-02-01',
    updatedOn: '2026-01-28',
    owner: 'Department of Law and Justice, model contracts cell',
    format: 'Document',
    summary: 'Tier, purpose, retention, erasure, sub-processors and processing location, aligned to the DPDP Act 2023.',
    usageCount: 34,
    clauses: ['CL-DATA-01', 'CL-DATA-02'],
    changeDiff: 'v3.0 requires field-level justification for every requested data element.',
    previewSections: [
      { heading: 'Schedule D', body: 'Field-by-field list of what is shared, at what tier, for what purpose.' },
      { heading: 'Erasure', body: 'Certified erasure within thirty days of pilot completion.' },
    ],
  },
  {
    id: 'TPL-CYB-01',
    label: 'Cybersecurity annexure',
    kind: 'cyber_annexure',
    version: 'v2.3',
    effectiveFrom: '2026-01-01',
    updatedOn: '2025-12-20',
    owner: 'State cyber security cell',
    format: 'Document',
    summary: 'Controls by data tier, incident reporting window, log retention, and the audit evidence a validator will ask for.',
    usageCount: 34,
    clauses: ['CL-CYBER-01'],
    changeDiff: 'v2.3 aligns the log retention period with the CERT-In directions.',
    previewSections: [
      { heading: 'Controls by tier', body: 'Synthetic, masked and production each carry a different control set.' },
      { heading: 'Reporting', body: 'Six hours from detection, to the department and to CERT-In.' },
    ],
  },
  {
    id: 'TPL-RISK-01',
    label: 'Pilot risk register',
    kind: 'risk_register',
    version: 'v1.4',
    effectiveFrom: '2026-01-01',
    updatedOn: '2025-11-30',
    owner: 'Programme management unit',
    format: 'Spreadsheet',
    summary: 'Probability times impact, an owner per risk, and a review date. Reviewed as a gate 4 precondition.',
    usageCount: 29,
    changeDiff: 'v1.4 adds a data-availability risk category after three pilots stalled on it.',
    previewSections: [
      { heading: 'Severity', body: 'Probability multiplied by impact, both on a five-point scale.' },
      { heading: 'Ownership', body: 'Every open risk names one person, not a team.' },
    ],
  },
  {
    id: 'TPL-MILE-01',
    label: 'Milestone schedule',
    kind: 'milestone_schedule',
    version: 'v2.0',
    effectiveFrom: '2026-01-01',
    updatedOn: '2025-12-11',
    owner: 'Finance and accounts',
    format: 'Spreadsheet',
    summary: 'Milestone, acceptance test, evidence required, payment, and the ageing clock that starts on acceptance.',
    usageCount: 34,
    changeDiff: 'v2.0 makes the evidence list mandatory per milestone rather than per pilot.',
    previewSections: [
      { heading: 'One test per rupee', body: 'No milestone may carry a payment without an acceptance test.' },
      { heading: 'Arithmetic', body: 'Milestone payments must total the pilot budget exactly.' },
    ],
  },
  {
    id: 'TPL-VAL-01',
    label: 'Independent validation report',
    kind: 'validation_report',
    version: 'v2.2',
    effectiveFrom: '2026-03-01',
    updatedOn: '2026-02-24',
    owner: 'Programme management unit',
    format: 'Document',
    summary:
      'Findings against every success criterion, the re-derivation method, and one of three outcomes. Published with its hash.',
    usageCount: 11,
    changeDiff: 'v2.2 requires the validator to state whether raw records were sufficient to re-derive the claim.',
    previewSections: [
      { heading: 'Outcomes', body: 'Validated, validated with qualifications, or not validated.' },
      { heading: 'Re-derivation', body: 'State the records used and whether the claimed figure was reproduced.' },
    ],
  },
  {
    id: 'TPL-GATE-01',
    label: 'Gate decision note',
    kind: 'gate_note',
    version: 'v1.1',
    effectiveFrom: '2026-01-01',
    updatedOn: '2025-12-02',
    owner: 'Programme management unit',
    format: 'Document',
    summary: 'The standing format for recording a gate decision: preconditions tested, decision, reasons, consequences.',
    usageCount: 147,
    changeDiff: 'v1.1 requires the consequence list to be reproduced in the note, not merely referenced.',
    previewSections: [
      { heading: 'Structure', body: 'What was decided, on what evidence, with what consequence, notified to whom.' },
    ],
  },
  {
    id: 'TPL-PATH-01',
    label: 'Procurement pathway justification',
    kind: 'pathway_justification',
    version: 'v1.3',
    effectiveFrom: '2026-03-01',
    updatedOn: '2026-02-19',
    owner: 'Procurement policy division',
    format: 'Document',
    summary:
      'The written case for the chosen pathway, against the rule that permits it, with the value-for-money analysis attached.',
    usageCount: 7,
    changeDiff: 'v1.3 requires reasons against the chosen pathway to be recorded, not only reasons for.',
    previewSections: [
      { heading: 'Reasons against', body: 'Recording the counter-argument is what makes the decision defensible later.' },
    ],
  },
] as const;

export function clause(id: string): ClauseDefinition {
  const found = CLAUSES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown clause: ${id}`);
  return found;
}

export function template(id: string): TemplateDefinition {
  const found = TEMPLATES.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown template: ${id}`);
  return found;
}

/** The three data tiers. A tier is a decision, not a toggle. */
export interface DataTierDefinition {
  id: 'synthetic' | 'masked' | 'production';
  label: string;
  purpose: string;
  approval: string;
  duration: string;
  conditions: readonly string[];
  logging: string;
  citation: string;
}

export const DATA_TIERS: readonly DataTierDefinition[] = [
  {
    id: 'synthetic',
    label: 'Synthetic',
    purpose: 'Build and demonstrate the approach without touching any real record.',
    approval: 'Department nodal officer.',
    duration: 'For the whole pilot.',
    conditions: [
      'Generated to match the shape and distribution of the real data, never derived from it',
      'May be taken outside the sandbox',
      'No personal data of any kind',
    ],
    logging: 'Access logged at the environment level only.',
    citation: 'DPDP-2023-S8',
  },
  {
    id: 'masked',
    label: 'Masked',
    purpose: 'Test against real structure and real edge cases without exposing identities.',
    approval: 'Department data custodian.',
    duration: 'Named phase of the pilot, renewable once.',
    conditions: [
      'Direct identifiers removed and quasi-identifiers generalised before release',
      'Stays inside the sandbox; no export',
      'Re-identification attempts are a contract breach and a reportable incident',
    ],
    logging: 'Every query logged with the requesting identity and retained for the statutory period.',
    citation: 'DPDP-2023-S8',
  },
  {
    id: 'production',
    label: 'Production',
    purpose: 'Measure the outcome under live conditions, where nothing else will prove it.',
    approval: 'Department data custodian and the programme management unit, jointly, with written reasons.',
    duration: 'Fixed window written into Schedule D. Credentials expire with it.',
    conditions: [
      'Only after a synthetic or masked phase has demonstrated the approach works',
      'Field-level justification required for every element released',
      'No export, no sub-processor outside India, no secondary use',
      'Erasure certified in writing within thirty days of the window closing',
    ],
    logging: 'Full query and access log, retained in India, available to the validator and the audit trail.',
    citation: 'DPDP-2023-S8',
  },
] as const;

export function dataTier(id: string): DataTierDefinition {
  const found = DATA_TIERS.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown data tier: ${id}`);
  return found;
}

/** Procurement pathways available at gate 6. */
export interface PathwayDefinition {
  id: string;
  label: string;
  summary: string;
  citation: string;
  authority: string;
  indicativeWeeks: [number, number];
  suitsWhen: readonly string[];
  poorFitWhen: readonly string[];
}

export const PATHWAYS: readonly PathwayDefinition[] = [
  {
    id: 'gem-listing',
    label: 'Government e-Marketplace listing',
    summary: 'List the validated solution as a catalogue item other buyers can order directly.',
    citation: 'GFR-2017-166',
    authority: 'Department head, within delegated financial powers',
    indicativeWeeks: [4, 8],
    suitsWhen: [
      'The solution is productised and needs little configuration',
      'Other departments have the same problem',
      'Unit price is stable and comparable',
    ],
    poorFitWhen: ['Each deployment needs substantial bespoke work', 'The market has no comparable listing to price against'],
  },
  {
    id: 'limited-tender',
    label: 'Limited tender enquiry',
    summary: 'Invite a shortlist of capable suppliers, including the pilot startup, to bid for the scaled contract.',
    citation: 'GFR-2017-166',
    authority: 'Procurement officer with finance concurrence',
    indicativeWeeks: [8, 14],
    suitsWhen: [
      'More than one supplier could plausibly deliver',
      'Contract value is material and price competition is worth the delay',
    ],
    poorFitWhen: ['The pilot proved a genuinely singular capability', 'Urgency outweighs the price benefit of competition'],
  },
  {
    id: 'open-tender',
    label: 'Open tender',
    summary: 'Compete the scaled requirement openly, using the pilot to write a better specification.',
    citation: 'GFR-2017-166',
    authority: 'Competent authority per delegated powers',
    indicativeWeeks: [14, 24],
    suitsWhen: ['High value', 'A healthy supplier market', 'The pilot mainly taught you what to ask for'],
    poorFitWhen: ['The window to act is short', 'The validated advantage is specific to this supplier'],
  },
  {
    id: 'single-source',
    label: 'Single source with recorded justification',
    summary: 'Contract the pilot startup directly, on written grounds that no alternative can meet the requirement.',
    citation: 'GFR-2017-173',
    authority: 'Secretary of the administrative department, with written reasons',
    indicativeWeeks: [4, 10],
    suitsWhen: ['Genuine singularity demonstrated during the pilot', 'Switching cost or continuity risk is decisive'],
    poorFitWhen: ['Comparable suppliers exist', 'Value for money cannot be demonstrated against an alternative'],
  },
  {
    id: 'innovation-partnership',
    label: 'Innovation partnership',
    summary: 'Continue development and phased purchase with the same supplier under a staged contract.',
    citation: 'PRAYOG-SOP-12',
    authority: 'Competent authority with programme management unit concurrence',
    indicativeWeeks: [10, 18],
    suitsWhen: ['The solution works but is not finished', 'Further development is needed before volume purchase'],
    poorFitWhen: ['The pilot outcome was fully achieved and the product is stable'],
  },
  {
    id: 'close',
    label: 'Close without procurement',
    summary: 'Record what was learned and stop. A pilot that does not justify purchase is a successful experiment.',
    citation: 'PRAYOG-SOP-12',
    authority: 'Department head',
    indicativeWeeks: [1, 3],
    suitsWhen: ['The outcome was not validated', 'The validated gain does not justify the recurring cost'],
    poorFitWhen: ['The outcome was validated and the cost case holds'],
  },
] as const;
