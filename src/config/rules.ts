import { policyNumber } from './policies';

/**
 * The eligibility rule engine, expressed as data and versioned.
 * The admin rule builder edits these; screening evaluates them; nothing is hardcoded in a screen.
 *
 * Relief category matters: GFR 2017 Rule 173(i) permits relaxation of prior turnover and prior
 * experience for recognised startups. Nothing else is relaxable, and the interface says so.
 */

export type RuleField =
  | 'entity.type'
  | 'entity.incorporationYears'
  | 'entity.turnoverCrore'
  | 'dpiit.status'
  | 'dpiit.validTo'
  | 'gst.status'
  | 'capability.tags'
  | 'deployment.count'
  | 'deployment.governmentCount'
  | 'certification.list'
  | 'geography.states'
  | 'declaration.debarred'
  | 'declaration.blacklisted'
  | 'documents.complete';

export type RuleOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'includes'
  | 'excludes'
  | 'isTrue'
  | 'isFalse'
  | 'afterToday'
  | 'anyOf';

export type ReliefCategory = 'relaxable' | 'not_relaxable';

export type RuleOutcome = 'pass' | 'fail' | 'review';

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value?: string | number | boolean | readonly string[];
}

export interface EligibilityRuleDefinition {
  id: string;
  version: number;
  label: string;
  /** Written so an applicant can understand it without a lawyer. */
  explanation: string;
  category: 'entity' | 'recognition' | 'technical' | 'quality' | 'security' | 'safety' | 'performance' | 'conduct';
  relief: ReliefCategory;
  reliefNote?: string;
  citation: string;
  effectiveFrom: string;
  logic: 'all' | 'any';
  conditions: readonly RuleCondition[];
  /** What happens when the conditions do not hold. */
  onFail: RuleOutcome;
  status: 'active' | 'deprecated';
  deprecatedNote?: string;
  changeNote: string;
}

