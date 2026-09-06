import { useState, type ReactNode } from 'react';
import { useAuditPack, useChallenges, useReport } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Nav';
import { SectionRail } from '@/components/patterns/SectionRail';
import { Field, Select } from '@/components/ui/Field';
import { AuditTrail } from '@/components/domain/RiskIncident';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { countOf, day, dayTime, money, shortHash } from '@/lib/format';

const REPORTS = [
  { value: 'programme', label: 'Programme report — every challenge, its gate and its money' },
  { value: 'pilot', label: 'Pilot report — status, gate, budget and milestones accepted' },
  { value: 'payment', label: 'Payment report — claims, deductions and ageing' },
  { value: 'outcome', label: 'Outcome report — baseline, target, result and validation' },
];

/** A cell may be a money figure, a date, a status or plain text. Render it as what it is. */
function Cell({ column, value }: { column: string; value: string | number }) {
  const c = column.toLowerCase();
  if (typeof value === 'number' && (c.includes('budget') || c.includes('amount') || c.includes('net') || c.includes('deduction') || c.includes('spent'))) {
    return <span className="tnum">{money(value)}</span>;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return <span className="tnum">{day(value)}</span>;
  }
  if (typeof value === 'string' && (c === 'status' || c === 'outcome' || c === 'gate')) {
    return c === 'gate' ? <span className="tnum">{value}</span> : <StatusBadge status={value} />;
  }
  return <span className={typeof value === 'number' ? 'tnum' : ''}>{value}</span>;
}

/**
 * One part of the pack. Empty is a finding in an audit pack — "no eligibility
 * override was recorded" is a sentence somebody may need years later — so a
 * part with nothing in it says so rather than vanishing from the rail.
 */
