import { useState } from 'react';
import { day, dayTime, durationWords } from '@/lib/format';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { Modal } from '@/components/ui/Overlay';
import { readClock } from '@/lib/sla';
import type { AuditEvent, ChangeRequest, Incident, Risk, User } from '@/types/models';
import { money } from '@/lib/format';

function severityTone(score: number): 'verify' | 'hold' | 'seal' {
  if (score >= 15) return 'seal';
  if (score >= 8) return 'hold';
  return 'verify';
}

export function RiskRegister({ risks, users }: { risks: Risk[]; users: User[] }) {
  if (risks.length === 0) {
    return <p className="text-body text-ink-soft">No risks recorded. A pilot with no risks usually means none were looked for.</p>;
  }
  return (
    <LedgerTable
      caption="Risk register"
      exportName="prayog-risk-register"
      rows={risks}
      rowKey={(r) => r.id}
      rowTone={(r) => (r.status === 'closed' ? 'neutral' : severityTone(r.probability * r.impact))}
      columns={[
        {
          key: 'title',
          header: 'Risk',
          width: '34%',
          sortValue: (r) => r.title,
          filterValue: (r) => r.title,
          render: (r) => (
            <span>
              <span className="block text-body text-ink">{r.title}</span>
              <span className="block text-micro text-ink-soft">Reviewed {day(r.reviewedOn)}</span>
            </span>
          ),
        },
        {
          key: 'category',
          header: 'Category',
          sortValue: (r) => r.category,
          filterValue: (r) => r.category,
          render: (r) => <span className="capitalize">{r.category}</span>,
        },
        {
          key: 'probability',
          header: 'Probability',
          align: 'right',
          sortValue: (r) => r.probability,
          render: (r) => `${r.probability} of 5`,
        },
        { key: 'impact', header: 'Impact', align: 'right', sortValue: (r) => r.impact, render: (r) => `${r.impact} of 5` },
        {
          key: 'severity',
          header: 'Severity',
          align: 'right',
          sortValue: (r) => r.probability * r.impact,
          render: (r) => (
            <Badge tone={severityTone(r.probability * r.impact)}>
              {r.probability * r.impact} of 25
            </Badge>
          ),
        },
        {
          key: 'mitigation',
          header: 'Mitigation',
          width: '26%',
          filterValue: (r) => r.mitigation,
          render: (r) => <span className="text-body text-ink">{r.mitigation}</span>,
        },
        {
          key: 'owner',
          header: 'Owner',
          filterValue: (r) => users.find((u) => u.id === r.ownerId)?.name ?? '',
          render: (r) => users.find((u) => u.id === r.ownerId)?.name ?? '—',
        },
        { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}

export function IncidentLog({
  incidents,
  users,
  onResolve,
  busy,
}: {
  incidents: Incident[];
  users: User[];
  onResolve?: (input: { id: string; resolution: string }) => Promise<void>;
  busy?: boolean;
}) {
  const [resolving, setResolving] = useState<Incident | null>(null);
  const [resolution, setResolution] = useState('');

  if (incidents.length === 0) {
    return <p className="text-body text-ink-soft">No incidents recorded against this pilot.</p>;
  }

  return (
    <>
      <ul className="sheet-flat">
        {incidents.map((i) => {
          const clock = readClock(i.detectedAt, Math.max(1, Math.round((new Date(i.resolutionDeadline).getTime() - new Date(i.detectedAt).getTime()) / 86_400_000)));
          return (
            <li key={i.id} className="ledger-row px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body text-ink">{i.title}</p>
                  <p className="mt-0.5 text-micro text-ink-soft">
                    Detected {dayTime(i.detectedAt)} · owner {users.find((u) => u.id === i.ownerId)?.name ?? '—'}
                  </p>
                  <p className="mt-0.5 text-micro text-ink-soft">
                    Resolution due {dayTime(i.resolutionDeadline)}
                    {i.status !== 'resolved' ? ` · ${clock.words}` : ''}
                  </p>
                  {i.resolution ? (
                    <p className="mt-2 max-w-doc border-l-2 border-l-verify bg-verify-wash px-2 py-1 text-body text-ink">
                      {i.resolution}
                      <span className="mt-0.5 block text-micro text-ink-soft">Closed {dayTime(i.resolvedAt)}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={i.severity} label={`${i.severity} severity`} />
                  <StatusBadge status={i.status} />
                  {onResolve && i.status !== 'resolved' ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setResolving(i);
                        setResolution('');
                      }}
                    >
                      Record resolution
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={Boolean(resolving)}
        onClose={() => setResolving(null)}
        title="Close an incident"
        description="A high-severity incident left open blocks gate 4."
        footer={
          <>
            <Button onClick={() => setResolving(null)}>Cancel</Button>
            <Button
              tone="primary"
              loading={busy}
              loadingLabel="Recording"
              disabled={resolution.trim().length < 20}
              onClick={async () => {
                if (!resolving) return;
                await onResolve?.({ id: resolving.id, resolution });
                setResolving(null);
              }}
            >
              Close incident
            </Button>
          </>
        }
      >
        <Field label="What was done" required hint="At least 20 characters." aside={`${resolution.trim().length} / 20`}>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          )}
        </Field>
      </Modal>
    </>
  );
}

export function ChangeRequestList({
  items,
  onDecide,
  busy,
}: {
  items: ChangeRequest[];
  onDecide?: (input: { id: string; status: 'approved' | 'refused'; note: string }) => Promise<void>;
  busy?: boolean;
}) {
  const [deciding, setDeciding] = useState<{ change: ChangeRequest; status: 'approved' | 'refused' } | null>(null);
  const [note, setNote] = useState('');

  if (items.length === 0) return <p className="text-body text-ink-soft">No change requests on this pilot.</p>;

  return (
    <>
      <ul className="sheet-flat">
        {items.map((c) => (
          <li key={c.id} className="ledger-row px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 max-w-doc">
                <p className="text-body text-ink">{c.title}</p>
                <p className="mt-1 text-body text-ink-soft">{c.reason}</p>
                <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1">
                  <div>
                    <dt className="text-micro text-ink-soft">Money</dt>
                    <dd className="text-data text-ink tnum">
                      {c.impact.moneyPaise >= 0 ? '+' : ''}
                      {money(c.impact.moneyPaise)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-micro text-ink-soft">Time</dt>
                    <dd className="text-data text-ink">
                      {c.impact.days >= 0 ? '+' : ''}
                      {durationWords(c.impact.days)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-micro text-ink-soft">Scope</dt>
                    <dd className="text-data text-ink">{c.impact.scope}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-micro text-ink-soft">
                  Raised by {c.raisedBy} on {day(c.raisedOn)}
                </p>
                {c.decisionNote ? (
                  <p className="mt-2 border-l-2 border-l-verify bg-verify-wash px-2 py-1 text-body text-ink">
                    {c.decisionNote}
                    <span className="mt-0.5 block text-micro text-ink-soft">
                      {c.decidedBy} · {day(c.decidedOn)}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={c.status} />
                {onDecide && c.status === 'requested' ? (
                  <>
                    <Button size="sm" tone="primary" onClick={() => setDeciding({ change: c, status: 'approved' })}>
                      Approve the change
                    </Button>
                    <Button size="sm" tone="destructive" onClick={() => setDeciding({ change: c, status: 'refused' })}>
                      Refuse the change
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        title={deciding?.status === 'approved' ? 'Approve this change' : 'Refuse this change'}
        description={
          deciding?.status === 'approved'
            ? 'Approving moves both the pilot budget and the end date. Both are recorded.'
            : 'Refusing leaves the agreement as it stands. The reason is sent to the startup.'
        }
        footer={
          <>
            <Button onClick={() => setDeciding(null)}>Cancel</Button>
            <Button
              tone={deciding?.status === 'approved' ? 'primary' : 'destructive'}
              loading={busy}
              loadingLabel="Recording"
              disabled={note.trim().length < 20}
              onClick={async () => {
                if (!deciding) return;
                await onDecide?.({ id: deciding.change.id, status: deciding.status, note });
                setDeciding(null);
                setNote('');
              }}
            >
              {deciding?.status === 'approved' ? 'Approve the change' : 'Refuse the change'}
            </Button>
          </>
        }
      >
        <Field label="Written reason" required hint="At least 20 characters." aside={`${note.trim().length} / 20`}>
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </Modal>
    </>
  );
}

/** The initials an officer signs a note with. */
function initialsOf(name: string): string {
  const parts = name.replace(/^(Dr|Prof).s*/, '').split(/[s.]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

/**
 * The ink an entry was written in. On a noting sheet the colour is not
 * decoration: green means an officer cleared something, red means they refused,
 * amber means they held it for a query, and carbon means it is only a record of
 * what happened.
 */
function inkOf(action: string, summary: string): 'verify' | 'seal' | 'hold' | 'note' {
  // The action names the kind of event ("gate.decision"); the summary carries
  // which way it went ("G1 cleared", "Refused"). Both have to be read, or every
  // gate decision would be filed as an ordinary note.
  const a = `${action} ${summary}`.toLowerCase();
  if (/reject|refus|fail|revoke|withdraw|cancel|deduct|not validated|on hold/.test(a)) return 'seal';
  if (/clear|approv|accept|sign|award|validat|publish|releas|paid|payment made/.test(a)) return 'verify';
  if (/waiv|overrid|extend|defer|return|request|needs review|escalat/.test(a)) return 'hold';
  return 'note';
}

/**
 * The noting sheet.
 *
 * Every entry hangs off the ruled margin, marked in the ink of the act, signed
 * with the officer's initials and dated — the way an observation is written into
 * a government file. This is the same device the gate decision and the evidence
 * dock use, so a reader learns it once.
 */
export function AuditTrail({ items, dense }: { items: AuditEvent[]; dense?: boolean }) {
  if (items.length === 0) return <p className="text-body text-ink-soft">Nothing recorded yet.</p>;
  return (
    <ol className="sheet-flat noting py-3 pr-4">
      {items.map((a) => (
        <li
          key={a.id}
          data-ink={inkOf(a.action, a.summary)}
          className={['noting-entry border-b border-rule last:border-b-0', dense ? 'py-2' : 'py-3'].join(' ')}
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <span aria-hidden className="monogram">
              {initialsOf(a.actorName)}
            </span>
            <p className="text-micro text-ink-soft tnum">{dayTime(a.at)}</p>
            <p className="text-micro text-ink-soft">
              {a.actorName} · {a.actorRole.replace(/_/g, ' ')}
            </p>
          </div>
          <p className="mt-1 max-w-doc text-body text-ink">{a.summary}</p>
          {a.before || a.after ? (
            <p className="mt-1 text-micro text-ink-soft">
              {a.before ? <span className="line-through">{a.before}</span> : null}
              {a.before && a.after ? ' → ' : null}
              {a.after}
            </p>
          ) : null}
          <p className="mt-1 text-micro text-ink-soft">
            {a.action} · <span className="type-register">{a.caseId}</span> · checksum{' '}
            <span className="type-register">{a.hash.slice(0, 12)}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
