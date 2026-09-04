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
 * Where a portal's own route already owns the path, so the shared page cannot
 * be mounted alongside it. `/d/challenges` is the department's pipeline, not
 * the public list; `/a/templates` is the editable register, not the library.
 * A link to one of these falls back to the public route — deliberately, and in
 * only two places.
 */
const OCCUPIED: Partial<Record<PortalBase, readonly string[]>> = {
  '/d': ['/challenges'],
  '/a': ['/templates'],
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
  const taken = OCCUPIED[base] ?? [];
  if (taken.some((t) => path === t || path.startsWith(`${t}/`))) return path;
  return `${base}${path}`;
}

/** `/challenges/x` becomes `/e/challenges/x` for an evaluator, `/challenges/x` for the public. */
export function usePortalLink(): (path: string) => string {
  const base = usePortalBase();
  return (path) => portalHref(base, path);
}
