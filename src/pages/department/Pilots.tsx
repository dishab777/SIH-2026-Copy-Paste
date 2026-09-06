import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GATES, gateSlaDays } from '@/config/gates';
import { usePilots } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { SlaClock } from '@/components/domain/SlaClock';
import { FigureCard, MarkRupee, MarkCleared, MarkClock, MarkOverdue } from '@/components/ledger/FigureCard';
import { beyondTarget, kpiStatus, progress } from '@/components/charts/MeasurementChart';
import { countOf, day, daysBetween, money, moneyScaled, num, percent } from '@/lib/format';
import type { PilotRow } from '@/services/hooks';

/**
 * A milestone's state, as one segment of the run.
 *
 * Four states and four inks, and the ink means the same thing it means
 * everywhere else in the product: cleared, waiting on somebody, refused, not
 * started. The bar is decorative — the count beneath it says the same thing in
 * words — which is what keeps it honest on a monochrome print.
 */
const SEGMENT: Record<string, string> = {
  approved: 'bg-verify',
  paid: 'bg-verify',
  submitted: 'bg-hold',
  under_review: 'bg-hold',
  rejected: 'bg-seal',
  revision_required: 'bg-seal',
};

function MilestoneRun({ milestones }: { milestones: PilotRow['milestones'] }) {
  if (milestones.length === 0) return null;
  return (
    <span aria-hidden className="flex gap-1">
      {milestones.map((m) => (
        <span key={m.id} className={['h-1.5 flex-1 rounded-pill', SEGMENT[m.status] ?? 'bg-rule'].join(' ')} />
      ))}
    </span>
  );
}

/**
 * How far the money has gone against what was committed.
 *
 * Money released is the only progress figure on this screen that a reader can
 * check against a bank statement, so it gets a track of its own rather than
 * sharing the milestone run — the two move together most of the time, and the
 * interesting pilots are the ones where they do not.
 */
function SpendTrack({ spent, budget }: { spent: number; budget: number }) {
  const share = budget > 0 ? Math.min(1, spent / budget) : 0;
  return (
    <span aria-hidden className="mt-2 block h-1.5 w-full rounded-pill bg-ledger">
      <span className="block h-1.5 rounded-pill bg-verify" style={{ width: `${Math.max(share * 100, 1.5)}%` }} />
    </span>
  );
}

/**
 * One pilot, as an object you can pick up.
 *
 * The table underneath answers "compare these across a column"; this answers
 * "what is happening to this one", which is the question an officer actually
 * arrives with. The rail carries the state, so a blocked pilot is findable in a
 * grid without reading a word of it.
 */
