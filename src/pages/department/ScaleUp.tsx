import { useState } from 'react';
import { usePortalLink } from '@/lib/portal';
import { Link, useParams } from 'react-router-dom';
import { DISTRICTS } from '@/mocks/fixtures/reference';
import { citationShort } from '@/config/policies';
import { useGeneratePackage, usePlanScaleUp, useProcurement, useSelectPathway, useSession } from '@/services/hooks';
import { can } from '@/config/rbac';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { StatLedger } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { Field, MoneyInput, MultiSelectTags, RadioGroup, Textarea } from '@/components/ui/Field';
import { SealStamp } from '@/components/domain/SealStamp';
import { PermissionGate } from '@/components/patterns/ApprovalBar';
import { day, money, num, percent, shortHash } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function ScaleUp() {
  const link = usePortalLink();
  const { pilotId } = useParams();
  const query = useProcurement(pilotId);
  const selectPathway = useSelectPathway(pilotId);
  const generate = useGeneratePackage(pilotId);
  const plan = usePlanScaleUp(pilotId);
  const session = useSession();
  const mayDecide = can(session.data?.data.role ?? 'public', 'approve', 'procurement');
  const pushToast = useUi((s) => s.pushToast);

  const [pathwayId, setPathwayId] = useState('');
  const [justification, setJustification] = useState('');
  const [reasonsAgainst, setReasonsAgainst] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [projectedPaise, setProjectedPaise] = useState(0);

  return (
    <div>
      <QueryState query={query} errorTitle="Unable to load the procurement case." loading={<PanelSkeleton lines={10} />}>
        {(payload) => {
          const d = payload.data;
          const r = d.procurement.readiness;
          const recommended = d.recommended;
          const chosen = d.procurement.pathwayId ?? pathwayId;
          const decided = Boolean(d.procurement.pathwayJustification);
          const allDistricts = Object.values(DISTRICTS).flat();

          return (
            <>
              <div className="mb-4">
                <Breadcrumb
                  items={[
                    { label: 'Pilots', to: '/d/pilots' },
                    { label: d.pilot.caseId, to: `/d/pilots/${d.pilot.id}` },
                    { label: 'Procurement and scale-up' },
                  ]}
                />
              </div>

              <PageHeader
                title="Procurement pathway"
                lead={`${d.pilot.title} — a successful pilot is not a purchase. The readiness score below is advisory; the written justification is the decision.`}
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={
                  d.validation?.outcome ? <StatusBadge status={d.validation.outcome} /> : <Badge tone="hold">Not validated yet</Badge>
                }
              />

              <div className="flex flex-col gap-8">
                {/* Truth 7, stated where the decision is taken. */}
                <InlineNote tone="hold" title="Passing a pilot does not entitle anyone to a contract">
                  Gate 5 records that the pilot worked. Gate 6 is a separate decision about how, and whether, to buy —
                  taken by the competent authority against a rule that permits it, with the reasons against recorded
                  alongside the reasons for.
                </InlineNote>

                {/* Readiness, fully decomposed. Never a black box. */}
                <section aria-labelledby="readiness-heading">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4">
                    <h2 id="readiness-heading" className="text-h2 text-ink">
                      Procurement readiness
                    </h2>
                    <p className="text-micro text-ink-soft">
                      Computed {day(r.computedAt)} · threshold for a recommendation is {d.threshold} of 100 ·{' '}
                      {citationShort('PRAYOG-SOP-12')}
                    </p>
                  </div>

                  <div className="sheet-flat">
                    <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink px-4 py-3">
                      <div>
                        <p className="text-h1 text-ink tnum">{r.total} / 100</p>
                        <p className="mt-1 text-body text-ink">
                          {r.total >= d.threshold
                            ? 'Above the threshold for a procurement recommendation.'
                            : 'Below the threshold for a procurement recommendation.'}
                        </p>
                      </div>
                      <p className="max-w-doc text-micro text-ink-soft">
                        Every component is shown below with its weight, its raw score and the evidence behind it. There
                        is no hidden model here — the number is arithmetic over the pilot record.
                      </p>
                    </div>
                    <ul>
                      {r.components.map((c) => (
                        <li key={c.key} className="ledger-row px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 max-w-doc">
                              <p className="text-body text-ink">{c.label}</p>
                              <p className="mt-0.5 text-micro text-ink-soft">{c.basis}</p>
                              <p className="mt-1 text-micro text-ink-soft">Evidence: {c.evidence}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-data text-ink tnum">
                                {num(c.rawScore)} × {c.weightPercent}% = {num(c.weighted, 1)}
                              </p>
                              <div className="mt-1 h-1.5 w-[140px] bg-ledger">
                                <div
                                  className={c.rawScore >= 75 ? 'h-full bg-verify' : c.rawScore >= 50 ? 'h-full bg-hold' : 'h-full bg-seal'}
                                  style={{ width: `${Math.min(100, c.rawScore)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="rule-total flex items-baseline justify-between px-4 py-3">
                      <span className="text-body font-medium text-ink">Total</span>
                      <span className="text-data font-medium text-ink tnum">{r.total} of 100</span>
                    </div>
                  </div>
                </section>

                <section aria-labelledby="vfm-heading">
                  <h2 id="vfm-heading" className="mb-3 text-h2 text-ink">
                    Value for money
                  </h2>
                  {d.procurement.vfm ? (
                    <>
                      <StatLedger
                        rows={[
                          { label: 'Pilot cost', value: money(d.procurement.vfm.pilotCostPaise) },
                          {
                            label: 'Closest market alternative',
                            value: money(d.procurement.vfm.alternativeCostPaise),
                            detail: d.procurement.vfm.note,
                          },
                        ]}
                        total={{
                          label: 'Demonstrated saving',
                          value: (
                            <span
                              className={
                                d.procurement.vfm.savingPercent >= d.vfmMinSaving ? 'text-verify' : 'text-seal'
                              }
                            >
                              {percent(d.procurement.vfm.savingPercent)}
                            </span>
                          ),
                        }}
                      />
                      {d.procurement.vfm.savingPercent < d.vfmMinSaving ? (
                        <div className="mt-3">
                          <InlineNote tone="hold" title={`Below the configured minimum of ${d.vfmMinSaving}%`}>
                            The pathway note must argue non-price grounds — continuity, risk, speed or capability — and
                            say so explicitly. {citationShort('PRAYOG-SOP-12')}.
                          </InlineNote>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <InlineNote tone="seal" title="No value-for-money analysis is attached">
                      Gate 6 cannot clear without one. Compare the pilot cost against the closest available market
                      alternative, and record what that alternative was.
                    </InlineNote>
                  )}
                </section>

                {/* The advisor. Advisory, and labelled as such. */}
                <section aria-labelledby="pathway-heading">
                  <h2 id="pathway-heading" className="mb-1 text-h2 text-ink">
                    Pathway options
                  </h2>
                  <p className="mb-4 max-w-doc text-body text-ink-soft">
                    Ranked by fit against the validated outcome, the readiness score and the value-for-money analysis.
                    This ranking is advice. It does not choose, and it is not recorded as the decision.
                  </p>

                  {recommended ? (
                    <div className="mb-4">
                      <InlineNote tone="verify" title={`Advice: ${recommended.label}`}>
                        <p className="max-w-doc">{recommended.summary}</p>
                        <p className="mt-1 text-micro text-ink-soft">
                          {citationShort(recommended.citation)} · {recommended.authority} · indicative{' '}
                          {recommended.indicativeWeeks[0]}–{recommended.indicativeWeeks[1]} weeks
                        </p>
                      </InlineNote>
                    </div>
                  ) : null}

                  <ul className="sheet-flat">
                    {d.advice.map(({ pathway, fit }) => (
                      <li
                        key={pathway.id}
                        className={[
                          'ledger-row border-l-2 px-4 py-4',
                          chosen === pathway.id ? 'border-l-verify bg-verify-wash' : 'border-l-transparent',
                        ].join(' ')}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 max-w-doc">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-body text-ink">{pathway.label}</p>
                              {recommended?.id === pathway.id ? <Badge tone="verify">Advised</Badge> : null}
                              {chosen === pathway.id && decided ? <Badge tone="verify">Selected</Badge> : null}
                            </div>
                            <p className="mt-1 text-body text-ink-soft">{pathway.summary}</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div>
                                <p className="text-micro text-ink-soft">Suits this when</p>
                                <ul className="mt-1 list-disc pl-5 text-micro text-ink">
                                  {pathway.suitsWhen.map((s) => (
                                    <li key={s}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-micro text-ink-soft">A poor fit when</p>
                                <ul className="mt-1 list-disc pl-5 text-micro text-ink">
                                  {pathway.poorFitWhen.map((s) => (
                                    <li key={s}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <p className="mt-3 text-micro text-ink-soft">
                              {citationShort(pathway.citation)} · authority: {pathway.authority} · indicative{' '}
                              {pathway.indicativeWeeks[0]}–{pathway.indicativeWeeks[1]} weeks
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-micro text-ink-soft">Fit score</p>
                            <p className="text-data text-ink tnum">{fit}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* The decision itself. */}
                <section aria-labelledby="decision-heading">
                  <h2 id="decision-heading" className="mb-3 text-h2 text-ink">
                    The decision
                  </h2>

                  {decided ? (
                    <div className="sheet-flat">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink px-4 py-3">
                        <div>
                          <p className="text-label text-ink-soft">Pathway selected</p>
                          <p className="mt-1 text-h3 text-ink">
                            {d.advice.find((a) => a.pathway.id === d.procurement.pathwayId)?.pathway.label ??
                              d.procurement.pathwayId}
                          </p>
                          <p className="mt-1 text-micro text-ink-soft">
                            Decided by {d.procurement.decidedBy} on {day(d.procurement.decidedOn)}
                          </p>
                        </div>
                        <SealStamp tone="cleared" gate="G6" date={d.procurement.decidedOn} by={d.procurement.decidedBy} />
                      </div>
                      <div className="px-4 py-4">
                        <p className="text-label text-ink-soft">Justification</p>
                        <p className="mt-1 max-w-doc font-doc text-doc text-ink">{d.procurement.pathwayJustification}</p>
                        {d.procurement.reasonsAgainst ? (
                          <>
                            <p className="mt-4 text-label text-ink-soft">Reasons against this pathway</p>
                            <p className="mt-1 max-w-doc font-doc text-doc text-ink">{d.procurement.reasonsAgainst}</p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <PermissionGate
                      allowed={mayDecide}
                      action="approve"
                      resource="procurement"
                      viewNote="You can read the readiness assessment and the pathway advice."
                    >
                    <div className="sheet-flat px-4 py-4">
                      <RadioGroup
                        legend="Which pathway are you choosing?"
                        name="pathway"
                        required
                        value={pathwayId}
                        onChange={setPathwayId}
                        options={d.advice.map(({ pathway }) => ({
                          value: pathway.id,
                          label: pathway.label,
                          detail: `${citationShort(pathway.citation)} · ${pathway.authority}`,
                        }))}
                      />

                      <div className="mt-6 flex flex-col gap-6">
                        <Field
                          label="Written justification"
                          required
                          hint="At least 80 characters, against the rule that permits this pathway. This is the decision — the advice above is not."
                          aside={`${justification.trim().length} / 80`}
                        >
                          {({ id, describedBy, invalid }) => (
                            <Textarea
                              id={id}
                              aria-describedby={describedBy}
                              invalid={invalid}
                              rows={6}
                              value={justification}
                              onChange={(e) => setJustification(e.target.value)}
                            />
                          )}
                        </Field>

                        <Field
                          label="Reasons against this pathway"
                          required
                          hint="At least 30 characters. Recording the counter-argument is what makes the decision defensible in two years."
                          aside={`${reasonsAgainst.trim().length} / 30`}
                        >
                          {({ id, describedBy, invalid }) => (
                            <Textarea
                              id={id}
                              aria-describedby={describedBy}
                              invalid={invalid}
                              rows={4}
                              value={reasonsAgainst}
                              onChange={(e) => setReasonsAgainst(e.target.value)}
                            />
                          )}
                        </Field>

                        <div>
                          <Button
                            tone="primary"
                            unavailableReason={
                              !pathwayId
                                ? 'Choose a pathway first.'
                                : justification.trim().length < 80
                                  ? `Write ${80 - justification.trim().length} more characters of justification.`
                                  : reasonsAgainst.trim().length < 30
                                    ? `Write ${30 - reasonsAgainst.trim().length} more characters on the case against.`
                                    : undefined
                            }
                            loading={selectPathway.isPending}
                            loadingLabel="Recording"
                            onClick={() =>
                              selectPathway.mutate(
                                { pathwayId, justification, reasonsAgainst },
                                {
                                  onSuccess: (res) => {
                                    track({ name: 'pathway_selected', pilotId: d.pilot.id, pathwayId });
                                    pushToast('verify', res.message ?? 'Pathway recorded.');
                                  },
                                  onError: (err) => {
                                    const api = err instanceof PrayogApiError ? err : null;
                                    pushToast(
                                      'seal',
                                      api?.message ?? 'The pathway was not recorded.',
                                      'Your text is preserved.',
                                    );
                                  },
                                },
                              )
                            }
                          >
                            Record the pathway decision
                          </Button>
                        </div>
                      </div>
                    </div>
                    </PermissionGate>
                  )}
                </section>

                {/* Replication package and scale-up. */}
                <section aria-labelledby="package-heading">
                  <h2 id="package-heading" className="mb-3 text-h2 text-ink">
                    Replication package
                  </h2>
                  <p className="mb-4 max-w-doc text-body text-ink-soft">
                    Everything another department needs to repeat this, packaged with a checksum. This is what turns one
                    department&rsquo;s work into something the rest of the system can use.
                  </p>

                  {d.scaleUp ? (
                    <div className="flex flex-col gap-4">
                      <div className="sheet-flat">
                        <p className="border-b border-ink px-4 py-2 text-label text-ink">
                          Generated {day(d.scaleUp.replicationPackage.generatedOn)} · checksum{' '}
                          <span className="tnum">{shortHash(d.scaleUp.replicationPackage.hash)}</span>
                        </p>
                        <ol>
                          {d.scaleUp.replicationPackage.contents.map((c, i) => (
                            <li key={c} className="ledger-row flex gap-4 px-4 py-2">
                              <span aria-hidden className="w-6 text-micro text-ink-soft tnum">
                                {i + 1}
                              </span>
                              <span className="text-body text-ink">{c}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <StatLedger
                        title="Scale-up plan"
                        rows={[
                          {
                            label: 'Districts',
                            value:
                              d.scaleUp.districts.length > 0
                                ? `${d.scaleUp.districts.length} — ${d.scaleUp.districts.slice(0, 4).join(', ')}${d.scaleUp.districts.length > 4 ? '…' : ''}`
                                : 'Not planned yet',
                          },
                          { label: 'Status', value: d.scaleUp.status.replace(/_/g, ' ') },
                        ]}
                        total={{ label: 'Projected value', value: money(d.scaleUp.projectedValuePaise) }}
                      />

                      <div className="sheet-flat px-4 py-4">
                        <p className="mb-4 text-label text-ink">Revise the scale-up plan</p>
                        <div className="flex flex-col gap-4">
                          <Field label="Districts in scope">
                            {({ id }) => (
                              <MultiSelectTags
                                id={id}
                                values={districts.length ? districts : d.scaleUp!.districts}
                                onChange={setDistricts}
                                options={allDistricts}
                                placeholder="Add a district"
                              />
                            )}
                          </Field>
                          <Field label="Projected value">
                            {({ id, describedBy }) => (
                              <MoneyInput
                                id={id}
                                describedBy={describedBy}
                                valuePaise={projectedPaise || d.scaleUp!.projectedValuePaise}
                                onChangePaise={setProjectedPaise}
                              />
                            )}
                          </Field>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              loading={plan.isPending}
                              loadingLabel="Saving"
                              onClick={() =>
                                plan.mutate(
                                  {
                                    districts: districts.length ? districts : d.scaleUp!.districts,
                                    projectedValuePaise: projectedPaise || d.scaleUp!.projectedValuePaise,
                                  },
                                  {
                                    onSuccess: (res) => pushToast('verify', res.message ?? 'Scale-up plan saved.'),
                                    onError: () => pushToast('seal', 'The plan was not saved.', 'Your entries are preserved.'),
                                  },
                                )
                              }
                            >
                              Save the scale-up plan
                            </Button>
                            <Button
                              loading={generate.isPending}
                              loadingLabel="Generating"
                              onClick={() =>
                                generate.mutate(undefined, {
                                  onSuccess: (res) => pushToast('verify', res.message ?? 'Package regenerated.'),
                                  onError: (err) => {
                                    const api = err instanceof PrayogApiError ? err : null;
                                    pushToast('seal', api?.message ?? 'The package was not generated.', api?.details.join(' '));
                                  },
                                })
                              }
                            >
                              Regenerate the package
                            </Button>
                            {d.scaleUp.catalogueSolutionId ? (
                              <LinkButton to={link(`/catalogue/${d.scaleUp.catalogueSolutionId}`)}>
                                View the catalogue record
                              </LinkButton>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="sheet-flat px-4 py-6">
                      <p className="max-w-doc text-body text-ink">
                        No package has been generated. It is built around the pathway note, so the pathway decision has
                        to be recorded first.
                      </p>
                      <div className="mt-4">
                        <Button
                          tone="primary"
                          disabled={!decided}
                          loading={generate.isPending}
                          loadingLabel="Generating"
                          onClick={() =>
                            generate.mutate(undefined, {
                              onSuccess: (res) => pushToast('verify', res.message ?? 'Replication package generated.'),
                              onError: (err) => {
                                const api = err instanceof PrayogApiError ? err : null;
                                pushToast('seal', api?.message ?? 'The package was not generated.', api?.details.join(' '));
                              },
                            })
                          }
                        >
                          Generate the replication package
                        </Button>
                      </div>
                    </div>
                  )}
                </section>

                <p className="text-micro text-ink-soft">
                  Related:{' '}
                  <Link to={`/v/validate/${d.pilot.id}`} className="underline underline-offset-2">
                    the independent validation report
                  </Link>{' '}
                  ·{' '}
                  <Link to={`/d/reports`} className="underline underline-offset-2">
                    the audit pack for {d.pilot.caseId}
                  </Link>
                </p>
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
