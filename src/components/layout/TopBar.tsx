import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROLES, portalFor, type Role } from '@/config/rbac';
import { SCENARIOS, setScenario } from '@/mocks/scenarios';
import { useMarkRead, useNotifications, useSession, useSignIn } from '@/services/hooks';
import { dayTime } from '@/lib/format';
import { Popover } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Mark } from '@/components/layout/Mark';
import { useUi } from '@/store/ui';
import { usePortalBase } from '@/lib/portal';
import i18n from '@/i18n';

/**
 * Which portal the bar is standing in. Named, because the shared pages are
 * mounted under every portal and "where am I" stopped being obvious from the
 * links alone.
 */
const PORTAL: Record<string, { label: string; home: string }> = {
  '': { label: 'Public', home: '/' },
  '/s': { label: 'Startup portal', home: '/s' },
  '/d': { label: 'Department portal', home: '/d' },
  '/e': { label: 'Evaluator portal', home: '/e' },
  '/v': { label: 'Validator portal', home: '/v' },
  '/a': { label: 'Programme management', home: '/a' },
};

export function TopBar({ links }: { links: { to: string; label: string; end?: boolean }[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useSession();
  const signIn = useSignIn();
  const notifications = useNotifications();
  const markRead = useMarkRead();
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const locale = useUi((s) => s.locale);
  const setLocale = useUi((s) => s.setLocale);
  const scenario = useUi((s) => s.scenario);
  const setScenarioState = useUi((s) => s.setScenario);
  const queryClient = useQueryClient();
  const portal = PORTAL[usePortalBase()];

  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  /*
   * The bar sits flat on the paper until the page starts moving under it, then
   * lifts onto glass. It is the only cue that the content is scrolling beneath
   * a fixed thing, and it costs one class change rather than a scroll handler
   * that writes styles every frame.
   */
  const [scrolled, setScrolled] = useState(false);
  /*
   * How far through the page you are, drawn as a hairline along the bottom of
   * the bar. It is the one piece of chrome that is also information: on a gate
   * decision or a contract, "how much of this is left" is a real question.
   */
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = (): void => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      setScrolled(window.scrollY > 4);
      setProgress(scrollable > 40 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
    };
    // One measurement per frame, never one per scroll event.
    const onScroll = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /*
   * The rule under the active item slides between destinations instead of
   * blinking off one and on at the next. The eye follows a moving object, so
   * the movement itself says "you were there, now you are here" — which a
   * disappearing highlight cannot.
   */
  const navRef = useRef<HTMLElement>(null);
  const [rail, setRail] = useState<{ left: number; width: number } | null>(null);
  const location = useLocation();

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const measure = (): void => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        setRail(null);
        return;
      }
      setRail({ left: active.offsetLeft, width: active.offsetWidth });
    };
    // After the route has painted, and again if the bar reflows.
    const id = window.requestAnimationFrame(measure);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(nav);
    return () => {
      window.cancelAnimationFrame(id);
      ro?.disconnect();
    };
  }, [location.pathname, links]);

  const user = session.data?.data.user ?? null;
  // Distinguish "nobody is signed in" from "we could not find out".
  const identityUnknown = session.isError;
  const role: Role = session.data?.data.role ?? 'public';
  const items = notifications.data?.data ?? [];
  const unread = items.filter((n) => !n.read).length;
  const waiting = items.filter((n) => n.waitingOnYou && !n.read);

  return (
    <header data-scrolled={scrolled} className="topbar sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-shell items-center gap-4 px-4 md:px-6">
        <Link to={portal.home} className="group flex min-w-0 shrink items-center gap-2.5 no-underline md:shrink-0">
          {/* The mark sits in a lit well, so it reads as an object on the bar
              rather than an icon printed on it. */}
          <span className="mark-well settle shrink-0 group-hover:-translate-y-0.5">
            <Mark size={22} tone="deep" className="settle group-hover:rotate-[-6deg]" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-display text-mark tracking-mega text-deep-ink">
              {t('app.name')}
            </span>
            {/* Which portal you are standing in, always. Following a shared page
                between portals used to be indistinguishable from being thrown
                onto the public site. */}
            <span className="mt-1 hidden truncate text-chip uppercase tracking-stamp text-saffron md:inline">
              {portal.label}
            </span>
          </span>
        </Link>

        {/*
          One lit pill slides between destinations rather than a highlight
          blinking off one item and on at the next: the eye follows a moving
          object, and the movement itself says "you were there, now you are
          here". The label rides above it.
        */}
        <nav
          ref={navRef}
          aria-label="Primary"
          className="nav-strip scroll-quiet relative ml-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                [
                  'swift relative z-10 flex h-9 items-center whitespace-nowrap rounded-pill px-3.5 text-label no-underline',
                  isActive ? 'font-semibold text-deep' : 'text-deep-dim hover:text-deep-ink',
                ].join(' ')
              }
            >
              {l.label}
            </NavLink>
          ))}

          <span
            aria-hidden
            className="nav-pill"
            style={
              rail
                ? { transform: `translateX(${rail.left}px)`, width: rail.width, opacity: 1 }
                : { opacity: 0, width: 0 }
            }
          />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={t('app.search')}
            className="press hidden h-8 items-center gap-2 rounded-pill border border-deep-rule px-2 text-label text-deep-dim hover:border-deep-dim hover:bg-deep-2 hover:text-deep-ink md:inline-flex xl:px-3"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
              <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.6 10.6 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="hidden xl:inline">{t('app.search')}</span>
            <kbd className="hidden rounded-control border border-deep-rule px-1 text-micro xl:inline">Ctrl K</kbd>
          </button>

          <Popover
            label={t('app.language')}
            align="right"
            trigger={({ onClick, ref, ...aria }) => (
              <button
                ref={ref}
                onClick={onClick}
                {...aria}
                className="press h-8 rounded-control border border-deep-rule px-2 text-label text-deep-dim hover:border-deep-dim hover:text-deep-ink"
              >
                {locale === 'en' ? 'EN' : 'हिं'}
              </button>
            )}
          >
            {(close) => (
              <ul>
                {(['en', 'hi'] as const).map((l) => (
                  <li key={l}>
                    <button
                      type="button"
                      onClick={() => {
                        setLocale(l);
                        close();
                      }}
                      className="w-full border-b border-rule py-2 text-left text-body last:border-b-0 hover:text-verify"
                    >
                      {l === 'en' ? 'English' : 'हिन्दी'}
                    </button>
                  </li>
                ))}
                <li className="pt-2 text-micro text-ink-soft">
                  This changes the interface. A challenge, a proposal and an evaluation stay in the language the
                  department or applicant wrote them in, and legal text stays in its authoritative language — neither
                  is machine-translated into a record someone has to sign.
                </li>
              </ul>
            )}
          </Popover>

          <Popover
            label={t('app.alerts')}
            align="right"
            trigger={({ onClick, ref, ...aria }) => (
              <button
                ref={ref}
                onClick={onClick}
                {...aria}
                aria-label={t('app.alerts')}
                className="press relative flex h-8 items-center gap-1.5 rounded-control border border-deep-rule px-2 text-label text-deep-dim hover:border-deep-dim hover:text-deep-ink md:px-3"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
                  <path
                    d="M8 1.6a4.2 4.2 0 0 0-4.2 4.2v2.6L2.6 11h10.8l-1.2-2.6V5.8A4.2 4.2 0 0 0 8 1.6ZM6.4 13a1.6 1.6 0 0 0 3.2 0"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hidden md:inline">{t('app.alerts')}</span>
                {unread > 0 ? <span className="text-micro text-saffron tnum">{unread}</span> : null}
                {waiting.length > 0 ? (
                  <span aria-hidden className="absolute -right-0.5 -top-0.5 block h-2 w-2 rounded-full bg-saffron" />
                ) : null}
              </button>
            )}
          >
            {(close) => (
              <div className="w-[340px]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-label text-ink">
                    {waiting.length} waiting on you · {items.length - waiting.length} for information
                  </p>
                  <button
                    type="button"
                    onClick={() => markRead.mutate({ all: true })}
                    className="text-micro text-ink-soft underline underline-offset-2"
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-[50vh] overflow-auto scroll-quiet">
                  {items.length === 0 ? (
                    <li className="py-4 text-body text-ink-soft">Nothing needs your attention.</li>
                  ) : (
                    items.slice(0, 12).map((n) => (
                      <li key={n.id} className="border-b border-rule py-2 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => {
                            markRead.mutate({ ids: [n.id] });
                            navigate(n.href);
                            close();
                          }}
                          className="w-full text-left"
                        >
                          <span className="flex items-center gap-2">
                            {n.waitingOnYou ? <Badge tone="hold">Waiting on you</Badge> : <Badge tone="neutral">Information</Badge>}
                            {!n.read ? <span aria-label="Unread" className="text-micro text-ink-soft">new</span> : null}
                          </span>
                          <span className="mt-1 block text-body text-ink">{n.title}</span>
                          <span className="block text-micro text-ink-soft">{n.detail}</span>
                          <span className="block text-micro text-ink-soft tnum">{dayTime(n.at)}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </Popover>

          <Popover
            label={t('app.account')}
            align="right"
            trigger={({ onClick, ref, ...aria }) => (
              <button
                ref={ref}
                onClick={onClick}
                {...aria}
                className="press flex h-8 items-center gap-2 rounded-control border border-deep-rule px-2 text-label text-deep-dim hover:border-deep-dim hover:text-deep-ink"
              >
                <span
                  aria-hidden
                  className="inline-flex h-5 w-5 items-center justify-center rounded-control bg-deep-2 text-micro text-signal"
                >
                  {identityUnknown ? '?' : (user?.initials ?? '—')}
                </span>
                <span className="hidden md:inline">{identityUnknown ? 'Sign-in unknown' : (user?.name ?? 'Public')}</span>
              </button>
            )}
          >
            {(close) => (
              <div className="w-[300px]">
                <p className="text-label text-ink">
                  {identityUnknown ? 'Your sign-in could not be read' : user ? user.name : 'Browsing as a member of the public'}
                </p>
                <p className="mt-0.5 text-micro text-ink-soft">
                  {identityUnknown
                    ? 'The service did not answer when asked who you are. Signing in again will retry it.'
                    : user
                      ? `${user.designation} · ${ROLES.find((r) => r.id === role)?.label}`
                      : 'Sign in to act on a case.'}
                </p>

                <p className="mt-4 text-label text-ink">Demonstration role switcher</p>
                <p className="mb-2 text-micro text-ink-soft">
                  Signing in as another role changes what the API allows, not only what the screen shows.
                </p>
                <ul>
                  {ROLES.filter((r) => r.id !== 'public').map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          signIn.mutate(
                            { role: r.id },
                            {
                              onSuccess: () => {
                                navigate(portalFor(r.id));
                                close();
                              },
                            },
                          );
                        }}
                        className={[
                          'w-full border-b border-rule py-2 text-left last:border-b-0',
                          r.id === role ? 'text-verify' : 'text-ink hover:text-verify',
                        ].join(' ')}
                      >
                        <span className="block text-body">{r.label}</span>
                        <span className="block text-micro text-ink-soft">{r.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    block
                    onClick={() => {
                      signIn.mutate(
                        { role: 'public' },
                        {
                          onSuccess: () => {
                            navigate('/');
                            close();
                          },
                        },
                      );
                    }}
                  >
                    {t('app.signOut')}
                  </Button>
                </div>
              </div>
            )}
          </Popover>

          {/*
            Below 1024px the primary nav does not fit on one line, and it used
            to be dropped entirely — leaving the wordmark as the only way out of
            a page. The same destinations, in the same order, in a sheet.
          */}
          <Popover
            label="Menu"
            align="right"
            trigger={({ onClick, ref, ...aria }) => (
              <button
                ref={ref}
                onClick={onClick}
                {...aria}
                aria-label="Menu"
                className="press flex h-8 items-center gap-2 rounded-control border border-deep-rule px-2 text-label text-deep-dim hover:border-deep-dim hover:text-deep-ink lg:hidden"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="hidden md:inline">Menu</span>
              </button>
            )}
          >
            {(close) => (
              <ul className="w-[240px]">
                {links.map((l) => (
                  <li key={l.to}>
                    <NavLink
                      to={l.to}
                      end={l.end}
                      onClick={close}
                      className={({ isActive }) =>
                        [
                          'block border-b border-rule py-2 text-body no-underline last:border-b-0',
                          isActive ? 'text-verify' : 'text-ink hover:text-verify',
                        ].join(' ')
                      }
                    >
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </Popover>

          {import.meta.env.DEV ? (
            <Popover
              label="Scenario"
              align="right"
              trigger={({ onClick, ref, ...aria }) => (
                <button
                  ref={ref}
                  onClick={onClick}
                  {...aria}
                  className={[
                    'press hidden h-8 rounded-control border px-2 text-label md:inline-flex md:items-center',
                    scenario === 'normal'
                      ? 'border-deep-rule text-deep-dim hover:text-deep-ink'
                      : 'border-saffron bg-saffron text-deep',
                  ].join(' ')}
                >
                  {SCENARIOS.find((s) => s.id === scenario)?.label}
                </button>
              )}
            >
              {(close) => (
                <div className="w-[320px]">
                  <p className="text-label text-ink">Scenario switcher</p>
                  <p className="mb-2 text-micro text-ink-soft">
                    Development only. Forces the mock API into a named condition so every state can be demonstrated.
                  </p>
                  <ul>
                    {SCENARIOS.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setScenario(s.id);
                            setScenarioState(s.id);
                            // Cached answers were served under the previous
                            // condition. Drop them so the new one is what the
                            // screen actually shows.
                            void queryClient.resetQueries();
                            close();
                          }}
                          className={[
                            'w-full border-b border-rule py-2 text-left last:border-b-0',
                            s.id === scenario ? 'text-verify' : 'text-ink hover:text-verify',
                          ].join(' ')}
                        >
                          <span className="block text-body">{s.label}</span>
                          <span className="block text-micro text-ink-soft">{s.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Popover>
          ) : null}
        </div>
      </div>

      {/* How far through the page you are. Zero-width when there is nothing to
          scroll, so a short screen does not carry a meaningless full bar. */}
      <span aria-hidden className="topbar-progress" style={{ transform: `scaleX(${progress})` }} />
    </header>
  );
}
