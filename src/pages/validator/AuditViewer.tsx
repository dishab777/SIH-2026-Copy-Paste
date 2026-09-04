import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAudit } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Nav';
import { Field, Select, DateInput } from '@/components/ui/Field';
import { countOf, dayTime } from '@/lib/format';

/**
 * Strictly read-only. There is no action button anywhere on this screen, by
 * design — an audit view that can change the record is not an audit view.
 */
export default function AuditViewer() {
  const { entityType, id } = useParams();
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useAudit({
    entityId: id,
    entityType,
    actor: actor || undefined,
    action: action || undefined,
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  });

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb
          items={[
            { label: 'Validation queue', to: '/v' },
            { label: `${entityType ?? 'record'} ${id ?? ''}` },
            { label: 'Audit' },
          ]}
        />
      </div>

      <PageHeader
        title="Audit trail"
        lead="Every action taken on this record, in order, with who took it, what changed and a checksum over the entry. Nothing on this page can be edited."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
        aside={<Badge tone="neutral">Read-only</Badge>}
      />

      <div className="mb-6">
        <InlineNote tone="neutral" title="What this is for">
          A decision is defensible when someone who was not there can reconstruct it. Filter by actor, action or date to
          follow one thread through the case.
        </InlineNote>
      </div>

      <QueryState
        query={query}
        errorTitle="Unable to load the audit trail."
        loading={<TableSkeleton rows={8} columns={5} />}
        isEmpty={(d) => d.data.items.length === 0}
        empty={{
          title: 'Nothing has been recorded against this record.',
          body: 'Entries appear as actions are taken. An empty trail on an active case is itself worth asking about.',
        }}
      >
        {(payload) => (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Actor">
                {({ id: fid }) => (
                  <Select
                    id={fid}
                    placeholder="Anyone"
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    options={payload.data.actors.map((a) => ({ value: a, label: a }))}
                  />
                )}
              </Field>
              <Field label="Action">
                {({ id: fid }) => (
                  <Select
                    id={fid}
                    placeholder="Any action"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    options={payload.data.actions.map((a) => ({ value: a, label: a.replace(/[._]/g, ' ') }))}
                  />
                )}
              </Field>
              <Field label="From">{({ id: fid }) => <DateInput id={fid} value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
              <Field label="To">{({ id: fid }) => <DateInput id={fid} value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
            </div>

            <LedgerTable
              caption={`Audit trail for ${entityType} ${id}`}
              exportName={`prayog-audit-${id}`}
              rows={payload.data.items}
              rowKey={(a) => a.id}
              columns={[
                {
                  key: 'at',
                  header: 'When',
                  sortValue: (a) => a.at,
                  filterValue: (a) => dayTime(a.at),
                  render: (a) => <span className="tnum">{dayTime(a.at)}</span>,
                },
                {
                  key: 'actor',
                  header: 'Actor',
                  sortValue: (a) => a.actorName,
                  filterValue: (a) => a.actorName,
                  render: (a) => (
                    <span>
                      <span className="block text-body text-ink">{a.actorName}</span>
                      <span className="block text-micro text-ink-soft">{a.actorRole.replace(/_/g, ' ')}</span>
                    </span>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  sortValue: (a) => a.action,
                  filterValue: (a) => a.action,
                  render: (a) => <span className="tnum text-body text-ink">{a.action}</span>,
                },
                {
                  key: 'summary',
                  header: 'What happened',
                  width: '32%',
                  filterValue: (a) => a.summary,
                  render: (a) => <span className="text-body text-ink">{a.summary}</span>,
                },
                {
                  key: 'change',
                  header: 'Before and after',
                  width: '22%',
                  filterValue: (a) => `${a.before ?? ''} ${a.after ?? ''}`,
                  render: (a) =>
                    a.before || a.after ? (
                      <span className="text-micro text-ink">
                        {a.before ? <span className="block line-through text-ink-soft">{a.before}</span> : null}
                        {a.after ? <span className="block">{a.after}</span> : null}
                      </span>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    ),
                },
                {
                  key: 'case',
                  header: 'Case',
                  optional: true,
                  filterValue: (a) => a.caseId,
                  render: (a) => <span className="tnum">{a.caseId}</span>,
                },
                {
                  key: 'hash',
                  header: 'Checksum',
                  align: 'right',
                  optional: true,
                  filterValue: (a) => a.hash,
                  render: (a) => <span className="type-register text-micro text-ink-soft">{a.hash.slice(0, 12)}</span>,
                },
              ]}
              totalRow={
                <span className="flex flex-wrap items-baseline justify-between gap-4">
                  <span className="text-body text-ink">{countOf(payload.data.items.length, 'entry', 'entries')}</span>
                  <span className="text-micro text-ink-soft">
                    Read-only. No action on this page changes the record.
                  </span>
                </span>
              }
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
