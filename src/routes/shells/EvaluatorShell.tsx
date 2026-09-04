import { Shell } from '@/components/layout/Shell';

const LINKS = [
  { to: '/e', label: 'Assignment queue', end: true },
  { to: '/e/challenges', label: 'Published challenges' },
  { to: '/e/templates', label: 'Rubrics and templates' },
];

export function EvaluatorShell() {
  return <Shell allow={['evaluator']} links={LINKS} />;
}
