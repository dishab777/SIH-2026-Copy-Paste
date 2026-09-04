import { useNavigate } from 'react-router-dom';
import { GATES, gateSlaDays } from '@/config/gates';
import { usePilots } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { SlaClock } from '@/components/domain/SlaClock';
import { achievement } from '@/components/charts/MeasurementChart';
import { day, money, num, percent, countOf } from '@/lib/format';

export default function ValidatorQueue() {
  const query = usePilots();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Validation queue"
        lead="Pilots waiting on an independent view, and those already reported on. You re-derive the claim from raw departmental records rather than accepting a supplier figure."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <div className="mb-6">
        <InlineNote tone="neutral" title="What independence means here">
          You are not employed by the department that ran the pilot, and your report is published whether or not the
          pilot worked. A report that says the claim could not be reproduced is as much a result as one that says it
          could.
        </InlineNote>
      </div>

      <QueryState
        query={query}
        errorTitle="Unable to load the validation queue."
        loading={<TableSkeleton rows={5} columns={5} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: 'Nothing is assigned to you.',
          body: 'A pilot reaches you once its measurement window has closed and the department requests validation at gate 5.',
          action: { label: 'See published results', to: '/results' },
        }}
      >
        {(payload) => {
          const awaiting = payload.data.filter((r) => r.pilot.status === 'awaiting_validation');

          return (
            <LedgerTable
              caption="Pilots for independent validation"
              exportName="prayog-validation-queue"
              rows={payload.data}
              rowKey={(r) => r.pilot.id}
              rowTone={(r) =>
                r.pilot.status === 'awaiting_validation'
                  ? 'hold'
                  : r.pilot.status === 'not_validated'
                    ? 'seal'
                    : r.pilot.status === 'validated'
                      ? 'verify'
                      : undefined
              }
              onRowOpen={(r) => navigate(`/v/validate/${r.pilot.id}`)}
              savedViews={[
                { id: 'awaiting', label: 'Awaiting validation first', hiddenColumns: [], sortKey: 'status', sortDirection: 'asc' },
              ]}
              toolbar={
                awaiting.length > 0 ? (
                  <Badge tone="hold">{countOf(awaiting.length, 'pilot is', 'pilots are')} awaiting your report</Badge>
                ) : undefined
              }
              columns={[
                {
                  key: 'case',
                  header: 'Case',
                  width: '26%',
                  sortValue: (r) => r.pilot.caseId,
                  filterValue: (r) => `${r.pilot.caseId} ${r.pilot.title}`,
                  render: (r) => (
                    <span>
                      <span className="type-register block text-micro text-ink-soft">{r.pilot.caseId}</span>
                      <span className="block text-body text-ink">{r.pilot.title}</span>
                      <span className="block text-micro text-ink-soft">
                        {r.department.shortName} · {r.startup.tradeName}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortValue: (r) =>
                    r.pilot.status === 'awaiting_validation' ? 0 : r.pilot.status === 'validated' ? 1 : 2,
                  filterValue: (r) => r.pilot.status,
                  render: (r) => <StatusBadge status={r.pilot.status} />,
                },
                {
                  key: 'claim',
                  header: 'The claim to test',
                  width: '24%',
                  filterValue: (r) => r.kpis[0]?.name ?? '',
                  render: (r) => {
                    const k = r.kpis[0];
                    if (!k) return <span className="text-ink-soft">No measure recorded</span>;
                    return (
                      <span>
                        <span className="block text-body text-ink">{k.name}</span>
                        <span className="block text-micro text-ink-soft tnum">
                          {num(k.baseline, 1)} → {num(k.current, 1)} {k.unit}, against a target of {num(k.target, 1)}
                        </span>
                        <span className="mt-1 block text-micro text-ink-soft tnum">
                          {percent(achievement(k))} of target · {countOf(k.series.length, 'reading')}
                        </span>
                      </span>
                    );
                  },
                },
                {
                  key: 'evidence',
                  header: 'Records available',
                  align: 'right',
                  sortValue: (r) => r.kpis.reduce((s, k) => s + k.series.length, 0),
                  render: (r) => (
                    <span>
                      <span className="block tnum">
                        {r.kpis.reduce((s, k) => s + k.series.length, 0)} readings
                      </span>
                      <span className="block text-micro text-ink-soft tnum">
                        {countOf(r.milestones.length, 'milestone')}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'gate',
                  header: 'Gate clock',
                  align: 'right',
                  sortValue: (r) => r.pilot.gateEnteredOn,
                  render: (r) =>
                    r.pilot.status === 'awaiting_validation' ? (
                      <span>
                        <SlaClock startedOn={r.pilot.gateEnteredOn} limitDays={gateSlaDays('G5')} showDetail />
                        <span className="mt-0.5 block text-micro text-ink-soft">
                          {GATES.find((g) => g.id === r.pilot.currentGate)?.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-soft">{day(r.pilot.endsOn)}</span>
                    ),
                },
                {
                  key: 'budget',
                  header: 'Pilot budget',
                  unit: '₹',
                  align: 'right',
                  optional: true,
                  sortValue: (r) => r.pilot.budgetPaise,
                  render: (r) => money(r.pilot.budgetPaise),
                },
              ]}
              totalRow={
                <span className="flex flex-wrap items-baseline justify-between gap-4">
                  <span className="text-body text-ink">
                    {countOf(payload.data.length, 'pilot')} · {awaiting.length} awaiting a report
                  </span>
                  <span className="text-micro text-ink-soft">
                    Every outcome needs a finding against every success criterion before it can be signed.
                  </span>
                </span>
              }
            />
          );
        }}
      </QueryState>
    </div>
  );
}