function PilotCard({ row, onOpen }: { row: PilotRow; onOpen: () => void }) {
  const { t } = useTranslation();
  const waiting = row.milestones.filter((m) => m.status === 'submitted' || m.status === 'under_review').length;
  const accepted = row.milestones.filter((m) => m.status === 'approved' || m.status === 'paid').length;
  const elapsed = Math.min(row.pilot.durationDays, Math.max(0, daysBetween(row.pilot.startedOn)));
  const k = row.kpis[0];

  const rail = row.pilot.blocked || row.pilot.status === 'not_validated' ? 'bg-seal' : waiting > 0 ? 'bg-hold' : 'bg-verify';

  return (
    <li className="reveal">
      <article className="sheet-flat lift-on-hover relative flex h-full flex-col overflow-hidden rounded-block">
        <span aria-hidden className={['absolute inset-x-0 top-0 block h-1', rail].join(' ')} />

        <div className="border-b border-rule bg-verify-wash px-5 pb-4 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="type-register text-micro text-ink-soft">{row.pilot.caseId}</span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={row.pilot.status} />
              {row.pilot.blocked ? <Badge tone="seal">{t('deptPilots.list.blocked')}</Badge> : null}
            </span>
          </div>
          <h3 className="mt-2 font-display text-h3 text-ink">
            <button type="button" onClick={onOpen} className="swift text-left hover:text-verify">
              {row.pilot.title}
            </button>
          </h3>
          <p className="mt-1 text-body text-ink-soft">{row.startup.tradeName}</p>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div>
            <p className="field-label">
              {t('deptPilots.list.standingAt', {
                gate: row.pilot.currentGate,
                name: GATES.find((g) => g.id === row.pilot.currentGate)?.name ?? '',
              })}
            </p>
            <div className="mt-2">
              <SlaClock startedOn={row.pilot.gateEnteredOn} limitDays={gateSlaDays(row.pilot.currentGate)} />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="field-label">{t('deptPilots.list.milestones')}</p>
              <p className="text-micro text-ink-soft tnum">
                {t('deptPilots.list.accepted', { done: accepted, total: row.milestones.length })}
              </p>
            </div>
            <div className="mt-2">
              <MilestoneRun milestones={row.milestones} />
            </div>
            {waiting > 0 ? (
              <p className="mt-2">
                <Badge tone="hold">{t('deptPilots.list.awaitingFinding', { count: waiting })}</Badge>
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="field-label">{t('deptPilots.list.released')}</p>
              <p className="text-micro text-ink-soft tnum">
                {t('deptPilots.list.ofCommitted', { amount: money(row.pilot.budgetPaise) })}
              </p>
            </div>
            <p className="mt-1 font-display text-figure text-verify tnum">{money(row.pilot.spentPaise)}</p>
            <SpendTrack spent={row.pilot.spentPaise} budget={row.pilot.budgetPaise} />
          </div>

          {k ? (
            <div className="rounded-sheet border border-rule bg-ledger px-4 py-3">
              <p className="field-label">{t('deptPilots.list.headlineMeasure')}</p>
              <p className="mt-1 text-body text-ink">{k.name}</p>
              <p className="mt-0.5 text-micro text-ink-soft tnum">
                {t('deptPilots.list.measureLine', {
                  baseline: num(k.baseline, 1),
                  current: num(k.current, 1),
                  unit: k.unit,
                  target: num(k.target, 1),
                })}
              </p>
              <p className="mt-2">
                <Badge tone={progress(k) >= 100 ? 'verify' : progress(k) >= 70 ? 'hold' : 'seal'}>
                  {kpiStatus(k)} · {percent(progress(k))}
                  {beyondTarget(k) > 0 ? ` · ${percent(beyondTarget(k))} past target` : ''}
                </Badge>
              </p>
            </div>
          ) : (
            <p className="text-micro text-ink-soft">{t('deptPilots.list.noMeasureYet')}</p>
          )}

          <p className="mt-auto border-t border-rule pt-3 text-micro text-ink-soft tnum">
            {t('deptPilots.list.dayLine', {
              day: elapsed,
              total: row.pilot.durationDays,
              date: day(row.pilot.endsOn),
            })}
          </p>
        </div>
      </article>
    </li>
  );
}

export default function DepartmentPilots() {
  const { t } = useTranslation();
  const query = usePilots();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        eyebrow={t('deptPilots.list.eyebrow')}
        title={t('deptPilots.list.title')}
        lead={t('deptPilots.list.lead')}
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState
        query={query}
        errorTitle={t('deptPilots.list.errorTitle')}
        loading={<TableSkeleton rows={6} columns={6} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: t('deptPilots.list.emptyTitle'),
          body: t('deptPilots.list.emptyBody'),
          action: { label: t('deptPilots.list.emptyAction'), to: '/d/challenges' },
        }}
      >
        {(payload) => {
          const rows = payload.data;
          const waiting = rows.filter((r) =>
            r.milestones.some((m) => m.status === 'submitted' || m.status === 'under_review'),
          ).length;
          const blocked = rows.filter((r) => r.pilot.blocked || r.pilot.status === 'not_validated').length;
          const spent = rows.reduce((s, r) => s + r.pilot.spentPaise, 0);
          const committed = rows.reduce((s, r) => s + r.pilot.budgetPaise, 0);

          return (
            <>
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FigureCard
                  label="Pilots running"
                  value={num(rows.length)}
                  detail="steered by this department"
                  tone="verify"
                  mark={MarkCleared}
                />
                <FigureCard
                  label="Awaiting your finding"
                  value={num(waiting)}
                  detail="milestone evidence submitted and unread"
                  tone={waiting > 0 ? 'hold' : 'verify'}
                  mark={MarkClock}
                />
                <FigureCard
                  label="Blocked or not reproduced"
                  value={num(blocked)}
                  detail={blocked > 0 ? 'each one needs a written decision' : 'nothing is stalled'}
                  tone={blocked > 0 ? 'seal' : 'verify'}
                  mark={MarkOverdue}
                />
                <FigureCard
                  label="Released"
                  value={moneyScaled(spent)}
                  detail={`of ${moneyScaled(committed)} committed`}
                  tone="verify"
                  mark={MarkRupee}
                />
              </div>

              <h2 className="sr-only">Pilots</h2>
              <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {rows.map((r) => (
                  <PilotCard key={r.pilot.id} row={r} onOpen={() => navigate(`/d/pilots/${r.pilot.id}`)} />
                ))}
              </ul>

              {/*
                The cards answer "what is happening to this pilot". Comparing a
                column across all of them — every gate clock, every budget — is a
                different question, and a sortable, filterable, exportable ledger
                is still the only honest answer to it. It stays, folded away.
              */}
              <details className="group mt-8 rounded-block border border-rule bg-sheet">
                <summary className="press flex cursor-pointer items-center justify-between gap-4 rounded-block px-5 py-4">
                  <span className="flex items-center gap-3">
                    <span className="field-label !text-saffron-ink">Compare across every pilot</span>
                    <span className="text-body text-ink">Open the sortable ledger</span>
                  </span>
                  <span aria-hidden className="text-ink-soft">
                    +
                  </span>
                </summary>

                <div className="border-t border-rule px-5 py-5">
                  <LedgerTable
                    title="Every pilot, side by side"
                    caption="Pilots owned by this department"
                    exportName="prayog-pilots"
                    rows={rows}
                    rowKey={(r) => r.pilot.id}
                    rowTone={(r) =>
                      r.pilot.blocked
                        ? 'seal'
                        : r.pilot.status === 'not_validated'
                          ? 'seal'
                          : r.milestones.some((m) => m.status === 'submitted' || m.status === 'under_review')
                            ? 'hold'
                            : undefined
                    }
                    onRowOpen={(r) => navigate(`/d/pilots/${r.pilot.id}`)}
                    savedViews={[
                      {
                        id: 'waiting',
                        label: 'Waiting on the department',
                        hiddenColumns: [],
                        sortKey: 'gate',
                        sortDirection: 'asc',
                      },
                      {
                        id: 'money',
                        label: 'By money committed',
                        hiddenColumns: ['kpi'],
                        sortKey: 'budget',
                        sortDirection: 'desc',
                      },
                    ]}
                    columns={[
                      {
                        key: 'case',
                        header: 'Case',
                        width: '24%',
                        sortValue: (r) => r.pilot.caseId,
                        filterValue: (r) => `${r.pilot.caseId} ${r.pilot.title}`,
                        render: (r) => (
                          <span>
                            <span className="type-register block text-micro text-ink-soft">{r.pilot.caseId}</span>
                            <span className="block text-body text-ink">{r.pilot.title}</span>
                            <span className="block text-micro text-ink-soft">{r.startup.tradeName}</span>
                          </span>
                        ),
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        sortValue: (r) => r.pilot.status,
                        filterValue: (r) => r.pilot.status,
                        render: (r) => (
                          <span className="flex flex-col items-start gap-1">
                            <StatusBadge status={r.pilot.status} />
                            {r.pilot.blocked ? <Badge tone="seal">Blocked</Badge> : null}
                          </span>
                        ),
                      },
                      {
                        key: 'gate',
                        header: 'Gate',
                        sortValue: (r) => r.pilot.currentGate,
                        filterValue: (r) => r.pilot.currentGate,
                        render: (r) => (
                          <span>
                            <span className="block text-data text-ink">{r.pilot.currentGate}</span>
                            <span className="block text-micro text-ink-soft">
                              {GATES.find((g) => g.id === r.pilot.currentGate)?.name}
                            </span>
                          </span>
                        ),
                      },
                      {
                        key: 'day',
                        header: 'Progress',
                        align: 'right',
                        sortValue: (r) => daysBetween(r.pilot.startedOn),
                        render: (r) => {
                          const elapsed = Math.min(r.pilot.durationDays, Math.max(0, daysBetween(r.pilot.startedOn)));
                          return (
                            <span>
                              <span className="block tnum">
                                Day {elapsed} of {r.pilot.durationDays}
                              </span>
                              <span className="block text-micro text-ink-soft">ends {day(r.pilot.endsOn)}</span>
                            </span>
                          );
                        },
                      },
                      {
                        key: 'milestones',
                        header: 'Milestones',
                        align: 'right',
                        sortValue: (r) =>
                          r.milestones.filter((m) => m.status === 'submitted' || m.status === 'under_review').length,
                        render: (r) => {
                          const open = r.milestones.filter(
                            (m) => m.status === 'submitted' || m.status === 'under_review',
                          ).length;
                          const done = r.milestones.filter((m) => m.status === 'approved' || m.status === 'paid').length;
                          return (
                            <span>
                              <span className="block tnum">
                                {done} of {r.milestones.length} accepted
                              </span>
                              {open > 0 ? (
                                <span className="mt-0.5 block text-micro text-ink">
                                  <Badge tone="hold">{open} awaiting your finding</Badge>
                                </span>
                              ) : null}
                            </span>
                          );
                        },
                      },
                      {
                        key: 'kpi',
                        header: 'Headline measure',
                        width: '20%',
                        filterValue: (r) => r.kpis[0]?.name ?? '',
                        render: (r) => {
                          const k = r.kpis[0];
                          if (!k) return <span className="text-ink-soft">No measure recorded</span>;
                          return (
                            <span>
                              <span className="block text-body text-ink">{k.name}</span>
                              <span className="block text-micro text-ink-soft tnum">
                                {num(k.baseline, 1)} → {num(k.current, 1)} {k.unit} · target {num(k.target, 1)}
                              </span>
                              <span className="mt-1 block">
                                <Badge tone={progress(k) >= 100 ? 'verify' : progress(k) >= 70 ? 'hold' : 'seal'}>
                                  {kpiStatus(k)} · {percent(progress(k))}
                                </Badge>
                              </span>
                            </span>
                          );
                        },
                      },
                      {
                        key: 'budget',
                        header: 'Budget',
                        unit: '₹',
                        align: 'right',
                        sortValue: (r) => r.pilot.budgetPaise,
                        filterValue: (r) => String(r.pilot.budgetPaise / 100),
                        render: (r) => (
                          <span>
                            <span className="block tnum">{money(r.pilot.spentPaise)}</span>
                            <span className="block text-micro text-ink-soft tnum">of {money(r.pilot.budgetPaise)}</span>
                          </span>
                        ),
                      },
                      {
                        key: 'sla',
                        header: 'Gate clock',
                        align: 'right',
                        optional: true,
                        sortValue: (r) => daysBetween(r.pilot.gateEnteredOn),
                        render: (r) => (
                          <SlaClock startedOn={r.pilot.gateEnteredOn} limitDays={gateSlaDays(r.pilot.currentGate)} />
                        ),
                      },
                    ]}
                    totalRow={
                      <span className="flex flex-wrap items-baseline justify-between gap-4">
                        <span className="text-body text-ink">{countOf(rows.length, 'pilot')}</span>
                        <span className="text-data text-ink tnum">
                          {money(spent)} released of {money(committed)} committed
                        </span>
                      </span>
                    }
                  />
                </div>
              </details>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
