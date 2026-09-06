/**
 * The public site's destinations, expressed as data.
 *
 * They live here rather than inside PublicShell because three places need them:
 * the public shell's own top bar, the chip under the wordmark, and the Menu
 * below the navigation breakpoint. A second copy would have drifted the first
 * time one was renamed.
 *
 * Labels are translation keys, never English. Every navigation label in this
 * product resolves through `t()` at the point of render, so switching to Hindi
 * changes the bar rather than only the wordmark above it.
 */
export interface PublicNavLink {
  to: string;
  /** A key under `bar.` in the translation bundles. */
  labelKey: string;
  end?: boolean;
  /** A key under `nav.hint.`, shown under the label inside the chip. */
  hintKey: string;
  /**
   * Open to anyone, with no account.
   *
   * The line a procurement portal draws: the demand board publishes what
   * departments need, and how-it-works explains the process — both without an
   * account. Everything else is the document room. `RequireAccount` enforces it
   * on the route; this decides whether a signed-out visitor is offered the link.
   */
  open: boolean;
}

export const PUBLIC_LINKS: readonly PublicNavLink[] = [
  { to: '/', labelKey: 'bar.demandBoard', end: true, hintKey: 'nav.hint.demandBoard', open: true },
  { to: '/how-it-works', labelKey: 'bar.howItWorks', hintKey: 'nav.hint.howItWorks', open: true },
  { to: '/challenges', labelKey: 'bar.challenges', hintKey: 'nav.hint.challenges', open: false },
  { to: '/results', labelKey: 'bar.results', hintKey: 'nav.hint.results', open: false },
  { to: '/catalogue', labelKey: 'bar.solutions', hintKey: 'nav.hint.solutions', open: false },
  { to: '/templates', labelKey: 'bar.templates', hintKey: 'nav.hint.templates', open: false },
  { to: '/transparency', labelKey: 'bar.transparency', hintKey: 'nav.hint.transparency', open: false },
];

/** What a visitor may be offered, given whether they hold an account. */
export function publicLinksFor(signedIn: boolean): readonly PublicNavLink[] {
  return signedIn ? PUBLIC_LINKS : PUBLIC_LINKS.filter((l) => l.open);
}
