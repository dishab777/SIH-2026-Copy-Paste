import { NavLink, useNavigate } from 'react-router-dom';
import { PUBLIC_LINKS } from '@/config/nav';
import { portalFor, roleLabel, type Role } from '@/config/rbac';
import { portalHref, usePortalBase, type PortalBase } from '@/lib/portal';
import { useSession } from '@/services/hooks';
import { Popover } from '@/components/ui/Overlay';

/**
 * The switcher under the wordmark.
 *
 * The seven public destinations — demand board, challenges, results,
 * solutions, templates, how it works, transparency — are the public site: the
 * view anyone gets without signing in. They are nobody's dashboard and belong
 * to no department.
 *
 * That was not obvious, because the application opens on the public site while
 * a session is already held, so the public bar looked like the signed-in home
 * screen. Switching role then navigated to that role's own portal and the
 * seven links were replaced by six work links, which read as a screen
 * disappearing rather than a deliberate move between two places.
 *
 * So the chip that already says which portal you are standing in now also says
 * how to leave it. From inside a portal it lists the public pages, resolved
 * through the portal's own prefix so following one keeps your navigation and
 * your identity. From the public site it offers the way back to your portal.
 */

/** Where a public page actually lives from where you are standing. */
function resolve(base: PortalBase, to: string): { href: string; leaves: boolean } {
  // The demand board is the public landing page. A portal's own index is its
  // landing page, so this one is never mounted inside a portal.
  if (to === '/') return { href: '/', leaves: base !== '' };
  const href = portalHref(base, to);
  return { href, leaves: base !== '' && !href.startsWith(`${base}/`) };
}

export function ViewSwitcher({ label }: { label: string }) {
  const base = usePortalBase();
  const session = useSession();
  const navigate = useNavigate();
  const role: Role = session.data?.data.role ?? 'public';
  const signedIn = role !== 'public';
  const homePortal = portalFor(role);

  return (
    <Popover
      label="Views"
      align="left"
      trigger={({ onClick, ref, ...aria }) => (
        <button
          ref={ref}
          onClick={onClick}
          {...aria}
          className="press mt-1 hidden max-w-full items-center gap-1 rounded-pill text-chip uppercase tracking-stamp text-saffron hover:text-deep-ink md:inline-flex"
        >
          <span className="truncate">{label}</span>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden focusable="false">
            <path d="m2 4 3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    >
      {(close) => (
        <div className="w-[320px]">
          {base === '' ? (
            <>
              <p className="text-label text-ink">You are on the public site.</p>
              <p className="mt-0.5 text-micro text-ink-soft">
                These seven pages are what anyone sees without signing in. They belong to no department and to no
                authority — they are the programme in the open.
              </p>

              {signedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    navigate(homePortal);
                    close();
                  }}
                  className="press mt-4 flex w-full items-center justify-between gap-3 rounded-control border border-verify bg-verify-wash px-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-body text-verify">Back to your own work</span>
                    <span className="block text-micro text-ink-soft">Signed in as {roleLabel(role)}</span>
                  </span>
                  <span aria-hidden className="shrink-0 text-verify">
                    →
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/login');
                    close();
                  }}
                  className="press mt-4 flex w-full items-center justify-between gap-3 rounded-control border border-rule bg-ledger px-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-body text-ink">Sign in to act on a case</span>
                    <span className="block text-micro text-ink-soft">Departments, startups, evaluators, validators</span>
                  </span>
                  <span aria-hidden className="shrink-0 text-ink-soft">
                    →
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-label text-ink">You are in the {label.toLowerCase()}.</p>
              <p className="mt-0.5 text-micro text-ink-soft">
                The bar above carries your work. The public site is below — the same pages anyone sees without signing
                in, opened inside your portal so you keep your navigation.
              </p>

              <p className="field-label mt-4">The public site</p>
              <ul className="mt-1">
                {PUBLIC_LINKS.map((l) => {
                  const { href, leaves } = resolve(base, l.to);
                  return (
                    <li key={l.to}>
                      <NavLink
                        to={href}
                        end={l.end}
                        onClick={close}
                        className={({ isActive }) =>
                          [
                            'block border-b border-rule py-2 no-underline last:border-b-0',
                            isActive ? 'text-verify' : 'text-ink hover:text-verify',
                          ].join(' ')
                        }
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-body">{l.label}</span>
                          {leaves ? (
                            <span className="shrink-0 text-micro text-ink-soft">leaves your portal</span>
                          ) : null}
                        </span>
                        <span className="block text-micro text-ink-soft">{l.hint}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}
