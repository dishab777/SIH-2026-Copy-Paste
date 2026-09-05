import { useNavigate } from 'react-router-dom';
import { policyNumber } from '@/config/policies';
import { useEvaluatorQueue } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote, ProgressRing } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SlaClock } from '@/components/domain/SlaClock';
import { day, daysBetween, countOf } from '@/lib/format';
import { platformNowIso } from '@/config/clock';

export default function EvaluatorQueue() {
  const query = useEvaluatorQueue();
  const navigate = useNavigate();
  const rationaleMin = policyNumber('evaluation.rationale.minChars');

  return (
    <div>
      <PageHeader
        title="Assignment queue"
        lead="Applicant identities and proposals stay hidden until your conflict declaration is recorded. That is not a permissions quirk — it is what makes the panel independent."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState
        query={query}
        errorTitle="Unable to load your queue."
        loading={<TableSkeleton rows={5} columns={5} />}
        isEmpty={(d) => d.data.length === 0}
        empty={{
          title: 'Nothing is assigned to you.',
          body: 'Assignments arrive when a challenge is shortlisted at gate 2 and a panel is convened. You will be notified.',
          action: { label: 'Read published challenges', to: '/e/challenges' },
        }}
      >
        {(payload) => {
          const undeclared = payload.data.filter((i) => !i.coiDeclared);
          const conflicted = payload.data.filter((i) => i.coiConflict);

          return (
            <>
              {undeclared.length > 0 ? (
                <div className="mb-6">
                  <InlineNote tone="seal" title={`${countOf(undeclared.length, 'declaration is', 'declarations are')} outstanding`}>
                    <p className="max-w-doc">
                      You cannot open these proposals, or even see who applied, until you declare. The declaration takes
                      a moment and cannot be skipped or dismissed.
                    </p>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        tone="primary"
                        onClick={() => navigate(`/e/coi/${undeclared[0]!.applicationId}`)}
                      >
                        Start declaring
                      </Button>
                    </div>
                  </InlineNote>
                </div>
              ) : null}

              {conflicted.length > 0 ? (
                <div className="mb-6">
                  <InlineNote tone="hold" title={`You are recused from ${countOf(conflicted.length, 'application')}`}>
                    You declared a conflict on these. The programme management unit has been notified and they will not
                    count towards the minimum evaluator requirement for the panel.
                  </InlineNote>
                </div>
              ) : null}

              <LedgerTable
                caption="Applications assigned to you"
                exportName="prayog-evaluator-queue"
                rows={payload.data}
                rowKey={(i) => i.applicationId}
                rowTone={(i) =>
                  i.coiConflict ? 'neutral' : !i.coiDeclared ? 'seal' : i.status === 'submitted' ? 'verify' : 'hold'
                }
                onRowOpen={(i) =>
                  navigate(i.coiDeclared && !i.coiConflict ? `/e/score/${i.applicationId}` : `/e/coi/${i.applicationId}`)
                }
                columns={[
                  {
                    key: 'challenge',
                    header: 'Challenge',
                    width: '28%',
                    sortValue: (i) => i.challengeCaseId,
                    filterValue: (i) => `${i.challengeCaseId} ${i.challengeTitle}`,
                    render: (i) => (
                      <span>
                        <span className="block text-body text-ink">{i.challengeTitle}</span>
                        <span className="block text-micro text-ink-soft tnum">{i.challengeCaseId}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'applicant',
                    header: 'Applicant',
                    sortValue: (i) => i.applicantLabel,
                    filterValue: (i) => i.applicantLabel,
                    render: (i) => (
                      <span>
                        <span className={['block text-body', i.coiDeclared ? 'text-ink' : 'text-ink-soft'].join(' ')}>
                          {i.applicantLabel}
                        </span>
                        <span className="block text-micro text-ink-soft tnum">{i.applicationCaseId}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'coi',
                    header: 'Conflict declaration',
                    sortValue: (i) => (i.coiDeclared ? 1 : 0),
                    render: (i) =>
                      i.coiConflict ? (
                        <Badge tone="neutral">Conflict declared — recused</Badge>
                      ) : i.coiDeclared ? (
                        <Badge tone="verify">Declared, no conflict</Badge>
                      ) : (
                        <Badge tone="seal">Not declared</Badge>
                      ),
                  },
                  {
                    key: 'progress',
                    header: 'Scoring progress',
                    sortValue: (i) => i.criteriaScored / Math.max(1, i.criteriaTotal),
                    render: (i) =>
                      i.coiConflict ? (
                        <span className="text-ink-soft">Not applicable</span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <ProgressRing
                            value={i.criteriaScored}
                            max={i.criteriaTotal}
                            label={`Scoring progress on ${i.applicationCaseId}`}
                            size={36}
                          />
                          <span className="text-micro text-ink-soft tnum">
                            {i.criteriaScored} of {i.criteriaTotal} criteria
                          </span>
                        </span>
                      ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    sortValue: (i) => i.status,
                    render: (i) => <StatusBadge status={i.status} />,
                  },
                  {
                    key: 'deadline',
                    header: 'Panel session',
                    align: 'right',
                    sortValue: (i) => i.deadline ?? '',
                    render: (i) =>
                      i.deadline ? (
                        <span>
                          <span className="block tnum">{day(i.deadline)}</span>
                          {daysBetween(platformNowIso(), i.deadline) > 0 ? (
                            <SlaClock
                              startedOn={platformNowIso()}
                              limitDays={daysBetween(platformNowIso(), i.deadline)}
                            />
                          ) : (
                            <span className="text-micro text-ink-soft">Session has passed</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-ink-soft">Not scheduled</span>
                      ),
                  },
                ]}
                totalRow={
                  <span className="flex flex-wrap items-baseline justify-between gap-4">
                    <span className="text-body text-ink">
                      {payload.data.length} assigned · {undeclared.length} awaiting your declaration
                    </span>
                    <span className="text-micro text-ink-soft">
                      Every criterion needs a written reason of at least {rationaleMin} characters.
                    </span>
                  </span>
                }
              />
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
