import { useState } from 'react';
import { useAdminRubrics, useSaveRubric } from '@/services/hooks';
import type { RubricDefinition } from '@/config/rubrics';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Field, NumberInput, Textarea } from '@/components/ui/Field';
import { RubricScorer } from '@/components/domain/RubricScorer';
import { countOf, day, num } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function AdminRubrics() {
  const query = useAdminRubrics();
  const saveRubric = useSaveRubric();
  const pushToast = useUi((s) => s.pushToast);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<RubricDefinition['criteria'] | null>(null);
  const [preview, setPreview] = useState(false);

  return (
    <div>
      <PageHeader
        title="Evaluation rubrics"
        lead="Criteria, weights and anchored descriptors. A rubric is published with the challenge and used unchanged afterwards, so what an applicant reads is what they are scored against."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState query={query} errorTitle="Unable to load the rubrics." loading={<PanelSkeleton lines={10} />}>
        {(payload) => {
          const selected = payload.data.find((r) => r.rubric.id === selectedId);
          const working = criteria ?? selected?.rubric.criteria ?? [];
          const total = working.reduce((s, c) => s + c.weightPercent, 0);
          const balanced = total === 100;

          return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
              <aside>
                <ul className="sheet-flat">
                  {payload.data.map((r) => (
                    <li key={r.rubric.id} className="border-b border-rule last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(r.rubric.id);
                          setCriteria(structuredClone(r.rubric.criteria) as RubricDefinition['criteria']);
                        }}
                        className={[
                          'w-full px-4 py-3 text-left',
                          r.rubric.id === selectedId
                            ? 'border-l-2 border-l-verify bg-verify-wash'
                            : 'border-l-2 border-l-transparent hover:bg-ledger',
                        ].join(' ')}
                      >
                        <p className="text-body text-ink">
                          {r.rubric.label} <span className="text-micro text-ink-soft">{r.rubric.version}</span>
                        </p>
                        <p className="mt-0.5 text-micro text-ink-soft">{r.rubric.appliesTo}</p>
                        <p className="mt-1 flex items-center gap-2 text-micro text-ink-soft tnum">
                          <Badge tone={r.weightTotal === 100 ? 'verify' : 'seal'}>{r.weightTotal}%</Badge>
                          {countOf(r.usedByChallenges.length, 'challenge')} · effective {day(r.rubric.effectiveFrom)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="min-w-0">
                {!selected ? (
                  <EmptyState
                    title="Choose a rubric to edit."
                    body="Weights must total exactly 100 percent. The server refuses anything else, so a half-finished rubric can never reach an applicant."
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-doc">
                        <h2 className="text-h2 text-ink">
                          {selected.rubric.label} {selected.rubric.version}
                        </h2>
                        <p className="mt-1 text-body text-ink-soft">{selected.rubric.appliesTo}</p>
                        <p className="mt-1 text-micro text-ink-soft">
                          Owner: {selected.rubric.owner} · effective {day(selected.rubric.effectiveFrom)}
                        </p>
                      </div>
                      <Button onClick={() => setPreview(true)}>Preview the evaluator screen</Button>
                    </div>

                    {selected.usedByChallenges.length > 0 ? (
                      <InlineNote tone="hold" title={`In use by ${countOf(selected.usedByChallenges.length, 'challenge')}`}>
                        {selected.usedByChallenges.slice(0, 8).join(', ')}
                        {selected.usedByChallenges.length > 8 ? '…' : ''}. Published challenges keep the version they
                        were published with; a change here applies to challenges published afterwards.
                      </InlineNote>
                    ) : null}

                    {!balanced ? (
                      <InlineNote tone="seal" title="Evaluation criteria must total 100%">
                        They currently total {total}%. Adjust the weights by {Math.abs(100 - total)} percentage points.
                        Until they balance, this rubric cannot be saved.
                      </InlineNote>
                    ) : null}

                    <ul className="flex flex-col gap-4">
                      {working.map((crit, i) => (
                        <li key={crit.id} className="sheet-flat px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 max-w-doc">
                              <p className="text-micro text-ink-soft tnum">Criterion {i + 1} · {crit.id}</p>
                              <p className="mt-0.5 text-body text-ink">{crit.label}</p>
                              <p className="mt-1 text-micro text-ink-soft">{crit.definition}</p>
                            </div>
                            <div className="w-[140px] shrink-0">
                              <Field label="Weight" aside="%">
                                {({ id }) => (
                                  <NumberInput
                                    id={id}
                                    min={0}
                                    max={100}
                                    value={crit.weightPercent}
                                    onChange={(e) =>
                                      setCriteria((c) =>
                                        (c ?? working).map((x, j) =>
                                          j === i ? { ...x, weightPercent: Number(e.target.value) } : x,
                                        ),
                                      )
                                    }
                                  />
                                )}
                              </Field>
                            </div>
                          </div>

                          <details className="mt-3">
                            <summary className="cursor-pointer text-label text-ink-soft">
                              Anchored descriptors, 0 to 5
                            </summary>
                            <ul className="mt-2">
                              {crit.anchors.map((anchor, ai) => (
                                <li key={anchor.score} className="border-t border-rule py-2">
                                  <div className="flex items-start gap-3">
                                    <span className="w-6 shrink-0 text-data text-ink tnum">{anchor.score}</span>
                                    <Textarea
                                      rows={2}
                                      aria-label={`Descriptor for score ${anchor.score} on ${crit.label}`}
                                      value={anchor.descriptor}
                                      onChange={(e) =>
                                        setCriteria((c) =>
                                          (c ?? working).map((x, j) =>
                                            j === i
                                              ? {
                                                  ...x,
                                                  anchors: x.anchors.map((an, k) =>
                                                    k === ai ? { ...an, descriptor: e.target.value } : an,
                                                  ),
                                                }
                                              : x,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-2 text-micro text-ink-soft">
                              Evidence hint shown to evaluators: {crit.evidenceHint}
                            </p>
                          </details>
                        </li>
                      ))}
                    </ul>

                    <div className="sheet-flat">
                      <div className="rule-total flex items-baseline justify-between px-4 py-3">
                        <span className="text-body font-medium text-ink">Total weight</span>
                        <span className={['text-data font-medium tnum', balanced ? 'text-verify' : 'text-seal'].join(' ')}>
                          {num(total)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        tone="primary"
                        unavailableReason={balanced ? undefined : 'Weights must total exactly 100 percent.'}
                        loading={saveRubric.isPending}
                        loadingLabel="Saving"
                        onClick={() =>
                          saveRubric.mutate(
                            { id: selected.rubric.id, criteria: working },
                            {
                              onSuccess: () => pushToast('verify', 'Rubric saved.'),
                              onError: (err) => {
                                const api = err instanceof PrayogApiError ? err : null;
                                pushToast('seal', api?.message ?? 'The rubric was not saved.', api?.details.join(' '));
                              },
                            },
                          )
                        }
                      >
                        Save this rubric
                      </Button>
                      {!balanced ? (
                        <p className="text-micro text-seal">Cannot continue. Evaluation criteria must total 100%.</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      </QueryState>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Evaluator screen preview"
        description="Exactly what an evaluator sees, with the anchored descriptors visible while scoring."
        width="lg"
        footer={<Button onClick={() => setPreview(false)}>Close</Button>}
      >
        {selectedId && criteria ? (
          <RubricScorer
            rubric={
              {
                ...(query.data?.data.find((r) => r.rubric.id === selectedId)?.rubric as RubricDefinition),
                criteria,
              } as RubricDefinition
            }
            scores={[]}
            rationaleMinChars={40}
            submitted={false}
            onSave={async () => {
              /* preview only */
            }}
            onSubmit={() => {
              /* preview only */
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
