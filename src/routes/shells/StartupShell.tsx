import { useTranslation } from 'react-i18next';
import { Shell } from '@/components/layout/Shell';

/** One navigation, in the top bar. See DepartmentShell for why. */
const LINKS = [
  { to: '/s', labelKey: 'bar.waitingOnYou', end: true },
  { to: '/s/challenges', labelKey: 'bar.openChallenges' },
  { to: '/s/matches', labelKey: 'bar.matches' },
  { to: '/s/applications', labelKey: 'bar.applications' },
  { to: '/s/pilots', labelKey: 'bar.pilots' },
  { to: '/s/payments', labelKey: 'bar.payments' },
  { to: '/s/messages', labelKey: 'bar.clarifications' },
  { to: '/s/profile', labelKey: 'bar.profile' },
];

export function StartupShell() {
  const { t } = useTranslation();
  return (
    <Shell allow={['startup']} links={LINKS.map((l) => ({ to: l.to, end: l.end, label: t(l.labelKey) }))} />
  );
}
