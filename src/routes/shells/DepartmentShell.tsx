import { useTranslation } from 'react-i18next';
import { Shell } from '@/components/layout/Shell';

/**
 * The department portal.
 *
 * There is one navigation, in the top bar. A case screen already carries its
 * own index — the gate ladder on the left and the evidence dock on the right —
 * and a second portal-level rail beside those was a third spine competing for
 * the same 200 pixels the working column needed.
 *
 * "New challenge" is deliberately not here. A top-bar item is a place, and the
 * studio is an act: putting it in the bar gave the department six destinations
 * and one verb sitting among them, and it offered the verb to a procurement
 * officer, who cannot create a challenge at all. It now lives on the pipeline
 * page, where the cases it creates are, and only for the roles that hold the
 * permission.
 */
const LINKS = [
  { to: '/d', labelKey: 'bar.whosWaiting', end: true },
  { to: '/d/challenges', labelKey: 'bar.challenges' },
  { to: '/d/pilots', labelKey: 'bar.pilots' },
  { to: '/d/payments', labelKey: 'bar.payments' },
  { to: '/d/reports', labelKey: 'bar.reports' },
  { to: '/d/catalogue', labelKey: 'bar.validatedCatalogue' },
];

export function DepartmentShell() {
  const { t } = useTranslation();
  return (
    <Shell
      allow={['department_officer', 'department_admin', 'procurement_officer']}
      links={LINKS.map((l) => ({ to: l.to, end: l.end, label: t(l.labelKey) }))}
    />
  );
}
