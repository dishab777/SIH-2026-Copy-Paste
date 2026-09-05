/**
 * The public site's destinations, expressed as data.
 *
 * They live here rather than inside PublicShell because two places need them:
 * the public shell's own top bar, and the view switcher under the wordmark,
 * which lets a signed-in officer reach the same pages without leaving their
 * portal. A second copy would have drifted the first time one was renamed.
 */
export interface PublicNavLink {
  to: string;
  label: string;
  end?: boolean;
  /** What the page is. A label alone is not enough inside the switcher. */
  hint: string;
}

export const PUBLIC_LINKS: readonly PublicNavLink[] = [
  { to: '/', label: 'Demand board', end: true, hint: 'What departments need right now' },
  { to: '/challenges', label: 'Challenges', hint: 'The open register, in full' },
  { to: '/results', label: 'Results', hint: 'Every finished pilot, including the ones that failed' },
  { to: '/catalogue', label: 'Solutions', hint: 'What has already been made to work somewhere' },
  { to: '/templates', label: 'Templates', hint: 'The documents in force today' },
  { to: '/how-it-works', label: 'How it works', hint: 'Nine stages, seven gates' },
  { to: '/transparency', label: 'Transparency', hint: 'How long it takes, and how fast it pays' },
];
