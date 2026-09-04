/**
 * Role-based access control, expressed as data.
 * /a/users renders this matrix; PermissionGate reads it; no component hardcodes a role check.
 *
 * The frontend is never the protection. Every mock endpoint re-checks the same matrix
 * server-side before it mutates anything.
 */

export type Role =
  | 'public'
  | 'startup'
  | 'department_officer'
  | 'department_admin'
  | 'procurement_officer'
  | 'evaluator'
  | 'validator'
  | 'pmu';

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'score'
  | 'validate'
  | 'pay'
  | 'export';

export type Resource =
  | 'challenge'
  | 'application'
  | 'evaluation'
  | 'gate'
  | 'pilot'
  | 'milestone'
  | 'payment'
  | 'validation'
  | 'procurement'
  | 'config'
  | 'user'
  | 'audit';

export interface RoleDefinition {
  id: Role;
  label: string;
  portal: '/' | '/s' | '/d' | '/e' | '/v' | '/a';
  description: string;
}

export const ROLES: readonly RoleDefinition[] = [
  {
    id: 'public',
    label: 'Public',
    portal: '/',
    description: 'Anyone. Sees government demand, published results and validated solutions.',
  },
  {
    id: 'startup',
    label: 'Startup',
    portal: '/s',
    description: 'Applies to challenges, runs pilots, submits evidence and tracks money owed.',
  },
  {
    id: 'department_officer',
    label: 'Department nodal officer',
    portal: '/d',
    description: 'Frames problems, defines outcomes, runs pilots day to day.',
  },
  {
    id: 'department_admin',
    label: 'Department administrator',
    portal: '/d',
    description: 'Owns gates 0, 2 and 4 for the department. Screens applications, steers pilots.',
  },
  {
    id: 'procurement_officer',
    label: 'Procurement officer',
    portal: '/d',
    description: 'Owns award and pathway decisions, approves payments, generates procurement packages.',
  },
  {
    id: 'evaluator',
    label: 'Evaluator',
    portal: '/e',
    description: 'Scores assigned applications against the published rubric, after declaring conflicts.',
  },
  {
    id: 'validator',
    label: 'Independent validator',
    portal: '/v',
    description: 'Verifies pilot outcomes from raw records. Independent of the department.',
  },
  {
    id: 'pmu',
    label: 'Programme management unit',
    portal: '/a',
    description: 'Configures rules, rubrics, templates and SLAs. Owns gate 1. Cannot bypass a precondition.',
  },
] as const;

type Matrix = Record<Role, Partial<Record<Resource, readonly Action[]>>>;

/**
 * Deliberate omissions, each one a rule from the specification:
 *  - startup has no evaluation, gate, payment-approval or procurement access
 *  - department roles cannot 'edit' a finalised evaluation
 *  - pmu can configure but cannot approve a gate it does not own, nor pay
 *  - validator can validate but never approve procurement
 */
export const RBAC: Matrix = {
  public: {
    challenge: ['view'],
    validation: ['view'],
    procurement: ['view'],
  },
  startup: {
    challenge: ['view'],
    application: ['view', 'create', 'edit'],
    pilot: ['view'],
    milestone: ['view', 'edit'],
    payment: ['view'],
    validation: ['view'],
  },
  department_officer: {
    challenge: ['view', 'create', 'edit'],
    application: ['view'],
    evaluation: ['view'],
    pilot: ['view', 'edit'],
    milestone: ['view', 'edit'],
    payment: ['view'],
    validation: ['view'],
    audit: ['view', 'export'],
  },
  department_admin: {
    challenge: ['view', 'create', 'edit', 'publish'],
    application: ['view', 'edit', 'approve', 'reject'],
    evaluation: ['view'],
    gate: ['view', 'approve', 'reject'],
    pilot: ['view', 'create', 'edit'],
    milestone: ['view', 'edit', 'approve', 'reject'],
    payment: ['view'],
    validation: ['view'],
    procurement: ['view'],
    audit: ['view', 'export'],
  },
  procurement_officer: {
    challenge: ['view'],
    application: ['view'],
    evaluation: ['view'],
    gate: ['view', 'approve', 'reject'],
    pilot: ['view'],
    milestone: ['view', 'approve'],
    payment: ['view', 'approve', 'pay', 'export'],
    validation: ['view'],
    procurement: ['view', 'create', 'approve', 'export'],
    audit: ['view', 'export'],
  },
  evaluator: {
    application: ['view'],
    evaluation: ['view', 'create', 'score'],
  },
  validator: {
    pilot: ['view'],
    milestone: ['view'],
    validation: ['view', 'create', 'validate'],
    audit: ['view', 'export'],
  },
  pmu: {
    challenge: ['view', 'publish'],
    application: ['view'],
    evaluation: ['view'],
    gate: ['view', 'approve', 'reject'],
    pilot: ['view'],
    validation: ['view'],
    procurement: ['view'],
    config: ['view', 'create', 'edit'],
    user: ['view', 'create', 'edit'],
    audit: ['view', 'export'],
  },
};

export const ACTIONS: readonly Action[] = [
  'view',
  'create',
  'edit',
  'approve',
  'reject',
  'publish',
  'score',
  'validate',
  'pay',
  'export',
];

export const RESOURCES: readonly Resource[] = [
  'challenge',
  'application',
  'evaluation',
  'gate',
  'pilot',
  'milestone',
  'payment',
  'validation',
  'procurement',
  'config',
  'user',
  'audit',
];

export function can(role: Role, action: Action, resource: Resource): boolean {
  return RBAC[role]?.[resource]?.includes(action) ?? false;
}

/** The role that would be needed. Used to write an honest forbidden message. */
export function rolesThatCan(action: Action, resource: Resource): RoleDefinition[] {
  return ROLES.filter((r) => can(r.id, action, resource));
}

export function roleLabel(role: Role): string {
  return ROLES.find((r) => r.id === role)?.label ?? role;
}

export function portalFor(role: Role): string {
  return ROLES.find((r) => r.id === role)?.portal ?? '/';
}
