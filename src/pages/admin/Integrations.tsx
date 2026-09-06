import { useIntegrations, useSyncIntegration } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { dayTime, num } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function AdminIntegrations() {
  const query = useIntegrations();
  const sync = useSyncIntegration();
  const pushToast = useUi((s) => s.pushToast);

  return (
    <div>
      <PageHeader
        title="Integration health"
        lead="Which external services this programme depends on, and whether they are answering."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
        aside={<Badge tone="hold">All providers are mocks in this build</Badge>}
      />

      <div className="mb-6">
        <InlineNote tone="hold" title="Nothing here talks to a live government system">
          Every provider on this page is a mock behind the same interface a real one would use. DPIIT recognition, GeM,
          PFMS, GSTN, eSign and government single sign-on are all represented, not connected. A demonstration that
          claimed otherwise would be worse than useless — you would trust a check that never happened.
        </InlineNote>
      </div>

      <QueryState
        query={query}
        errorTitle="Unable to load integration health."
        loading={<TableSkeleton rows={8} columns={6} />}
      >
        {(payload) => (
          <LedgerTable
            caption="Integration health"
            pageSize={12}
            exportName="prayog-integrations"
            rows={payload.data}
            rowKey={(i) => i.id}
            rowTone={(i) =>
              i.status === 'mock_down' ? 'seal' : i.status === 'mock_degraded' ? 'hold' : i.status === 'mock_healthy' ? 'verify' : 'neutral'
            }
            columns={[
              {
                key: 'integration',
                header: 'Integration',
                width: '26%',
                sortValue: (i) => i.name,
                filterValue: (i) => `${i.name} ${i.purpose}`,
                render: (i) => (
                  <span>
                    <span className="block text-body text-ink">{i.name}</span>
                    <span className="mt-0.5 block max-w-[52ch] text-micro text-ink-soft">{i.purpose}</span>
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortValue: (i) => i.status,
                filterValue: (i) => i.status,
                render: (i) => (
                  <StatusBadge
                    status={i.status}
                    label={
                      i.status === 'mock_healthy'
                        ? 'Mock responding'
                        : i.status === 'mock_degraded'
                          ? 'Mock degraded'
                          : i.status === 'mock_down'
                            ? 'Mock not responding'
                            : 'Not configured'
                    }
                  />
                ),
              },
              {
                key: 'lastSync',
                header: 'Last successful sync',
                align: 'right',
                sortValue: (i) => i.lastSyncAt ?? '',
                render: (i) => (i.lastSyncAt ? dayTime(i.lastSyncAt) : <span className="text-ink-soft">Never</span>),
              },
              {
                key: 'failures',
                header: 'Failures',
                align: 'right',
                sortValue: (i) => i.failureCount,
                render: (i) => (
                  <span className={i.failureCount > 0 ? 'text-seal tnum' : 'tnum'}>{num(i.failureCount)}</span>
                ),
              },
              {
                key: 'pending',
                header: 'Pending verification',
                align: 'right',
                sortValue: (i) => i.pendingVerification,
                render: (i) => <span className="tnum">{num(i.pendingVerification)}</span>,
              },
              {
                key: 'note',
                header: 'Note',
                width: '22%',
                filterValue: (i) => i.note,
                render: (i) => <span className="text-micro text-ink-soft">{i.note}</span>,
              },
              {
                key: 'action',
                header: 'Action',
                render: (i) => (
                  <Button
                    size="sm"
                    loading={sync.isPending && sync.variables === i.id}
                    loadingLabel="Syncing"
                    onClick={() =>
                      sync.mutate(i.id, {
                        onSuccess: (res) => pushToast('verify', res.message ?? 'Synced.'),
                        onError: (err) => {
                          const api = err instanceof PrayogApiError ? err : null;
                          pushToast('seal', api?.message ?? 'The sync failed.', api?.details.join(' '));
                        },
                      })
                    }
                  >
                    Sync now
                  </Button>
                ),
              },
            ]}
            totalRow={
              <span className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="text-body text-ink">
                  {payload.data.filter((i) => i.status === 'mock_healthy').length} responding ·{' '}
                  {payload.data.filter((i) => i.status === 'mock_degraded').length} degraded ·{' '}
                  {payload.data.filter((i) => i.status === 'mock_down').length} down
                </span>
                <span className="text-micro text-ink-soft">
                  {num(payload.data.reduce((s, i) => s + i.pendingVerification, 0))} verifications waiting across all
                  providers.
                </span>
              </span>
            }
          />
        )}
      </QueryState>

      <div className="mt-8">
        <InlineNote tone="neutral" title="What a real deployment would change">
          The provider interfaces stay the same. Each mock is swapped for a client that holds credentials and speaks to
          the actual service, and this page starts reporting real sync times and real failure counts. Nothing in the rest
          of the product needs to change, because nothing else talks to these services directly.
        </InlineNote>
      </div>
    </div>
  );
}
