import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Role } from '@/config/rbac';
import { useRoleText } from '@/lib/roleText';
import { SCENARIOS, setScenario } from '@/mocks/scenarios';
import { useMarkRead, useNotifications, useSession, useSignIn } from '@/services/hooks';
import { dayTime, setFormatLanguage } from '@/lib/format';
import { Popover } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GovernmentOfIndia, GovernmentOfMaharashtra, StateEmblem } from '@/components/layout/Emblems';
import { useUi } from '@/store/ui';
import { usePortalBase } from '@/lib/portal';
import i18n from '@/i18n';

/**
 * Which portal the bar is standing in. Named, because the shared pages are
 * mounted under every portal and "where am I" stopped being obvious from the
 * links alone.
 */
const PORTAL: Record<string, { labelKey: string; home: string }> = {
  '': { labelKey: 'portal.public', home: '/' },
  '/s': { labelKey: 'portal.s', home: '/s' },
  '/d': { labelKey: 'portal.d', home: '/d' },
  '/e': { labelKey: 'portal.e', home: '/e' },
  '/v': { labelKey: 'portal.v', home: '/v' },
  '/a': { labelKey: 'portal.a', home: '/a' },
};

/**
 * Whose programme this is, before anything about the programme.
 *
 * It scrolls away with the page: the bar under it is what has to stay
 * reachable, and two stacked sticky strips would eat 104px of every screen.
 */
function GovernmentStrip() {
  return (
    <div className="gov-strip border-b border-deep-rule">
      {/*
       * Three tracks, not a flex row with space between: the emblem has to be
       * centred on the BAR, and the two lockups either side are different
       * widths — "Government of Maharashtra" is half again as long as
       * "Government of India". With `justify-between` the emblem would sit
       * wherever those two happened to leave it. The outer tracks share the
       * remaining space equally whatever they hold, so the centre stays the
       * centre, including when the state lockup is dropped on a phone.
       */}
      <div className="mx-auto grid h-12 max-w-shell grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-6">
        <span className="flex min-w-0 justify-start">
          <GovernmentOfIndia size={30} />
        </span>

        {/* The seal of the state, standing alone. */}
        <StateEmblem size={38} />

        <span className="flex min-w-0 justify-end">
          {/* Below md the state lockup would push the Union one off its own
              strip. The empty track keeps the emblem centred without it. */}
          <span className="hidden md:flex">
            <GovernmentOfMaharashtra size={30} />
          </span>
        </span>
      </div>
    </div>
  );
}

