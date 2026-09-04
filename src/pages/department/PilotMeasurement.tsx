import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMeasurement, useRecordAttribution } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { MeasurementChart, achievement, kpiStatus } from '@/components/charts/MeasurementChart';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { Field, Textarea } from '@/components/ui/Field';
import { day, num, percent } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function PilotMeasurement() {
  const { id } = useParams();
  const query = useMeasurement(id);
  const record = useRecordAttribution(id);
  const pushToast = useUi((s) => s.pushToast);
  const [explanation, setExplanation] = useState('');

  return (
    <div>
      <QueryState
        query={query}
        errorTitle="Unable to load the measurement."
        loading={<PanelSkeleton lines={10} />}
      >
        {(payload) => {
          const { pilot: p, kpis, dataQuality, confounders, attribution } = payload.data;
          const totalMissing = dataQuality.reduce((s, q) => s + q.missing, 0);

          return (
            <>
              <div className="mb-4">
                <Breadcrumb
                  items={[
                    { label: 'Pilots', to: '/d/pilots' },
                    { label: p.caseId, to: `/d/pilots/${p.id}` },
                    { label: 'Measurement' },
                  ]}
                />
              </div>

              <PageHeader
                title="Measurement"
                lead={`${p.title} — the baseline period against the pilot period, by the method published with the challenge. A validator will attempt to re-derive these figures from the raw records.`}
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={<LinkButton to={`/d/pilots/${p.id}`}>Back to the pilot</LinkButton>}
              />

              {kpis.length === 0 ? (
                <EmptyState
                  title="No measures recorded on this pilot."
                  body="A pilot cannot clear gate 5 without a measure. Add one on the pilot workspace before the measurement window closes."
                  action={{ label: 'Open the pilot', to: `/d/pilots/${p.id}` }}
                />
              ) : (
                <div className="flex flex-col gap-8">
                  <section aria-label="Results against target" className="sheet-flat">
                    <h2 className="border-b border-ink px-4 py-2 text-label text-ink">Every measure on this pilot</h2>
                    <ul>
                      {kpis.map((k) => (
                        <li key={k.id} className="ledger-row px-4 py-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-4">
                            <span className="min-w-0">
                              <span className="block text-body text-ink">{k.name}</span>
                              <span className="block text-micro text-ink-soft tnum">
                                baseline {num(k.baseline, 1)} {k.unit} · target {num(k.target, 1)} {k.unit} · measured{' '}
                                {k.frequency.toLowerCase()}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-4">
                              <span className="text-data text-ink tnum">
                                {num(k.current, 1)} {k.unit}
                              </span>
                              <Badge tone={achievement(k) >= 100 ? 'verify' : achievement(k) >= 70 ? 'hold' : 'seal'}>
                                {kpiStatus(k)} · {percent(achievement(k))}
                              </Badge>
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {kpis.map((k) => (
                    <MeasurementChart
                      key={k.id}
                      kpi={k}
                      confounders={confounders}
                      sampleNote={`Baseline period: as published with the challenge. Pilot period: ${day(p.startedOn)} to ${day(p.endsOn)}. Total sample across all readings: ${num(k.series.reduce((s, x) => s + x.sampleSize, 0))}.`}
                    />
                  ))}

                  <section aria-labelledby="quality-heading">
                    <h2 id="quality-heading" className="mb-3 text-h2 text-ink">
                      Data quality
                    </h2>
                    <p className="mb-3 max-w-doc text-body text-ink-soft">
                      Missing readings are excluded rather than interpolated, and the exclusion is recorded so a
                      validator can see exactly what was left out.
                    </p>
                    <ul className="sheet-flat">
                      {dataQuality.map((q) => {
                        const k = kpis.find((x) => x.id === q.kpiId);
                        return (
                          <li
                            key={q.kpiId}
                            className={[
                              'ledger-row border-l-2 px-4 py-3',
                              q.missing > 0 ? 'border-l-hold bg-hold-wash' : 'border-l-transparent',
                            ].join(' ')}
                          >
                            <p className="text-body text-ink">{k?.name ?? q.kpiId}</p>
                            <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-1">
                              {[
                                { label: 'Expected readings', value: q.expectedReadings },
                                { label: 'Actual readings', value: q.actualReadings },
                                { label: 'Missing', value: q.missing },
                                { label: 'Outliers', value: q.outliers },
                                { label: 'Gaps', value: q.gaps },
                              ].map((cell) => (
                                <div key={cell.label}>
                                  <dt className="text-micro text-ink-soft">{cell.label}</dt>
                                  <dd className="text-data text-ink tnum">{cell.value}</dd>
                                </div>
                              ))}
                            </dl>
                            <p className="mt-2 text-micro text-ink-soft">{q.note}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section aria-labelledby="attribution-heading">
                    <h2 id="attribution-heading" className="mb-1 text-h2 text-ink">
                      Is the observed improvement attributable to the pilot?
                    </h2>
                    <p className="mb-4 max-w-doc text-body text-ink-soft">
                      This is a gate 5 precondition. A number that moved is not the same as a number the pilot moved,
                      and the validator will test this claim rather than accept it.
                    </p>

                    <KeyValueSheet
                      title="Confounders already considered"
                      items={confounders.map((c, i) => ({ label: `Confounder ${i + 1}`, value: c }))}
                      footnote="Add anything else that could plausibly explain the change, including things that argue against the pilot."
                    />

                    <div className="mt-6">
                      {attribution ? (
                        <InlineNote tone="verify" title="Attribution recorded">
                          <p className="max-w-doc font-doc text-doc text-ink">{attribution}</p>
                          <p className="mt-2 text-micro text-ink-soft">
                            This is attached to the gate 5 record and read by the independent validator.
                          </p>
                        </InlineNote>
                      ) : (
                        <div className="sheet-flat px-4 py-4">
                          {totalMissing > 0 ? (
                            <div className="mb-4">
                              <InlineNote tone="hold" title={`${totalMissing} readings are missing`}>
                                Say what you did about them. A validator who finds an unexplained gap will qualify the
                                validation.
                              </InlineNote>
                            </div>
                          ) : null}
                          <Field
                            label="Your written explanation"
                            required
                            hint="At least 60 characters. Explain why the change is attributable to the pilot rather than to seasonality, a process change, or something else."
                            aside={`${explanation.trim().length} / 60`}
                          >
                            {({ id: fid, describedBy, invalid }) => (
                              <Textarea
                                id={fid}
                                aria-describedby={describedBy}
                                invalid={invalid}
                                rows={6}
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                placeholder="For example: the improvement tracks installation zone by zone, and the two uninstrumented control zones show no comparable movement over the same period."
                              />
                            )}
                          </Field>
                          <div className="mt-4">
                            <Button
                              tone="primary"
                              unavailableReason={
                                explanation.trim().length < 60
                                  ? `Write ${60 - explanation.trim().length} more characters of explanation.`
                                  : undefined
                              }
                              loading={record.isPending}
                              loadingLabel="Recording"
                              onClick={() =>
                                record.mutate(
                                  { explanation },
                                  {
                                    onSuccess: (res) => {
                                      pushToast('verify', res.message ?? 'Attribution recorded.');
                                      setExplanation('');
                                    },
                                    onError: (err) => {
                                      const api = err instanceof PrayogApiError ? err : null;
                                      pushToast(
                                        'seal',
                                        api?.message ?? 'The explanation was not recorded.',
                                        'Your text is preserved.',
                                      );
                                    },
                                  },
                                )
                              }
                            >
                              Record the attribution
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
