import { useTranslation } from 'react-i18next';
import { Shell } from '@/components/layout/Shell';

const LINKS = [
  { to: '/v', labelKey: 'bar.validationQueue', end: true },
  { to: '/v/results', labelKey: 'bar.publishedResults' },
  { to: '/v/transparency', labelKey: 'bar.programmeTransparency' },
];

export function ValidatorShell() {
  const { t } = useTranslation();
  return (
    <Shell allow={['validator']} links={LINKS.map((l) => ({ to: l.to, end: l.end, label: t(l.labelKey) }))} />
  );
}
