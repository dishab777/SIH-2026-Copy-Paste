import { useNavigate } from 'react-router-dom';
import { useApplications } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { day, money } from '@/lib/format';

const NEXT_STEP: Record<string, string> = {
  draft: 'Continue where you left off',
  submitted: 'With the department for screening',
  screening: 'With the department for screening',
  eligible: 'Eligible — waiting for the shortlist decision at gate 2',
  ineligible: 'Not eligible — the reasons are on the application',
  needs_review: 'A rule needs a human decision. You will be told the outcome and why',
  shortlisted: 'Shortlisted — with the evaluation panel',
  under_evaluation: 'With the evaluation panel',
  awarded: 'Awarded — open the pilot',
  not_selected: 'Not selected — your scores against the published rubric are on the application',
  withdrawn: 'Withdrawn',
};

export default function StartupApplications() {
  const query = useApplications();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Applications"
        lead="Every application you have started, submitted or completed, with the next step spelled out rather than implied by a status word."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
        aside={<LinkButton tone="primary" to="/s/matches">Find a challenge that fits</LinkButton>}
      />

      <QueryState
        query={query}
        errorTitle="Unable to load your applications."
        loading={<TableSkeleton rows={6} columns={5} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: 'You have not applied to anything yet.',
          body: 'Matching shows which open challenges fit your profile and, just as usefully, which do not and why.',
          action: { label: 'See your matches', to: '/s/matches' },
        }}
      >
        {(payload) => (
          <LedgerTable
            caption="Your applications"
            exportName="prayog-my-applications"
            rows={payload.data}
            rowKey={(r) => r.application.id}
            rowTone={(r) =>
              r.application.status === 'awarded'
                ? 'verify'
                : r.application.status === 'ineligible' || r.application.status === 'not_selected'
                  ? 'seal'
                  : r.application.status === 'draft' || r.application.status === 'needs_review'
                    ? 'hold'
                    : undefined
            }
            onRowOpen={(r) =>
              navigate(
                r.application.status === 'draft'
                  ? `/s/applications/${r.application.id}/edit/eligibility`
                  : `/s/applications/${r.application.id}`,
              )
            }
            columns={[
              {
                key: 'challenge',
                header: 'Challenge',
                width: '28%',
                sortValue: (r) => r.challenge.title,
                filterValue: (r) => `${r.challenge.title} ${r.application.caseId}`,
                render: (r) => (
                  <span>
                    <span className="block text-body text-ink">{r.challenge.title}</span>
                    <span className="block text-micro text-ink-soft tnum">
                      {r.challenge.caseId} · {r.application.caseId}
                    </span>
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortValue: (r) => r.application.status,
                filterValue: (r) => r.application.status,
                render: (r) => (
                  <span className="flex flex-col items-start gap-1">
                    <StatusBadge status={r.application.status} />
                    {r.application.eligibility.some((e) => e.relaxationApplied) ? (
                      <Badge tone="verify">Relief applied</Badge>
                    ) : null}
                  </span>
                ),
              },
              {
                key: 'next',
                header: 'What happens next',
                width: '26%',
                filterValue: (r) => NEXT_STEP[r.application.status] ?? '',
                render: (r) => <span className="text-body text-ink">{NEXT_STEP[r.application.status] ?? '—'}</span>,
              },
              {
                key: 'cost',
                header: 'Your price',
                unit: '₹',
                align: 'right',
                sortValue: (r) => r.application.commercials.totalPaise,
                render: (r) => (
                  <span>
                    <span className="block tnum">{money(r.application.commercials.totalPaise)}</span>
                    <span className="block text-micro text-ink-soft tnum">
                      budget {money(r.challenge.pilot.budgetPaise)}
                    </span>
                  </span>
                ),
              },
              {
                key: 'submitted',
                header: 'Submitted',
                align: 'right',
                sortValue: (r) => r.application.submittedAt ?? r.application.lastSavedAt,
                render: (r) =>
                  r.application.submittedAt ? (
                    day(r.application.submittedAt)
                  ) : (
                    <span className="text-ink-soft">saved {day(r.application.lastSavedAt)}</span>
                  ),
              },
              {
                key: 'closes',
                header: 'Challenge closes',
                align: 'right',
                optional: true,
                sortValue: (r) => r.challenge.timeline.closesOn ?? '',
                render: (r) => (r.challenge.timeline.closesOn ? day(r.challenge.timeline.closesOn) : '—'),
              },
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
