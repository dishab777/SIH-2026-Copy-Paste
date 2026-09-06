import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useChallenge, useSession, useStartApplication, useApplications } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PanelSkeleton } from '@/components/ui/Feedback';
import { ChallengeDocument } from '@/components/domain/ChallengeDocument';
import { ChallengeDocumentNav } from '@/components/domain/ChallengeDocumentNav';
import { ChallengeSectionProvider } from '@/components/domain/ChallengeSectionContext';
import { Breadcrumb } from '@/components/ui/Nav';
import { StatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { SlaClock } from '@/components/domain/SlaClock';
import { InlineNote } from '@/components/ui/Feedback';
import { day, daysBetween, money } from '@/lib/format';
import { useUi } from '@/store/ui';
import { PrayogApiError } from '@/services/api';
import { track } from '@/lib/analytics';
import { usePortalLink } from '@/lib/portal';
import { portalFor } from '@/config/rbac';

export default function ChallengeDetail() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const query = useChallenge(slug);
  const session = useSession();
  const applications = useApplications();
  const start = useStartApplication();
  const pushToast = useUi((s) => s.pushToast);

  const link = usePortalLink();
  const role = session.data?.data.role ?? 'public';

  return (
    <QueryState
      query={query}
      errorTitle={t('pubChallenges.detail.errorTitle')}
      loading={<PanelSkeleton lines={10} />}
    >
      {(payload) => {
        const { challenge: c, department, clarifications } = payload.data;
        const existing = applications.data?.data.find((a) => a.application.challengeId === c.id);
        const isOpen = c.status === 'open' || c.status === 'closing_soon';

        return (
          <div className="-mx-4 -mt-6 md:-mx-6">
            {/*
              The cover of the file, on the same ground every public page opens
              on: the number stamped in a box, the subject line across it, and
              the four particulars a founder decides on, in a ruled strip.
            */}
            <header className="deep deep-field full-bleed border-b border-deep-rule px-4 py-8 md:px-6 lg:py-10">
              <div className="mx-auto max-w-shell">
                <Breadcrumb
                  tone="deep"
                  items={[
                    { label: t('pubChallenges.detail.breadcrumbBoard'), to: '/' },
                    { label: t('pubChallenges.detail.breadcrumbChallenges'), to: link('/challenges') },
                    { label: c.caseId },
                  ]}
                />

                <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="type-register inline-block rounded-pill border border-saffron px-3 py-0.5 text-micro text-saffron">
                      {c.caseId}
                    </p>
                    <h1 className="mt-3 max-w-[22ch] font-display text-hero tracking-mega text-deep-ink">{c.title}</h1>
                    <p className="mt-3 text-lead text-deep-dim">
                      {department?.name} · {c.district}, {c.state}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-block border border-deep-rule bg-deep-rule md:grid-cols-4">
                  <div className="bg-deep-2 px-4 py-4">
                    <dt className="field-label !text-deep-dim">{t('pubChallenges.detail.pilotBudget')}</dt>
                    <dd className="mt-1 font-display text-figure text-signal tnum">{money(c.pilot.budgetPaise)}</dd>
                  </div>
                  <div className="bg-deep-2 px-4 py-4">
                    <dt className="field-label !text-deep-dim">{t('pubChallenges.detail.duration')}</dt>
                    <dd className="mt-1 font-display text-figure text-deep-ink tnum">
                      {t('pubChallenges.detail.durationDays', { count: c.pilot.durationDays })}
                    </dd>
                  </div>
                  <div className="bg-deep-2 px-4 py-4">
                    <dt className="field-label !text-deep-dim">{t('pubChallenges.detail.applicants')}</dt>
                    <dd className="mt-1 font-display text-figure text-deep-ink tnum">{c.applicantCount}</dd>
                  </div>
                  {c.timeline.closesOn && c.timeline.publishedOn ? (
                    <div className="bg-deep-2 px-4 py-4">
                      {/* A clock only counts down while the window is open. A closed
                          challenge is not "overdue" — it closed, on a known date. */}
                      <dt className="field-label !text-deep-dim">
                        {isOpen ? t('pubChallenges.detail.closes') : t('pubChallenges.detail.closed')}
                      </dt>
                      <dd className="mt-1">
                        {isOpen ? (
                          <SlaClock
                            startedOn={c.timeline.publishedOn}
                            limitDays={daysBetween(c.timeline.publishedOn, c.timeline.closesOn)}
                          />
                        ) : (
                          <span className="font-display text-figure text-deep-ink tnum">{day(c.timeline.closesOn)}</span>
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                {role === 'startup' ? (
                  existing ? (
                    <LinkButton tone="primary" to={`/s/applications/${existing.application.id}`}>
                      {existing.application.status === 'draft'
                        ? t('pubChallenges.detail.continueApplication')
                        : t('pubChallenges.detail.openApplication')}
                    </LinkButton>
                  ) : isOpen ? (
                    <Button
                      tone="primary"
                      loading={start.isPending}
                      loadingLabel={t('pubChallenges.detail.starting')}
                      onClick={() =>
                        start.mutate(c.id, {
                          onSuccess: (res) => {
                            track({ name: 'application_started', applicationId: res.data.id, challengeId: c.id });
                            navigate(`/s/applications/${res.data.id}/edit/eligibility`);
                          },
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            pushToast(
                              'seal',
                              api?.message ?? t('pubChallenges.detail.startFailed'),
                              api?.details.join(' '),
                            );
                          },
                        })
                      }
                    >
                      {t('pubChallenges.detail.startApplication')}
                    </Button>
                  ) : (
                    <InlineNote tone="neutral" title={t('pubChallenges.detail.closedTitle')}>
                      {t('pubChallenges.detail.closedBody')}
                    </InlineNote>
                  )
                ) : role === 'public' ? (
                  <>
                    <LinkButton tone="primary" to="/register/startup">
                      {t('pubChallenges.detail.registerToApply')}
                    </LinkButton>
                    <LinkButton to="/login">{t('pubChallenges.detail.signIn')}</LinkButton>
                  </>
                ) : portalFor(role) === '/d' ? (
                  /*
                   * Only the roles the department portal admits. An evaluator,
                   * a validator or the programme unit following this reached
                   * the portal guard rather than a workspace.
                   */
                  <LinkButton to={`/d/challenges/${c.id}`}>
                    {t('pubChallenges.detail.openWorkspace')}
                  </LinkButton>
                ) : null}
                </div>
              </div>
            </header>

            {/* The index chooses; the panel beside it shows one thing at a time. */}
            <section className="full-bleed bg-ledger px-4 py-10 md:px-6">
              <div className="mx-auto max-w-shell">
                <ChallengeSectionProvider>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[228px_minmax(0,1fr)]">
                    <ChallengeDocumentNav />
                    <div className="rounded-block border border-rule bg-sheet px-5 py-6 shadow-sheet md:px-8 md:py-8">
                      <ChallengeDocument challenge={c} department={department} clarifications={clarifications} />
                    </div>
                  </div>
                </ChallengeSectionProvider>
              </div>
            </section>
          </div>
        );
      }}
    </QueryState>
  );
}
