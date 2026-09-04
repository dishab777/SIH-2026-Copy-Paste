import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { rubric } from '@/config/rubrics';
import { useEvaluationPanel, useRecordMinutes, useReleaseResults, useRequestRationale } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { ComparisonMatrix, KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb, Tabs } from '@/components/ui/Nav';
import { Modal } from '@/components/ui/Overlay';
import { Field, Textarea } from '@/components/ui/Field';
import { ProgressRing } from '@/components/ui/Feedback';
import { day, dayTime, num, countOf } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function EvaluationPanelPage() {
  const { id } = useParams();
  const query = useEvaluationPanel(id);
  const release = useReleaseResults();
  const recordMinutes = useRecordMinutes();
  const requestRationale = useRequestRationale();
  const pushToast = useUi((s) => s.pushToast);

  const [tab, setTab] = useState('panel');
  const [releasing, setReleasing] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [minutes, setMinutes] = useState('');

  return (
    <QueryState query={query} errorTitle="Unable to load the evaluation panel." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { challenge: c, panel, evaluators, results, outlierThreshold, minEvaluators } = payload.data;
        const rub = (() => {
          try {
            return rubric(panel?.rubricId ?? c.rubricId);
          } catch {
            return null;
          }
        })();

        const outliers = results.flatMap((r) => r.evaluations.filter((e) => e.isOutlier).map((e) => ({ r, e })));
        const incomplete = results.filter((r) => !r.complete);
        const coiOutstanding = evaluators.reduce((s, e) => s + (e.totalAssigned - e.declaredCount), 0);

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb
                items={[
                  { label: 'Challenge pipeline', to: '/d/challenges' },
                  { label: c.caseId, to: `/d/challenges/${c.id}` },
                  { label: 'Evaluation' },
                ]}
              />
            </div>

            <PageHeader
              title="Evaluation panel"
              lead={`${c.title} — scored against ${rub?.label ?? c.rubricId} ${rub?.version ?? ''}, the rubric published with the challenge.`}
              servedAt={payload.servedAt}
              onRefresh={() => void query.refetch()}
              aside={
                panel ? (
                  <div className="flex items-center gap-3">
                    {panel.resultsReleased ? (
                      <Badge tone="verify">Results released</Badge>
                    ) : (
                      <Button tone="primary" onClick={() => setReleasing(true)}>
                        Release results
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            />

            {!panel ? (
              <EmptyState
                title="No panel has been convened."
                body="A panel is created once applications are shortlisted at gate 2. Until then there is nothing to score."
                action={{ label: 'Open the screening ledger', to: `/d/challenges/${c.id}/applications` }}
              />
            ) : (
              <>
                {coiOutstanding > 0 ? (
                  <div className="mb-6">
                    <InlineNote tone="seal" title={`${countOf(coiOutstanding, 'conflict declaration is', 'conflict declarations are')} outstanding`}>
                      An evaluator cannot open a proposal, or see the applicant name, until their declaration is
                      recorded. Gate 3 cannot clear while any declaration is missing.
                    </InlineNote>
                  </div>
                ) : null}

                <Tabs
                  items={[
                    { id: 'panel', label: 'Panel', count: evaluators.length },
                    { id: 'scores', label: 'Score comparison', count: results.length },
                    { id: 'outliers', label: 'Variance', count: outliers.length },
                    { id: 'minutes', label: 'Minutes' },
                  ]}
                  value={tab}
                  onChange={setTab}
                >
                  {tab === 'panel' ? (
                    <div className="flex flex-col gap-6">
                      <KeyValueSheet
                        headingLevel={2}
                        title="Session"
                        items={[
                          { label: 'Panel chair', value: evaluators.find((e) => e.user.id === panel.chairEvaluatorId)?.user.name ?? '—' },
                          { label: 'Session date', value: panel.sessionDate ? day(panel.sessionDate) : 'Not scheduled' },
                          { label: 'Rubric in force', value: `${rub?.label ?? panel.rubricId} ${rub?.version ?? ''}` },
                          {
                            label: 'Minimum evaluators per application',
                            value: <span className="tnum">{minEvaluators}</span>,
                            citation: 'PRAYOG programme SOP, clause 4',
                          },
                          {
                            label: 'Outlier threshold',
                            value: `${outlierThreshold} points from the panel mean`,
                            citation: 'PRAYOG programme SOP, clause 4',
                          },
                        ]}
                      />

                      <section>
                        <h2 className="mb-3 text-h2 text-ink">Evaluators</h2>
                        <ul className="sheet-flat">
                          {evaluators.map((e) => {
                            const undeclared = e.totalAssigned - e.declaredCount;
                            return (
                              <li
                                key={e.user.id}
                                className={[
                                  'ledger-row border-l-2 px-4 py-3',
                                  undeclared > 0 ? 'border-l-seal bg-seal-wash' : 'border-l-transparent',
                                ].join(' ')}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="text-body text-ink">
                                      {e.user.name}
                                      {e.user.id === panel.chairEvaluatorId ? (
                                        <span className="ml-2">
                                          <Badge tone="verify">Chair</Badge>
                                        </span>
                                      ) : null}
                                    </p>
                                    <p className="mt-0.5 text-micro text-ink-soft">{e.user.designation}</p>
                                    <p className="mt-1 text-micro text-ink-soft tnum">
                                      {e.declaredCount} of {e.totalAssigned} declarations recorded ·{' '}
                                      {e.conflictCount} conflicts declared
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-4">
                                    <ProgressRing
                                      value={e.submitted}
                                      max={Math.max(1, e.totalAssigned - e.conflictCount)}
                                      label={`Scoring progress for ${e.user.name}`}
                                    />
                                    <span className="text-micro text-ink-soft tnum">
                                      {e.submitted} of {Math.max(0, e.totalAssigned - e.conflictCount)} scored
                                    </span>
                                    {undeclared > 0 ? <Badge tone="seal">{undeclared} declarations missing</Badge> : null}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    </div>
                  ) : null}

                  {tab === 'scores' ? (
                    <div className="flex flex-col gap-6">
                      {!panel.resultsReleased ? (
                        <InlineNote tone="hold" title="Not released yet">
                          Applicants cannot see these scores, and evaluators can only see their own. Releasing is a
                          deliberate act with a confirmation that says exactly what becomes public.
                        </InlineNote>
                      ) : null}

                      {incomplete.length > 0 ? (
                        <InlineNote tone="seal" title={`${countOf(incomplete.length, 'application is', 'applications are')} below the minimum`}>
                          Gate 3 needs at least {minEvaluators} completed, conflict-free scores per application:{' '}
                          {incomplete.map((r) => r.startup.tradeName).join(', ')}.
                        </InlineNote>
                      ) : null}

                      {rub ? (
                        <ComparisonMatrix
                          rowHeader="Criterion"
                          columns={results.slice(0, 6).map((r, i) => ({
                            key: r.application.id,
                            label: `#${i + 1} ${r.startup.tradeName}`,
                            sublabel: `mean ${num(r.mean, 2)}`,
                          }))}
                          rows={[
                            ...rub.criteria.map((crit) => ({
                              key: crit.id,
                              label: crit.label,
                              detail: `${crit.weightPercent}% weight`,
                              cells: Object.fromEntries(
                                results.slice(0, 6).map((r) => {
                                  const scores = r.evaluations
                                    .map((e) => e.scores.find((s) => s.criterionId === crit.id)?.score)
                                    .filter((s): s is number => typeof s === 'number');
                                  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                                  return [
                                    r.application.id,
                                    mean === null ? (
                                      <span className="text-ink-soft">not scored</span>
                                    ) : (
                                      <span className="tnum">
                                        {num(mean, 1)}
                                        <span className="ml-2 text-micro text-ink-soft">
                                          {scores.map((s) => s).join(' · ')}
                                        </span>
                                      </span>
                                    ),
                                  ];
                                }),
                              ),
                            })),
                            {
                              key: 'total',
                              label: 'Weighted total',
                              cells: Object.fromEntries(
                                results.slice(0, 6).map((r) => [
                                  r.application.id,
                                  <span key={r.application.id} className="text-data text-ink tnum">
                                    {num(r.mean, 2)} of 5
                                  </span>,
                                ]),
                              ),
                            },
                          ]}
                        />
                      ) : null}

                      <section>
                        <h2 className="mb-3 text-h2 text-ink">Ranking</h2>
                        <ol className="sheet-flat">
                          {results.map((r, i) => (
                            <li key={r.application.id} className="ledger-row px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-4">
                                  <span aria-hidden className="w-6 text-data text-ink-soft tnum">
                                    {i + 1}
                                  </span>
                                  <span className="min-w-0">
                                    <Link
                                      to={`/d/challenges/${c.id}/applications/${r.application.id}`}
                                      className="block text-body text-ink underline underline-offset-2"
                                    >
                                      {r.startup.tradeName}
                                    </Link>
                                    <span className="type-register block text-micro text-ink-soft">{r.application.caseId}</span>
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-4">
                                  <StatusBadge status={r.application.status} />
                                  {!r.complete ? <Badge tone="seal">Below the minimum</Badge> : null}
                                  <span className="text-data text-ink tnum">{num(r.mean, 2)} of 5</span>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    </div>
                  ) : null}

                  {tab === 'outliers' ? (
                    <div className="flex flex-col gap-4">
                      <p className="max-w-doc text-body text-ink-soft">
                        A score more than {outlierThreshold} points from the panel mean is flagged. A flag is not an
                        accusation — the chair may ask the evaluator to explain the basis, and the score is retained
                        unless the evaluator changes it themselves.
                      </p>
                      {outliers.length === 0 ? (
                        <EmptyState
                          title="No scores are outside the variance threshold."
                          body={`Every submitted score sits within ${outlierThreshold} points of its panel mean.`}
                        />
                      ) : (
                        <ul className="sheet-flat">
                          {outliers.map(({ r, e }) => (
                            <li key={e.id} className="ledger-row border-l-2 border-l-hold bg-hold-wash px-4 py-4">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 max-w-doc">
                                  <p className="text-body text-ink">
                                    {e.evaluatorName} on {r.startup.tradeName}
                                  </p>
                                  <p className="mt-0.5 text-micro text-ink-soft tnum">
                                    Scored {num(e.weightedTotal ?? 0, 2)} against a panel mean of {num(r.mean, 2)} —
                                    deviation {num(Math.abs(e.deviation), 2)}
                                  </p>
                                  {e.outlier?.rationale ? (
                                    <p className="mt-2 max-w-doc border-l-2 border-l-verify bg-verify-wash px-3 py-2 font-doc text-doc text-ink">
                                      {e.outlier.rationale}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="shrink-0">
                                  {e.outlier?.rationaleRequested ? (
                                    <Badge tone="verify">Rationale requested</Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        requestRationale.mutate(e.id, {
                                          onSuccess: () =>
                                            pushToast('verify', `${e.evaluatorName} has been asked to explain the score.`),
                                        })
                                      }
                                    >
                                      Request a rationale
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}

                  {tab === 'minutes' ? (
                    <div className="flex flex-col gap-4">
                      <p className="max-w-doc text-body text-ink-soft">
                        Minutes are a gate 3 precondition. They record the consensus, any material disagreement, and the
                        panel recommendation — so the award can be reconstructed years later.
                      </p>
                      {panel.minutes ? (
                        <section className="sheet-flat">
                          <div className="flex items-baseline justify-between border-b border-ink px-4 py-2">
                            <h3 className="text-label text-ink">Recorded minutes</h3>
                            <span className="text-micro text-ink-soft tnum">{dayTime(panel.minutesRecordedAt)}</span>
                          </div>
                          <p className="max-w-doc px-4 py-4 font-doc text-doc text-ink">{panel.minutes}</p>
                        </section>
                      ) : (
                        <InlineNote tone="hold" title="No minutes recorded">
                          Gate 3 cannot clear until minutes exist.
                        </InlineNote>
                      )}

                      {panel.consensus?.length ? (
                        <section className="sheet-flat">
                          <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Consensus scores</h3>
                          <ul>
                            {panel.consensus.map((con) => {
                              const app = results.find((r) => r.application.id === con.applicationId);
                              return (
                                <li key={`${con.applicationId}-${con.at}`} className="ledger-row px-4 py-3">
                                  <div className="flex items-baseline justify-between gap-4">
                                    <span className="text-body text-ink">{app?.startup.tradeName ?? con.applicationId}</span>
                                    <span className="text-data text-ink tnum">{num(con.score, 2)} of 5</span>
                                  </div>
                                  <p className="mt-1 max-w-doc text-body text-ink-soft">{con.varianceNote}</p>
                                  <p className="text-micro text-ink-soft">
                                    Recorded by {con.recordedBy} on {dayTime(con.at)}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      ) : null}

                      <div>
                        <Button
                          onClick={() => {
                            setMinutes(panel.minutes ?? '');
                            setMinutesOpen(true);
                          }}
                        >
                          {panel.minutes ? 'Revise the minutes' : 'Record the minutes'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Tabs>
              </>
            )}

            <Modal
              open={minutesOpen}
              onClose={() => setMinutesOpen(false)}
              title="Evaluation minutes"
              description="These are attached to the gate 3 record and are readable by anyone auditing the award."
              width="lg"
              footer={
                <>
                  <Button onClick={() => setMinutesOpen(false)}>Cancel</Button>
                  <Button
                    tone="primary"
                    unavailableReason={
                      minutes.trim().length < 80
                        ? `Write ${80 - minutes.trim().length} more characters of minutes.`
                        : undefined
                    }
                    loading={recordMinutes.isPending}
                    loadingLabel="Recording"
                    onClick={() =>
                      panel &&
                      recordMinutes.mutate(
                        { panelId: panel.id, minutes },
                        {
                          onSuccess: () => {
                            setMinutesOpen(false);
                            pushToast('verify', 'Minutes recorded.');
                          },
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            pushToast('seal', api?.message ?? 'Minutes were not recorded.', 'Your text is preserved.');
                          },
                        },
                      )
                    }
                  >
                    Record the minutes
                  </Button>
                </>
              }
            >
              <Field
                label="Minutes"
                required
                hint="At least 80 characters. Record the consensus, the disagreements and the recommendation."
                aside={`${minutes.trim().length} / 80`}
              >
                {({ id: fid, describedBy, invalid }) => (
                  <Textarea
                    id={fid}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    rows={10}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                )}
              </Field>
            </Modal>

            <Modal
              open={releasing}
              onClose={() => setReleasing(false)}
              title="Release evaluation results"
              description="Releasing is deliberate and cannot be undone."
              footer={
                <>
                  <Button onClick={() => setReleasing(false)}>Cancel</Button>
                  <Button
                    tone="primary"
                    loading={release.isPending}
                    loadingLabel="Releasing"
                    onClick={() =>
                      panel &&
                      release.mutate(panel.id, {
                        onSuccess: (res) => {
                          setReleasing(false);
                          pushToast('verify', res.message ?? 'Results released.');
                        },
                        onError: (err) => {
                          const api = err instanceof PrayogApiError ? err : null;
                          setReleasing(false);
                          pushToast('seal', api?.message ?? 'Results were not released.', api?.details.join(' '));
                        },
                      })
                    }
                  >
                    Release results
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-label text-ink-soft">What becomes visible to applicants</p>
                  <ul className="mt-1 list-disc pl-5 text-body text-ink">
                    <li>Their own weighted total and their score on every published criterion</li>
                    <li>The written rationale on each of their own criteria</li>
                    <li>Their rank relative to the field, without other applicants being named</li>
                  </ul>
                </div>
                <div>
                  <p className="text-label text-ink-soft">What stays private</p>
                  <ul className="mt-1 list-disc pl-5 text-body text-ink">
                    <li>Other applicants&rsquo; proposals, scores and rationales</li>
                    <li>Which evaluator gave which score</li>
                    <li>Internal panel discussion beyond what is written into the minutes</li>
                  </ul>
                </div>
                <p className="text-micro text-ink-soft">
                  Evaluators will also be able to see each other&rsquo;s scores from this point.
                </p>
              </div>
            </Modal>
          </div>
        );
      }}
    </QueryState>
  );
}
