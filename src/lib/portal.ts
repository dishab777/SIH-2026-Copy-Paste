import { useLocation } from 'react-router-dom';

/**
 * Which portal you are standing in, and how to link without leaving it.
 *
 * Several screens are genuinely shared: an evaluator needs the published
 * challenge, a validator needs the published result, the PMU needs the
 * transparency figures. Those used to be linked straight at the public route,
 * which mounted the public shell — so following "Public transparency" from the
 * programme management unit swapped your whole navigation for the public one
 * and left no way back to your own portal. It read as being thrown onto
 * somebody else's site.
 *
 * Every shared page is now mounted under every portal, and this is how a link
 * to one gets the right prefix.
 */
const PORTALS = ['/s', '/d', '/e', '/v', '/a'] as const;

export type PortalBase = '' | (typeof PORTALS)[number];

/**
 * Where a portal's own route already owns the path, so the shared page is
 * mounted at a different one inside that portal.
 *
 * `/d/challenges` is the department's pipeline, not the public register, and
 * `/a/templates` is the editable library, not the read-only one. This used to
 * resolve by falling back to the public route, which is exactly the leak this
 * module exists to prevent: a nodal officer following "read the published
 * notice" from their own case screen was dropped onto the public shell with
 * the public navigation and no way back to their portal.
 *
 * So each of those two paths has an alias inside the portal that owns the
 * conflict, and the shared page is mounted there.
 */
const ALIAS: Partial<Record<PortalBase, readonly { from: string; to: string }[]>> = {
  '/d': [{ from: '/challenges', to: '/d/notices' }],
  '/a': [{ from: '/templates', to: '/a/library' }],
};

export function portalBaseFor(pathname: string): PortalBase {
  return PORTALS.find((p) => pathname === p || pathname.startsWith(`${p}/`)) ?? '';
}

/** The prefix of the portal you are in, or `''` on the public site. */
export function usePortalBase(): PortalBase {
  return portalBaseFor(useLocation().pathname);
}

export function portalHref(base: PortalBase, path: string): string {
  if (!base) return path;
  for (const { from, to } of ALIAS[base] ?? []) {
    if (path === from) return to;
    if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`;
  }
  return `${base}${path}`;
}

/** `/challenges/x` becomes `/e/challenges/x` for an evaluator, `/challenges/x` for the public. */
export function usePortalLink(): (path: string) => string {
  const base = usePortalBase();
  return (path) => portalHref(base, path);
}
