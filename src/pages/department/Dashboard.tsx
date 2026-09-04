import { Link } from 'react-router-dom';
import { useDepartmentDashboard } from '@/services/hooks';
import { QueryState, WidgetBoundary } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { StatLedger } from '@/components/ledger/Ledger';
import { StatSkeleton, TableSkeleton, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { SlaClock, PaymentAgeingBar } from '@/components/domain/SlaClock';
import { LinkButton } from '@/components/ui/Button';
import { money, num } from '@/lib/format';
import { readClock } from '@/lib/sla';
import { platformNow } from '@/config/clock';

export default function DepartmentDashboard() {
  const query = useDepartmentDashboard();

  return (
    <div>
      <QueryState
        query={query}
        errorTitle="Unable to load your dashboard."
        loading={
          <div className="flex flex-col gap-6">
            <TableSkeleton rows={5} columns={4} />
            <StatSkeleton rows={5} />
          </div>
        }
      >
        {(payload) => {
          const d = payload.data;
          return (
            <div className="flex flex-col gap-8">
              <PageHeader
                title={d.department.shortName}
                lead="Sorted by how close each case is to breaching its decision window. The oldest waiting case is first, not the newest."
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={<LinkButton tone="primary" to="/d/challenges/new/problem">Create a challenge</LinkButton>}
              />

              {/* Who is waiting on you, before anything else. */}
              <section aria-labelledby="waiting-heading">
                <h2 id="waiting-heading" className="mb-3 text-h2 text-ink">
                  Who is waiting on you
                </h2>
                {d.waiting.length === 0 ? (
                  <EmptyState
                    title="Nothing is waiting on you."
                    body="Every case in this department is with someone else, or inside its decision window with time to spare."
                    action={{ label: 'Look at the pipeline', to: '/d/challenges' }}
                  />
                ) : (
                  <ul className="sheet-flat">
                    {d.waiting.map((w) => {
                      const clock = readClock(
                        new Date(platformNow().getTime() - w.waitingSinceDays * 86_400_000).toISOString(),
                        w.slaDays,
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
                              <SlaClock
                                startedOn={new Date(platformNow().getTime() - w.waitingSinceDays * 86_400_000).toISOString()}
                                limitDays={w.slaDays}
                                showDetail
                              />
                              <span className="text-micro text-ink-soft">{w.ownerName}</span>
                              {w.amountPaise ? (
                                <span className="text-data text-ink tnum">{money(w.amountPaise)}</span>
                              ) : null}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Where the department is stuck. */}
                <section aria-labelledby="dwell-heading">
                  <h2 id="dwell-heading" className="mb-3 text-h2 text-ink">
                    Gate dwell ledger
                  </h2>
                  <p className="mb-3 max-w-doc text-body text-ink-soft">
                    Where cases are sitting, and for how long against the configured decision window.
                  </p>
                  <WidgetBoundary label="the gate dwell ledger">
                    <div className="sheet-flat">
                      <div className="field-label grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b-2 border-b-ink px-4 py-2">
                        <span>Gate</span>
                        <span>Open cases</span>
                        <span className="text-right">Median dwell</span>
                        <span className="text-right">Window</span>
                      </div>
                      <ul>
                        {d.gateDwell.map((g) => {
                          const over = g.medianDwellDays > g.slaDays;
                          return (
                            <li
                              key={g.gate}
                              className={[
                                'ledger-row grid grid-cols-[auto_1fr_auto_auto] gap-4 border-l-2 px-4 py-2',
                                over ? 'border-l-seal bg-seal-wash' : g.blockedCases > 0 ? 'border-l-hold bg-hold-wash' : 'border-l-transparent',
                              ].join(' ')}
                            >
                              <span className="text-data text-ink tnum">{g.gate}</span>
                              <span className="text-body text-ink">
                                {g.openCases} open
                                {g.blockedCases > 0 ? (
                                  <span className="ml-2">
                                    <Badge tone="seal">{g.blockedCases} blocked</Badge>
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-right text-data text-ink tnum">
                                {g.medianDwellDays > 0 ? `${g.medianDwellDays} days` : '—'}
                              </span>
                              <span className="text-right text-data text-ink-soft tnum">{g.slaDays} days</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </WidgetBoundary>
                </section>

                <section aria-labelledby="portfolio-heading">
                  <h2 id="portfolio-heading" className="mb-3 text-h2 text-ink">
                    Portfolio
                  </h2>
                  <StatLedger
                    rows={[
                      { label: 'Open challenges', value: num(d.portfolio.openChallenges) },
                      { label: 'Live pilots', value: num(d.portfolio.livePilots) },
                      { label: 'Committed to pilots', value: money(d.portfolio.committedPaise) },
                      { label: 'Released to date', value: money(d.portfolio.releasedPaise) },
                    ]}
                    total={{
                      label: 'Outstanding commitment',
                      value: money(d.portfolio.committedPaise - d.portfolio.releasedPaise),
                    }}
                  />
                </section>
              </div>

              {/* Money owed, always within one screen. */}
              <section aria-labelledby="payment-heading">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4">
                  <h2 id="payment-heading" className="text-h2 text-ink">
                    Payment risk
                  </h2>
                  <Link to="/d/payments" className="text-label text-ink-soft underline underline-offset-2 hover:text-ink">
                    Open the payment ledger
                  </Link>
                </div>
                <p className="mb-3 max-w-doc text-body text-ink-soft">
                  Claims approaching or past the configured {d.limitDays}-day payment limit. The clock started on
                  acceptance, not on invoice.
                </p>
                {d.paymentRisk.length === 0 ? (
                  <EmptyState
                    title="No claims are outstanding."
                    body="Accepted milestones raise a claim automatically, and the ageing clock starts the same day."
                  />
                ) : (
                  <ul className="sheet-flat">
                    {d.paymentRisk.map((p) => (
                      <li key={p.claim.id} className="ledger-row px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-body text-ink">{p.startup.tradeName}</p>
                            <p className="type-register text-micro text-ink-soft">{p.claim.caseId}</p>
                            <p className="mt-1 text-micro text-ink-soft">{p.claim.approvalStep}</p>
                            {p.claim.holdReason ? (
                              <p className="mt-1 max-w-doc text-micro text-ink">
                                Held by {p.claim.heldBy}: {p.claim.holdReason}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0">
                            <PaymentAgeingBar
                              acceptedOn={p.claim.acceptedOn}
                              limitDays={d.limitDays}
                              amountPaise={p.claim.amountPaise}
                              deductionPaise={p.claim.deductionPaise}
                              paidOn={p.claim.paidOn}
                              reference={p.claim.paymentReference}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
