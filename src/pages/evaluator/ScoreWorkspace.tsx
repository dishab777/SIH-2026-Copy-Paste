import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useScoringWorkspace,
  useSaveScore,
  useStartEvaluation,
  useSubmitEvaluation,
} from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PanelSkeleton, InlineNote, ErrorState } from '@/components/ui/Feedback';
import { RubricScorer } from '@/components/domain/RubricScorer';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { Modal } from '@/components/ui/Overlay';
import { SealStamp } from '@/components/domain/SealStamp';
import { dayTime, money, num } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function ScoreWorkspace() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const query = useScoringWorkspace(appId);
  const start = useStartEvaluation();
  const submit = useSubmitEvaluation();
  const pushToast = useUi((s) => s.pushToast);
  const [confirming, setConfirming] = useState(false);

  const evaluationId = query.data?.data.own?.id;
  const saveScore = useSaveScore(evaluationId);

  // Opening the workspace creates the evaluation record so progress can resume.
  useEffect(() => {
    if (query.data && !query.data.data.own && appId) {
      start.mutate(appId);
    }
  }, [query.data, appId, start]);

  // A refused read here is the COI gate doing its job, not an outage.
  if (query.isError) {
    const err = query.error;
    const api = err instanceof PrayogApiError ? err : null;
    if (api?.code === 'COI_REQUIRED') {
      return (
        <div className="mx-auto max-w-[720px]">
          <InlineNote tone="seal" title="Declare conflicts before opening this proposal">
            <p className="max-w-doc">{api.details.join(' ')}</p>
            <div className="mt-4">
              <Button tone="primary" onClick={() => navigate(`/e/coi/${appId}`)}>
                Go to the declaration
              </Button>
            </div>
          </InlineNote>
        </div>
      );
    }
    if (api?.code === 'RECUSED') {
      return (
        <div className="mx-auto max-w-[720px]">
          <InlineNote tone="seal" title="You are recused from this application">
            <p className="max-w-doc">{api.details.join(' ')}</p>
            <div className="mt-4">
              <Button onClick={() => navigate('/e')}>Back to your queue</Button>
            </div>
          </InlineNote>
        </div>
      );
    }
    return (
      <ErrorState
        title="Unable to open this proposal."
        what={api?.message ?? 'The service did not respond.'}
        details={api?.details}
        reference={api?.reference}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <QueryState query={query} errorTitle="Unable to open this proposal." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { application: a, challenge: c, rubric: rub, own, others, othersHiddenCount, rationaleMinChars } = payload.data;
        const submitted = own?.status === 'submitted';

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb items={[{ label: 'Assignment queue', to: '/e' }, { label: a.caseId }]} />
            </div>

            <header className="mb-6 border-b border-ink pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-doc">
                  <p className="text-micro text-ink-soft tnum">
                    {c.caseId} · {a.caseId}
                  </p>
                  <h1 className="mt-1 text-h1 text-ink">{c.title}</h1>
                  <p className="mt-2 text-body text-ink-soft">
                    Scored against {rub.label} {rub.version} — the rubric published with the challenge, unchanged.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {submitted ? (
                    <SealStamp tone="cleared" date={own?.submittedAt} />
                  ) : (
                    <StatusBadge status={own?.status ?? 'not_started'} />
                  )}
                  <Button size="sm" onClick={() => navigate('/e')}>
                    Back to the queue
                  </Button>
                </div>
              </div>
            </header>

            {submitted ? (
              <div className="mb-6">
                <InlineNote tone="verify" title="Your evaluation is submitted and final">
                  <p className="max-w-doc">
                    Submitted {dayTime(own?.submittedAt)} with a weighted total of {num(own?.weightedTotal ?? 0, 2)} of 5.
                    It cannot be edited by you or by the department. If you need a correction noted, ask the panel chair
                    to record it in the minutes.
                  </p>
                </InlineNote>
              </div>
            ) : null}

            {own?.outlier?.rationaleRequested && !own.outlier.rationale ? (
              <div className="mb-6">
                <InlineNote tone="hold" title="The panel chair has asked you to explain this score">
                  Your weighted total sits outside the variance threshold. Explaining the basis does not oblige you to
                  change it — the score stands unless you change it yourself.
                </InlineNote>
              </div>
            ) : null}

            {/* Split layout: proposal on the left, scorer on the right. */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-6 lg:max-h-[calc(100vh-220px)] lg:overflow-auto lg:pr-2 scroll-quiet">
                <section>
                  <h2 className="mb-2 text-h2 text-ink">The problem, as published</h2>
                  <p className="max-w-doc font-doc text-doc text-ink">{c.problem.whatHappensToday}</p>
                  <p className="mt-3 max-w-doc text-body text-ink-soft">
                    Baseline: {num(c.baseline.currentValue, 1)} {c.baseline.unit}. Target:{' '}
                    {num(c.outcome.magnitude, 1)} {c.outcome.unit}. Failure threshold:{' '}
                    {num(c.outcome.failureThreshold, 1)} {c.outcome.unit}.
                  </p>
                </section>

                <section>
                  <h2 className="mb-2 text-h2 text-ink">The proposal</h2>
                  <dl className="flex flex-col gap-4">
                    {[
                      { label: 'Understanding of the problem', value: a.solution.problemUnderstanding },
                      { label: 'Approach', value: a.solution.approach },
                      { label: 'What already exists', value: a.solution.existingSolution },
                      { label: 'What will be built', value: a.solution.proposedDevelopment },
                    ].map((row) => (
                      <div key={row.label}>
                        <dt className="text-label text-ink-soft">{row.label}</dt>
                        <dd className="mt-1 max-w-doc font-doc text-doc text-ink">{row.value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section>
                  <h2 className="mb-2 text-h2 text-ink">Pilot plan</h2>
                  <ol className="sheet-flat">
                    {a.pilotPlan.milestones.map((m, i) => (
                      <li key={`${m.name}-${i}`} className="ledger-row px-4 py-3">
                        <p className="text-micro text-ink-soft tnum">
                          Milestone {i + 1} · day {m.dayOffset} · {money(a.commercials.milestoneCostsPaise[i] ?? 0)}
                        </p>
                        <p className="mt-0.5 text-body text-ink">{m.name}</p>
                        <p className="mt-1 text-micro text-ink-soft">Deliverable: {m.deliverable}</p>
                        <p className="mt-0.5 text-micro text-ink-soft">Acceptance test: {m.acceptanceTest}</p>
                      </li>
                    ))}
                  </ol>
                  {a.pilotPlan.dependencies.length ? (
                    <p className="mt-2 text-micro text-ink-soft">
                      Dependencies: {a.pilotPlan.dependencies.join('; ')}
                    </p>
                  ) : null}
                </section>

                <KeyValueSheet
                  title="Commercials"
                  items={[
                    { label: 'Total proposed', value: <span className="tnum">{money(a.commercials.totalPaise)}</span> },
                    {
                      label: 'Published budget',
                      value: <span className="tnum">{money(c.pilot.budgetPaise)}</span>,
                      hint:
                        a.commercials.totalPaise > c.pilot.budgetPaise
                          ? 'Over budget. A justification is required and is below.'
                          : undefined,
                    },
                    { label: 'Cost basis', value: a.commercials.costBasis || '—' },
                    ...(a.commercials.overBudgetJustification
                      ? [{ label: 'Over-budget justification', value: a.commercials.overBudgetJustification }]
                      : []),
                  ]}
                />

                <KeyValueSheet
                  title="Data and security"
                  items={[
                    { label: 'Tier requested', value: a.dataSecurity.tier },
                    { label: 'Fields requested', value: a.dataSecurity.dataRequested.join(', ') || '—' },
                    { label: 'Processing location', value: a.dataSecurity.processingLocation || '—' },
                    { label: 'Sub-processors', value: a.dataSecurity.subProcessors.join(', ') || 'None declared' },
                    { label: 'Certifications', value: a.dataSecurity.certifications.join(', ') || 'None declared' },
                  ]}
                />

                <KeyValueSheet
                  title="Declarations"
                  items={[
                    {
                      label: 'Conflict',
                      value: a.declarations.conflict ? (a.declarations.conflictDetail ?? 'Declared') : 'None declared',
                    },
                    { label: 'Debarred', value: a.declarations.debarred ? 'Yes' : 'No' },
                    { label: 'Blacklisted', value: a.declarations.blacklisted ? 'Yes' : 'No' },
                    { label: 'Technology readiness', value: `${a.solution.trl} of 9` },
                  ]}
                />
              </div>

              <div className="lg:sticky lg:top-20 lg:self-start">
                <RubricScorer
                  rubric={rub}
                  scores={own?.scores ?? []}
                  rationaleMinChars={rationaleMinChars}
                  submitted={submitted}
                  busy={saveScore.isPending}
                  startAtCriterionId={own?.lastCriterionId}
                  error={
                    saveScore.error instanceof PrayogApiError
                      ? [saveScore.error.message, ...saveScore.error.details].join(' ')
                      : undefined
                  }
                  onSave={async (score) => {
                    await saveScore.mutateAsync(score, {
                      onSuccess: () =>
                        track({
                          name: 'criterion_scored',
                          evaluationId: evaluationId ?? '',
                          criterionId: score.criterionId,
                          score: score.score,
                        }),
                      onError: (err) => {
                        const api = err instanceof PrayogApiError ? err : null;
                        pushToast(
                          'seal',
                          api?.message ?? 'The score was not saved.',
                          'Your reasoning is preserved in the form.',
                        );
                      },
                    });
                  }}
                  onSubmit={() => setConfirming(true)}
                />

                <div className="mt-4">
                  {othersHiddenCount > 0 ? (
                    <InlineNote tone="neutral" title={`${othersHiddenCount} other evaluators are scoring this`}>
                      Their scores stay hidden until the panel releases results. You cannot see them, and they cannot see
                      yours.
                    </InlineNote>
                  ) : others.length > 0 ? (
                    <div className="sheet-flat">
                      <h3 className="border-b border-ink px-4 py-2 text-label text-ink">
                        Other evaluators, now that results are released
                      </h3>
                      <ul>
                        {others.map((o) => (
                          <li key={o.id} className="ledger-row flex items-baseline justify-between px-4 py-2">
                            <span className="text-body text-ink">Evaluator {o.evaluatorId.slice(-2)}</span>
                            <span className="text-data text-ink tnum">{num(o.weightedTotal ?? 0, 2)} of 5</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <Modal
              open={confirming}
              onClose={() => setConfirming(false)}
              title="Submit this evaluation?"
              description="Submission is final. Neither you nor the department can edit it afterwards."
              footer={
                <>
                  <Button onClick={() => setConfirming(false)}>Go back</Button>
                  <Button
                    tone="primary"
                    loading={submit.isPending}
                    loadingLabel="Submitting"
                    onClick={() =>
                      evaluationId &&
                      submit.mutate(evaluationId, {
                        onSuccess: () => {
                          track({ name: 'evaluation_submitted', evaluationId, applicationId: a.id });
                          setConfirming(false);
                          pushToast('verify', 'Evaluation submitted. It is final.');
                        },
                        onError: (err) => {
                          const api = err instanceof PrayogApiError ? err : null;
                          setConfirming(false);
                          pushToast('seal', api?.message ?? 'Not submitted.', api?.details.join(' '));
                        },
                      })
                    }
                  >
                    Submit the evaluation
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <p className="text-body text-ink">
                  You have scored all {rub.criteria.length} criteria with a written reason on each. Your weighted total
                  is {num(own?.weightedTotal ?? 0, 2)} of 5.
                </p>
                <ul className="sheet-flat">
                  {rub.criteria.map((crit) => {
                    const sc = own?.scores.find((x) => x.criterionId === crit.id);
                    return (
                      <li key={crit.id} className="ledger-row flex items-baseline justify-between px-4 py-2">
                        <span className="text-body text-ink">{crit.label}</span>
                        <span className="text-data text-ink tnum">
                          {sc?.score ?? '—'} of 5 · {crit.weightPercent}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Badge tone="hold">
                  Your own score stays visible to you. Other evaluators see it only once results are released.
                </Badge>
              </div>
            </Modal>
          </div>
        );
      }}
    </QueryState>
  );
}
