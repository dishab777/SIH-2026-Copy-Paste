import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { daysBetween, money } from '@/lib/format';

/*
 * The way into the challenge studio.
 *
 * This used to be an item in the top bar, which put a verb among six places
 * and offered it to a procurement officer, who cannot create a challenge at
 * all. It belongs here, beside the cases it produces, and only for the roles
 * that hold the permission — the same permission the API re-checks.
 */
function StudioLead() {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="studio-lead"
      className="lift-on-hover mb-6 overflow-hidden rounded-block border border-rule border-l-2 border-l-saffron bg-sheet shadow-sheet"
    >
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="field-label mb-2">{t('deptCases.pipeline.studio.eyebrow')}</p>
          <h2 id="studio-lead" className="font-display text-h3 text-ink">
            {t('deptCases.pipeline.studio.heading')}
          </h2>
          <p className="mt-2 max-w-doc text-body text-ink-soft">
            {t('deptCases.pipeline.studio.lead')}
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {[
              t('deptCases.pipeline.studio.chipSteps'),
              t('deptCases.pipeline.studio.chipVendorNaming'),
              t('deptCases.pipeline.studio.chipGateReadiness'),
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
            {t('deptCases.pipeline.create')}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

export default function ChallengePipeline() {
  const { t } = useTranslation();
  const query = useChallenges({ scope: 'department' });
  const session = useSession();
  const navigate = useNavigate();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [dragNote, setDragNote] = useState(false);
  const mayCreate = can(session.data?.data.role ?? 'public', 'create', 'challenge');

  return (
    <div>
      <PageHeader
        title={t('deptCases.pipeline.heading')}
        lead={t('deptCases.pipeline.lead')}
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
        aside={
          <div className="flex items-center gap-2" role="group" aria-label={t('deptCases.pipeline.viewToggle')}>
            <Button size="sm" tone={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>
              {t('deptCases.pipeline.viewTable')}
            </Button>
            <Button size="sm" tone={view === 'board' ? 'primary' : 'secondary'} onClick={() => setView('board')}>
              {t('deptCases.pipeline.viewBoard')}
            </Button>
          </div>
        }
      />

      {mayCreate ? <StudioLead /> : null}

      <QueryState
        query={query}
        errorTitle={t('deptCases.pipeline.errorTitle')}
        loading={<TableSkeleton rows={8} columns={6} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: t('deptCases.pipeline.emptyTitle'),
          body: mayCreate
            ? t('deptCases.pipeline.emptyBodyAuthor')
            : t('deptCases.pipeline.emptyBodyReader'),
          action: mayCreate ? { label: t('deptCases.pipeline.create'), to: '/d/challenges/new/problem' } : undefined,
        }}
      >
        {(payload) => {
          const rows = payload.data;

          if (view === 'board') {
            return (
              <div>
                {dragNote ? (
                  <div className="mb-4">
                    <InlineNote tone="seal" title={t('deptCases.pipeline.dragTitle')}>
                      <p>{t('deptCases.pipeline.dragBody')}</p>
                      <div className="mt-3">
                        <Button size="sm" onClick={() => setDragNote(false)}>
                          {t('deptCases.pipeline.dragAcknowledge')}
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
                              <p className="mt-1 text-micro text-ink-soft tnum">
                                {t('deptCases.pipeline.caseCount', { count: column.length })}
                              </p>
                            </div>
                            <ul>
                              {column.length === 0 ? (
                                <li className="px-3 py-6 text-micro text-ink-soft">{t('deptCases.pipeline.gateEmpty')}</li>
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
                                          {t('deptCases.pipeline.heldAndApplicants', {
                                            days: daysBetween(c.gateEnteredOn),
                                            applicants: c.applicantCount,
                                          })}
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
              title={t('deptCases.pipeline.tableTitle')}
              caption={t('deptCases.pipeline.tableCaption')}
              exportName="prayog-challenge-pipeline"
              rows={rows}
              rowKey={(c) => c.id}
              rowTone={(c) => (c.blocked ? 'seal' : c.waiver ? 'hold' : undefined)}
              onRowOpen={(c) => navigate(`/d/challenges/${c.id}`)}
              savedViews={[
                { id: 'blocked', label: t('deptCases.pipeline.views.blocked'), hiddenColumns: [], sortKey: 'dwell', sortDirection: 'desc' },
                { id: 'money', label: t('deptCases.pipeline.views.money'), hiddenColumns: ['owner'], sortKey: 'budget', sortDirection: 'desc' },
                { id: 'closing', label: t('deptCases.pipeline.views.closing'), hiddenColumns: [], sortKey: 'closes', sortDirection: 'asc' },
              ]}
              columns={[
                {
                  key: 'case',
                  header: t('deptCases.pipeline.col.case'),
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
                  header: t('deptCases.pipeline.col.gate'),
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
                  header: t('deptCases.pipeline.col.status'),
                  sortValue: (c) => c.status,
                  filterValue: (c) => c.status,
                  render: (c) => (
                    <span className="flex flex-col items-start gap-1">
                      <StatusBadge status={c.status} />
                      {c.blocked ? <Badge tone="seal">{t('deptCases.pipeline.blocked')}</Badge> : null}
                      {c.waiver ? <Badge tone="hold">{t('deptCases.pipeline.waiverRequested')}</Badge> : null}
                    </span>
                  ),
                },
                {
                  key: 'dwell',
                  header: t('deptCases.pipeline.col.heldFor'),
                  align: 'right',
                  sortValue: (c) => daysBetween(c.gateEnteredOn),
                  filterValue: (c) => String(daysBetween(c.gateEnteredOn)),
                  render: (c) => <SlaClock startedOn={c.gateEnteredOn} limitDays={gateSlaDays(c.currentGate)} />,
                },
                {
                  key: 'applicants',
                  header: t('deptCases.pipeline.col.applicants'),
                  align: 'right',
                  sortValue: (c) => c.applicantCount,
                  render: (c) => c.applicantCount,
                },
                {
                  key: 'budget',
                  header: t('deptCases.pipeline.col.pilotBudget'),
                  unit: '₹',
                  align: 'right',
                  sortValue: (c) => c.pilot.budgetPaise,
                  filterValue: (c) => String(c.pilot.budgetPaise / 100),
                  render: (c) => money(c.pilot.budgetPaise),
                },
                {
                  key: 'owner',
                  header: t('deptCases.pipeline.col.owner'),
                  optional: true,
                  filterValue: (c) => c.ownerId,
                  render: (c) => <span className="text-micro text-ink-soft">{c.ownerId}</span>,
                },
                {
                  key: 'closes',
                  header: t('deptCases.pipeline.col.closes'),
                  align: 'right',
                  optional: true,
                  sortValue: (c) => c.timeline.closesOn ?? '9999',
                  render: (c) => (c.timeline.closesOn ? c.timeline.closesOn.slice(0, 10) : '—'),
                },
              ]}
              totalRow={
                <span className="flex flex-wrap items-end justify-between gap-4">
                  <span className="min-w-0">
                    <span className="field-label block !text-saffron-ink">
                      {t('deptCases.pipeline.committed', { count: rows.length })}
                    </span>
                    <span className="mt-1 block text-micro text-ink-soft">
                      {t('deptCases.pipeline.committedNote')}
                    </span>
                  </span>
                  <span className="tnum shrink-0 font-display text-figure text-ink">
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
