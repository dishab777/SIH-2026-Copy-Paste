import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortalLink } from '@/lib/portal';
import { useMatches } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { TableSkeleton, EmptyState, InlineNote } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Pager } from '@/components/ui/Pager';
import { SlaClock } from '@/components/domain/SlaClock';
import { countOf, daysBetween, money, num } from '@/lib/format';
import type { MatchReason } from '@/services/hooks';
import type { Challenge, Department } from '@/types/models';

function MatchRow({
  challenge,
  department,
  reasons,
  nearMiss,
}: {
  challenge: Challenge;
  department: Department;
  reasons: MatchReason[];
  nearMiss?: boolean;
}) {
  const link = usePortalLink();
  const matched = reasons.filter((r) => r.matched);
  const unmatched = reasons.filter((r) => !r.matched);

  return (
    <li className="ledger-row px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-doc">
          <Link to={link(`/challenges/${challenge.slug}`)} className="text-h3 text-ink underline underline-offset-2">
            {challenge.title}
          </Link>
          <p className="mt-0.5 text-micro text-ink-soft tnum">
            {challenge.caseId} · {department.shortName} · {challenge.district}, {challenge.state}
          </p>
          <p className="mt-2 text-body text-ink">{challenge.outcome.statement}</p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-label text-ink-soft">Why this fits</p>
              <ul className="mt-1 space-y-1">
                {matched.map((r) => (
                  <li key={r.key} className="flex gap-2 text-body text-ink">
                    <span aria-hidden className="text-verify">
                      ✓
                    </span>
                    <span>
                      {r.detail}
                      <span className="ml-2 text-micro text-ink-soft tnum">{r.weightPercent}%</span>
                    </span>
                  </li>
                ))}
                {matched.length === 0 ? <li className="text-body text-ink-soft">Nothing on your profile matches.</li> : null}
              </ul>
            </div>
            <div>
              <p className="text-label text-ink-soft">{nearMiss ? 'Why this is not a fit' : 'What is missing'}</p>
              <ul className="mt-1 space-y-1">
                {unmatched.map((r) => (
                  <li key={r.key} className="flex gap-2 text-body text-ink-soft">
                    <span aria-hidden>—</span>
                    <span>
                      {r.detail}
                      <span className="ml-2 text-micro tnum">{r.weightPercent}%</span>
                    </span>
                  </li>
                ))}
                {unmatched.length === 0 ? <li className="text-body text-ink">Nothing is missing.</li> : null}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
          <span className="text-data text-ink tnum">{money(challenge.pilot.budgetPaise)}</span>
          <span className="text-micro text-ink-soft">{challenge.pilot.durationDays}-day pilot</span>
          {challenge.timeline.closesOn && challenge.timeline.publishedOn ? (
            <SlaClock
              startedOn={challenge.timeline.publishedOn}
              limitDays={daysBetween(challenge.timeline.publishedOn, challenge.timeline.closesOn)}
            />
          ) : null}
          <span className="text-micro text-ink-soft tnum">
            {num(challenge.applicantCount)} applicants so far
          </span>
          {challenge.eligibility.relaxationsAvailable ? <Badge tone="verify">Startup relief</Badge> : null}
          <LinkButton size="sm" tone={nearMiss ? 'secondary' : 'primary'} to={link(`/challenges/${challenge.slug}`)}>
            Read the challenge
          </LinkButton>
        </div>
      </div>
    </li>
  );
}

const PER_PAGE = 5;

/**
 * A register of matches, five to a page.
 *
 * Each entry carries the challenge, its outcome, every weighted reason it
 * matched and every reason it did not — which is the point of the page, and
 * also why twenty of them on one scroll is unreadable. The tables in this
 * product have paged since they were written; this is the same pager, on the
 * one list that was not a table.
 */
