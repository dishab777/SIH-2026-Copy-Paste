import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudit } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { Field, Select, DateInput, Input } from '@/components/ui/Field';
import { countOf, dayTime } from '@/lib/format';

export default function AdminAudit() {
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [caseId, setCaseId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useAudit({
    actor: actor || undefined,
    action: action || undefined,
    entityType: entityType || undefined,
    entityId: caseId || undefined,
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  });

  return (
    <div>
      <PageHeader
        title="Programme audit trail"
        lead="Every recorded action across the programme, with who took it, what changed and a checksum over the entry. Read-only."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
        aside={<Badge tone="neutral">Read-only</Badge>}
      />

      <div className="mb-6">
        <InlineNote tone="neutral" title="Why the trail is programme-wide">
          Most questions asked after the fact are not about one case. They are about one person, one action, or one
          week. Filter on those and follow the thread; open a case to see it in order.
        </InlineNote>
      </div>

      <QueryState
        query={query}
        errorTitle="Unable to load the audit trail."
        loading={<TableSkeleton rows={10} columns={6} />}
        isEmpty={(d) => d.data.items.length === 0}
        empty={{
          title: 'No entries match these filters.',
          body: 'Widen the date range, or clear the actor and action filters.',
        }}
      >
        {(payload) => (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Field label="Actor">
                {({ id }) => (
                  <Select
                    id={id}
                    placeholder="Anyone"
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    options={payload.data.actors.map((a) => ({ value: a, label: a }))}
                  />
                )}
              </Field>
              <Field label="Action">
                {({ id }) => (
                  <Select
                    id={id}
                    placeholder="Any action"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    options={payload.data.actions.map((a) => ({ value: a, label: a.replace(/[._]/g, ' ') }))}
                  />
                )}
              </Field>
              <Field label="Record type">
                {({ id }) => (
                  <Select
                    id={id}
                    placeholder="Any type"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    options={[
                      { value: 'challenge', label: 'Challenge' },
                      { value: 'application', label: 'Application' },
                      { value: 'pilot', label: 'Pilot' },
                    ]}
                  />
                )}
              </Field>
              <Field label="Case" hint="A case id such as CH-2026-0143.">
                {({ id }) => <Input id={id} value={caseId} onChange={(e) => setCaseId(e.target.value)} />}
              </Field>
              <Field label="From">{({ id }) => <DateInput id={id} value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
              <Field label="To">{({ id }) => <DateInput id={id} value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
            </div>

            <LedgerTable
              caption="Programme audit trail"
              exportName="prayog-audit-trail"
              rows={payload.data.items}
              rowKey={(a) => a.id}
              rowTone={(a) =>
                a.action.includes('waiver') || a.action.includes('overridden')
                  ? 'hold'
                  : a.action.includes('gate.decision')
                    ? 'verify'
                    : undefined
              }
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
                  width: '34%',
                  filterValue: (a) => a.summary,
                  render: (a) => <span className="text-body text-ink">{a.summary}</span>,
                },
                {
                  key: 'case',
                  header: 'Case',
                  sortValue: (a) => a.caseId,
                  filterValue: (a) => a.caseId,
                  render: (a) => (
                    <Link
                      to={`/v/audit/${a.entityType}/${a.entityId}`}
                      className="tnum text-body text-ink underline underline-offset-2"
                    >
                      {a.caseId}
                    </Link>
                  ),
                },
                {
                  key: 'change',
                  header: 'Before and after',
                  width: '18%',
                  optional: true,
                  filterValue: (a) => `${a.before ?? ''} ${a.after ?? ''}`,
                  render: (a) =>
                    a.before || a.after ? (
                      <span className="text-micro text-ink">
                        {a.before ? <span className="block text-ink-soft line-through">{a.before}</span> : null}
                        {a.after ? <span className="block">{a.after}</span> : null}
                      </span>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    ),
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
                  <span className="text-body text-ink">{countOf(payload.data.items.length, 'entry', 'entries')} shown</span>
                  <span className="text-micro text-ink-soft">
                    Entries are append-only. Nothing on this page, or anywhere in the product, edits one.
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
