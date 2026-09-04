import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { policyNumber } from '@/config/policies';
import { useEvaluationPanel, useRecordConsensus, useRecordMinutes, useSession } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { PermissionGate } from '@/components/patterns/ApprovalBar';
import { Field, NumberInput, Textarea } from '@/components/ui/Field';
import { countOf, day, dayTime, num } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

/**
 * The pitch-day view. The session id in the route is a challenge id; a panel
 * belongs to exactly one challenge.
 */
export default function PanelSession() {
  const { sessionId } = useParams();
  const query = useEvaluationPanel(sessionId);
  const consensus = useRecordConsensus();
  const minutesMutation = useRecordMinutes();
  const session = useSession();
  const pushToast = useUi((s) => s.pushToast);

  const [current, setCurrent] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [varianceNote, setVarianceNote] = useState('');
  const [minutes, setMinutes] = useState('');

  const userId = session.data?.data.user?.id;

  return (
    <QueryState query={query} errorTitle="Unable to load this panel session." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { challenge: c, panel, evaluators, results, outlierThreshold } = payload.data;
        if (!panel) {
          return (
            <EmptyState
              title="No panel has been convened for this challenge."
              body="A panel is created once applications are shortlisted at gate 2."
              action={{ label: 'Back to your queue', to: '/e' }}
            />
          );
        }

        const isChair = panel.chairEvaluatorId === userId;
        const slots = results.slice(0, 8);
        const active = slots[current];
        const recorded = panel.consensus ?? [];

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb items={[{ label: 'Assignment queue', to: '/e' }, { label: `${c.caseId} panel` }]} />
            </div>

            <PageHeader
              title="Pitch day panel"
              lead={`${c.title} — ${slots.length} shortlisted applicants, scored against the rubric published with the challenge.`}
              servedAt={payload.servedAt}
              onRefresh={() => void query.refetch()}
              aside={
                isChair ? <Badge tone="verify">You are the panel chair</Badge> : <Badge tone="neutral">Panel member</Badge>
              }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
              {/* Agenda and time slots. */}
              <aside className="lg:sticky lg:top-20 lg:self-start">
                <div className="sheet-flat">
                  <div className="border-b border-ink px-4 py-2">
                    <h2 className="text-label text-ink">Agenda</h2>
                    <p className="mt-0.5 text-micro text-ink-soft">
                      {panel.sessionDate ? day(panel.sessionDate) : 'Not scheduled'} · 30 minutes each
                    </p>
                  </div>
                  <ol>
                    {slots.map((s, i) => {
                      const done = recorded.some((r) => r.applicationId === s.application.id);
                      return (
                        <li key={s.application.id} className="border-b border-rule last:border-b-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrent(i);
                              setScore(Number(s.mean.toFixed(2)));
                              setVarianceNote('');
                            }}
                            aria-current={i === current ? 'true' : undefined}
                            className={[
                              'flex w-full items-start gap-3 px-4 py-3 text-left',
                              i === current ? 'border-l-2 border-l-verify bg-verify-wash' : 'border-l-2 border-l-transparent hover:bg-ledger',
                            ].join(' ')}
                          >
                            <span aria-hidden className="mt-0.5 w-6 text-micro text-ink-soft tnum">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-body text-ink">{s.startup.tradeName}</span>
                              <span className="block text-micro text-ink-soft tnum">
                                mean {num(s.mean, 2)} · {countOf(s.evaluations.length, 'score')}
                              </span>
                              {done ? (
                                <span className="mt-1 block">
                                  <Badge tone="verify">Consensus recorded</Badge>
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="mt-4 sheet-flat">
                  <h2 className="border-b border-ink px-4 py-2 text-label text-ink">Panel</h2>
                  <ul>
                    {evaluators.map((e) => (
                      <li key={e.user.id} className="ledger-row px-4 py-2">
                        <p className="text-body text-ink">
                          {e.user.name}
                          {e.user.id === panel.chairEvaluatorId ? (
                            <span className="ml-2">
                              <Badge tone="verify">Chair</Badge>
                            </span>
                          ) : null}
                        </p>
                        <p className="text-micro text-ink-soft tnum">
                          {e.submitted} of {Math.max(0, e.totalAssigned - e.conflictCount)} scored
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div className="min-w-0">
                {!active ? (
                  <EmptyState
                    title="Nothing is on the agenda."
                    body="Applications appear here once they are shortlisted and scored."
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    <section className="sheet-flat">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink px-4 py-3">
                        <div>
                          <p className="text-micro text-ink-soft tnum">
                            Slot {current + 1} of {slots.length} · {active.application.caseId}
                          </p>
                          <h2 className="mt-0.5 text-h2 text-ink">{active.startup.tradeName}</h2>
                          <p className="mt-1 text-micro text-ink-soft">
                            {active.startup.city}, {active.startup.state} · {active.startup.capabilities.slice(0, 3).join(' · ')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={active.application.status} />
                          <Link
                            to={`/e/score/${active.application.id}`}
                            className="text-micro text-ink-soft underline underline-offset-2 hover:text-ink"
                          >
                            Open your own scoring
                          </Link>
                        </div>
                      </div>

                      <div className="px-4 py-4">
                        <h3 className="text-label text-ink-soft">Panel scores</h3>
                        <ul className="mt-2">
                          {active.evaluations.map((e) => (
                            <li
                              key={e.id}
                              className={[
                                'flex flex-wrap items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0',
                                e.isOutlier ? 'border-l-2 border-l-hold bg-hold-wash pl-2' : '',
                              ].join(' ')}
                            >
                              <span className="text-body text-ink">
                                {e.evaluatorName}
                                {e.isOutlier ? (
                                  <span className="ml-2">
                                    <Badge tone="hold">Outside the {outlierThreshold}-point threshold</Badge>
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-data text-ink tnum">
                                {num(e.weightedTotal ?? 0, 2)} of 5
                                <span className="ml-2 text-micro text-ink-soft">
                                  {e.deviation >= 0 ? '+' : ''}
                                  {num(e.deviation, 2)} from mean
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="rule-total mt-2 flex items-baseline justify-between py-2">
                          <span className="text-body font-medium text-ink">Panel mean</span>
                          <span className="text-data font-medium text-ink tnum">{num(active.mean, 2)} of 5</span>
                        </div>
                      </div>
                    </section>

                    {/* Private notes stay on this device and are never submitted. */}
                    <section>
                      <Field
                        label="Your private notes"
                        hint="These are yours alone. They are not submitted, not scored and not visible to the panel or the applicant."
                      >
                        {({ id }) => (
                          <Textarea
                            id={id}
                            rows={4}
                            value={notes[active.application.id] ?? ''}
                            onChange={(e) => setNotes((n) => ({ ...n, [active.application.id]: e.target.value }))}
                          />
                        )}
                      </Field>
                    </section>

                    <section>
                      <h3 className="mb-3 text-h3 text-ink">Consensus</h3>
                      <PermissionGate
                        allowed={isChair}
                        action="score"
                        resource="evaluation"
                        viewNote="You can see the panel scores and take your own notes."
                      >
                        <div className="sheet-flat px-4 py-4">
                          <div className="flex flex-col gap-4">
                            <Field
                              label="Consensus score"
                              required
                              hint="Between 0 and 5. It does not have to equal the mean, but a departure needs a variance note."
                            >
                              {({ id }) => (
                                <NumberInput
                                  id={id}
                                  min={0}
                                  max={5}
                                  step={0.01}
                                  value={score || Number(active.mean.toFixed(2))}
                                  onChange={(e) => setScore(Number(e.target.value))}
                                />
                              )}
                            </Field>
                            <Field
                              label="Variance note"
                              required
                              hint="Record where the panel disagreed and how it was resolved. This is read by anyone auditing the award."
                            >
                              {({ id }) => (
                                <Textarea
                                  id={id}
                                  rows={4}
                                  value={varianceNote}
                                  onChange={(e) => setVarianceNote(e.target.value)}
                                />
                              )}
                            </Field>
                            <div>
                              <Button
                                tone="primary"
                                unavailableReason={
                                  varianceNote.trim().length < 20
                                    ? `Write ${20 - varianceNote.trim().length} more characters on the variance.`
                                    : undefined
                                }
                                loading={consensus.isPending}
                                loadingLabel="Recording"
                                onClick={() =>
                                  consensus.mutate(
                                    {
                                      panelId: panel.id,
                                      applicationId: active.application.id,
                                      score: score || Number(active.mean.toFixed(2)),
                                      varianceNote,
                                    },
                                    {
                                      onSuccess: () => {
                                        pushToast('verify', 'Consensus recorded.');
                                        setVarianceNote('');
                                      },
                                      onError: (err) => {
                                        const api = err instanceof PrayogApiError ? err : null;
                                        pushToast(
                                          'seal',
                                          api?.message ?? 'The consensus was not recorded.',
                                          api?.details.join(' '),
                                        );
                                      },
                                    },
                                  )
                                }
                              >
                                Record the consensus score
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PermissionGate>
                    </section>

                    {recorded.length > 0 ? (
                      <section>
                        <h3 className="mb-3 text-h3 text-ink">Consensus recorded so far</h3>
                        <ul className="sheet-flat">
                          {recorded.map((r) => {
                            const app = results.find((x) => x.application.id === r.applicationId);
                            return (
                              <li key={`${r.applicationId}-${r.at}`} className="ledger-row px-4 py-3">
                                <div className="flex items-baseline justify-between gap-4">
                                  <span className="text-body text-ink">{app?.startup.tradeName ?? r.applicationId}</span>
                                  <span className="text-data text-ink tnum">{num(r.score, 2)} of 5</span>
                                </div>
                                <p className="mt-1 max-w-doc text-body text-ink-soft">{r.varianceNote}</p>
                                <p className="text-micro text-ink-soft">
                                  {r.recordedBy} · {dayTime(r.at)}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ) : null}

                    <section>
                      <h3 className="mb-3 text-h3 text-ink">Minutes</h3>
                      {panel.minutes ? (
                        <div className="sheet-flat">
                          <p className="border-b border-ink px-4 py-2 text-micro text-ink-soft tnum">
                            Recorded {dayTime(panel.minutesRecordedAt)}
                          </p>
                          <p className="max-w-doc px-4 py-4 font-doc text-doc text-ink">{panel.minutes}</p>
                        </div>
                      ) : (
                        <PermissionGate allowed={isChair} action="score" resource="evaluation">
                          <div className="sheet-flat px-4 py-4">
                            <InlineNote tone="hold" title="Minutes are a gate 3 precondition">
                              The award cannot be made until they exist. Record the consensus, the disagreements and the
                              recommendation.
                            </InlineNote>
                            <div className="mt-4">
                              <Field
                                label="Minutes"
                                required
                                hint={`At least 80 characters. Minimum ${policyNumber('evaluation.minEvaluators')} completed scores are needed per application before gate 3 can clear.`}
                                aside={`${minutes.trim().length} / 80`}
                              >
                                {({ id }) => (
                                  <Textarea id={id} rows={8} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                                )}
                              </Field>
                              <div className="mt-3">
                                <Button
                                  tone="primary"
                                  unavailableReason={
                                    minutes.trim().length < 80
                                      ? `Write ${80 - minutes.trim().length} more characters of minutes.`
                                      : undefined
                                  }
                                  loading={minutesMutation.isPending}
                                  loadingLabel="Recording"
                                  onClick={() =>
                                    minutesMutation.mutate(
                                      { panelId: panel.id, minutes },
                                      {
                                        onSuccess: () => pushToast('verify', 'Minutes recorded.'),
                                        onError: (err) => {
                                          const api = err instanceof PrayogApiError ? err : null;
                                          pushToast(
                                            'seal',
                                            api?.message ?? 'Minutes were not recorded.',
                                            'Your text is preserved.',
                                          );
                                        },
                                      },
                                    )
                                  }
                                >
                                  Record the minutes
                                </Button>
                              </div>
                            </div>
                          </div>
                        </PermissionGate>
                      )}
                    </section>

                    <KeyValueSheet
                      title="Session"
                      dense
                      items={[
                        { label: 'Challenge', value: `${c.caseId} — ${c.title}` },
                        { label: 'Rubric', value: panel.rubricId },
                        { label: 'Chair', value: evaluators.find((e) => e.user.id === panel.chairEvaluatorId)?.user.name ?? '—' },
                        { label: 'Results released', value: panel.resultsReleased ? 'Yes' : 'Not yet' },
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
