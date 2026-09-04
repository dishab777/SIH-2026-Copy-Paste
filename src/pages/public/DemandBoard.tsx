import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
            <Eyebrow>From challenge to contract</Eyebrow>
            <h1 className="max-w-hero font-display text-mega tracking-mega text-deep-ink">
              Government
              <span className="block text-saffron">problems,</span>
              priced and open.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lead text-deep-dim">
              Every problem here carries a measured baseline, a budget head and the scoring rubric it will be judged
              against. You can read all of it — including exactly how you will be marked — before deciding to spend a
              week on an application.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/challenges"
                className="press inline-flex h-12 items-center rounded-pill bg-saffron px-6 text-body font-semibold text-deep no-underline shadow-saffron"
              >
                Browse open problems
              </Link>
              <Link
                to="/how-it-works"
                className="swift inline-flex h-12 items-center rounded-pill border border-deep-rule px-6 text-body text-deep-ink no-underline hover:border-saffron hover:text-saffron"
              >
                How the seven gates work
              </Link>
            </div>

            {h ? (
              <dl className="mt-10 grid max-w-[540px] grid-cols-3 gap-px overflow-hidden rounded-block border border-deep-rule bg-deep-rule">
                {[
                  { k: 'Departments', v: num(h.departments), c: 'text-deep-ink' },
                  { k: 'Open now', v: num(h.openProblems), c: 'text-saffron' },
                  { k: 'Committed', v: moneyScaled(h.committedPaise), c: 'text-signal' },
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
          <Eyebrow tone="paper">Closing soonest</Eyebrow>
          <WidgetBoundary label="the featured challenge">
            <QueryState
              query={challenges}
              errorTitle="Unable to load open challenges."
              loading={<div className="h-[300px] rounded-block bg-ledger" />}
              isEmpty={(d) => d.data.length === 0}
              empty={{
                title: 'No problems are open for applications today.',
                body: 'Departments post here the moment a challenge clears gate 1. Until then the published results are the honest picture of what this programme has bought.',
                action: { label: 'See published results', to: '/results' },
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
              <Eyebrow tone="paper">The demand board</Eyebrow>
              <h2 id="demand-heading" className="font-display text-hero text-ink">
                What departments need right now
              </h2>
            </div>
          </div>

          <WidgetBoundary label="the demand board">
            <QueryState
              query={challenges}
              errorTitle="Unable to load open challenges."
              loading={<TableSkeleton rows={6} columns={4} />}
              isEmpty={(d) => d.data.length === 0}
              empty={{
                title: 'No challenges are open right now.',
                body: 'Departments publish here as soon as gate 1 clears. Closed challenges and their outcomes stay on the results page.',
                action: { label: 'See published results', to: '/results' },
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
          <Eyebrow>Nine stages, no shortcuts</Eyebrow>
          <h2 id="stages-heading" className="max-w-[16ch] font-display text-hero text-deep-ink">
            A problem becomes a contract in the open.
          </h2>
          <p className="mt-4 max-w-[58ch] text-body text-deep-dim">
            Nothing here happens in a meeting nobody minuted. Each stage hands the case to a named role, and the gate
            between two stages is a written decision anyone can read afterwards.
          </p>

          {/* One accent across all nine. The stages are a sequence, not nine
              categories, and colouring them differently implied a difference
              between them that does not exist. */}
          <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((s, i) => (
              <li key={s.id} className="reveal slab settle p-6 hover:-translate-y-1" data-delay={String((i % 5) + 1)} data-accent="signal">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="type-register text-figure text-signal">{String(s.index).padStart(2, '0')}</span>
                  <h3 className="min-w-0 font-display text-h3 text-deep-ink">{s.title}</h3>
                </div>
                <p className="mt-3 text-body text-deep-dim">{s.department.happens}</p>
                <p className="field-label mt-4 !text-deep-dim">
                  {s.actor} · clears {s.gate}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================================== 6. the proof */}
      <section aria-labelledby="proof-heading" className="full-bleed border-t border-rule bg-sheet px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <Eyebrow tone="paper">Published outcomes</Eyebrow>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="proof-heading" className="max-w-[18ch] font-display text-hero text-ink">
              Every pilot is published, whether or not it worked.
            </h2>
            <Link to="/results" className="text-label text-ink underline underline-offset-4 hover:text-verify">
              Read every result
            </Link>
          </div>

          <WidgetBoundary label="the published results">
            <QueryState
              query={results}
              errorTitle="Unable to load published results."
              loading={<StatSkeleton rows={4} />}
              isEmpty={(d) => d.data.length === 0}
              empty={{
                title: 'No pilots have finished yet.',
                body: 'An outcome appears here as soon as an independent validator signs a report, whether or not the pilot succeeded.',
                action: { label: 'See open challenges', to: '/challenges' },
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
              Prior turnover is relaxed. The quality bar is not.
            </h2>
            <p className="mt-4 max-w-[56ch] text-body text-deep-dim">
              A recognised startup can be excused prior turnover and prior experience. Technical capability, security,
              safety and performance are never relaxed for anyone — and the rule that was applied to you is named on
              your result.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register/startup"
              className="press inline-flex h-12 items-center rounded-pill bg-signal px-6 text-body font-semibold text-deep no-underline shadow-signal"
            >
              Register a startup
            </Link>
            <Link
              to="/transparency"
              className="swift inline-flex h-12 items-center rounded-pill border border-deep-rule px-6 text-body text-deep-ink no-underline hover:border-saffron hover:text-saffron"
            >
              Programme transparency
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------- featured notice */

function FeaturedNotice({ notice, headingId }: { notice: Challenge; headingId: string }) {
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
            {notice.district}, {notice.state}. The department has stated the outcome it needs and left the method open.
            How you get there is your proposal to make.
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
              Read this challenge
            </Link>
            {notice.eligibility.relaxationsAvailable ? <Badge tone="verify">Startup relief available</Badge> : null}
          </div>
        </div>

        {/* The three things a founder decides on, in the order they decide them. */}
        <dl className="border-t border-rule bg-ledger lg:border-l lg:border-t-0">
          <div className="border-b border-rule px-6 py-5">
            <dt className="field-label">Measured on</dt>
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
            <dt className="field-label">Pilot budget</dt>
            <dd className="mt-1 font-display text-figure text-ink tnum">
              {money(notice.pilot.budgetPaise)}
            </dd>
            <dd className="mt-1 text-micro text-ink-soft">over {notice.pilot.durationDays} days</dd>
          </div>
          <div className="px-6 py-5">
            <dt className="field-label">Applications close</dt>
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
            <dd className="mt-2 text-micro text-ink-soft tnum">{notice.applicantCount} have applied so far</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- the proof */

interface ResultRow {
  pilot: { id: string; caseId: string; title: string };
  challenge: { title: string };
  startup: { tradeName: string };
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
  const count = (key: string): number => rows.filter((r) => (r.outcome ?? 'not_validated') === key).length;

  const slices = [
    {
      key: 'validated' as const,
      label: 'Reproduced',
      detail: 'An independent validator re-derived the claim from the department’s own records and got the same answer.',
      count: count('validated'),
      colour: 'var(--verify)',
    },
    {
      key: 'validated_with_qualifications' as const,
      label: 'Reproduced with qualifications',
      detail: 'The outcome held, but the validator recorded a caveat on the record — usually a gap in the measurement.',
      count: count('validated_with_qualifications'),
      colour: 'var(--hold)',
    },
    {
      key: 'not_validated' as const,
      label: 'Not reproduced',
      detail: 'The claim could not be reproduced. It stays published, because the next department is entitled to know.',
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
