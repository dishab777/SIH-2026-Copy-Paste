import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, portalFor, type RoleDefinition } from '@/config/rbac';
import { useAccounts, useSignIn } from '@/services/hooks';
import { PageHeader } from '@/components/layout/Shell';
import { QueryState } from '@/components/layout/QueryState';
import { InlineNote, StatSkeleton } from '@/components/ui/Feedback';
import { Button, LinkButton } from '@/components/ui/Button';

type Portal = RoleDefinition['portal'];

/**
 * What a portal is called in ordinary words.
 *
 * The route is the record and the role register in config owns which role goes
 * where; this only says out loud which desk a person is about to sit down at,
 * because "/v" is not an answer to that question.
 */
const PORTAL_NAMES: Record<Portal, string> = {
  '/': 'Public site',
  '/s': 'Startup portal',
  '/d': 'Department portal',
  '/e': 'Evaluation portal',
  '/v': 'Validation portal',
  '/a': 'Programme portal',
};

/**
 * The portals in the order the role register lists them, named once each. Read
 * from config rather than restated, so a role moving portal moves this too.
 */
const PORTAL_ORDER: readonly Portal[] = ROLES.reduce<Portal[]>(
  (acc, r) => (acc.includes(r.portal) ? acc : [...acc, r.portal]),
  [],
);

/**
 * One drawing per portal, in the language of the work done there: a growth
 * line for the startup, a secretariat front for the department, a scored sheet
 * for evaluation, a countersigned seal for validation, a set of levers for the
 * unit that sets the rules.
 */
const PORTAL_GLYPH: Record<Portal, ReactNode> = {
  '/': (
    <g>
      <path d="M2.5 12S6.1 6.5 12 6.5 21.5 12 21.5 12 17.9 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </g>
  ),
  '/s': (
    <g>
      <path d="M3.5 17.5 9 12l3.5 2.5L20.5 6" />
      <path d="M15.5 6h5v5" />
    </g>
  ),
  '/d': (
    <g>
      <path d="M3 20.5h18" />
      <path d="M12 3.5 21 8.5H3l9-5Z" />
      <path d="M6 11v6.5M10 11v6.5M14 11v6.5M18 11v6.5" />
    </g>
  ),
  '/e': (
    <g>
      <path d="M5.5 3.5h13v17h-13z" />
      <path d="M9 8.5h6M9 12.5h6M9 16.5h3" />
    </g>
  ),
  '/v': (
    <g>
      <circle cx="12" cy="10" r="6.5" />
      <path d="m9 10 2.2 2.2L15 8.4" />
      <path d="m8.5 15.5-1 5 4.5-2.2 4.5 2.2-1-5" />
    </g>
  ),
  '/a': (
    <g>
      <path d="M3.5 8h8M15.5 8h5M3.5 16h4M11.5 16h9" />
      <circle cx="13.5" cy="8" r="2.2" />
      <circle cx="9.5" cy="16" r="2.2" />
    </g>
  ),
};

function PortalMark({ portal }: { portal: Portal }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {PORTAL_GLYPH[portal]}
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const signIn = useSignIn();

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow="Demonstration access"
        title="Sign in"
        lead="This build stands in for government single sign-on with a demonstration account per role. Signing in changes what the API allows, not only what the screen shows."
        aside={
          <span className="inline-flex items-center gap-2 rounded-pill border border-deep-rule bg-deep-2 px-4 py-1.5 text-micro text-deep-dim">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              focusable="false"
            >
              <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>
            No password is collected
          </span>
        }
      />

      {/*
       * The card floats over the page wash rather than sitting flat on it,
       * which is the one thing this screen has to do: it is a choice, not a
       * register, and it should read as something handed to you.
       */}
      <section className="glass panel-in rounded-block px-5 py-6 md:px-8 md:py-8">
        <div className="mb-6 border-b border-rule pb-6">
          <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            Choose an account
          </p>
          <h2 className="font-display text-h2 text-ink">Which desk are you sitting at?</h2>
          <p className="mt-2 max-w-doc text-body text-ink-soft">
            Every account below is a real role with real permissions. What you can see, sign and pay for changes with
            the one you pick.
          </p>
        </div>

        <div className="mb-8">
          <InlineNote tone="hold" title="Mock provider">
            Government single sign-on is represented by a mock provider. No live government authentication service is
            called by this build, and no password is collected.
          </InlineNote>
        </div>

        <QueryState
          query={accounts}
          errorTitle="Unable to load demonstration accounts."
          loading={<StatSkeleton rows={7} />}
        >
          {(payload) => {
            const groups = PORTAL_ORDER.map((portal) => ({
              portal,
              users: payload.data.filter((u) => portalFor(u.role) === portal),
            })).filter((g) => g.users.length > 0);

            return (
              <div className="flex flex-col gap-8">
                {groups.map((group) => (
                  <section key={group.portal}>
                    <div className="mb-4 flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-hold-wash text-verify shadow-sheet"
                      >
                        <PortalMark portal={group.portal} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-h3 text-ink">{PORTAL_NAMES[group.portal]}</h3>
                        <p className="text-micro text-ink-soft">
                          <span className="type-register">{group.portal}</span>
                          {' · '}
                          {group.users.length === 1 ? 'one account' : `${group.users.length} accounts`}
                        </p>
                      </div>
                    </div>

                    <ul className="flex flex-col gap-4">
                      {group.users.map((u) => {
                        const role = ROLES.find((r) => r.id === u.role);
                        return (
                          <li key={u.id}>
                            <div className="sheet-flat lift-on-hover relative overflow-hidden rounded-sheet px-5 py-5">
                              {/* The edge every card in this product is picked up by: open at the
                                  top, cleared at the bottom, which is the journey behind the door. */}
                              <span
                                aria-hidden
                                className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-saffron to-verify"
                              />
                              <div className="flex flex-wrap items-start gap-4 pl-3">
                                <span
                                  aria-hidden
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border border-verify bg-verify-wash font-display text-label text-verify shadow-sheet"
                                >
                                  {u.initials}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className="text-body font-medium text-ink">{u.name}</p>
                                  <p className="text-micro text-ink-soft">{u.designation}</p>
                                  <p className="mt-2">
                                    <span className="inline-flex items-center gap-2 rounded-pill border border-verify bg-verify-wash px-3 py-0.5 text-micro text-verify">
                                      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-verify" />
                                      {role?.label}
                                    </span>
                                  </p>
                                  <p className="mt-2 max-w-doc text-micro text-ink-soft">{role?.description}</p>
                                </div>

                                <div className="w-full shrink-0 md:ml-auto md:w-auto">
                                  <Button
                                    tone="primary"
                                    loading={signIn.isPending && signIn.variables?.userId === u.id}
                                    loadingLabel="Signing in"
                                    onClick={() =>
                                      signIn.mutate({ userId: u.id }, { onSuccess: () => navigate(portalFor(u.role)) })
                                    }
                                    className="w-full md:w-auto"
                                  >
                                    Sign in as {role?.label.toLowerCase()}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            );
          }}
        </QueryState>
      </section>

      <div className="sheet mt-8 rounded-block px-5 py-6 md:px-8">
        <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
          <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
          No account yet
        </p>
        <h2 className="font-display text-h3 text-ink">Three other ways in</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton to="/register/startup">Register a startup</LinkButton>
          <LinkButton to="/register/expert">Register as an evaluator</LinkButton>
          <LinkButton to="/">Keep browsing as a member of the public</LinkButton>
        </div>
      </div>
    </div>
  );
}
