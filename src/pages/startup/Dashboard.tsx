import { Link } from 'react-router-dom';
import { useStartupDashboard } from '@/services/hooks';
import { QueryState, WidgetBoundary } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { StatLedger } from '@/components/ledger/Ledger';
import { StatSkeleton, TableSkeleton, EmptyState, InlineNote, ProgressRing } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { SlaClock } from '@/components/domain/SlaClock';
import { day, durationWords, money, num, countOf } from '@/lib/format';
import { readClock } from '@/lib/sla';
import { platformNow } from '@/config/clock';

export default function StartupDashboard() {
  const query = useStartupDashboard();

  return (
    <div>
      <QueryState
        query={query}
        errorTitle="Unable to load your dashboard."
        loading={
          <div className="flex flex-col gap-6">
            <TableSkeleton rows={4} columns={3} />
            <StatSkeleton rows={4} />
          </div>
        }
      >
        {(payload) => {
          const d = payload.data;
          const oldestClock = d.money.oldestDays > 0;

          return (
            <div className="flex flex-col gap-8">
              <PageHeader
                title={d.startup.tradeName}
                lead="What is waiting on you, what is waiting on someone else, and what you are owed. In that order."
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={<LinkButton tone="primary" to="/s/matches">See what fits you</LinkButton>}
              />

              {/* Money owed is always within one screen. */}
              <section aria-labelledby="money-heading" className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <h2 id="money-heading" className="mb-3 text-h2 text-ink">
                    Waiting on you
                  </h2>
                  {d.waitingOnYou.length === 0 ? (
                    <EmptyState
                      title="Nothing is waiting on you."
                      body="Every open item is with a department, an evaluator or a validator. You will be told the moment that changes."
                      action={{ label: 'Look at open challenges', to: '/s/challenges' }}
                    />
                  ) : (
                    <ul className="sheet-flat">
                      {d.waitingOnYou.map((w) => {
                        const clock = readClock(
                          new Date(platformNow().getTime() - w.waitingSinceDays * 86_400_000).toISOString(),
                          Math.max(1, w.slaDays + w.waitingSinceDays),
                        );
                        return (
                          <li key={w.id} className="ledger-row">
                            <Link
                              to={w.href}
                              className={[
                                'flex flex-wrap items-start justify-between gap-4 border-l-2 px-4 py-3 no-underline hover:bg-ledger',
                                clock.state === 'overdue'
                                  ? 'border-l-seal bg-seal-wash'
                                  : clock.state === 'due_soon'
                                    ? 'border-l-hold bg-hold-wash'
                                    : 'border-l-transparent',
                              ].join(' ')}
                            >
                              <div className="min-w-0 max-w-doc">
                                <p className="type-register text-micro text-ink-soft">{w.caseId}</p>
                                <p className="mt-0.5 text-body text-ink">{w.title}</p>
                                <p className="mt-1 text-body text-ink-soft">{w.requiredAction}</p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                                <span className={clock.state === 'overdue' ? 'text-data text-seal' : 'text-data text-ink'}>
                                  {clock.words}
                                </span>
                                {w.amountPaise ? (
                                  <span className="text-micro text-ink-soft tnum">{money(w.amountPaise)}</span>
                                ) : null}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <WidgetBoundary label="what you are owed">
                  <div className="flex flex-col gap-4">
                    <StatLedger
                      title="Owed to you"
                      rows={[
                        { label: 'Claims outstanding', value: num(d.money.claimCount) },
                        {
                          label: 'Oldest claim',
                          value: oldestClock ? `${num(d.money.oldestDays)} days` : '—',
                          detail: oldestClock ? `Against a ${d.money.limitDays}-day limit` : undefined,
                        },
                        {
                          label: 'Past the limit',
                          value: num(d.money.overdueCount),
                          detail: d.money.overdueCount > 0 ? 'Each one shows who is holding it' : undefined,
                        },
                      ]}
                      total={{ label: 'Total outstanding', value: money(d.money.outstandingPaise) }}
                    />
                    {d.money.overdueCount > 0 ? (
                      <InlineNote tone="seal" title={`${countOf(d.money.overdueCount, 'payment is', 'payments are')} past the limit`}>
                        The ageing is visible to the department and on the public transparency page. Open the payment
                        ledger to see who is holding each one and what they need.
                      </InlineNote>
                    ) : null}
                    <LinkButton block to="/s/payments">
                      Open the payment ledger
                    </LinkButton>
                  </div>
                </WidgetBoundary>
              </section>

              <section aria-labelledby="them-heading">
                <h2 id="them-heading" className="mb-3 text-h2 text-ink">
                  Waiting on them
                </h2>
                {d.waitingOnThem.length === 0 ? (
                  <EmptyState
                    title="Nothing is with a department right now."
                    body="Applications under evaluation, payments in approval and validations in progress all appear here."
                    action={{ label: 'Find a challenge to apply to', to: '/s/challenges' }}
                  />
                ) : (
                  <ul className="sheet-flat">
                    {d.waitingOnThem.map((w) => (
                      <li key={w.id} className="ledger-row">
                        <Link to={w.href} className="flex flex-wrap items-start justify-between gap-4 px-4 py-3 no-underline hover:bg-ledger">
                          <div className="min-w-0 max-w-doc">
                            <p className="type-register text-micro text-ink-soft">{w.caseId}</p>
                            <p className="mt-0.5 text-body text-ink">{w.title}</p>
                            <p className="mt-1 text-body text-ink-soft">{w.detail}</p>
                          </div>
                          <StatusBadge status={w.status.replace(/\s+/g, '_')} label={w.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="matches-heading">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4">
                  <h2 id="matches-heading" className="text-h2 text-ink">
                    Challenges that fit you
                  </h2>
                  <Link to="/s/matches" className="text-label text-ink-soft underline underline-offset-2 hover:text-ink">
                    See every match, and every near miss
                  </Link>
                </div>
                {d.recommendations.length === 0 ? (
                  <EmptyState
                    title="No open challenge matches your profile yet."
                    body="Matching is deterministic and published. Adding capabilities and deployments to your profile changes what you see here."
                    action={{ label: 'Complete your profile', to: '/s/profile' }}
                  />
                ) : (
                  <ul className="sheet-flat">
                    {d.recommendations.map((rec) => (
                      <li key={rec.challenge.id} className="ledger-row px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 max-w-doc">
                            <Link
                              to={`/challenges/${rec.challenge.slug}`}
                              className="text-body text-ink underline underline-offset-2"
                            >
                              {rec.challenge.title}
                            </Link>
                            <p className="mt-0.5 text-micro text-ink-soft tnum">
                              {rec.challenge.caseId} · {rec.department.shortName}
                            </p>
                            {/* Never a bare percentage. Every match states its reasons. */}
                            <ul className="mt-2 space-y-0.5">
                              {rec.reasons
                                .filter((r) => r.matched)
                                .slice(0, 4)
                                .map((r) => (
                                  <li key={r.key} className="flex gap-2 text-micro text-ink">
                                    <span aria-hidden className="text-verify">
                                      ✓
                                    </span>
                                    {r.detail}
                                  </li>
                                ))}
                            </ul>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                            <span className="text-data text-ink tnum">{money(rec.challenge.pilot.budgetPaise)}</span>
                            {rec.challenge.timeline.closesOn && rec.challenge.timeline.publishedOn ? (
                              <SlaClock
                                startedOn={rec.challenge.timeline.publishedOn}
                                limitDays={Math.max(
                                  1,
                                  Math.round(
                                    (new Date(rec.challenge.timeline.closesOn).getTime() -
                                      new Date(rec.challenge.timeline.publishedOn).getTime()) /
                                      86_400_000,
                                  ),
                                )}
                              />
                            ) : null}
                            <span className="text-micro text-ink-soft tnum">
                              {rec.challenge.applicantCount} applicants so far
                            </span>
                            {rec.challenge.eligibility.relaxationsAvailable ? (
                              <Badge tone="verify">Startup relief</Badge>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="profile-heading" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h2 id="profile-heading" className="mb-3 text-h2 text-ink">
                    Profile completeness
                  </h2>
                  <div className="sheet-flat px-4 py-4">
                    <div className="flex items-center gap-4">
                      <ProgressRing value={d.profileCompleteness} label="Profile completeness" size={56} />
                      <p className="max-w-doc text-body text-ink-soft">
                        Screening runs against your profile, not against a fresh declaration. A gap here becomes a
                        needs-review flag later.
                      </p>
                    </div>
                    {d.profileGaps.length > 0 ? (
                      <ul className="mt-4 list-disc pl-5 text-body text-ink">
                        {d.profileGaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-body text-ink">Nothing is missing from your profile.</p>
                    )}
                    <div className="mt-4">
                      <LinkButton size="sm" to="/s/profile">
                        Open your profile
                      </LinkButton>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="mb-3 text-h2 text-ink">Your recognition</h2>
                  <StatLedger
                    rows={[
                      {
                        label: 'DPIIT recognition',
                        value: <StatusBadge status={d.startup.dpiit.status} />,
                        detail: d.startup.dpiit.recognitionNumber ?? 'No recognition number on file',
                      },
                      {
                        label: 'Valid to',
                        value: d.startup.dpiit.validTo ? day(d.startup.dpiit.validTo) : '—',
                        detail:
                          d.startup.dpiit.status === 'expired'
                            ? 'Expired recognition sends eligibility to review, not to automatic rejection'
                            : 'Turnover and experience relief depends on this staying current',
                      },
                      {
                        label: 'Last checked',
                        value: day(d.startup.dpiit.lastCheckedAt),
                        detail: durationWords(
                          Math.max(0, Math.round((platformNow().getTime() - new Date(d.startup.dpiit.lastCheckedAt).getTime()) / 86_400_000)),
                        ) + ' ago',
                      },
                      { label: 'GST registration', value: <StatusBadge status={d.startup.gstStatus} /> },
                    ]}
                  />
                </div>
              </section>
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
