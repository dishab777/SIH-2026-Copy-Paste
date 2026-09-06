import type { ReactNode } from 'react';
import { useSay } from '@/lib/contentText';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CardCarousel } from '@/components/patterns/CardCarousel';
import { STAGES } from '@/config/stages';
import { useChallenges, useResults, useTransparency } from '@/services/hooks';
import { QueryState, WidgetBoundary } from '@/components/layout/QueryState';
import { FreshnessLine } from '@/components/layout/Shell';
import { StatSkeleton, TableSkeleton } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { GateFile } from '@/components/domain/GateFile';
import { SlaClock } from '@/components/domain/SlaClock';
import { ChallengeCard } from '@/components/domain/ChallengeCard';
import { OutcomePie } from '@/components/domain/OutcomePie';
import { useReveal } from '@/lib/reveal';
import { daysBetween, money, moneyScaled, num } from '@/lib/format';
import type { Challenge } from '@/types/models';


function Eyebrow({ children, tone = 'deep' }: { children: ReactNode; tone?: 'deep' | 'paper' }) {
  return (
    <p className={['field-label mb-3 flex items-center gap-2', tone === 'deep' ? '!text-deep-dim' : ''].join(' ')}>
      <span aria-hidden className={['inline-block h-px w-6', tone === 'deep' ? 'bg-deep-rule' : 'bg-rule'].join(' ')} />
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ page */

export default function DemandBoard() {
  const say = useSay();
  const { t } = useTranslation();
  const stats = useTransparency();
  const challenges = useChallenges({ view: 'public', status: ['open', 'closing_soon'], sort: 'closing' });
  const results = useResults();

  useReveal([stats.data, challenges.data, results.data]);

  const open = challenges.data?.data ?? [];
  const notice = open[0];
  const rest = open.slice(1);
  const h = stats.data?.data.headline;

  return (
    <div className="-mx-4 -mt-6 md:-mx-6">
      {/* ============================================== 1. the hero
        The claim and the evidence, side by side: the sentence on the left, and
        on the right an actual open case with its seven gates written down it —
        three stamped, one open, three still blank. It is the only thing on the
        page that could not be said by a brochure.
      */}
      <section className="deep deep-field full-bleed px-4 pb-16 pt-12 md:px-6 lg:pt-16">
        <div className="mx-auto grid max-w-shell grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <Eyebrow>{t('pubStatic.demand.heroEyebrow')}</Eyebrow>
            <h1 className="max-w-hero font-display text-mega tracking-mega text-deep-ink">
              {t('pubStatic.demand.heroTitleLead')}
              <span className="block text-saffron">{t('pubStatic.demand.heroTitleAccent')}</span>
              {t('pubStatic.demand.heroTitleTail')}
            </h1>
            <p className="mt-6 max-w-[52ch] text-lead text-deep-dim">{t('pubStatic.demand.heroLead')}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#demand-heading"
                className="press inline-flex h-12 items-center rounded-pill bg-saffron px-6 text-body font-semibold text-deep no-underline shadow-saffron"
              >
                {t('pubStatic.demand.browseOpen')}
              </a>
              <Link
                to="/how-it-works"
                className="swift inline-flex h-12 items-center rounded-pill border border-deep-rule px-6 text-body text-deep-ink no-underline hover:border-saffron hover:text-saffron"
              >
                {t('pubStatic.demand.gatesLink')}
              </Link>
            </div>

            {h ? (
              <dl className="mt-10 grid max-w-[540px] grid-cols-3 gap-px overflow-hidden rounded-block border border-deep-rule bg-deep-rule">
                {[
                  { k: t('pubStatic.demand.statDepartments'), v: num(h.departments), c: 'text-deep-ink' },
                  { k: t('pubStatic.demand.statOpenNow'), v: num(h.openProblems), c: 'text-saffron' },
                  { k: t('pubStatic.demand.statCommitted'), v: moneyScaled(h.committedPaise), c: 'text-signal' },
                ].map((s) => (
                  <div key={s.k} className="bg-deep-2 px-4 py-4">
                    <dt className="field-label !text-deep-dim">{s.k}</dt>
                    <dd className={['mt-1 font-display text-figure tnum', s.c].join(' ')}>{s.v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="mt-10 h-[92px] max-w-[540px] rounded-block bg-deep-2" />
            )}
          </div>

          {/*
            A diagram of the process would only show how the programme is meant
            to work. Drawing a real case, standing where it actually stands,
            shows that it is working — which is the harder and more useful
            claim, and the only one this page is entitled to make.
          */}
          <figure className="m-0 lg:pl-6">
            <GateFile at={3} caseId={notice?.caseId} title={notice?.title} district={notice?.district} />
          </figure>
        </div>
      </section>

      {/* ============================================== 3. the featured case */}
      <section aria-labelledby="notice-heading" className="full-bleed bg-sheet px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <Eyebrow tone="paper">{t('pubStatic.demand.closingSoonest')}</Eyebrow>
          <WidgetBoundary label="the featured challenge">
            <QueryState
              query={challenges}
              errorTitle={t('pubStatic.demand.challengesErrorTitle')}
              loading={<div className="h-[300px] rounded-block bg-ledger" />}
              isEmpty={(d) => d.data.length === 0}
              empty={{
                title: t('pubStatic.demand.featuredEmptyTitle'),
                body: t('pubStatic.demand.featuredEmptyBody'),
                action: { label: t('pubStatic.demand.seeResults'), to: '/results' },
              }}
            >
              {() => (notice ? <FeaturedNotice notice={notice} headingId="notice-heading" /> : <span />)}
            </QueryState>
          </WidgetBoundary>
        </div>
      </section>

      {/* ============================================== 4. everything else open */}
      <section aria-labelledby="demand-heading" className="full-bleed border-t border-rule bg-ledger px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow tone="paper">{t('pubStatic.demand.boardEyebrow')}</Eyebrow>
              <h2 id="demand-heading" className="font-display text-hero text-ink">
                {t('pubStatic.demand.boardHeading')}
              </h2>
            </div>
          </div>

          <WidgetBoundary label="the demand board">
            <QueryState
              query={challenges}
              errorTitle={t('pubStatic.demand.challengesErrorTitle')}
              loading={<TableSkeleton rows={6} columns={4} />}
              isEmpty={(d) => d.data.length === 0}
              empty={{
                title: t('pubStatic.demand.boardEmptyTitle'),
                body: t('pubStatic.demand.boardEmptyBody'),
                action: { label: t('pubStatic.demand.seeResults'), to: '/results' },
              }}
            >
              {() => (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {rest.map((c, i) => (
                    <li key={c.id} className="reveal" data-delay={String((i % 5) + 1)}>
                      <ChallengeCard challenge={c} />
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
          </WidgetBoundary>
        </div>
      </section>

      {/* ============================================== 5. the nine stages
        Numbered, because they genuinely run in order and a case cannot skip one.
      */}
      <section aria-labelledby="stages-heading" className="deep full-bleed bg-deep px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <Eyebrow>{t('pubStatic.demand.stagesEyebrow')}</Eyebrow>
          <h2 id="stages-heading" className="max-w-[16ch] font-display text-hero text-deep-ink">
            {t('pubStatic.demand.stagesHeading')}
          </h2>
          <p className="mt-4 max-w-[58ch] text-body text-deep-dim">{t('pubStatic.demand.stagesLead')}</p>

          {/*
            One accent across all nine. The stages are a sequence, not nine
            categories, and colouring them differently implied a difference
            between them that does not exist.

            Read one at a time, with the one behind and the one ahead left on
            screen — which is the whole claim of the section, and something a
            grid of nine equal blocks could not make.
          */}
          <div className="mt-10">
            <CardCarousel
              items={STAGES}
              itemKey={(stage) => stage.id}
              unit="Stage"
              label={t('pubStatic.demand.stagesCarouselLabel')}
              render={(stage, _i, live) => (
                <article className="slab flex h-full flex-col overflow-hidden" data-accent={live ? 'saffron' : 'signal'}>
                  <span aria-hidden className="carousel-rail block w-full" />
                  <div className="flex flex-1 flex-col px-6 py-6">
                    <div className="flex items-start justify-between gap-4">
                      <span
                        aria-hidden
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border border-deep-rule bg-deep-2 text-saffron"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          focusable="false"
                        >
                          <path d="M12 6.5V12l3.5 2M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Z" />
                        </svg>
                      </span>
                      {/* The stage number as a watermark. On the dead rule it
                          measured 1.45 : 1 and was simply not there; the card
                          beside the live one is already at 40% opacity, so it
                          recedes without needing to be invisible up close. */}
                      <span aria-hidden className="type-register text-mega text-deep-dim">
                        {String(stage.index).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-h2 text-deep-ink">
                      <span className="sr-only">{t('pubStatic.demand.srStage', { index: stage.index })} </span>
                      {say(stage.title)}
                    </h3>
                    <p className="mt-3 text-body text-deep-dim">{stage.department.happens}</p>

                    <p className="field-label mt-auto pt-6 !text-deep-dim">
                      {t('pubStatic.demand.stageActorGate', { actor: say(stage.actor), gate: stage.gate })}
                    </p>
                  </div>
                </article>
              )}
            />
          </div>
        </div>
      </section>

      {/* ============================================== 6. the proof */}
      <section aria-labelledby="proof-heading" className="full-bleed border-t border-rule bg-sheet px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <Eyebrow tone="paper">{t('pubStatic.demand.proofEyebrow')}</Eyebrow>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="proof-heading" className="max-w-[18ch] font-display text-hero text-ink">
              {t('pubStatic.demand.proofHeading')}
            </h2>
            <Link to="/results" className="text-label text-ink underline underline-offset-4 hover:text-verify">
              {t('pubStatic.demand.readEveryResult')}
            </Link>
          </div>

          <WidgetBoundary label="the published results">
            <QueryState
              query={results}
              errorTitle={t('pubStatic.demand.resultsErrorTitle')}
              loading={<StatSkeleton rows={4} />}
              isEmpty={(d) => d.data.length === 0}
              empty={{
                title: t('pubStatic.demand.proofEmptyTitle'),
                body: t('pubStatic.demand.proofEmptyBody'),
                action: { label: t('pubStatic.demand.seeOpenChallenges'), to: '/challenges' },
              }}
            >
              {(payload) => <ProofWall rows={payload.data} />}
            </QueryState>
          </WidgetBoundary>

          {stats.data ? (
            <div className="mt-10">
              <FreshnessLine servedAt={stats.data.servedAt} onRefresh={() => void stats.refetch()} />
            </div>
          ) : null}
        </div>
      </section>

      {/* ============================================== 7. the way in */}
      <section className="deep full-bleed border-t border-deep-rule bg-deep px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-shell grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 className="max-w-[20ch] font-display text-hero text-deep-ink">
              {t('pubStatic.demand.reliefHeading')}
            </h2>
            <p className="mt-4 max-w-[56ch] text-body text-deep-dim">{t('pubStatic.demand.reliefLead')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="press inline-flex h-12 items-center rounded-pill bg-signal px-6 text-body font-semibold text-deep no-underline shadow-signal"
            >
              {t('pubStatic.demand.createAccount')}
            </Link>
            <Link
              to="/how-it-works"
              className="swift inline-flex h-12 items-center rounded-pill border border-deep-rule px-6 text-body text-deep-ink no-underline hover:border-saffron hover:text-saffron"
            >
              {t('pubStatic.demand.gatesLink')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------- featured notice */

function FeaturedNotice({ notice, headingId }: { notice: Challenge; headingId: string }) {
  const { t } = useTranslation();
  return (
    <article className="overflow-hidden rounded-block border border-rule bg-sheet shadow-lift">
      <div
        aria-hidden
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, var(--verify), transparent)' }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="px-6 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="type-register rounded-pill border border-ink px-3 py-0.5 text-micro text-ink">
              {notice.caseId}
            </span>
            <span className="field-label !text-verify">{notice.sector}</span>
          </div>

          <h2 id={headingId} className="mt-4 max-w-[20ch] font-display text-hero text-ink">
            {notice.title}
          </h2>

          <p className="mt-4 max-w-doc text-body text-ink-soft">
            {t('pubStatic.demand.noticeLead', { district: notice.district, state: notice.state })}
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {notice.capabilities.slice(0, 4).map((cap) => (
              <li key={cap} className="rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft">
                {cap}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={`/challenges/${notice.slug}`}
              className="press inline-flex h-11 items-center rounded-pill bg-ink px-6 text-body font-medium text-sheet no-underline"
            >
              {t('pubStatic.demand.readChallenge')}
            </Link>
            {notice.eligibility.relaxationsAvailable ? (
              <Badge tone="verify">{t('pubStatic.demand.startupRelief')}</Badge>
            ) : null}
          </div>
        </div>

        {/* The three things a founder decides on, in the order they decide them. */}
        <dl className="border-t border-rule bg-ledger lg:border-l lg:border-t-0">
          <div className="border-b border-rule px-6 py-5">
            <dt className="field-label">{t('pubStatic.demand.measuredOn')}</dt>
            <dd className="mt-1 text-body text-ink">{notice.baseline.metric}</dd>
            <dd className="mt-2 flex flex-wrap items-baseline gap-2 font-display text-figure text-ink tnum">
              {num(notice.baseline.currentValue, 1)}
              <span aria-hidden className="text-verify">
                →
              </span>
              {num(notice.outcome.magnitude, 1)}
              <span className="text-body font-normal text-ink-soft">{notice.outcome.unit}</span>
            </dd>
          </div>
          <div className="border-b border-rule px-6 py-5">
            <dt className="field-label">{t('pubStatic.demand.pilotBudget')}</dt>
            <dd className="mt-1 font-display text-figure text-ink tnum">
              {money(notice.pilot.budgetPaise)}
            </dd>
            <dd className="mt-1 text-micro text-ink-soft">
              {t('pubStatic.demand.overDays', { count: notice.pilot.durationDays })}
            </dd>
          </div>
          <div className="px-6 py-5">
            <dt className="field-label">{t('pubStatic.demand.applicationsClose')}</dt>
            <dd className="mt-2">
              {notice.timeline.closesOn && notice.timeline.publishedOn ? (
                <SlaClock
                  startedOn={notice.timeline.publishedOn}
                  limitDays={daysBetween(notice.timeline.publishedOn, notice.timeline.closesOn)}
                  showDetail
                />
              ) : (
                <span className="text-data text-ink">—</span>
              )}
            </dd>
            <dd className="mt-2 text-micro text-ink-soft tnum">
              {t('pubStatic.demand.appliedSoFar', { count: notice.applicantCount })}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- the proof */

/*
 * What this page is entitled to.
 *
 * Signed out, /api/results answers with the outcome and an id and nothing else
 * — the projection is decided on the server, not here. This type used to
 * declare the company and the challenge title as well, which it never read;
 * a type that claims more than the payload carries is how identifying data
 * ends up on a public page by accident.
 */
interface ResultRow {
  id: string;
  outcome?: string | null;
}

/**
 * The proportion of finished pilots that reproduced their claim.
 *
 * A pie, because the question is what share of the whole each finding took,
 * and there are only three findings a validator can sign. The list beside it
 * carries the same numbers in words, so the answer survives without colour.
 */
function ProofWall({ rows }: { rows: readonly ResultRow[] }) {
  const { t } = useTranslation();
  const count = (key: string): number => rows.filter((r) => (r.outcome ?? 'not_validated') === key).length;

  const slices = [
    {
      key: 'validated' as const,
      label: t('pubStatic.demand.outcomeReproduced'),
      detail: t('pubStatic.demand.outcomeReproducedDetail'),
      count: count('validated'),
      colour: 'var(--verify)',
    },
    {
      key: 'validated_with_qualifications' as const,
      label: t('pubStatic.demand.outcomeQualified'),
      detail: t('pubStatic.demand.outcomeQualifiedDetail'),
      count: count('validated_with_qualifications'),
      colour: 'var(--hold)',
    },
    {
      key: 'not_validated' as const,
      label: t('pubStatic.demand.outcomeNotReproduced'),
      detail: t('pubStatic.demand.outcomeNotReproducedDetail'),
      count: count('not_validated'),
      colour: 'var(--seal)',
    },
  ];

  return (
    <div className="rounded-block border border-rule bg-ledger p-6 shadow-sheet md:p-10">
      <OutcomePie slices={slices} />

      <p className="mt-8 border-t border-rule pt-4 text-micro text-ink-soft">
        Every finding here was signed by someone who does not work for the department that ran the pilot, and who was
        paid whether the answer was yes or no.
      </p>
    </div>
  );
}
