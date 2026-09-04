import { Shell } from '@/components/layout/Shell';

const LINKS = [
  { to: '/', label: 'Demand board', end: true },
  { to: '/challenges', label: 'Challenges' },
  { to: '/results', label: 'Results' },
  { to: '/catalogue', label: 'Solutions' },
  { to: '/templates', label: 'Templates' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/transparency', label: 'Transparency' },
];

export function PublicShell() {
  return <Shell links={LINKS} />;
}
