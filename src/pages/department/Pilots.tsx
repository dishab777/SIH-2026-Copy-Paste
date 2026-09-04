import { useNavigate } from 'react-router-dom';
import { GATES, gateSlaDays } from '@/config/gates';
import { usePilots } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { SlaClock } from '@/components/domain/SlaClock';
import { achievement, kpiStatus } from '@/components/charts/MeasurementChart';
import { countOf, day, daysBetween, money, num, percent } from '@/lib/format';

export default function DepartmentPilots() {
  const query = usePilots();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Pilots"
        lead="Every pilot this department is steering, with the milestone that is waiting and the measure that matters."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState
        query={query}
        errorTitle="Unable to load pilots."
        loading={<TableSkeleton rows={6} columns={6} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: 'No active pilots.',
          body: 'Approved pilots appear here as soon as gate 3 clears and a contract is signed.',
          action: { label: 'Open the challenge pipeline', to: '/d/challenges' },
        }}
      >
        {(payload) => (
          <LedgerTable
            caption="Pilots owned by this department"
            exportName="prayog-pilots"
            rows={payload.data}
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
              { id: 'waiting', label: 'Waiting on the department', hiddenColumns: [], sortKey: 'gate', sortDirection: 'asc' },
              { id: 'money', label: 'By money committed', hiddenColumns: ['kpi'], sortKey: 'budget', sortDirection: 'desc' },
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
                sortValue: (r) => r.milestones.filter((m) => m.status === 'submitted' || m.status === 'under_review').length,
                render: (r) => {
                  const waiting = r.milestones.filter((m) => m.status === 'submitted' || m.status === 'under_review').length;
                  const done = r.milestones.filter((m) => m.status === 'approved' || m.status === 'paid').length;
                  return (
                    <span>
                      <span className="block tnum">
                        {done} of {r.milestones.length} accepted
                      </span>
                      {waiting > 0 ? (
                        <span className="mt-0.5 block text-micro text-ink">
                          <Badge tone="hold">{waiting} awaiting your finding</Badge>
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
                        <Badge tone={achievement(k) >= 100 ? 'verify' : achievement(k) >= 70 ? 'hold' : 'seal'}>
                          {kpiStatus(k)} · {percent(achievement(k))}
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
                render: (r) => <SlaClock startedOn={r.pilot.gateEnteredOn} limitDays={gateSlaDays(r.pilot.currentGate)} />,
              },
            ]}
            totalRow={
              <span className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="text-body text-ink">{countOf(payload.data.length, 'pilot')}</span>
                <span className="text-data text-ink tnum">
                  {money(payload.data.reduce((s, r) => s + r.pilot.spentPaise, 0))} released of{' '}
                  {money(payload.data.reduce((s, r) => s + r.pilot.budgetPaise, 0))} committed
                </span>
              </span>
            }
          />
        )}
      </QueryState>
    </div>
  );
}
