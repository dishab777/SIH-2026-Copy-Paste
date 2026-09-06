import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useScoringWorkspace,
  useSaveScore,
  useStartEvaluation,
  useSubmitEvaluation,
} from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote, ErrorState } from '@/components/ui/Feedback';
import { RubricScorer } from '@/components/domain/RubricScorer';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { Modal } from '@/components/ui/Overlay';
import { SealStamp } from '@/components/domain/SealStamp';
import { countOf, dayTime, money, num } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

/**
 * A section of the document you are judging, set as a document.
 *
 * The rubric beside it is interface — fields, a scale, a save. This is paper,
 * and it should read as paper: a titled sheet with a ruled head, not a bare
 * heading over a paragraph on the page ground.
 */
function Paper({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="sheet-flat overflow-hidden rounded-block">
      <header className="border-b border-ink bg-ledger px-4 py-3">
        <p className="field-label !text-saffron-ink">{eyebrow}</p>
        <h2 className="mt-0.5 font-display text-h3 text-ink">{title}</h2>
      </header>
      <div className="px-4 py-5">{children}</div>
    </section>
  );
}

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
        <div>
          <PageHeader
            eyebrow="Closed to you"
            title="Declare conflicts before opening this proposal"
            lead="The applicant identity and the proposal stay closed until your declaration is on the record. That is not a permissions quirk — it is what makes the panel independent."
            breadcrumb={<Breadcrumb tone="deep" items={[{ label: 'Assignment queue', to: '/e' }]} />}
          />
          <div className="mx-auto max-w-[760px]">
            <InlineNote tone="seal" title="Nothing here has been opened">
              <p className="max-w-doc">{api.details.join(' ')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button tone="primary" onClick={() => navigate(`/e/coi/${appId}`)}>
                  Go to the declaration
                </Button>
                <Button onClick={() => navigate('/e')}>Back to your queue</Button>
              </div>
            </InlineNote>
          </div>
        </div>
      );
    }
    if (api?.code === 'RECUSED') {
      return (
        <div>
          <PageHeader
            eyebrow="Closed to you"
            title="You are recused from this application"
            lead="You declared a conflict on it. The programme management unit has been notified and will reassign it; your other assignments are unaffected."
            breadcrumb={<Breadcrumb tone="deep" items={[{ label: 'Assignment queue', to: '/e' }]} />}
          />
          <div className="mx-auto max-w-[760px]">
            <InlineNote tone="seal" title="This proposal was never opened to you">
              <p className="max-w-doc">{api.details.join(' ')}</p>
              <div className="mt-4">
                <Button tone="primary" onClick={() => navigate('/e')}>
                  Back to your queue
                </Button>
              </div>
            </InlineNote>
          </div>
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
            <PageHeader
              eyebrow={`Scoring · ${rub.label} ${rub.version}`}
              title={c.title}
              lead={`Scored against the rubric published with the challenge, unchanged. Each of the ${rub.criteria.length} criteria carries its own weight and needs a written reason.`}
              breadcrumb={
                <Breadcrumb tone="deep" items={[{ label: 'Assignment queue', to: '/e' }, { label: a.caseId }]} />
              }
              aside={
                submitted ? (
                  <SealStamp tone="cleared" date={own?.submittedAt} />
                ) : (
                  <span className="flex flex-col items-end gap-2">
                    <StatusBadge status={own?.status ?? 'not_started'} />
                    <Button size="sm" onClick={() => navigate('/e')}>
                      Back to the queue
                    </Button>
                  </span>
                )
              }
            />

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

            {/*
             * Proposal on the left, scorer on the right. The proposal column
             * used to cap its own height and scroll inside itself, which meant
             * the page had two scrollbars and the wheel moved whichever one the
             * pointer was over. It scrolls with the page now; the scorer is
             * what sticks, because that is the thing you keep reaching for.
             */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <div className="flex min-w-0 flex-col gap-6">
                <Paper title="The problem, as published" eyebrow="Published with the challenge">
                  <p className="max-w-doc font-doc text-doc text-ink">{c.problem.whatHappensToday}</p>
                  <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-sheet border border-rule bg-rule md:grid-cols-3">
                    {[
                      { label: 'Baseline today', value: `${num(c.baseline.currentValue, 1)} ${c.baseline.unit}` },
                      { label: 'Target', value: `${num(c.outcome.magnitude, 1)} ${c.outcome.unit}` },
                      { label: 'Failure threshold', value: `${num(c.outcome.failureThreshold, 1)} ${c.outcome.unit}` },
                    ].map((cell) => (
                      <div key={cell.label} className="bg-ledger px-3 py-2.5">
                        <dt className="field-label">{cell.label}</dt>
                        <dd className="mt-0.5 text-data text-ink tnum">{cell.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Paper>

                <Paper title="The proposal" eyebrow="In the applicant's own words">
                  <dl className="flex flex-col gap-5">
                    {[
                      { label: 'Understanding of the problem', value: a.solution.problemUnderstanding },
                      { label: 'Approach', value: a.solution.approach },
                      { label: 'What already exists', value: a.solution.existingSolution },
                      { label: 'What will be built', value: a.solution.proposedDevelopment },
                    ].map((row) => (
                      <div key={row.label} className="border-l-2 border-l-rule pl-4">
                        <dt className="field-label">{row.label}</dt>
                        <dd className="mt-1.5 max-w-doc font-doc text-doc text-ink">{row.value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </Paper>

                <section className="sheet-flat overflow-hidden rounded-block">
                  <header className="border-b border-ink bg-ledger px-4 py-3">
                    <p className="field-label !text-saffron-ink">{countOf(a.pilotPlan.milestones.length, 'milestone')}</p>
                    <h2 className="mt-0.5 font-display text-h3 text-ink">Pilot plan</h2>
                  </header>
                  <ol>
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
                    <p className="border-t border-rule bg-ledger px-4 py-3 text-micro text-ink-soft">
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

              <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20">
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

                <div>
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
