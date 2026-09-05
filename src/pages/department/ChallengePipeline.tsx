import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GATES } from '@/config/gates';
import { can } from '@/config/rbac';
import { useChallenges, useSession } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { SlaClock } from '@/components/domain/SlaClock';
import { gateSlaDays } from '@/config/gates';
import { countOf, daysBetween, money } from '@/lib/format';

/*
 * The way into the challenge studio.
 *
 * This used to be an item in the top bar, which put a verb among six places
 * and offered it to a procurement officer, who cannot create a challenge at
 * all. It belongs here, beside the cases it produces, and only for the roles
 * that hold the permission — the same permission the API re-checks.
 */
function StudioLead() {
  return (
    <section
      aria-labelledby="studio-lead"
      className="lift-on-hover mb-6 overflow-hidden rounded-block border border-rule border-l-2 border-l-saffron bg-sheet shadow-sheet"
    >
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="field-label mb-2">Stage 1 · clears gate 0</p>
          <h2 id="studio-lead" className="font-display text-h3 text-ink">
            Start a new challenge
          </h2>
          <p className="mt-2 max-w-doc text-body text-ink-soft">
            Begin with the problem you would fix tomorrow if you could. The studio turns it into an outcome a startup
            can be paid to achieve, rather than a product you have already chosen.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {[
              'Eight steps, autosaved',
              'Flags vendor naming before publication',
              'Carries gate 0 and gate 1 readiness',
            ].map((chip) => (
              <li
                key={chip}
                className="rounded-pill border border-rule bg-ledger px-2.5 py-1 text-micro text-ink-soft"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0">
          <LinkButton tone="primary" to="/d/challenges/new/problem">
            Create a challenge
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

export default function ChallengePipeline() {
  const query = useChallenges({ scope: 'department' });
  const session = useSession();
  const navigate = useNavigate();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [dragNote, setDragNote] = useState(false);
  const mayCreate = can(session.data?.data.role ?? 'public', 'create', 'challenge');

  return (
    <div>
      <PageHeader
        title="Challenge pipeline"
        lead="Every case this department owns, at the gate that currently holds it."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
        aside={
          <div className="flex items-center gap-2" role="group" aria-label="Table or board">
            <Button size="sm" tone={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>
              Table
            </Button>
            <Button size="sm" tone={view === 'board' ? 'primary' : 'secondary'} onClick={() => setView('board')}>
              Board
            </Button>
          </div>
        }
      />

      {mayCreate ? <StudioLead /> : null}

      <QueryState
        query={query}
        errorTitle="Unable to load the pipeline."
        loading={<TableSkeleton rows={8} columns={6} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: 'No challenges yet.',
          body: mayCreate
            ? 'Start with the problem you would fix tomorrow if you could. The studio turns it into something a startup can be paid to solve.'
            : 'Nothing has been framed yet. A department nodal officer or administrator opens the first case in the challenge studio.',
          action: mayCreate ? { label: 'Create a challenge', to: '/d/challenges/new/problem' } : undefined,
        }}
      >
        {(payload) => {
          const rows = payload.data;

          if (view === 'board') {
            return (
              <div>
                {dragNote ? (
                  <div className="mb-4">
                    <InlineNote tone="seal" title="Cases move through gate decisions.">
                      <p>
                        Drag and drop cannot bypass an approval gate. Open the case and record a decision, with its
                        preconditions and a written reason.
                      </p>
                      <div className="mt-3">
                        <Button size="sm" onClick={() => setDragNote(false)}>
                          Understood
                        </Button>
                      </div>
                    </InlineNote>
                  </div>
                ) : null}

                <div className="relative overflow-x-auto scroll-quiet">
                  <div className="flex min-w-max gap-4">
                    {GATES.map((g) => {
                      const column = rows.filter((c) => c.currentGate === g.id);
                      return (
                        <section key={g.id} aria-label={`${g.id} ${g.name}`} className="w-[260px] shrink-0">
                          <div className="sheet-flat">
                            <div className="border-b border-ink px-3 py-2">
                              <p className="text-data text-ink">{g.id}</p>
                              <p className="text-micro text-ink-soft">{g.name}</p>
                              <p className="mt-1 text-micro text-ink-soft tnum">{countOf(column.length, 'case')}</p>
                            </div>
                            <ul>
                              {column.length === 0 ? (
                                <li className="px-3 py-6 text-micro text-ink-soft">Nothing at this gate.</li>
                              ) : (
                                column.map((c) => (
                                  <li key={c.id} className="ledger-row">
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        e.preventDefault();
                                        setDragNote(true);
                                      }}
                                      className={[
                                        'border-l-2 px-3 py-2',
                                        c.blocked ? 'border-l-seal bg-seal-wash' : 'border-l-transparent',
                                      ].join(' ')}
                                    >
                                      <Link to={`/d/challenges/${c.id}`} className="block no-underline">
                                        <p className="type-register text-micro text-ink-soft">{c.caseId}</p>
                                        <p className="mt-0.5 text-body text-ink">{c.title}</p>
                                        <p className="mt-1 text-micro text-ink-soft">
                                          Held {daysBetween(c.gateEnteredOn)} days · {c.applicantCount} applicants
                                        </p>
                                        <div className="mt-2">
                                          <SlaClock startedOn={c.gateEnteredOn} limitDays={gateSlaDays(c.currentGate)} />
                                        </div>
                                        {c.blocked ? (
                                          <p className="mt-2 text-micro text-ink">{c.blocked.reason}</p>
                                        ) : null}
                                      </Link>
                                    </div>
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <LedgerTable
              caption="Challenges owned by this department"
              exportName="prayog-challenge-pipeline"
              rows={rows}
              rowKey={(c) => c.id}
              rowTone={(c) => (c.blocked ? 'seal' : c.waiver ? 'hold' : undefined)}
              onRowOpen={(c) => navigate(`/d/challenges/${c.id}`)}
              savedViews={[
                { id: 'blocked', label: 'Blocked cases only', hiddenColumns: [], sortKey: 'dwell', sortDirection: 'desc' },
                { id: 'money', label: 'By money at stake', hiddenColumns: ['owner'], sortKey: 'budget', sortDirection: 'desc' },
                { id: 'closing', label: 'Closing soonest', hiddenColumns: [], sortKey: 'closes', sortDirection: 'asc' },
              ]}
              columns={[
                {
                  key: 'case',
                  header: 'Case',
                  width: '26%',
                  sortValue: (c) => c.caseId,
                  filterValue: (c) => `${c.caseId} ${c.title}`,
                  render: (c) => (
                    <span>
                      <span className="type-register block text-micro text-ink-soft">{c.caseId}</span>
                      <span className="block text-body text-ink">{c.title}</span>
                      <span className="block text-micro text-ink-soft">
                        {c.district} · {c.sector}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'gate',
                  header: 'Gate',
                  sortValue: (c) => c.currentGate,
                  filterValue: (c) => c.currentGate,
                  render: (c) => (
                    <span>
                      <span className="block text-data text-ink">{c.currentGate}</span>
                      <span className="block text-micro text-ink-soft">
                        {GATES.find((g) => g.id === c.currentGate)?.name}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortValue: (c) => c.status,
                  filterValue: (c) => c.status,
                  render: (c) => (
                    <span className="flex flex-col items-start gap-1">
                      <StatusBadge status={c.status} />
                      {c.blocked ? <Badge tone="seal">Blocked</Badge> : null}
                      {c.waiver ? <Badge tone="hold">Waiver requested</Badge> : null}
                    </span>
                  ),
                },
                {
                  key: 'dwell',
                  header: 'Held for',
                  align: 'right',
                  sortValue: (c) => daysBetween(c.gateEnteredOn),
                  filterValue: (c) => String(daysBetween(c.gateEnteredOn)),
                  render: (c) => <SlaClock startedOn={c.gateEnteredOn} limitDays={gateSlaDays(c.currentGate)} />,
                },
                {
                  key: 'applicants',
                  header: 'Applicants',
                  align: 'right',
                  sortValue: (c) => c.applicantCount,
                  render: (c) => c.applicantCount,
                },
                {
                  key: 'budget',
                  header: 'Pilot budget',
                  unit: '₹',
                  align: 'right',
                  sortValue: (c) => c.pilot.budgetPaise,
                  filterValue: (c) => String(c.pilot.budgetPaise / 100),
                  render: (c) => money(c.pilot.budgetPaise),
                },
                {
                  key: 'owner',
                  header: 'Owner',
                  optional: true,
                  filterValue: (c) => c.ownerId,
                  render: (c) => <span className="text-micro text-ink-soft">{c.ownerId}</span>,
                },
                {
                  key: 'closes',
                  header: 'Closes',
                  align: 'right',
                  optional: true,
                  sortValue: (c) => c.timeline.closesOn ?? '9999',
                  render: (c) => (c.timeline.closesOn ? c.timeline.closesOn.slice(0, 10) : '—'),
                },
              ]}
              totalRow={
                <span className="flex items-baseline justify-between">
                  <span className="text-body text-ink">Committed across {rows.length} cases</span>
                  <span className="text-data text-ink tnum">
                    {money(rows.reduce((s, c) => s + c.pilot.budgetPaise, 0))}
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
