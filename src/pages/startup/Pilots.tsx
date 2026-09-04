import { Link } from 'react-router-dom';
import { GATES } from '@/config/gates';
import { usePilots } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { TableSkeleton } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { achievement, kpiStatus } from '@/components/charts/MeasurementChart';
import { day, daysBetween, money, num, percent } from '@/lib/format';

export default function StartupPilots() {
  const query = usePilots();

  return (
    <div>
      <PageHeader
        title="Pilots"
        lead="Every pilot you are running, with what is due from you and what the measurement currently says."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState
        query={query}
        errorTitle="Unable to load your pilots."
        loading={<TableSkeleton rows={4} columns={4} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: 'No active pilots.',
          body: 'A pilot starts once a challenge is awarded at gate 3 and the contract is signed. Approved pilots will appear here.',
          action: { label: 'See your applications', to: '/s/applications' },
        }}
      >
        {(payload) => (
          <ul className="flex flex-col gap-4">
            {payload.data.map((r) => {
              const elapsed = Math.min(r.pilot.durationDays, Math.max(0, daysBetween(r.pilot.startedOn)));
              const due = r.milestones.filter((m) =>
                ['not_started', 'in_progress', 'revision_required'].includes(m.status),
              );
              const k = r.kpis[0];
              return (
                <li key={r.pilot.id} className="sheet-flat">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink px-4 py-3">
                    <div className="min-w-0">
                      <p className="type-register text-micro text-ink-soft">{r.pilot.caseId}</p>
                      <Link to={`/s/pilots/${r.pilot.id}`} className="mt-0.5 block text-h3 text-ink underline underline-offset-2">
                        {r.pilot.title}
                      </Link>
                      <p className="mt-0.5 text-micro text-ink-soft">
                        {r.department.shortName} · gate {r.pilot.currentGate} ·{' '}
                        {GATES.find((g) => g.id === r.pilot.currentGate)?.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={r.pilot.status} />
                      <LinkButton size="sm" tone="primary" to={`/s/pilots/${r.pilot.id}`}>
                        Open the workspace
                      </LinkButton>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 md:grid-cols-4">
                    {[
                      {
                        label: 'Elapsed',
                        value: `Day ${elapsed} of ${r.pilot.durationDays}`,
                        detail: `Ends ${day(r.pilot.endsOn)}`,
                      },
                      {
                        label: 'Milestones',
                        value: `${r.milestones.filter((m) => m.status === 'approved' || m.status === 'paid').length} of ${r.milestones.length} accepted`,
                        detail: due.length ? `${due.length} due from you` : 'Nothing due from you',
                      },
                      {
                        label: 'Headline measure',
                        value: k ? `${num(k.current, 1)} ${k.unit}` : '—',
                        detail: k ? `${kpiStatus(k)} · ${percent(achievement(k))}` : 'No measure recorded',
                      },
                      {
                        label: 'Contract value',
                        value: money(r.pilot.budgetPaise),
                        detail: `${money(r.pilot.spentPaise)} accepted so far`,
                      },
                    ].map((cell, i) => (
                      <div key={cell.label} className={['px-4 py-3', i < 3 ? 'border-r border-rule' : ''].join(' ')}>
                        <dt className="text-micro text-ink-soft">{cell.label}</dt>
                        <dd className="mt-1 text-data text-ink tnum">{cell.value}</dd>
                        <dd className="text-micro text-ink-soft">{cell.detail}</dd>
                      </div>
                    ))}
                  </dl>

                  {due.length > 0 ? (
                    <div className="border-t border-l-2 border-l-hold border-t-rule bg-hold-wash px-4 py-3">
                      <p className="text-label text-ink">Due from you</p>
                      <ul className="mt-1">
                        {due.map((m) => (
                          <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-3 py-1">
                            <span className="text-body text-ink">
                              Milestone {m.index} — {m.name}
                            </span>
                            <span className="text-micro text-ink-soft tnum">
                              due {day(m.dueOn)} · {money(m.paymentPaise)}
                              {m.status === 'revision_required' ? (
                                <span className="ml-2">
                                  <Badge tone="seal">Returned for revision</Badge>
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
