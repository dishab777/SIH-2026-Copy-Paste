import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSaveValidation, useSignValidation, useValidation } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { KeyValueSheet, ComparisonMatrix } from '@/components/ledger/Ledger';
import { MeasurementChart, achievement } from '@/components/charts/MeasurementChart';
import { EvidenceVault } from '@/components/domain/Milestones';
import { SealStamp } from '@/components/domain/SealStamp';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb, Tabs } from '@/components/ui/Nav';
import { Modal } from '@/components/ui/Overlay';
import { Checkbox, Field, NumberInput, RadioGroup, Select, Textarea } from '@/components/ui/Field';
import { countOf, day, dayTime, num, percent, shortHash } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { ValidationFinding, ValidationReport } from '@/types/models';

export default function ValidatorWorkspace() {
  const { pilotId } = useParams();
  const query = useValidation(pilotId);
  const saveReport = useSaveValidation(pilotId);
  const signReport = useSignValidation();
  const pushToast = useUi((s) => s.pushToast);

  const [tab, setTab] = useState('claim');
  const [findings, setFindings] = useState<ValidationFinding[] | null>(null);
  const [rederivation, setRederivation] = useState<ValidationReport['rederivation'] | null>(null);
  const [securityAudit, setSecurityAudit] = useState<ValidationReport['securityAudit'] | null>(null);
  const [attestation, setAttestation] = useState<ValidationReport['dataAttestation'] | null>(null);
  const [signing, setSigning] = useState(false);
  const [outcome, setOutcome] = useState<'validated' | 'validated_with_qualifications' | 'not_validated'>('validated');
  const [qualifications, setQualifications] = useState('');
  const [justSigned, setJustSigned] = useState(false);

  // Seed the working copy from the report, or from the pilot criteria if there is none.
  useEffect(() => {
    if (!query.data || findings) return;
    const d = query.data.data;
    const existing = d.report;
    setFindings(
      d.pilot.successCriteria.map((criterion) => {
        const found = existing?.findings.find((f) => f.criterion === criterion);
        return (
          found ?? {
            criterion,
            claimed: '',
            observed: '',
            finding: 'met',
            note: '',
          }
        );
      }),
    );
    setRederivation(existing?.rederivation ?? { records: '', reproduced: false, note: '' });
    setSecurityAudit(existing?.securityAudit ?? { done: false, findingsOpen: 0, note: '' });
    setAttestation(existing?.dataAttestation ?? { signed: false, note: '' });
    if (existing?.outcome) setOutcome(existing.outcome);
    if (existing?.qualifications) setQualifications(existing.qualifications);
  }, [query.data, findings]);

  return (
    <QueryState query={query} errorTitle="Unable to load this pilot." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const d = payload.data;
        const report = d.report;
        const signed = report?.status === 'signed';
        const f = findings ?? [];
        const complete =
          f.length > 0 &&
          f.every((x) => x.observed.trim().length >= 10 && x.note.trim().length >= 10) &&
          (rederivation?.records.trim().length ?? 0) >= 20 &&
          Boolean(securityAudit?.done) &&
          Boolean(attestation?.signed);

        function persist(): void {
          saveReport.mutate(
            {
              findings: f,
              rederivation: rederivation ?? undefined,
              securityAudit: securityAudit ?? undefined,
              dataAttestation: attestation ?? undefined,
            },
            {
              onSuccess: () => pushToast('verify', 'Draft saved.'),
              onError: (err) => {
                const api = err instanceof PrayogApiError ? err : null;
                pushToast('seal', api?.message ?? 'Unable to save. Your changes are preserved.');
              },
            },
          );
        }

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb items={[{ label: 'Validation queue', to: '/v' }, { label: d.pilot.caseId }]} />
            </div>

            <PageHeader
              title="Independent validation"
              lead={`${d.pilot.title} — ${d.startup.tradeName} for ${d.challenge.district}. Your job is to test the claim against the raw records, not to accept the supplier figure.`}
              servedAt={payload.servedAt}
              onRefresh={() => void query.refetch()}
              aside={
                signed ? (
                  <SealStamp
                    tone={report?.outcome === 'not_validated' ? 'rejected' : 'cleared'}
                    date={report?.signedAt}
                    animate={justSigned}
                  />
                ) : (
                  <StatusBadge status={d.pilot.status} />
                )
              }
            />

            {signed ? (
              <div className="mb-6">
                <InlineNote
                  tone={report?.outcome === 'not_validated' ? 'seal' : 'verify'}
                  title={`Signed — ${report?.outcome?.replace(/_/g, ' ')}`}
                >
                  <p className="max-w-doc">{report?.publishedSummary}</p>
                  <p className="mt-1 text-micro text-ink-soft">
                    Signed {dayTime(report?.signedAt)} · report {report?.caseId} · checksum{' '}
                    <span className="tnum">{shortHash(report?.hash ?? '')}</span>
                  </p>
                  <p className="mt-2 text-micro text-ink-soft">
                    Published on{' '}
                    <Link to="/v/results" className="underline underline-offset-2">
                      the public results page
                    </Link>{' '}
                    whether or not the pilot succeeded.
                  </p>
                </InlineNote>
              </div>
            ) : null}

            <Tabs
              items={[
                { id: 'claim', label: 'The claim' },
                { id: 'records', label: 'Raw records', count: d.rawRecords.length },
                { id: 'evidence', label: 'Evidence', count: d.evidence.length },
                { id: 'security', label: 'Security and data' },
                { id: 'report', label: 'Report builder', count: f.length },
              ]}
              value={tab}
              onChange={setTab}
            >
              {tab === 'claim' ? (
                <div className="flex flex-col gap-6">
                  <KeyValueSheet
                    headingLevel={2}
                    title="What was promised"
                    items={[
                      { label: 'Challenge', value: `${d.challenge.caseId} — ${d.challenge.title}` },
                      {
                        label: 'Baseline as published',
                        value: `${num(d.challenge.baseline.currentValue, 1)} ${d.challenge.baseline.unit}`,
                        hint: d.challenge.baseline.method,
                      },
                      {
                        label: 'Target',
                        value: `${num(d.challenge.outcome.magnitude, 1)} ${d.challenge.outcome.unit}`,
                      },
                      {
                        label: 'Failure threshold',
                        value: `${num(d.challenge.outcome.failureThreshold, 1)} ${d.challenge.outcome.unit}`,
                      },
                      { label: 'Measurement method', value: d.challenge.outcome.method },
                      { label: 'Source of truth', value: d.challenge.baseline.sourceOfTruth },
                    ]}
                  />

                  <section>
                    <h2 className="mb-3 text-h2 text-ink">What is claimed</h2>
                    <div className="flex flex-col gap-4">
                      {d.kpis.map((k) => (
                        <MeasurementChart key={k.id} kpi={k} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-3 text-h2 text-ink">Success criteria to report against</h2>
                    <ul className="sheet-flat">
                      {d.pilot.successCriteria.map((sc) => (
                        <li key={sc} className="ledger-row flex gap-3 px-4 py-3">
                          <span aria-hidden className="text-ink-soft">
                            ·
                          </span>
                          <span className="text-body text-ink">{sc}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-micro text-ink-soft">
                      A report cannot be signed until every one of these carries a finding.
                    </p>
                  </section>
                </div>
              ) : null}

              {tab === 'records' ? (
                <div className="flex flex-col gap-6">
                  <InlineNote tone="neutral" title="Re-derive rather than accept">
                    These are the readings as recorded, with sample sizes. The derived column is arithmetic you can check
                    by hand against the rows beneath it.
                  </InlineNote>

                  {d.rawRecords.map((rec) => (
                    <section key={rec.kpiId} className="sheet-flat">
                      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink px-4 py-2">
                        <h3 className="text-label text-ink">{rec.name}</h3>
                        <span className="text-micro text-ink-soft tnum">
                          {countOf(rec.rows.length, 'reading')} · total sample {num(rec.derived.totalSample)}
                        </span>
                      </div>

                      <dl className="grid grid-cols-2 border-b border-rule md:grid-cols-4">
                        {[
                          { label: 'Baseline as published', value: `${num(rec.baseline, 1)} ${rec.unit}` },
                          { label: 'Mean of readings', value: `${num(rec.derived.mean, 2)} ${rec.unit}` },
                          { label: 'Change against baseline', value: percent(rec.derived.changePercent) },
                          { label: 'Readings', value: num(rec.rows.length) },
                        ].map((cell, i) => (
                          <div key={cell.label} className={['px-4 py-3', i < 3 ? 'border-r border-rule' : ''].join(' ')}>
                            <dt className="text-micro text-ink-soft">{cell.label}</dt>
                            <dd className="mt-1 text-data text-ink tnum">{cell.value}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="max-h-[380px] overflow-auto scroll-quiet">
                        <table className="w-full border-collapse text-data">
                          <caption className="sr-only">Raw readings for {rec.name}</caption>
                          <thead className="sticky top-0 bg-sheet">
                            <tr>
                              <th scope="col" className="border-b border-rule px-4 py-2 text-left text-label text-ink-soft">
                                Reading date
                              </th>
                              <th scope="col" className="border-b border-rule px-4 py-2 text-right text-label text-ink-soft">
                                Value ({rec.unit})
                              </th>
                              <th scope="col" className="border-b border-rule px-4 py-2 text-right text-label text-ink-soft">
                                Sample size
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rec.rows.map((row) => (
                              <tr key={row.at} className="ledger-row">
                                <td className="px-4 py-2 text-ink">{day(row.at)}</td>
                                <td className="px-4 py-2 text-right text-ink tnum">{num(row.value, 1)}</td>
                                <td className="px-4 py-2 text-right text-ink tnum">{num(row.sampleSize)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}

                  <ComparisonMatrix
                    rowHeader="Measure"
                    columns={[
                      { key: 'claimed', label: 'Claimed' },
                      { key: 'derived', label: 'Re-derived here' },
                      { key: 'delta', label: 'Difference' },
                    ]}
                    rows={d.kpis.map((k) => {
                      const rec = d.rawRecords.find((r) => r.kpiId === k.id);
                      const delta = rec ? k.current - rec.derived.mean : 0;
                      return {
                        key: k.id,
                        label: k.name,
                        cells: {
                          claimed: <span className="tnum">{num(k.current, 2)} {k.unit}</span>,
                          derived: <span className="tnum">{rec ? num(rec.derived.mean, 2) : '—'} {k.unit}</span>,
                          delta: (
                            <span className={Math.abs(delta) > k.baseline * 0.05 ? 'text-seal tnum' : 'text-ink tnum'}>
                              {delta >= 0 ? '+' : ''}
                              {num(delta, 2)}
                            </span>
                          ),
                        },
                      };
                    })}
                  />
                </div>
              ) : null}

              {tab === 'evidence' ? (
                <div className="flex flex-col gap-4">
                  <p className="max-w-doc text-body text-ink-soft">
                    Every file carries its checksum, who uploaded it and who verified it. A file whose scan failed cannot
                    be relied on.
                  </p>
                  <EvidenceVault items={d.evidence} />
                  <section>
                    <h3 className="mb-3 mt-4 text-h3 text-ink">Milestone findings by the department</h3>
                    <ul className="sheet-flat">
                      {d.milestones.map((m) => (
                        <li key={m.id} className="ledger-row px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 max-w-doc">
                              <p className="text-body text-ink">
                                Milestone {m.index} — {m.name}
                              </p>
                              <p className="mt-1 text-micro text-ink-soft">{m.acceptanceTest}</p>
                              {m.reviewNote ? <p className="mt-1 text-body text-ink">{m.reviewNote}</p> : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {m.acceptanceFinding ? <StatusBadge status={m.acceptanceFinding} /> : null}
                              <StatusBadge status={m.status} />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}

              {tab === 'security' ? (
                <div className="flex flex-col gap-6">
                  <section className="sheet-flat px-4 py-4">
                    <h3 className="mb-3 text-h3 text-ink">Security audit</h3>
                    <div className="flex flex-col gap-4">
                      <Checkbox
                        checked={Boolean(securityAudit?.done)}
                        disabled={signed}
                        onChange={(v) => setSecurityAudit((s) => ({ ...(s ?? { findingsOpen: 0, note: '' }), done: v }))}
                        label="A security audit has been carried out and I have seen the report"
                        detail="A gate 5 precondition. Without it the pilot cannot be recorded as successful."
                      />
                      <Field label="Findings still open" hint="Zero is required for a clean validation.">
                        {({ id }) => (
                          <NumberInput
                            id={id}
                            min={0}
                            disabled={signed}
                            value={securityAudit?.findingsOpen ?? 0}
                            onChange={(e) =>
                              setSecurityAudit((s) => ({
                                ...(s ?? { done: false, note: '' }),
                                findingsOpen: Number(e.target.value),
                              }))
                            }
                          />
                        )}
                      </Field>
                      <Field label="Audit note">
                        {({ id }) => (
                          <Textarea
                            id={id}
                            rows={3}
                            disabled={signed}
                            value={securityAudit?.note ?? ''}
                            onChange={(e) =>
                              setSecurityAudit((s) => ({ ...(s ?? { done: false, findingsOpen: 0 }), note: e.target.value }))
                            }
                          />
                        )}
                      </Field>
                    </div>
                  </section>

                  <section className="sheet-flat px-4 py-4">
                    <h3 className="mb-3 text-h3 text-ink">Data-handling attestation</h3>
                    <div className="flex flex-col gap-4">
                      <Checkbox
                        checked={Boolean(attestation?.signed)}
                        disabled={signed}
                        onChange={(v) => setAttestation((s) => ({ ...(s ?? { note: '' }), signed: v }))}
                        label="The data-handling attestation is signed and consistent with the tier granted"
                        detail="Tier, retention, processing location, sub-processors and certified erasure."
                      />
                      <Field label="Attestation note">
                        {({ id }) => (
                          <Textarea
                            id={id}
                            rows={3}
                            disabled={signed}
                            value={attestation?.note ?? ''}
                            onChange={(e) => setAttestation((s) => ({ ...(s ?? { signed: false }), note: e.target.value }))}
                          />
                        )}
                      </Field>
                    </div>
                  </section>

                  {d.incidents.length > 0 ? (
                    <section>
                      <h3 className="mb-3 text-h3 text-ink">Incidents during the pilot</h3>
                      <ul className="sheet-flat">
                        {d.incidents.map((i) => (
                          <li key={i.id} className="ledger-row px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 max-w-doc">
                                <p className="text-body text-ink">{i.title}</p>
                                <p className="mt-0.5 text-micro text-ink-soft">
                                  Detected {dayTime(i.detectedAt)} · deadline {dayTime(i.resolutionDeadline)}
                                </p>
                                {i.resolution ? <p className="mt-1 text-body text-ink">{i.resolution}</p> : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <StatusBadge status={i.severity} label={`${i.severity} severity`} />
                                <StatusBadge status={i.status} />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {tab === 'report' ? (
                <div className="flex flex-col gap-6">
                  <section>
                    <h2 className="mb-1 text-h2 text-ink">Findings against every success criterion</h2>
                    <p className="mb-4 max-w-doc text-body text-ink-soft">
                      One finding per criterion. A report cannot be signed with a criterion left blank, because a reader
                      would not know whether it was met or simply not looked at.
                    </p>
                    <ul className="flex flex-col gap-4">
                      {f.map((finding, i) => (
                        <li key={finding.criterion} className="sheet-flat px-4 py-4">
                          <p className="text-label text-ink-soft">Criterion {i + 1}</p>
                          <p className="mt-0.5 max-w-doc text-body text-ink">{finding.criterion}</p>
                          <div className="mt-4 flex flex-col gap-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <Field label="What was claimed">
                                {({ id }) => (
                                  <Textarea
                                    id={id}
                                    rows={2}
                                    disabled={signed}
                                    value={finding.claimed}
                                    onChange={(e) =>
                                      setFindings((prev) =>
                                        (prev ?? []).map((x, j) => (j === i ? { ...x, claimed: e.target.value } : x)),
                                      )
                                    }
                                  />
                                )}
                              </Field>
                              <Field label="What you observed" required>
                                {({ id }) => (
                                  <Textarea
                                    id={id}
                                    rows={2}
                                    disabled={signed}
                                    value={finding.observed}
                                    onChange={(e) =>
                                      setFindings((prev) =>
                                        (prev ?? []).map((x, j) => (j === i ? { ...x, observed: e.target.value } : x)),
                                      )
                                    }
                                  />
                                )}
                              </Field>
                            </div>
                            <Field label="Finding" required>
                              {({ id }) => (
                                <Select
                                  id={id}
                                  disabled={signed}
                                  value={finding.finding}
                                  onChange={(e) =>
                                    setFindings((prev) =>
                                      (prev ?? []).map((x, j) =>
                                        j === i ? { ...x, finding: e.target.value as ValidationFinding['finding'] } : x,
                                      ),
                                    )
                                  }
                                  options={[
                                    { value: 'met', label: 'Met' },
                                    { value: 'partially_met', label: 'Partially met' },
                                    { value: 'not_met', label: 'Not met' },
                                  ]}
                                />
                              )}
                            </Field>
                            <Field label="Note" required hint="What you did to test it, and what you found.">
                              {({ id }) => (
                                <Textarea
                                  id={id}
                                  rows={3}
                                  disabled={signed}
                                  value={finding.note}
                                  onChange={(e) =>
                                    setFindings((prev) =>
                                      (prev ?? []).map((x, j) => (j === i ? { ...x, note: e.target.value } : x)),
                                    )
                                  }
                                />
                              )}
                            </Field>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="sheet-flat px-4 py-4">
                    <h3 className="mb-3 text-h3 text-ink">Re-derivation</h3>
                    <div className="flex flex-col gap-4">
                      <Field
                        label="Records you used"
                        required
                        hint="Name them precisely enough that another validator could ask for the same ones. At least 20 characters."
                      >
                        {({ id }) => (
                          <Textarea
                            id={id}
                            rows={3}
                            disabled={signed}
                            value={rederivation?.records ?? ''}
                            onChange={(e) =>
                              setRederivation((s) => ({
                                ...(s ?? { reproduced: false, note: '' }),
                                records: e.target.value,
                              }))
                            }
                          />
                        )}
                      </Field>
                      <Checkbox
                        checked={Boolean(rederivation?.reproduced)}
                        disabled={signed}
                        onChange={(v) =>
                          setRederivation((s) => ({ ...(s ?? { records: '', note: '' }), reproduced: v }))
                        }
                        label="I reproduced the claimed figure from those records"
                        detail="If you could not, say so here and explain why in the note. That is a finding, not a failure of the process."
                      />
                      <Field label="Re-derivation note" required>
                        {({ id }) => (
                          <Textarea
                            id={id}
                            rows={3}
                            disabled={signed}
                            value={rederivation?.note ?? ''}
                            onChange={(e) =>
                              setRederivation((s) => ({
                                ...(s ?? { records: '', reproduced: false }),
                                note: e.target.value,
                              }))
                            }
                          />
                        )}
                      </Field>
                    </div>
                  </section>

                  {!signed ? (
                    <div className="sticky bottom-0 -mx-4 border-t border-rule bg-sheet px-4 py-4 md:-mx-6 md:px-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-doc">
                          <p className="text-body text-ink">
                            Signing publishes this report with a checksum, on the public results page, whether or not the
                            pilot succeeded. It cannot be edited afterwards.
                          </p>
                          {!complete ? (
                            <p className="mt-1 text-micro text-seal">
                              Still needed: a finding on every criterion, the records you used, the security audit and
                              the data attestation.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-3">
                          <Button loading={saveReport.isPending} loadingLabel="Saving" onClick={persist}>
                            Save draft
                          </Button>
                          <Button tone="primary" disabled={!complete} onClick={() => setSigning(true)}>
                            Sign the validation report
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Tabs>

            <Modal
              open={signing}
              onClose={() => setSigning(false)}
              title="Sign the validation report"
              description="This is published with a checksum and cannot be edited. A pilot that did not work is published too."
              width="lg"
              footer={
                <>
                  <Button onClick={() => setSigning(false)}>Go back</Button>
                  <Button
                    tone={outcome === 'not_validated' ? 'destructive' : 'primary'}
                    loading={signReport.isPending}
                    loadingLabel="Signing"
                    disabled={outcome === 'validated_with_qualifications' && qualifications.trim().length < 30}
                    onClick={() => {
                      if (!report) {
                        pushToast('seal', 'Save the draft before signing.');
                        return;
                      }
                      signReport.mutate(
                        { id: report.id, outcome, qualifications: qualifications || undefined },
                        {
                          onSuccess: (res) => {
                            track({ name: 'validation_outcome_recorded', pilotId: d.pilot.id, outcome });
                            setSigning(false);
                            setJustSigned(true);
                            pushToast('verify', res.message ?? 'Validation report signed.');
                          },
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            setSigning(false);
                            pushToast('seal', api?.message ?? 'The report was not signed.', api?.details.join(' '));
                          },
                        },
                      );
                    }}
                  >
                    Sign and publish
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-6">
                <RadioGroup
                  legend="Outcome"
                  name="outcome"
                  required
                  value={outcome}
                  onChange={(v) => setOutcome(v as typeof outcome)}
                  options={[
                    {
                      value: 'validated',
                      label: 'Validated',
                      detail: 'The claimed outcome was achieved and you reproduced it from the raw records.',
                    },
                    {
                      value: 'validated_with_qualifications',
                      label: 'Validated with qualifications',
                      detail: 'Achieved, but something limits the claim — missing data, a narrower scope, an untested assumption.',
                    },
                    {
                      value: 'not_validated',
                      label: 'Not validated',
                      detail: 'The claim could not be reproduced, or the movement is not attributable to the pilot.',
                    },
                  ]}
                />

                {outcome === 'validated_with_qualifications' ? (
                  <Field
                    label="Qualifications"
                    required
                    hint="State exactly what qualifies the validation, so a reader knows what was and was not proved. At least 30 characters."
                    aside={`${qualifications.trim().length} / 30`}
                  >
                    {({ id }) => (
                      <Textarea id={id} rows={4} value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
                    )}
                  </Field>
                ) : null}

                <div className="sheet-flat">
                  <h4 className="border-b border-ink px-4 py-2 text-label text-ink">Your findings</h4>
                  <ul>
                    {f.map((x) => (
                      <li key={x.criterion} className="ledger-row flex items-baseline justify-between gap-4 px-4 py-2">
                        <span className="min-w-0 text-body text-ink">{x.criterion}</span>
                        <StatusBadge status={x.finding} />
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-label text-ink-soft">What becomes public</p>
                  <ul className="mt-1 list-disc pl-5 text-body text-ink">
                    <li>The outcome, the summary and every finding against every criterion</li>
                    <li>Whether you were able to reproduce the claim, and from which records</li>
                    <li>The report checksum, on the public results page</li>
                  </ul>
                  <p className="mt-2 text-micro text-ink-soft">
                    The evidence vault itself stays access-controlled. Only your findings about it are published.
                  </p>
                </div>

                {d.kpis[0] ? (
                  <p className="text-micro text-ink-soft tnum">
                    Headline measure: {d.kpis[0].name} at {num(d.kpis[0].current, 1)} {d.kpis[0].unit}, which is{' '}
                    {percent(achievement(d.kpis[0]))} of target.
                  </p>
                ) : null}
                <Badge tone="hold">A signed report cannot be edited</Badge>
              </div>
            </Modal>
          </div>
        );
      }}
    </QueryState>
  );
}
