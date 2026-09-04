import { Shell } from '@/components/layout/Shell';

/*
 * The eight sections live in the index on the left, where they read as a list
 * of settings rather than a crowded strip. The top bar carries only the routes
 * that leave this portal.
 */
const LINKS = [
  { to: '/a/config', label: 'Configuration', end: true },
  { to: '/a/transparency', label: 'Public transparency' },
  { to: '/a/catalogue', label: 'Validated catalogue' },
];

const SIDEBAR = [
  { to: '/a/config', label: 'Configuration ledger', hint: 'Proof nothing is hardcoded' },
  { to: '/a/rules', label: 'Eligibility rules' },
  { to: '/a/rubrics', label: 'Evaluation rubrics' },
  { to: '/a/templates', label: 'Templates and clauses' },
  { to: '/a/taxonomy', label: 'Taxonomy' },
  { to: '/a/users', label: 'Users and roles' },
  { to: '/a/integrations', label: 'Integration health' },
  { to: '/a/audit', label: 'Audit trail' },
];

export function AdminShell() {
  return <Shell allow={['pmu']} links={LINKS} sidebar={SIDEBAR} sidebarTitle="Programme management" />;
}
