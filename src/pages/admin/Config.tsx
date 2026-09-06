import { useState } from 'react';
import { useConfig, useUpdateConfig } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Field, Input, DateInput, Textarea } from '@/components/ui/Field';
import { day } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { ConfigParameter } from '@/config/types';
import { platformNowIso } from '@/config/clock';

const GROUP_LABEL: Record<string, string> = {
  sla: 'Service levels',
  payment: 'Payment',
  eligibility: 'Eligibility',
  evaluation: 'Evaluation',
  gate: 'Gates',
  pilot: 'Pilots',
  data: 'Data and security',
  procurement: 'Procurement',
  account: 'Accounts and sign-up',
};

export default function AdminConfig() {
  const query = useConfig();
  const update = useUpdateConfig();
  const pushToast = useUi((s) => s.pushToast);

  const [editing, setEditing] = useState<ConfigParameter | null>(null);
  const [value, setValue] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [changeNote, setChangeNote] = useState('');

  return (
    <div>
      <PageHeader
        title="Configuration ledger"
        lead="Every threshold, timeline and statutory figure this product enforces. Nothing here is written into a screen — change a value and the whole system changes with it."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <div className="mb-6">
        <InlineNote tone="neutral" title="Why this page exists">
          A procurement system that hardcodes a statutory figure is obsolete the day the statute changes. This ledger is
          the proof that PRAYOG does not: every number a gate, a rule, a rubric or a payment clock relies on is a row
          here, with its citation, its effective date and what it used to be.
        </InlineNote>
      </div>

      <QueryState
        query={query}
        errorTitle="Unable to load the configuration."
        loading={<TableSkeleton rows={10} columns={6} />}
      >
        {(payload) => (
          <>
            <LedgerTable
              caption="Configured parameters"
              pageSize={12}
              exportName="prayog-configuration"
              rows={payload.data.parameters}
              rowKey={(p) => p.key}
              rowTone={(p) => (p.changedBy === 'Statute' ? 'neutral' : p.previousValue !== undefined ? 'hold' : undefined)}
              onRowOpen={(p) => {
                setEditing(p);
                setValue(String(p.value));
                setEffectiveFrom(platformNowIso().slice(0, 10));
                setChangeNote('');
              }}
              savedViews={[
                { id: 'sla', label: 'Service levels', hiddenColumns: [], filters: { group: 'sla' } },
                { id: 'payment', label: 'Payment', hiddenColumns: [], filters: { group: 'payment' } },
                { id: 'statutory', label: 'Statutory only', hiddenColumns: [], filters: { changedBy: 'Statute' } },
                { id: 'changed', label: 'Recently changed', hiddenColumns: [], sortKey: 'effective', sortDirection: 'desc' },
              ]}
              columns={[
                {
                  key: 'parameter',
                  header: 'Parameter',
                  width: '28%',
                  sortValue: (p) => p.label,
                  filterValue: (p) => `${p.label} ${p.key}`,
                  render: (p) => (
                    <span>
                      <span className="block text-body text-ink">{p.label}</span>
                      <span className="block text-micro text-ink-soft tnum">{p.key}</span>
                      <span className="mt-1 block max-w-[52ch] text-micro text-ink-soft">{p.note}</span>
                    </span>
                  ),
                },
                {
                  key: 'group',
                  header: 'Group',
                  sortValue: (p) => p.group,
                  filterValue: (p) => p.group,
                  render: (p) => <Badge tone="neutral">{GROUP_LABEL[p.group] ?? p.group}</Badge>,
                },
                {
                  key: 'value',
                  header: 'Current value',
                  align: 'right',
                  sortValue: (p) => String(p.value),
                  filterValue: (p) => String(p.value),
                  render: (p) => (
                    <span>
                      <span className="block text-data text-ink tnum">{String(p.value)}</span>
                      {p.unit ? <span className="block text-micro text-ink-soft">{p.unit}</span> : null}
                    </span>
                  ),
                },
                {
                  key: 'previous',
                  header: 'Previous value',
                  align: 'right',
                  sortValue: (p) => String(p.previousValue ?? ''),
                  render: (p) =>
                    p.previousValue !== undefined ? (
                      <span className="tnum text-ink-soft line-through">{String(p.previousValue)}</span>
                    ) : (
                      <span className="text-ink-soft">Never changed</span>
                    ),
                },
                {
                  key: 'effective',
                  header: 'Effective from',
                  align: 'right',
                  sortValue: (p) => p.effectiveFrom,
                  filterValue: (p) => day(p.effectiveFrom),
                  render: (p) => day(p.effectiveFrom),
                },
                {
                  key: 'changedBy',
                  header: 'Changed by',
                  sortValue: (p) => p.changedBy,
                  filterValue: (p) => p.changedBy,
                  render: (p) => (
                    <span>
                      <span className="block text-body text-ink">{p.changedBy}</span>
                      {p.changedBy === 'Statute' ? (
                        <span className="mt-0.5 block">
                          <Badge tone="hold">Not ours to change</Badge>
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: 'citation',
                  header: 'Citation',
                  width: '18%',
                  filterValue: (p) => p.citation,
                  render: (p) => {
                    const c = payload.data.citations.find((x) => x.id === p.citation);
                    return (
                      <span>
                        <span className="block text-body text-ink">{c?.short ?? p.citation}</span>
                        {c ? (
                          <span className="mt-0.5 block max-w-[44ch] text-micro text-ink-soft">{c.full}</span>
                        ) : null}
                      </span>
                    );
                  },
                },
              ]}
              totalRow={
                <span className="flex flex-wrap items-baseline justify-between gap-4">
                  <span className="text-body text-ink">
                    {payload.data.parameters.length} parameters ·{' '}
                    {payload.data.parameters.filter((p) => p.changedBy === 'Statute').length} statutory
                  </span>
                  <span className="text-micro text-ink-soft">
                    Open a row to change it. Every change carries a note and an effective date.
                  </span>
                </span>
              }
            />

            <section className="mt-8">
              <h2 className="mb-3 text-h2 text-ink">Citations in force</h2>
              <ul className="sheet-flat">
                {payload.data.citations.map((c) => (
                  <li key={c.id} className="ledger-row px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="text-body text-ink">{c.short}</span>
                      <span className="text-micro text-ink-soft tnum">
                        {c.id} · effective {day(c.effectiveFrom)}
                      </span>
                    </div>
                    <p className="mt-1 max-w-doc text-micro text-ink-soft">{c.full}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </QueryState>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Change ${editing.label}` : ''}
        description={editing?.key}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              tone="primary"
              loading={update.isPending}
              loadingLabel="Saving"
              unavailableReason={
                value === ''
                  ? 'Enter the new value first.'
                  : !effectiveFrom
                    ? 'Set the date this takes effect.'
                    : changeNote.trim().length < 15
                      ? `Write ${15 - changeNote.trim().length} more characters explaining the change.`
                      : undefined
              }
              onClick={() =>
                editing &&
                update.mutate(
                  {
                    key: editing.key,
                    value: Number.isNaN(Number(value)) ? value : Number(value),
                    effectiveFrom,
                    changeNote,
                  },
                  {
                    onSuccess: (res) => {
                      setEditing(null);
                      pushToast('verify', res.message ?? 'Parameter updated.');
                    },
                    onError: (err) => {
                      const api = err instanceof PrayogApiError ? err : null;
                      pushToast('seal', api?.message ?? 'The change was not saved.', api?.details.join(' '));
                    },
                  },
                )
              }
            >
              Save the new value
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="flex flex-col gap-6">
            {editing.changedBy === 'Statute' ? (
              <InlineNote tone="seal" title="This value comes from a statute">
                Changing it here changes what the product enforces, but not what the law says. Do this only to reflect a
                notification that has already been issued, and record the notification in the change note.
              </InlineNote>
            ) : null}

            <InlineNote tone="hold" title="What a change affects">
              Every case decided after the effective date uses the new value. Cases already decided keep the value that
              was in force when they were decided — the audit trail records which.
            </InlineNote>

            <Field
              label="New value"
              required
              hint={editing.unit ? `Measured in ${editing.unit}.` : undefined}
              aside={`current ${String(editing.value)}`}
            >
              {({ id }) => <Input id={id} value={value} onChange={(e) => setValue(e.target.value)} />}
            </Field>

            <Field label="Effective from" required hint="Cases decided before this date are unaffected.">
              {({ id }) => <DateInput id={id} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />}
            </Field>

            <Field
              label="Change note"
              required
              hint="At least 15 characters. Say why, and cite the order or decision behind it."
              aside={`${changeNote.trim().length} / 15`}
            >
              {({ id }) => <Textarea id={id} rows={4} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />}
            </Field>

            <p className="text-micro text-ink-soft">
              The previous value, {String(editing.value)}, stays on the record and is shown in this ledger.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
