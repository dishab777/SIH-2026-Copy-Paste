import { Suspense, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { SiteFooter } from './SiteFooter';
import { PanelSkeleton } from '@/components/ui/Feedback';
import { PortalGuard } from './PortalGuard';
import type { Role } from '@/config/rbac';
import { useUi } from '@/store/ui';
import { platformNow } from '@/config/clock';

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[70] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'border-l-2 bg-sheet px-4 py-3 shadow-lift',
            t.tone === 'verify' ? 'border-l-verify' : t.tone === 'hold' ? 'border-l-hold' : 'border-l-seal',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-body text-ink">{t.message}</p>
              {t.detail ? <p className="mt-0.5 text-micro text-ink-soft">{t.detail}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-ink-soft hover:text-ink"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ShellProps {
  /** Roles this portal is for. Anyone else gets an explicit sign-in, not a redirect. */
  allow?: readonly Role[];
  links: readonly { to: string; label: string; end?: boolean }[];
  sidebar?: { to: string; label: string; end?: boolean; hint?: string }[];
  sidebarTitle?: string;
  /** One line saying what the index is for, under its title. */
  sidebarNote?: string;
  wide?: boolean;
  /**
   * Strip the bar to the government strip, the language control and one way
   * back. For the sign-in and registration pages, where the site's own
   * navigation is not what the reader is there for.
   */
  bare?: boolean;
  children?: ReactNode;
}

export function Shell({ allow, links, sidebar, sidebarTitle, sidebarNote, wide, bare, children }: ShellProps) {
  const { t } = useTranslation();
  const body = children ?? <Outlet />;
  const guarded = allow ? <PortalGuard allow={allow}>{body}</PortalGuard> : body;
  return (
    <div className="app-root min-h-screen">
      <a href="#main" className="skip-link text-label">
        {t('app.skipToContent')}
      </a>
      <TopBar links={links} bare={bare} />
      <div className={['mx-auto flex max-w-shell gap-6 px-4 py-6 md:px-6', wide ? '' : ''].join(' ')}>
        {sidebar?.length ? (
          <nav aria-label="Section" className="hidden w-[208px] shrink-0 lg:block">
            <div className="sheet-flat sticky top-20">
              {sidebarTitle ? (
                <div className="border-b border-ink px-4 py-2">
                  <p className="text-label text-ink">{sidebarTitle}</p>
                  {sidebarNote ? <p className="mt-0.5 text-micro font-normal text-ink-soft">{sidebarNote}</p> : null}
                </div>
              ) : null}
              <ul>
                {sidebar.map((s) => (
                  <li key={s.to} className="border-b border-rule last:border-b-0">
                    <NavLink
                      to={s.to}
                      end={s.end}
                      className={({ isActive }) =>
                        [
                          'block px-4 py-2 text-body no-underline',
                          isActive ? 'border-l-2 border-l-verify bg-verify-wash text-ink' : 'border-l-2 border-l-transparent text-ink-soft hover:text-ink',
                        ].join(' ')
                      }
                    >
                      {s.label}
                      {s.hint ? <span className="block text-micro text-ink-soft">{s.hint}</span> : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        ) : null}
        <main id="main" className="min-w-0 flex-1">
          <Suspense fallback={<PanelSkeleton lines={6} />}>{guarded}</Suspense>
        </main>
      </div>
      <CommandPalette />
      <Toasts />
      <SiteFooter />
    </div>
  );
}

/**
 * The head of a working page. One h1 per page.
 *
 * It is the same deep band the public pages open on, sized down and rounded
 * into the working column — so a payments ledger, an evaluator queue and the
 * demand board all start the same way. Before this, every screen inside a
 * portal opened on bare paper with a black heading on it, which is why the
 * startup's "Waiting on you" read as an unstyled document.
 *
 * `eyebrow` names what kind of screen this is; it is the only new thing a page
 * has to supply, and it is optional.
 */
export function PageHeader({
  title,
  lead,
  aside,
  breadcrumb,
  eyebrow,
}: {
  title: string;
  lead?: string;
  aside?: ReactNode;
  servedAt?: string;
  onRefresh?: () => void;
  breadcrumb?: ReactNode;
  /** Two or three words naming the kind of screen. "Payments", "Gate decision". */
  eyebrow?: string;
}) {
  return (
    <header className="page-head deep mb-8 px-5 py-6 md:px-8 md:py-7">
      <div className="relative">
        {breadcrumb ? <div className="mb-4">{breadcrumb}</div> : null}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-doc">
            {eyebrow ? (
              <p className="field-label mb-2 flex items-center gap-2 !text-saffron">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                {eyebrow}
              </p>
            ) : (
              <span aria-hidden className="mb-3 block h-1 w-12 rounded-pill bg-saffron" />
            )}
            <h1 className="font-display text-h1 tracking-mega text-deep-ink">{title}</h1>
            {lead ? <p className="mt-2 text-lead text-deep-dim">{lead}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">{aside}</div>
        </div>
      </div>
    </header>
  );
}

export function FreshnessLine({ servedAt, onRefresh }: { servedAt: string; onRefresh?: () => void }) {
  const at = new Date(servedAt);
  const stale = platformNow().getTime() - at.getTime() > 15 * 60 * 1000;
  return (
    <p className={['mt-3 flex items-center gap-3 text-micro', stale ? 'text-ink' : 'text-ink-soft'].join(' ')}>
      <span className={stale ? 'border-l-2 border-l-hold bg-hold-wash px-2 py-0.5' : ''}>
        Data as of {at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
        {stale ? ' — this is older than it should be' : ''}
      </span>
      {onRefresh ? (
        <button type="button" onClick={onRefresh} className="underline underline-offset-2 hover:text-ink">
          Refresh
        </button>
      ) : null}
    </p>
  );
}
