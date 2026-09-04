import { Shell } from '@/components/layout/Shell';

/**
 * The department portal.
 *
 * There is one navigation, in the top bar. A case screen already carries its
 * own index — the gate ladder on the left and the evidence dock on the right —
 * and a second portal-level rail beside those was a third spine competing for
 * the same 200 pixels the working column needed.
 */
const LINKS = [
  { to: '/d', label: "Who's waiting", end: true },
  { to: '/d/challenges', label: 'Challenges' },
  { to: '/d/challenges/new/problem', label: 'New challenge' },
  { to: '/d/pilots', label: 'Pilots' },
  { to: '/d/payments', label: 'Payments' },
  { to: '/d/reports', label: 'Reports' },
  { to: '/d/catalogue', label: 'Validated catalogue' },
];

export function DepartmentShell() {
  return <Shell allow={['department_officer', 'department_admin', 'procurement_officer']} links={LINKS} />;
}