export const ELIGIBILITY_RULES: readonly EligibilityRuleDefinition[] = [
  {
    id: 'R-ENT-01',
    version: 3,
    label: 'Registered legal entity',
    explanation: 'The applicant is a company, LLP or registered partnership with a valid registration number.',
    category: 'entity',
    relief: 'not_relaxable',
    citation: 'DPIIT-2019-127',
    effectiveFrom: '2026-01-01',
    logic: 'all',
    conditions: [{ field: 'entity.type', operator: 'anyOf', value: ['private_limited', 'llp', 'partnership'] }],
    onFail: 'fail',
    status: 'active',
    changeNote: 'Added registered partnership to the accepted entity types.',
  },
  {
    id: 'R-ENT-02',
    version: 2,
    label: 'Entity age within the startup definition',
    explanation: `Incorporated within the last ${policyNumber('eligibility.startup.maxAgeYears')} years, as required for startup recognition.`,
    category: 'recognition',
    relief: 'not_relaxable',
    citation: 'DPIIT-2019-127',
    effectiveFrom: '2019-02-19',
    logic: 'all',
    conditions: [
      {
        field: 'entity.incorporationYears',
        operator: 'lte',
        value: policyNumber('eligibility.startup.maxAgeYears'),
      },
    ],
    onFail: 'fail',
    status: 'active',
    changeNote: 'Ceiling raised from 7 to 10 years by G.S.R. 127(E).',
  },
  {
    id: 'R-REC-01',
    version: 4,
    label: 'Valid startup recognition',
    explanation:
      'The applicant holds a current DPIIT recognition. Expired recognition does not fail automatically — it goes to a human for review.',
    category: 'recognition',
    relief: 'not_relaxable',
    citation: 'DPIIT-2019-127',
    effectiveFrom: '2026-01-01',
    logic: 'all',
    conditions: [
      { field: 'dpiit.status', operator: 'eq', value: 'recognised' },
      { field: 'dpiit.validTo', operator: 'afterToday' },
    ],
    onFail: 'review',
    status: 'active',
    changeNote: 'Expiry now routes to needs review rather than an automatic fail.',
  },
  {
    id: 'R-FIN-01',
    version: 2,
    label: 'Prior turnover',
    explanation:
      'The challenge sets a prior turnover figure. A recognised startup may be relieved of it under GFR 2017 Rule 173(i).',
    category: 'entity',
    relief: 'relaxable',
    reliefNote: 'Relaxed automatically for a recognised startup. The technical bar is unchanged.',
    citation: 'GFR-2017-173',
    effectiveFrom: '2017-03-07',
    logic: 'all',
    conditions: [{ field: 'entity.turnoverCrore', operator: 'gte', value: 1 }],
    onFail: 'fail',
    status: 'active',
    changeNote: 'Relief linked to live recognition status rather than a self-declaration.',
  },
  {
    id: 'R-EXP-01',
    version: 2,
    label: 'Prior experience of similar work',
    explanation:
      'The challenge asks for prior deployments. A recognised startup may be relieved of it under GFR 2017 Rule 173(i).',
    category: 'entity',
    relief: 'relaxable',
    reliefNote: 'Relaxed automatically for a recognised startup. Technical capability is still assessed.',
    citation: 'GFR-2017-173',
    effectiveFrom: '2017-03-07',
    logic: 'all',
    conditions: [{ field: 'deployment.count', operator: 'gte', value: 2 }],
    onFail: 'fail',
    status: 'active',
    changeNote: 'Relief made automatic instead of discretionary.',
  },
  {
    id: 'R-TEC-01',
    version: 1,
    label: 'Required technical capability',
    explanation: 'The applicant declares and evidences the capabilities the challenge requires.',
    category: 'technical',
    relief: 'not_relaxable',
    reliefNote: 'Never relaxed. Startups get relief on turnover and experience, not on capability.',
    citation: 'PRAYOG-SOP-4',
    effectiveFrom: '2026-01-01',
    logic: 'all',
    conditions: [{ field: 'capability.tags', operator: 'includes' }],
    onFail: 'fail',
    status: 'active',
    changeNote: 'Initial version.',
  },
  {
    id: 'R-SEC-01',
    version: 3,
    label: 'Cybersecurity baseline',
    explanation:
      'The applicant holds the security certification the challenge requires, or an equivalent accepted by the department.',
    category: 'security',
    relief: 'not_relaxable',
    reliefNote: 'Never relaxed.',
    citation: 'CERTIN-2022-DIR',
    effectiveFrom: '2022-06-28',
    logic: 'any',
    conditions: [
      { field: 'certification.list', operator: 'includes', value: 'ISO 27001' },
      { field: 'certification.list', operator: 'includes', value: 'SOC 2 Type II' },
      { field: 'certification.list', operator: 'includes', value: 'CERT-In empanelled audit' },
    ],
    onFail: 'review',
    status: 'active',
    changeNote: 'CERT-In empanelled audit accepted as equivalent evidence.',
  },
  {
    id: 'R-DAT-01',
    version: 2,
    label: 'Data protection undertaking',
    explanation:
      'The applicant accepts data-fiduciary obligations: stated purpose, stated retention, stated processing location.',
    category: 'security',
    relief: 'not_relaxable',
    citation: 'DPDP-2023-S8',
    effectiveFrom: '2023-08-11',
    logic: 'all',
    conditions: [{ field: 'documents.complete', operator: 'isTrue' }],
    onFail: 'fail',
    status: 'active',
    changeNote: 'Aligned wording with the DPDP Act 2023.',
  },
  {
    id: 'R-CON-01',
    version: 1,
    label: 'Not debarred or blacklisted',
    explanation: 'The applicant is not debarred or blacklisted by any government body.',
    category: 'conduct',
    relief: 'not_relaxable',
    citation: 'PRAYOG-SOP-4',
    effectiveFrom: '2026-01-01',
    logic: 'all',
    conditions: [
      { field: 'declaration.debarred', operator: 'isFalse' },
      { field: 'declaration.blacklisted', operator: 'isFalse' },
    ],
    onFail: 'fail',
    status: 'active',
    changeNote: 'Initial version.',
  },
  {
    id: 'R-GEO-01',
    version: 1,
    label: 'Deployment geography',
    explanation: 'The applicant can deploy and support in the state where the pilot runs.',
    category: 'performance',
    relief: 'not_relaxable',
    citation: 'PRAYOG-SOP-4',
    effectiveFrom: '2026-01-01',
    logic: 'all',
    conditions: [{ field: 'geography.states', operator: 'includes' }],
    onFail: 'review',
    status: 'active',
    changeNote: 'Initial version.',
  },
  {
    id: 'R-GST-01',
    version: 2,
    label: 'Active GST registration',
    explanation: 'A live GST registration is required to raise an invoice against a milestone.',
    category: 'entity',
    relief: 'not_relaxable',
    citation: 'PRAYOG-SOP-9',
    effectiveFrom: '2026-01-01',
    logic: 'all',
    conditions: [{ field: 'gst.status', operator: 'eq', value: 'active' }],
    onFail: 'review',
    status: 'active',
    changeNote: 'Suspended registrations now route to review rather than fail.',
  },
  {
    id: 'R-EXP-LEGACY',
    version: 1,
    label: 'Three prior government deployments',
    explanation: 'Superseded. Kept because two published challenges still cite this version.',
    category: 'entity',
    relief: 'relaxable',
    citation: 'GFR-2017-173',
    effectiveFrom: '2025-04-01',
    logic: 'all',
    conditions: [{ field: 'deployment.governmentCount', operator: 'gte', value: 3 }],
    onFail: 'fail',
    status: 'deprecated',
    deprecatedNote:
      'Deprecated on 12 Feb 2026. It cannot be deleted while challenges CH-2026-0088 and CH-2026-0091 reference it.',
    changeNote: 'Deprecated in favour of R-EXP-01, which is relaxable for recognised startups.',
  },
] as const;

