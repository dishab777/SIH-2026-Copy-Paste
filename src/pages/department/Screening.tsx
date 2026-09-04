import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApplicationDecision, useOverrideEligibility, useScreening } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { Sheet } from '@/components/ui/Overlay';
import { EligibilityChecklist } from '@/components/domain/Eligibility';
import { day, money, countOf } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { Application, Startup } from '@/types/models';

export default function Screening() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useScreening(id);
  const override = useOverrideEligibility();
  const decide = useApplicationDecision();
  const pushToast = useUi((s) => s.pushToast);
  const [open, setOpen] = useState<{ application: Application; startup: Startup } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div>
      <QueryState
        query={query}
        errorTitle="Unable to load applications."
        loading={<TableSkeleton rows={8} columns={6} />}
        isEmpty={(d) => d.data.items.length === 0}
        empty={{
          title: 'No applications have been submitted.',
          body: 'The eligibility rules run automatically the moment an application is submitted. Nothing needs doing until then.',
          action: { label: 'Back to the challenge', to: `/d/challenges/${id}` },
        }}
      >
        {(payload) => {
          const { challenge: c, items } = payload.data;

          const received = items.length;
          const eligible = items.filter((i) => i.application.eligibilitySummary === 'auto_pass').length;
          const needsReview = items.filter((i) => i.application.eligibilitySummary === 'needs_review');
          const autoFail = items.filter((i) => i.application.eligibilitySummary === 'auto_fail').length;
          const shortlisted = items.filter((i) =>
            ['shortlisted', 'awarded', 'under_evaluation'].includes(i.application.status),
          ).length;
          const pitch = items.filter((i) => ['awarded', 'not_selected'].includes(i.application.status)).length;

          const funnel = [
            { label: 'Received', value: received },
            { label: 'Eligible', value: eligible },
            { label: 'Shortlisted', value: shortlisted },
            { label: 'Pitch', value: pitch },
          ];

          return (
            <>
              <div className="mb-4">
                <Breadcrumb
                  items={[
                    { label: 'Challenge pipeline', to: '/d/challenges' },
                    { label: c.caseId, to: `/d/challenges/${c.id}` },
                    { label: 'Applications' },
                  ]}
                />
              </div>

              <PageHeader
                title="Application screening"
                lead={`${c.title} — every application carries an automated result with the evidence used, the rule cited and a timestamp. An override needs a written justification.`}
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={<LinkButton to={`/d/challenges/${c.id}/evaluation`}>Open the evaluation panel</LinkButton>}
              />

              {/* The funnel, as a ruled strip rather than a decorative chart. */}
              <section aria-label="Screening funnel" className="mb-6 sheet-flat">
                <ol className="grid grid-cols-2 md:grid-cols-4">
                  {funnel.map((f, i) => (
                    <li
                      key={f.label}
                      className={[
                        'border-b border-rule px-4 py-3 md:border-b-0',
                        i < funnel.length - 1 ? 'md:border-r' : '',
                      ].join(' ')}
                    >
                      <p className="text-micro text-ink-soft">
                        {i > 0 ? '↓ ' : ''}
                        {f.label}
                      </p>
                      <p className="mt-1 text-h2 text-ink tnum">{f.value}</p>
                      {i > 0 && funnel[i - 1]!.value > 0 ? (
                        <p className="text-micro text-ink-soft tnum">
                          {Math.round((f.value / funnel[i - 1]!.value) * 100)}% of the previous stage
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>

              {needsReview.length > 0 ? (
                <div className="mb-6">
                  <InlineNote tone="hold" title={`${countOf(needsReview.length, 'application needs', 'applications need')} an explicit human decision`}>
                    <p className="max-w-doc">
                      The rule engine could not decide these on its own. Gate 2 cannot clear while any application is
                      still in needs review — an application is never rejected silently.
                    </p>
                    <ul className="mt-2 list-disc pl-5">
                      {needsReview.map((i) => (
                        <li key={i.application.id}>
                          {i.startup.tradeName} — {i.application.eligibility.find((e) => e.result === 'review')?.evidence}
                        </li>
                      ))}
                    </ul>
                  </InlineNote>
                </div>
              ) : null}

              <LedgerTable
                caption={`Applications against ${c.caseId}`}
                exportName={`prayog-screening-${c.caseId}`}
                rows={items}
                rowKey={(i) => i.application.id}
                rowTone={(i) =>
                  i.application.eligibilitySummary === 'auto_fail'
                    ? 'seal'
                    : i.application.eligibilitySummary === 'needs_review'
                      ? 'hold'
                      : 'verify'
                }
                selectable
                selected={selected}
                onSelectedChange={setSelected}
                onRowOpen={(i) => setOpen(i)}
                savedViews={[
                  { id: 'review', label: 'Needs review first', hiddenColumns: [], sortKey: 'result', sortDirection: 'asc' },
                  { id: 'cost', label: 'By proposed cost', hiddenColumns: ['recognition'], sortKey: 'cost', sortDirection: 'asc' },
                ]}
                toolbar={
                  selected.length > 0 ? (
                    <span className="flex items-center gap-3">
                      <span className="text-micro text-ink-soft tnum">{selected.length} selected</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          selected.forEach((appId) =>
                            decide.mutate({ id: appId, status: 'shortlisted', note: 'Shortlisted at screening' }),
                          );
                          pushToast('verify', `${countOf(selected.length, 'application')} shortlisted.`);
                          setSelected([]);
                        }}
                      >
                        Shortlist the selected applications
                      </Button>
                    </span>
                  ) : undefined
                }
                columns={[
                  {
                    key: 'applicant',
                    header: 'Applicant',
                    width: '24%',
                    sortValue: (i) => i.startup.tradeName,
                    filterValue: (i) => `${i.startup.tradeName} ${i.application.caseId}`,
                    render: (i) => (
                      <span>
                        <span className="block text-body text-ink">{i.startup.tradeName}</span>
                        <span className="type-register block text-micro text-ink-soft">{i.application.caseId}</span>
                        <span className="block text-micro text-ink-soft">
                          {i.startup.city}, {i.startup.state}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'result',
                    header: 'Eligibility',
                    sortValue: (i) =>
                      i.application.eligibilitySummary === 'needs_review'
                        ? 0
                        : i.application.eligibilitySummary === 'auto_fail'
                          ? 1
                          : 2,
                    filterValue: (i) => i.application.eligibilitySummary,
                    render: (i) => (
                      <span className="flex flex-col items-start gap-1">
                        <StatusBadge
                          status={i.application.eligibilitySummary}
                          label={
                            i.application.eligibilitySummary === 'auto_pass'
                              ? 'Auto-pass'
                              : i.application.eligibilitySummary === 'auto_fail'
                                ? 'Auto-fail'
                                : i.application.eligibilitySummary === 'needs_review'
                                  ? 'Needs review'
                                  : 'Not run'
                          }
                        />
                        {i.application.eligibility.some((e) => e.override) ? <Badge tone="hold">Overridden</Badge> : null}
                        {i.application.eligibility.some((e) => e.relaxationApplied) ? (
                          <Badge tone="verify">Relief applied</Badge>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    key: 'recognition',
                    header: 'Recognition',
                    sortValue: (i) => i.startup.dpiit.status,
                    filterValue: (i) => i.startup.dpiit.status,
                    render: (i) => (
                      <span>
                        <StatusBadge status={i.startup.dpiit.status} />
                        {i.startup.dpiit.validTo ? (
                          <span className="mt-0.5 block text-micro text-ink-soft">
                            Valid to {day(i.startup.dpiit.validTo)}
                          </span>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    key: 'changed',
                    header: 'Changed since submission',
                    width: '20%',
                    optional: true,
                    filterValue: (i) => i.application.eligibility.find((e) => e.changedSince)?.changedSince?.what ?? '',
                    render: (i) => {
                      const changed = i.application.eligibility.find((e) => e.changedSince);
                      return changed?.changedSince ? (
                        <span className="text-body text-ink">
                          {changed.changedSince.what}
                          <span className="mt-0.5 block text-micro text-ink-soft">
                            on {day(changed.changedSince.at)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-soft">No change</span>
                      );
                    },
                  },
                  {
                    key: 'cost',
                    header: 'Proposed cost',
                    align: 'right',
                    sortValue: (i) => i.application.commercials.totalPaise,
                    filterValue: (i) => String(i.application.commercials.totalPaise / 100),
                    render: (i) => (
                      <span>
                        <span className="block tnum">{money(i.application.commercials.totalPaise)}</span>
                        {i.application.commercials.totalPaise > c.pilot.budgetPaise ? (
                          <span className="mt-0.5 block text-micro text-seal">Over the published budget</span>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    sortValue: (i) => i.application.status,
                    filterValue: (i) => i.application.status,
                    render: (i) => <StatusBadge status={i.application.status} />,
                  },
                  {
                    key: 'submitted',
                    header: 'Submitted',
                    align: 'right',
                    optional: true,
                    sortValue: (i) => i.application.submittedAt ?? '',
                    render: (i) => day(i.application.submittedAt),
                  },
                ]}
                totalRow={
                  <span className="flex flex-wrap items-baseline justify-between gap-4">
                    <span className="text-body text-ink">
                      {received} received · {eligible} eligible · {autoFail} ineligible · {needsReview.length} need review
                    </span>
                    <span className="text-micro text-ink-soft">
                      Gate 2 cannot clear while any application is in needs review.
                    </span>
                  </span>
                }
              />

              <Sheet
                open={Boolean(open)}
                onClose={() => setOpen(null)}
                title={open ? `${open.startup.tradeName} — eligibility` : ''}
                side="right"
                footer={
                  open ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        tone="primary"
                        size="sm"
                        onClick={() => {
                          navigate(`/d/challenges/${c.id}/applications/${open.application.id}`);
                          setOpen(null);
                        }}
                      >
                        Open the full dossier
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          decide.mutate(
                            { id: open.application.id, status: 'shortlisted', note: 'Shortlisted at screening' },
                            {
                              onSuccess: () => {
                                pushToast('verify', `${open.startup.tradeName} shortlisted.`);
                                setOpen(null);
                              },
                            },
                          )
                        }
                      >
                        Shortlist
                      </Button>
                      <Button
                        size="sm"
                        tone="destructive"
                        onClick={() =>
                          decide.mutate(
                            { id: open.application.id, status: 'not_selected', note: 'Not shortlisted at screening' },
                            {
                              onSuccess: () => {
                                pushToast('hold', `${open.startup.tradeName} was not shortlisted. They will be told why.`);
                                setOpen(null);
                              },
                            },
                          )
                        }
                      >
                        Do not shortlist
                      </Button>
                    </div>
                  ) : undefined
                }
              >
                {open ? (
                  <div className="flex flex-col gap-4">
                    <p className="type-register text-micro text-ink-soft">{open.application.caseId}</p>
                    <EligibilityChecklist
                      results={open.application.eligibility}
                      overrideBusy={override.isPending}
                      overrideError={
                        override.error instanceof PrayogApiError
                          ? [override.error.message, ...override.error.details].join(' ')
                          : undefined
                      }
                      onOverride={async (input) => {
                        await override.mutateAsync(
                          { applicationId: open.application.id, ...input },
                          {
                            onSuccess: () => pushToast('verify', 'Override recorded with your written justification.'),
                            onError: (err) => {
                              const api = err instanceof PrayogApiError ? err : null;
                              pushToast('seal', api?.message ?? 'The override was not recorded.', api?.details.join(' '));
                            },
                          },
                        );
                      }}
                    />
                  </div>
                ) : null}
              </Sheet>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
