import { Shell } from '@/components/layout/Shell';

const LINKS = [
  { to: '/v', label: 'Validation queue', end: true },
  { to: '/v/results', label: 'Published results' },
  { to: '/v/transparency', label: 'Programme transparency' },
];

export function ValidatorShell() {
  return <Shell allow={['validator']} links={LINKS} />;
}