function Part({
  title,
  empty,
  emptyNote,
  children,
}: {
  title: string;
  empty: boolean;
  emptyNote: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-h3 text-ink">{title}</h3>
      {empty ? (
        <p className="sheet-flat px-4 py-3 text-body text-ink-soft">{emptyNote}</p>
      ) : (
        children
      )}
    </section>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('standard');
  const [kind, setKind] = useState('programme');
  const [caseId, setCaseId] = useState('CH-2026-0143');
  /* Which part of the pack is open. The whole pack is what you export; one
     part is what you read. */
  const [part, setPart] = useState('case');

  const report = useReport(kind);
  const pack = useAuditPack(tab === 'audit' ? caseId : undefined);
  const challenges = useChallenges({ scope: 'department' });

  return (
    <div>
      <PageHeader
        title="Reports"
        lead="Standard reports for the programme, and a chronological audit pack that reconstructs a single case from first draft to final decision."
      />

      <Tabs
        items={[
          { id: 'standard', label: 'Standard reports' },
          { id: 'audit', label: 'Audit pack' },
        ]}
        value={tab}
        onChange={setTab}
      >
        {tab === 'standard' ? (
          <div className="flex flex-col gap-6">
            <div className="max-w-[520px]">
              <Field label="Report" hint="Every report exports as CSV with the columns shown.">
                {({ id }) => (
                  <Select id={id} value={kind} onChange={(e) => setKind(e.target.value)} options={REPORTS} />
                )}
              </Field>
            </div>

            <QueryState
              query={report}
              errorTitle="Unable to build this report."
              loading={<TableSkeleton rows={8} columns={6} />}
              isEmpty={(d) => d.data.rows.length === 0}
              empty={{
                title: 'This report has no rows yet.',
                body: 'Reports are built from live case records. Nothing has reached this stage in your department.',
              }}
            >
              {(payload) => (
                <LedgerTable
                  title={REPORTS.find((r) => r.value === kind)?.label ?? kind}
                  caption={REPORTS.find((r) => r.value === kind)?.label ?? kind}
                  exportName={`prayog-${kind}-report`}
                  rows={payload.data.rows.map((row, i) => ({ id: String(i), cells: row }))}
                  rowKey={(r) => r.id}
                  columns={payload.data.columns.map((col, ci) => ({
                    key: col,
                    header: col,
                    align: ['Budget', 'Amount', 'Net', 'Deduction', 'Spent', 'Applicants', 'Days elapsed', 'Baseline', 'Target', 'Result', 'Milestones accepted'].includes(col)
                      ? ('right' as const)
                      : ('left' as const),
                    sortValue: (r: { cells: (string | number)[] }) => r.cells[ci] ?? '',
                    filterValue: (r: { cells: (string | number)[] }) => String(r.cells[ci] ?? ''),
                    render: (r: { cells: (string | number)[] }) => <Cell column={col} value={r.cells[ci] ?? ''} />,
                  }))}
                />
              )}
            </QueryState>
          </div>
        ) : null}

        {tab === 'audit' ? (
          <div className="flex flex-col gap-6">
            <div className="max-w-[520px]">
              <Field label="Case" hint="Any challenge or pilot case identifier in this department.">
                {({ id }) => (
                  <Select
                    id={id}
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    options={(challenges.data?.data ?? []).map((c) => ({
                      value: c.caseId,
                      label: `${c.caseId} — ${c.title}`,
                    }))}
                  />
                )}
              </Field>
            </div>

            <InlineNote tone="neutral" title="What an audit pack is">
              Gate decisions, evaluator scores, override reasons, milestones, payment records, documents with their
              checksums, and the full timeline — in order, for one case. It is what makes a decision reconstructable
              years later by someone who was not there.
            </InlineNote>

            <QueryState query={pack} errorTitle="Unable to build the audit pack." loading={<PanelSkeleton lines={10} />}>
              {(payload) => {
                const p = payload.data;
                return (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h2 className="text-h2 text-ink">Audit pack — {p.caseId}</h2>
                      <Button
                        onClick={() => {
                          const lines: string[] = [
                            `PRAYOG audit pack — ${p.caseId}`,
                            `Generated ${dayTime(payload.servedAt)}`,
                            '',
                            'GATE DECISIONS',
                            ...p.gates.map(
                              (g) =>
                                `${g.gate}\t${g.status}\t${g.decidedOn ? day(g.decidedOn) : '—'}\t${(g.reason ?? '').replace(/\s+/g, ' ')}`,
                            ),
                            '',
                            'EVALUATIONS',
                            ...p.evaluations.map((e) => `${e.evaluatorName}\t${e.weightedTotal ?? '—'}\t${e.status}`),
                            '',
                            'ELIGIBILITY OVERRIDES',
                            ...p.overrides.map(
                              (o) =>
                                `${o.applicationCaseId}\t${o.ruleId}\t${o.override?.by ?? ''}\t${(o.override?.justification ?? '').replace(/\s+/g, ' ')}`,
                            ),
                            '',
                            'MILESTONES',
                            ...p.milestones.map((m) => `${m.caseId}\t${m.name}\t${m.status}\t${m.paymentPaise / 100}`),
                            '',
                            'PAYMENTS',
                            ...p.claims.map(
                              (c) => `${c.caseId}\t${day(c.acceptedOn)}\t${c.netPaise / 100}\t${c.status}\t${c.paymentReference ?? ''}`,
                            ),
                            '',
                            'TIMELINE',
                            ...p.timeline.map((a) => `${dayTime(a.at)}\t${a.actorName}\t${a.action}\t${a.summary.replace(/\s+/g, ' ')}\t${a.hash}`),
                          ];
                          const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `prayog-audit-pack-${p.caseId}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export the audit pack
                      </Button>
                    </div>

                    <SectionRail
                      title="The pack, in parts"
                      note="Every part is in the export. This is which one is on the screen."
                      label="Audit pack sections"
                      value={part}
                      onChange={setPart}
                      sections={[
                        { id: 'case', label: 'The case' },
                        { id: 'gates', label: 'Gate decisions', count: p.gates.length },
                        { id: 'evaluations', label: 'Evaluator scores', count: p.evaluations.length },
                        { id: 'overrides', label: 'Eligibility overrides', count: p.overrides.length },
                        { id: 'milestones', label: 'Milestones', count: p.milestones.length },
                        { id: 'payments', label: 'Payment records', count: p.claims.length },
                        { id: 'documents', label: 'Documents and checksums', count: p.evidence.length },
                        { id: 'timeline', label: 'Timeline, in order', count: p.timeline.length },
                      ]}
                    >
                      {part === 'case' ? (
                        <KeyValueSheet
                          title="Case"
                          items={[
                            { label: 'Challenge', value: p.challenge ? `${p.challenge.caseId} — ${p.challenge.title}` : '—' },
                            {
                              label: 'Pilot',
                              value: p.pilot ? `${p.pilot.caseId} — ${p.pilot.status.replace(/_/g, ' ')}` : 'No pilot',
                            },
                            { label: 'Gate records', value: String(p.gates.length) },
                            { label: 'Evaluations', value: String(p.evaluations.length) },
                            { label: 'Eligibility overrides', value: String(p.overrides.length) },
                            { label: 'Milestones', value: String(p.milestones.length) },
                            { label: 'Payment records', value: String(p.claims.length) },
                            { label: 'Evidence files', value: String(p.evidence.length) },
                            {
                              label: 'Validation',
                              value: p.validation
                                ? `${p.validation.outcome?.replace(/_/g, ' ') ?? 'in progress'}${p.validation.hash ? ` · checksum ${shortHash(p.validation.hash)}` : ''}`
                                : 'None',
                            },
                          ]}
                        />
                      ) : null}

                      {part === 'gates' ? (
                        <Part title="Gate decisions" empty={p.gates.length === 0} emptyNote="No gate has been decided on this case yet.">
                          <ul className="sheet-flat">
                            {p.gates.map((g) => (
                              <li key={g.id} className="ledger-row px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0 max-w-doc">
                                    <p className="text-data text-ink">{g.gate}</p>
                                    {g.reason ? (
                                      <p className="mt-1 max-w-doc font-doc text-doc text-ink">{g.reason}</p>
                                    ) : (
                                      <p className="mt-1 text-body text-ink-soft">No decision recorded.</p>
                                    )}
                                    <p className="mt-1 text-micro text-ink-soft">
                                      {g.preconditions.filter((x) => x.result === 'pass').length} of{' '}
                                      {countOf(g.preconditions.length, 'precondition')} met · dwell {g.dwellDays} days
                                    </p>
                                    {g.waiver ? (
                                      <p className="mt-1 text-micro text-ink">
                                        Waiver {g.waiver.status} — {g.waiver.reason}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <StatusBadge status={g.status} />
                                    <span className="text-micro text-ink-soft tnum">
                                      {g.decidedOn ? day(g.decidedOn) : '—'}
                                    </span>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </Part>
                      ) : null}

                      {part === 'evaluations' ? (
                        <Part
                          title="Evaluator scores"
                          empty={p.evaluations.length === 0}
                          emptyNote="No panel has scored this case."
                        >
                          <ul className="sheet-flat">
                            {p.evaluations.map((e) => (
                              <li
                                key={e.id}
                                className="ledger-row flex flex-wrap items-baseline justify-between gap-3 px-4 py-2"
                              >
                                <span className="min-w-0">
                                  <span className="block text-body text-ink">{e.evaluatorName}</span>
                                  <span className="block text-micro text-ink-soft">
                                    {countOf(e.scores.length, 'criterion scored', 'criteria scored')}
                                    {e.submittedAt ? ` · submitted ${day(e.submittedAt)}` : ''}
                                  </span>
                                </span>
                                <span className="flex items-center gap-3">
                                  <StatusBadge status={e.status} />
                                  <span className="text-data text-ink tnum">
                                    {typeof e.weightedTotal === 'number' ? `${e.weightedTotal.toFixed(2)} of 5` : '—'}
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Part>
                      ) : null}

                      {part === 'overrides' ? (
                        <Part
                          title="Eligibility overrides"
                          empty={p.overrides.length === 0}
                          emptyNote="Every application on this case cleared the rules as written. Nothing was overridden."
                        >
                          <ul className="sheet-flat">
                            {p.overrides.map((o, i) => (
                              <li key={`${o.applicationCaseId}-${o.ruleId}-${i}`} className="ledger-row px-4 py-3">
                                <p className="text-body text-ink">
                                  {o.applicationCaseId} · rule {o.ruleId}
                                </p>
                                <p className="mt-1 max-w-doc font-doc text-doc text-ink">{o.override?.justification}</p>
                                <p className="mt-1 text-micro text-ink-soft">
                                  {o.override?.by} · {dayTime(o.override?.at)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </Part>
                      ) : null}

                      {part === 'milestones' ? (
                        <Part
                          title="Milestones"
                          empty={p.milestones.length === 0}
                          emptyNote="No pilot has been contracted on this case."
                        >
                          <ul className="sheet-flat">
                            {p.milestones.map((m) => (
                              <li key={m.id} className="ledger-row px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0 max-w-doc">
                                    <p className="text-body text-ink">
                                      Milestone {m.index} — {m.name}
                                    </p>
                                    <p className="type-register text-micro text-ink-soft">{m.caseId}</p>
                                    <p className="mt-1 text-micro text-ink-soft">Acceptance test: {m.acceptanceTest}</p>
                                    {m.acceptanceFinding ? (
                                      <p className="mt-0.5 text-micro text-ink">
                                        Finding: {m.acceptanceFinding.replace(/_/g, ' ')}
                                        {m.acceptedOn ? ` · accepted ${day(m.acceptedOn)}` : ''}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <StatusBadge status={m.status} />
                                    <span className="text-data text-ink tnum">{money(m.paymentPaise)}</span>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </Part>
                      ) : null}

                      {part === 'payments' ? (
                        <Part
                          title="Payment records"
                          empty={p.claims.length === 0}
                          emptyNote="No milestone on this case has been accepted, so nothing is payable yet."
                        >
                          <ul className="sheet-flat">
                            {p.claims.map((c) => (
                              <li
                                key={c.id}
                                className="ledger-row flex flex-wrap items-baseline justify-between gap-3 px-4 py-2"
                              >
                                <span className="text-body text-ink">
                                  {c.caseId} · accepted {day(c.acceptedOn)}
                                  {c.paidOn ? ` · paid ${day(c.paidOn)}` : ''}
                                </span>
                                <span className="flex items-center gap-3">
                                  {c.paymentReference ? (
                                    <span className="type-register text-micro text-ink-soft">{c.paymentReference}</span>
                                  ) : null}
                                  <StatusBadge status={c.status} />
                                  <span className="text-data text-ink tnum">{money(c.netPaise)}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Part>
                      ) : null}

                      {part === 'documents' ? (
                        <Part
                          title="Documents and checksums"
                          empty={p.evidence.length === 0}
                          emptyNote="No evidence has been filed against this case."
                        >
                          <ul className="sheet-flat">
                            {p.evidence.map((e) => (
                              <li
                                key={e.id}
                                className="ledger-row flex flex-wrap items-baseline justify-between gap-3 px-4 py-2"
                              >
                                <span className="min-w-0 truncate text-body text-ink">{e.fileName}</span>
                                <span className="flex items-center gap-3">
                                  <Badge tone="neutral">{e.access}</Badge>
                                  <span className="text-micro text-ink-soft tnum">{shortHash(e.hash)}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Part>
                      ) : null}

                      {part === 'timeline' ? (
                        <Part title="Timeline, in order" empty={p.timeline.length === 0} emptyNote="Nothing has been recorded against this case.">
                          <AuditTrail items={p.timeline} dense />
                        </Part>
                      ) : null}
                    </SectionRail>
                  </div>
                );
              }}
            </QueryState>
          </div>
        ) : null}
      </Tabs>
    </div>
  );
}
