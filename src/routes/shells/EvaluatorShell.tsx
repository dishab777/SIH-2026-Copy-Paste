import { useTranslation } from 'react-i18next';
import { Shell } from '@/components/layout/Shell';

const LINKS = [
  { to: '/e', labelKey: 'bar.assignmentQueue', end: true },
  { to: '/e/challenges', labelKey: 'bar.publishedChallenges' },
  { to: '/e/templates', labelKey: 'bar.rubricsAndTemplates' },
];

export function EvaluatorShell() {
  const { t } = useTranslation();
  return (
    <Shell allow={['evaluator']} links={LINKS.map((l) => ({ to: l.to, end: l.end, label: t(l.labelKey) }))} />
  );
}