function MatchRegister({
  entries,
  nearMiss,
}: {
  entries: { challenge: Challenge; department: Department; reasons: MatchReason[] }[];
  nearMiss?: boolean;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
  // A list that shrinks under you should not leave you on page four of two.
  const at = Math.min(page, pages - 1);
  const from = at * PER_PAGE;
  const visible = entries.slice(from, from + PER_PAGE);

  return (
    <div className="sheet-flat overflow-hidden">
      <ul>
        {visible.map((f) => (
          <MatchRow
            key={f.challenge.id}
            challenge={f.challenge}
            department={f.department}
            reasons={f.reasons}
            nearMiss={nearMiss}
          />
        ))}
      </ul>
      <Pager
        page={at}
        pages={pages}
        onChange={setPage}
        summary={`Showing ${from + 1}–${Math.min(from + PER_PAGE, entries.length)} of ${entries.length}`}
      />
    </div>
  );
}

export default function StartupMatches() {
  const query = useMatches();

  return (
    <div>
      <PageHeader
        title="Matches"
        lead="Deterministic, weighted and published. Every recommendation states its reasons, and every near miss states what is missing — there is no unexplained percentage anywhere on this page."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState
        query={query}
        errorTitle="Unable to load your matches."
        loading={<TableSkeleton rows={4} columns={3} />}
        isEmpty={(d) => d.data.fits.length === 0 && d.data.nearMisses.length === 0}
        empty={{
          title: 'No open challenge matches your profile yet.',
          body: 'Matching runs against the capabilities, deployments, geography and certifications on your profile. Adding to those changes what appears here.',
          action: { label: 'Complete your profile', to: '/s/profile' },
        }}
      >
        {(payload) => (
          <div className="flex flex-col gap-8">
            <section aria-labelledby="weights-heading">
              <h2 id="weights-heading" className="mb-3 text-h2 text-ink">
                How matching works
              </h2>
              <div className="sheet-flat">
                <p className="border-b border-ink px-4 py-2 text-label text-ink">
                  Weighted components — hard eligibility rules override similarity entirely
                </p>
                <ul>
                  {payload.data.weights.map((w) => (
                    <li key={w.key} className="ledger-row flex items-baseline justify-between px-4 py-2">
                      <span className="text-body text-ink">{w.label}</span>
                      <span className="text-data text-ink tnum">{w.weightPercent}%</span>
                    </li>
                  ))}
                </ul>
                <div className="rule-total flex items-baseline justify-between px-4 py-2">
                  <span className="text-body font-medium text-ink">Total</span>
                  <span className="text-data font-medium text-ink tnum">
                    {payload.data.weights.reduce((s, w) => s + w.weightPercent, 0)}%
                  </span>
                </div>
              </div>
            </section>

            <section aria-labelledby="fits-heading">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="fits-heading" className="text-h2 text-ink">
                  Challenges that fit you
                </h2>
                <p className="text-micro text-ink-soft tnum">
                  {countOf(payload.data.fits.length, 'challenge clears', 'challenges clear')} the fit threshold
                </p>
              </div>
              {payload.data.fits.length === 0 ? (
                <EmptyState
                  title="Nothing clears the fit threshold right now."
                  body="The near misses below show exactly what would have to change."
                  action={{ label: 'Browse every open challenge', to: '/s/challenges' }}
                />
              ) : (
                <MatchRegister entries={payload.data.fits} />
              )}
            </section>

            <section aria-labelledby="near-heading">
              <h2 id="near-heading" className="mb-1 text-h2 text-ink">
                Near misses
              </h2>
              <p className="mb-3 max-w-doc text-body text-ink-soft">
                These are shown deliberately. Knowing why you are not a fit is more useful than not seeing the challenge
                at all, and nothing here stops you applying if you disagree.
              </p>
              {payload.data.nearMisses.length === 0 ? (
                <InlineNote tone="neutral" title="No near misses">
                  Every open challenge either fits you or is too far from your profile to be worth listing.
                </InlineNote>
              ) : (
                <MatchRegister entries={payload.data.nearMisses} nearMiss />
              )}
            </section>
          </div>
        )}
      </QueryState>
    </div>
  );
}