export function TopBar({
  links,
  bare,
}: {
  links: readonly { to: string; label: string; end?: boolean }[];
  /** An authentication screen: no navigation, no account, no notifications. */
  bare?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useSession();
  const signIn = useSignIn();
  // The desk a person sits at should be named in the language they are reading.
  const roleText = useRoleText();
  const notifications = useNotifications();
  const markRead = useMarkRead();
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const locale = useUi((s) => s.locale);
  const setLocale = useUi((s) => s.setLocale);
  const scenario = useUi((s) => s.scenario);
  const setScenarioState = useUi((s) => s.setScenario);
  const queryClient = useQueryClient();
  const base = usePortalBase();
  const portalRoute = PORTAL[base]!;
  const portal = { label: t(portalRoute.labelKey), home: portalRoute.home };

  useEffect(() => {
    void i18n.changeLanguage(locale);
    setFormatLanguage(locale);
    document.documentElement.lang = locale;
    /*
     * Content is negotiated at the API, so a cached English response is the
     * wrong answer to a Hindi page. Every query is dropped and re-asked in the
     * new language rather than only the chrome changing around stale data.
     */
    void queryClient.invalidateQueries();
  }, [locale, queryClient]);

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
  /*
   * Do the destinations actually fit?
   *
   * They used to appear at a fixed breakpoint, `wide`, chosen when the widest
   * portal had six of them. The startup portal has eight, and the same eight
   * are longer in Hindi — so between roughly 1240 and 1340 the strip overflowed
   * and its last item ran straight over the search, language and account
   * controls. Measured on the startup portal at 1240px: "Profile" ended at
   * x=934 and the controls began at x=859.
   *
   * A breakpoint cannot know any of that. So the strip is measured, and when
   * its content is wider than the room it has it stops being shown — the Menu
   * carries the same destinations, and a link behind one more click is better
   * than a link on top of the search box.
   */
  const [fits, setFits] = useState(true);
  const location = useLocation();

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const measure = (): void => {
      /*
       * Overflow only means something while the strip is laid out. Below its
       * own breakpoint it is display:none and measures zero, which is not a
       * reason to hide something already hidden.
       */
      const laidOut = nav.clientWidth > 0;
      setFits(!laidOut || nav.scrollWidth <= nav.clientWidth + 1);

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
    /*
     * And again once the webfonts have landed. The strip is `flex-1`, so its
     * own box does not change when Anek replaces the fallback face — only the
     * width of the text inside it does, which is exactly what decides whether
     * the destinations fit. Without this the first measurement is taken in a
     * narrower fallback font and the strip is judged to fit when it does not.
     */
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
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

  /*
   * An authentication screen. The bar used to carry the whole site here —
   * demand board, challenges, results, solutions, templates, transparency, all
   * of them working links — which made a sign-in page a detour rather than a
   * door, and handed an already-signed-in reader the full document room from
   * the one screen whose purpose is to change who they are.
   */
  if (bare) {
    return (
      <>
        <GovernmentStrip />
        <header className="topbar sticky top-0 z-40">
          <div className="mx-auto flex h-16 max-w-shell items-center gap-4 px-4 md:px-6">
            <span className="font-display text-mark tracking-mega text-deep-ink">{t('portal.public')}</span>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
                aria-label={t('app.language')}
                className="press h-8 rounded-pill border border-deep-rule px-3 text-label text-deep-dim hover:border-deep-dim hover:text-deep-ink"
              >
                {locale === 'en' ? 'हिन्दी' : 'English'}
              </button>
              <Link
                to="/"
                className="press inline-flex h-8 items-center rounded-pill border border-deep-rule px-3.5 text-label text-deep-ink no-underline hover:border-saffron hover:text-saffron-ink"
              >
                {t('chrome.backToBoard')}
              </Link>
            </div>
          </div>
        </header>
      </>
    );
  }

  return (
    <>
      <GovernmentStrip />

      <header data-scrolled={scrolled} className="topbar sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-shell items-center gap-4 px-4 md:px-6">
        <div className="group flex min-w-0 shrink items-center gap-2.5 md:shrink-0">
          {/* No mark here. The emblem stands in the centre of the strip above,
              which is the one place on the page it belongs; repeating it
              beside the portal name made the head of every screen carry it
              twice. The portal name is the link back. */}
          <span className="flex min-w-0 flex-col items-start">
            {/* The desk you are sitting at, and the way back to it. The product's
                own mark and wordmark are not here any more — they close the page
                in the footer instead. */}
            <Link
              to={portal.home}
              className="max-w-full truncate font-display text-mark tracking-mega text-deep-ink no-underline"
            >
              {portal.label}
            </Link>
            {/* No second line here. The strip above already names the
                government, and the product's own wordmark now closes the page
                rather than opening it. */}
          </span>
        </div>

        {/*
          One lit pill slides between destinations rather than a highlight
          blinking off one item and on at the next: the eye follows a moving
          object, and the movement itself says "you were there, now you are
          here". The label rides above it.
        */}
        <nav
          ref={navRef}
          aria-label="Primary"
          className={[
            'nav-strip relative ml-2 hidden min-w-0 flex-1 items-center gap-0.5 wide:flex',
            /* visibility, not display: it keeps its box so the next measurement
               is still meaningful, and it takes the links out of the tab order
               and the accessibility tree on its own. */
            fits ? '' : 'invisible',
          ].join(' ')}
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                [
                  /* Tighter until there is room to breathe. The startup portal carries
                     eight destinations and Hindi sets them longer than English;
                     at px-3.5 the padding alone was 224px of the strip. */
                  'swift relative z-10 flex h-9 items-center whitespace-nowrap rounded-pill px-2.5 text-label no-underline',
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
                      className="w-full border-b border-rule py-2 text-left text-body text-ink last:border-b-0 hover:text-verify"
                    >
                      {l === 'en' ? 'English' : 'हिन्दी'}
                    </button>
                  </li>
                ))}
                <li className="pt-2 text-micro text-ink-soft">{t('chrome.languageNote')}</li>
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
                {unread > 0 ? <span className="text-micro text-saffron-ink tnum">{unread}</span> : null}
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
                    {t('chrome.waitingSummary', {
                      waiting: waiting.length,
                      information: items.length - waiting.length,
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => markRead.mutate({ all: true })}
                    className="text-micro text-ink-soft underline underline-offset-2"
                  >
                    {t('chrome.markAllRead')}
                  </button>
                </div>
                <ul className="max-h-[50vh] overflow-auto scroll-quiet">
                  {items.length === 0 ? (
                    <li className="py-4 text-body text-ink-soft">{t('chrome.nothingWaiting')}</li>
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
                            {n.waitingOnYou ? (
                              <Badge tone="hold">{t('chrome.waitingOnYouBadge')}</Badge>
                            ) : (
                              <Badge tone="neutral">{t('chrome.informationBadge')}</Badge>
                            )}
                            {!n.read ? (
                              <span aria-label="Unread" className="text-micro text-ink-soft">
                                {t('chrome.unread')}
                              </span>
                            ) : null}
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
                {/* The monogram is the identity below xl; the name is what the strip
                    beside it needs the room for. */}
                <span className="hidden xl:inline">
                  {identityUnknown ? t('chrome.signInUnknown') : (user?.name ?? t('portal.public'))}
                </span>
              </button>
            )}
          >
            {(close) => (
              <div className="w-[300px]">
                <p className="text-label text-ink">
                  {identityUnknown
                    ? t('chrome.signInUnknown')
                    : user
                      ? user.name
                      : t('chrome.browsingAsPublic')}
                </p>
                <p className="mt-0.5 text-micro text-ink-soft">
                  {identityUnknown
                    ? t('chrome.signInUnknownLead')
                    : user
                      ? `${user.designation} · ${roleText(role).label}`
                      : t('chrome.signInToAct')}
                </p>

                {/*
                  The seven demonstration accounts used to be listed right here,
                  one click each. That made every boundary in the product
                  decorative: whoever was refused a department screen could
                  become a department officer without leaving the page. Changing
                  who you are is an act, so it happens on the sign-in page.
                */}
                <div className="mt-4 border-t border-rule pt-4">
                  <p className="text-label text-ink">{t('chrome.roleSwitcher')}</p>
                  <p className="mt-0.5 mb-3 text-micro text-ink-soft">{t('chrome.roleSwitcherLead')}</p>
                  <Button
                    size="sm"
                    block
                    onClick={() => {
                      navigate('/login');
                      close();
                    }}
                  >
                    {t('chrome.switchAccount')}
                  </Button>
                </div>

                {/*
                  Signed out, the only control here used to be "Sign out" —
                  which had already happened, and left no way back in. Whoever
                  is browsing as a member of the public gets the way in instead.
                */}
                <div className="mt-3 flex gap-2">
                  {user ? (
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
                  ) : (
                    <>
                      <Button
                        tone="primary"
                        size="sm"
                        block
                        onClick={() => {
                          navigate('/login');
                          close();
                        }}
                      >
                        {t('app.signIn')}
                      </Button>
                      <Button
                        size="sm"
                        block
                        onClick={() => {
                          navigate('/register');
                          close();
                        }}
                      >
                        {t('chrome.createAccount')}
                      </Button>
                    </>
                  )}
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
            label={t('chrome.menu')}
            align="right"
            trigger={({ onClick, ref, ...aria }) => (
              <button
                ref={ref}
                onClick={onClick}
                {...aria}
                aria-label={t('chrome.menu')}
                className={[
                  'press flex h-8 items-center gap-2 rounded-control border border-deep-rule px-2 text-label text-deep-dim hover:border-deep-dim hover:text-deep-ink',
                  /* Below the breakpoint, or above it whenever the strip could
                     not fit the destinations, this is what carries them. */
                  fits ? 'wide:hidden' : '',
                ].join(' ')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="hidden md:inline">{t('chrome.menu')}</span>
              </button>
            )}
          >
            {(close) => (
              <div className="w-[260px]">
                <p className="field-label mb-1">{portal.label}</p>
                <ul>
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

                {/*
                  Signed in, this is the whole of the navigation below the
                  breakpoint: your portal, and nothing from the front of the
                  building. Signed out, `links` is already the public site.
                */}
              </div>
            )}
          </Popover>


          {import.meta.env.DEV ? (
            <Popover
              label={t('chrome.scenario')}
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
    </>
  );
}
