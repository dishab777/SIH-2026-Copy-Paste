import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ROLES, portalFor, type RoleDefinition } from '@/config/rbac';
import { useAccounts, useSignIn } from '@/services/hooks';
import { signInSchema, type SignInInput } from '@/schemas/auth';
import { PageHeader } from '@/components/layout/Shell';
import { QueryState } from '@/components/layout/QueryState';
import { ErrorState, InlineNote, StatSkeleton } from '@/components/ui/Feedback';
import { Button, LinkButton } from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

type Portal = RoleDefinition['portal'];

/**
 * What a portal is called in ordinary words.
 *
 * The route is the record and the role register in config owns which role goes
 * where; this only says out loud which desk a person is about to sit down at,
 * because "/v" is not an answer to that question.
 *
 * The map holds translation keys rather than names: it is module scope, where
 * `t` does not exist, so the name is read at the render site.
 */
const PORTAL_NAMES: Record<Portal, string> = {
  '/': 'auth.signIn.portal.public',
  '/s': 'auth.signIn.portal.startup',
  '/d': 'auth.signIn.portal.department',
  '/e': 'auth.signIn.portal.evaluation',
  '/v': 'auth.signIn.portal.validation',
  '/a': 'auth.signIn.portal.programme',
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accounts = useAccounts();
  const signIn = useSignIn();
  const pushToast = useUi((s) => s.pushToast);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  /* Only the credential attempt is an error on this screen. The demonstration
     switcher below has its own buttons and reports its own failure. */
  const credentialAttempt = signIn.variables?.email !== undefined;

  function onSubmit(values: SignInInput): void {
    signIn.mutate(values, {
      onSuccess: (res) => {
        const role = res.data.user?.role;
        pushToast('verify', res.message ?? t('auth.signIn.signedIn'));
        navigate(role ? portalFor(role) : '/');
      },
    });
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow={t('auth.signIn.eyebrow')}
        title={t('auth.signIn.title')}
        lead={t('auth.signIn.lead')}
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
            {t('auth.signIn.encrypted')}
          </span>
        }
      />

      {/* ------------------------------------------------------- credentials */}
      <section className="glass panel-in mb-8 rounded-block px-5 py-6 md:px-8 md:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
              <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
              {t('auth.signIn.accountEyebrow')}
            </p>
            <h2 className="font-display text-h2 text-ink">{t('auth.signIn.heading')}</h2>
            <p className="mt-2 max-w-doc text-body text-ink-soft">{t('auth.signIn.note')}</p>

            {signIn.isError && credentialAttempt ? (
              <div className="mt-5">
                <ErrorState
                  title={t('auth.signIn.errorTitle')}
                  what={
                    signIn.error instanceof PrayogApiError
                      ? signIn.error.message
                      : t('auth.signIn.errorWhat')
                  }
                  details={signIn.error instanceof PrayogApiError ? signIn.error.details : undefined}
                  compact
                />
              </div>
            ) : null}

            <form
              noValidate
              onSubmit={form.handleSubmit(onSubmit, () => {
                document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
              })}
              className="mt-6 flex flex-col gap-6"
            >
              <Field label={t('auth.signIn.emailLabel')} required error={errors.email?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder={t('auth.signIn.emailPlaceholder')}
                    {...form.register('email')}
                  />
                )}
              </Field>

              <Field
                label={t('auth.signIn.passwordLabel')}
                required
                error={errors.password?.message}
                aside={
                  <Link
                    to="/register"
                    className="text-micro text-ink-soft underline underline-offset-2 hover:text-verify"
                  >
                    {t('auth.signIn.noAccountLink')}
                  </Link>
                }
              >
                {({ id, describedBy, invalid }) => (
                  <PasswordInput
                    id={id}
                    autoComplete="current-password"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    {...form.register('password')}
                  />
                )}
              </Field>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  type="submit"
                  tone="primary"
                  loading={signIn.isPending && credentialAttempt}
                  loadingLabel={t('auth.signIn.signingIn')}
                >
                  {t('auth.signIn.submit')}
                </Button>
                <button
                  type="button"
                  onClick={() =>
                    pushToast(
                      'hold',
                      t('auth.signIn.recoveryTitle'),
                      t('auth.signIn.recoveryDetail'),
                    )
                  }
                  className="text-label text-ink-soft underline underline-offset-2 hover:text-verify"
                >
                  {t('auth.signIn.forgot')}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:border-l lg:border-l-rule lg:pl-8">
            <InlineNote tone="hold" title={t('auth.signIn.backendTitle')}>
              <p>{t('auth.signIn.backendBody')}</p>
              <p className="mt-2">{t('auth.signIn.backendContract')}</p>
            </InlineNote>

            <div className="mt-6 rounded-block border border-rule bg-ledger px-5 py-4">
              <p className="field-label">{t('auth.signIn.noAccountTitle')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <LinkButton size="sm" tone="primary" to="/register">
                  {t('auth.signIn.createAccount')}
                </LinkButton>
                <LinkButton size="sm" to="/">
                  {t('auth.signIn.keepBrowsing')}
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
       * The card floats over the page wash rather than sitting flat on it,
       * which is the one thing this screen has to do: it is a choice, not a
       * register, and it should read as something handed to you.
       */}
      <section className="glass panel-in rounded-block px-5 py-6 md:px-8 md:py-8">
        <div className="mb-6 border-b border-rule pb-6">
          <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            {t('auth.signIn.demoEyebrow')}
          </p>
          <h2 className="font-display text-h2 text-ink">{t('auth.signIn.demoHeading')}</h2>
          <p className="mt-2 max-w-doc text-body text-ink-soft">{t('auth.signIn.demoLead')}</p>
        </div>

        <QueryState
          query={accounts}
          errorTitle={t('auth.signIn.demoErrorTitle')}
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
                        <h3 className="font-display text-h3 text-ink">{t(PORTAL_NAMES[group.portal])}</h3>
                        <p className="text-micro text-ink-soft">
                          <span className="type-register">{group.portal}</span>
                          {' · '}
                          {t('auth.signIn.accounts', { count: group.users.length })}
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
                                    loadingLabel={t('auth.signIn.signingIn')}
                                    onClick={() =>
                                      signIn.mutate({ userId: u.id }, { onSuccess: () => navigate(portalFor(u.role)) })
                                    }
                                    className="w-full md:w-auto"
                                  >
                                    {t('auth.signIn.signInAs', { role: role?.label.toLowerCase() ?? '' })}
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

    </div>
  );
}
