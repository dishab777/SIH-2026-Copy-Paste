import { Shell } from '@/components/layout/Shell';

/** One navigation, in the top bar. See DepartmentShell for why. */
const LINKS = [
  { to: '/s', label: 'Waiting on you', end: true },
  { to: '/s/challenges', label: 'Open challenges' },
  { to: '/s/matches', label: 'Matches' },
  { to: '/s/applications', label: 'Applications' },
  { to: '/s/pilots', label: 'Pilots' },
  { to: '/s/payments', label: 'Payments' },
  { to: '/s/messages', label: 'Clarifications' },
  { to: '/s/profile', label: 'Profile' },
];

export function StartupShell() {
  return <Shell allow={['startup']} links={LINKS} />;
}