export const RELAXABLE_CATEGORIES = ['prior turnover', 'prior experience'] as const;

export const NON_RELAXABLE_CATEGORIES = [
  'technical capability',
  'quality',
  'cybersecurity',
  'performance',
  'safety',
  'domain requirements',
] as const;

export function rule(id: string): EligibilityRuleDefinition {
  const found = ELIGIBILITY_RULES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown eligibility rule: ${id}`);
  return found;
}

export const RULE_FIELDS: readonly { value: RuleField; label: string; type: 'text' | 'number' | 'boolean' | 'date' | 'list' }[] = [
  { value: 'entity.type', label: 'Entity type', type: 'text' },
  { value: 'entity.incorporationYears', label: 'Years since incorporation', type: 'number' },
  { value: 'entity.turnoverCrore', label: 'Turnover (crore rupees)', type: 'number' },
  { value: 'dpiit.status', label: 'DPIIT recognition status', type: 'text' },
  { value: 'dpiit.validTo', label: 'DPIIT recognition valid to', type: 'date' },
  { value: 'gst.status', label: 'GST registration status', type: 'text' },
  { value: 'capability.tags', label: 'Declared capabilities', type: 'list' },
  { value: 'deployment.count', label: 'Prior deployments', type: 'number' },
  { value: 'deployment.governmentCount', label: 'Prior government deployments', type: 'number' },
  { value: 'certification.list', label: 'Certifications held', type: 'list' },
  { value: 'geography.states', label: 'States served', type: 'list' },
  { value: 'declaration.debarred', label: 'Declared debarred', type: 'boolean' },
  { value: 'declaration.blacklisted', label: 'Declared blacklisted', type: 'boolean' },
  { value: 'documents.complete', label: 'Required documents complete', type: 'boolean' },
];

export const RULE_OPERATORS: readonly { value: RuleOperator; label: string }[] = [
  { value: 'eq', label: 'is exactly' },
  { value: 'neq', label: 'is not' },
  { value: 'gt', label: 'is more than' },
  { value: 'gte', label: 'is at least' },
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is at most' },
  { value: 'includes', label: 'includes' },
  { value: 'excludes', label: 'does not include' },
  { value: 'isTrue', label: 'is true' },
  { value: 'isFalse', label: 'is false' },
  { value: 'afterToday', label: 'is still valid today' },
  { value: 'anyOf', label: 'is any of' },
];
