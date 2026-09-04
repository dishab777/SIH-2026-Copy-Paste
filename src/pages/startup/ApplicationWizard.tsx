import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { policyNumber } from '@/config/policies';
import { rubric } from '@/config/rubrics';
import { CERTIFICATIONS } from '@/mocks/fixtures/reference';
import { useApplication, useSaveApplication, useSubmitApplication } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { WizardShell, type WizardStep } from '@/components/patterns/WizardShell';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { KeyValueSheet, StatLedger } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Field, Input, Textarea, NumberInput, MoneyInput, MultiSelectTags, Checkbox } from '@/components/ui/Field';
import { EligibilityChecklist, RelaxationNotice } from '@/components/domain/Eligibility';
import { DataTierSelector } from '@/components/domain/Legal';
import { day, dayTime, money } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { Application } from '@/types/models';

const STEPS = [
  { slug: 'eligibility', title: 'Eligibility self-check', summary: 'Checked against your verified profile, not a fresh declaration.' },
  { slug: 'solution', title: 'Solution approach', summary: 'What you understand, what you will do, and how ready it already is.' },
  { slug: 'plan', title: 'Pilot plan', summary: 'Milestones, acceptance tests and what you need from the department.' },
  { slug: 'commercials', title: 'Commercials', summary: 'Cost per milestone, the basis for it, and how it sits against the published budget.' },
  { slug: 'data', title: 'Data and security', summary: 'What data you need, at what tier, processed where and by whom.' },
  { slug: 'declarations', title: 'Declarations and signature', summary: 'The statutory declarations and the authorised signatory.' },
  { slug: 'review', title: 'Review and submit', summary: 'Everything you are about to send, and the receipt you will get back.' },
];

export default function ApplicationWizard() {
  const { id, step = 'eligibility' } = useParams();
  const navigate = useNavigate();
  const query = useApplication(id);
  const save = useSaveApplication(id);
  const submit = useSubmitApplication();
  const pushToast = useUi((s) => s.pushToast);

  const [draft, setDraft] = useState<Application | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);
  const [receipt, setReceipt] = useState<{ reference: string; at: string; hash: string } | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    if (query.data && !draft) {
      setDraft(structuredClone(query.data.data.application));
      setSavedAt(query.data.data.application.lastSavedAt);
    }
  }, [query.data, draft]);

  const patch = (fn: (a: Application) => Application): void =>
    setDraft((a) => (a ? fn(structuredClone(a)) : a));

  const missing = useMemo((): Record<string, string[]> => {
    if (!draft) return { eligibility: [], solution: [], plan: [], commercials: [], data: [], declarations: [], review: [] };
    return {
      eligibility: [],
      solution: [
        draft.solution.problemUnderstanding.length < 80 && 'Your understanding of the problem, at least 80 characters',
        draft.solution.approach.length < 80 && 'Your approach, at least 80 characters',
        draft.solution.existingSolution.length < 20 && 'What already exists and works today',
        draft.solution.proposedDevelopment.length < 20 && 'What you will build during the pilot',
      ].filter((x): x is string => Boolean(x)),
      plan: [
        draft.pilotPlan.milestones.length === 0 && 'At least one milestone',
        draft.pilotPlan.milestones.some((m) => m.deliverable.length < 20) && 'A deliverable on every milestone',
        draft.pilotPlan.milestones.some((m) => m.acceptanceTest.length < 20) && 'An acceptance test on every milestone',
        draft.pilotPlan.dependencies.length === 0 && 'What you need from the department',
      ].filter((x): x is string => Boolean(x)),
      commercials: [
        draft.commercials.totalPaise <= 0 && 'A cost against each milestone',
        draft.commercials.costBasis.length < 30 && 'How the price is built up, at least 30 characters',
      ].filter((x): x is string => Boolean(x)),
      data: [
        draft.dataSecurity.dataRequested.length === 0 && 'The fields you actually need',
        draft.dataSecurity.processingLocation.length < 6 && 'Where the data will be processed',
      ].filter((x): x is string => Boolean(x)),
      declarations: [
        !draft.declarations.startupDeclaration && 'The startup declaration',
        !draft.declarations.signatureName && 'The authorised signatory',
      ].filter((x): x is string => Boolean(x)),
      review: [],
    };
  }, [draft]);

  async function persist(): Promise<void> {
    if (!draft) return;
    setSaveState('saving');
    setSaveError(undefined);
    try {
      const res = await save.mutateAsync({
        solution: draft.solution,
        pilotPlan: draft.pilotPlan,
        commercials: draft.commercials,
        dataSecurity: draft.dataSecurity,
        declarations: draft.declarations,
        currentStep: STEPS.findIndex((s) => s.slug === step) + 1,
      });
      setSaveState('saved');
      setSavedAt(res.servedAt);
    } catch (err) {
      setSaveState('failed');
      setSaveError(
        err instanceof PrayogApiError
          ? [err.message, ...err.details].join(' ')
          : 'The service did not respond. Nothing you typed has been lost.',
      );
    }
  }

  return (
    <QueryState query={query} errorTitle="Unable to load this application." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { challenge: c, startup: s } = payload.data;
        const a = draft ?? payload.data.application;
        const closed = !['open', 'closing_soon'].includes(c.status);
        const total = a.commercials.milestoneCostsPaise.reduce((sum, x) => sum + x, 0);
        const overBudget = total > c.pilot.budgetPaise;
        const rub = (() => {
          try {
            return rubric(c.rubricId);
          } catch {
            return null;
          }
        })();

        const steps: WizardStep[] = STEPS.map((sdef, i) => ({
          index: i + 1,
          slug: sdef.slug,
          title: sdef.title,
          summary: sdef.summary,
          missing: missing[sdef.slug] ?? [],
        }));

        // The window can close while a draft is open. The draft survives.
        if (closed && a.status === 'draft') {
          return (
            <div className="mx-auto max-w-[720px]">
              <EmptyState
                title="Applications for this challenge are now closed."
                body={`They closed on ${day(c.timeline.closesOn)}. Your draft has been preserved exactly as you left it, and you can still download it.`}
                action={{ label: 'Back to your applications', to: '/s/applications' }}
                secondary={
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `prayog-draft-${a.caseId}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                      track({ name: 'application_abandoned', applicationId: a.id, atStep: a.currentStep });
                    }}
                  >
                    Download your draft
                  </button>
                }
              />
            </div>
          );
        }

        if (a.status !== 'draft' && !receipt) {
          return (
            <div className="mx-auto max-w-[720px]">
              <EmptyState
                title="This application has already been submitted."
                body={`Reference ${a.referenceNumber ?? a.caseId}, submitted ${dayTime(a.submittedAt)}. Evaluators score what was submitted, so it cannot be edited.`}
                action={{ label: 'Open the application', to: `/s/applications/${a.id}` }}
              />
            </div>
          );
        }

        return (
          <div>
            <div className="mb-6">
              <p className="text-micro text-ink-soft tnum">
                {c.caseId} · {a.caseId}
              </p>
              <h1 className="mt-1 text-h1 text-ink">{c.title}</h1>
              <p className="mt-1 text-body text-ink-soft">
                Applications close {day(c.timeline.closesOn)} · pilot budget {money(c.pilot.budgetPaise)} ·{' '}
                {c.pilot.durationDays}-day pilot
              </p>
            </div>

            <WizardShell
              title="Application"
              caseId={a.caseId}
              steps={steps}
              currentSlug={step}
              onNavigate={(slug) => {
                const idx = STEPS.findIndex((x) => x.slug === step);
                if (idx >= 0) track({ name: 'application_step_completed', applicationId: a.id, step: idx + 1 });
                void persist();
                navigate(`/s/applications/${a.id}/edit/${slug}`);
              }}
              onSaveDraft={() => void persist()}
              saveState={saveState}
              savedAt={savedAt}
              saveError={saveError}
              onRetrySave={() => void persist()}
              onExit={() => navigate('/s/applications')}
              footer={
                step === 'review' ? (
                  <Button
                    tone="primary"
                    unavailableReason={
                      Object.values(missing).some((m) => m.length > 0)
                        ? 'Some steps are still incomplete. The review step lists what is missing.'
                        : undefined
                    }
                    onClick={() => setConfirmSubmit(true)}
                  >
                    Submit this application
                  </Button>
                ) : undefined
              }
            >
              {step === 'eligibility' ? (
                <div className="flex flex-col gap-6">
                  <RelaxationNotice />

                  <KeyValueSheet
                    title="Checked against your verified profile"
                    items={[
                      { label: 'Legal name', value: s.legalName },
                      { label: 'Incorporated', value: day(s.incorporationDate) },
                      {
                        label: 'Startup recognition',
                        value: (
                          <span>
                            <StatusBadge status={s.dpiit.status} />
                            <span className="mt-0.5 block text-micro text-ink-soft">
                              {s.dpiit.validTo ? `Valid to ${day(s.dpiit.validTo)}` : 'No validity on record'}
                            </span>
                          </span>
                        ),
                      },
                      { label: 'GST', value: <StatusBadge status={s.gstStatus} /> },
                      { label: 'Capabilities declared', value: s.capabilities.join(', ') || 'None' },
                      { label: 'Certifications', value: s.certifications.join(', ') || 'None' },
                      { label: 'Prior deployments', value: <span className="tnum">{s.deployments.length}</span> },
                    ]}
                    footnote="These are read from your profile. Correct them there rather than here, so every application uses the same verified facts."
                  />

                  {s.dpiit.status !== 'recognised' ? (
                    <InlineNote tone="hold" title="Relief will not apply automatically">
                      Prior turnover and prior experience are relaxed only on a current recognition. You can still apply;
                      the rule will go to a human for an explicit decision rather than failing you outright.
                    </InlineNote>
                  ) : null}

                  {a.eligibility.length > 0 ? <EligibilityChecklist results={a.eligibility} /> : null}

                  <div>
                    <LinkButton size="sm" to="/s/profile">
                      Open your profile to correct anything
                    </LinkButton>
                  </div>
                </div>
              ) : null}

              {step === 'solution' ? (
                <div className="flex flex-col gap-6">
                  {rub ? (
                    <InlineNote tone="neutral" title="How this step is scored">
                      <p className="max-w-doc">
                        {rub.criteria[0]?.label} carries {rub.criteria[0]?.weightPercent}% and{' '}
                        {rub.criteria[1]?.label} carries {rub.criteria[1]?.weightPercent}%. A 5 on understanding means
                        you understand the problem better than the challenge document states it, with evidence.
                      </p>
                    </InlineNote>
                  ) : null}

                  <Field
                    label="Your understanding of the problem"
                    required
                    hint="Not a restatement of the challenge. Name the constraints the department did not."
                    aside={`${a.solution.problemUnderstanding.length} / 80`}
                  >
                    {({ id: fid }) => (
                      <Textarea
                        id={fid}
                        rows={6}
                        value={a.solution.problemUnderstanding}
                        onChange={(e) =>
                          patch((x) => ({ ...x, solution: { ...x.solution, problemUnderstanding: e.target.value } }))
                        }
                      />
                    )}
                  </Field>

                  <Field
                    label="Your approach"
                    required
                    hint="What you will do, and why it is appropriate to this outcome."
                    aside={`${a.solution.approach.length} / 80`}
                  >
                    {({ id: fid }) => (
                      <Textarea
                        id={fid}
                        rows={6}
                        value={a.solution.approach}
                        onChange={(e) => patch((x) => ({ ...x, solution: { ...x.solution, approach: e.target.value } }))}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="What already exists and works" required>
                      {({ id: fid }) => (
                        <Textarea
                          id={fid}
                          rows={4}
                          value={a.solution.existingSolution}
                          onChange={(e) =>
                            patch((x) => ({ ...x, solution: { ...x.solution, existingSolution: e.target.value } }))
                          }
                        />
                      )}
                    </Field>
                    <Field label="What you will build during the pilot" required>
                      {({ id: fid }) => (
                        <Textarea
                          id={fid}
                          rows={4}
                          value={a.solution.proposedDevelopment}
                          onChange={(e) =>
                            patch((x) => ({ ...x, solution: { ...x.solution, proposedDevelopment: e.target.value } }))
                          }
                        />
                      )}
                    </Field>
                  </div>

                  <Field
                    label="Technology readiness level"
                    required
                    hint="1 is a principle observed; 9 is proven in operation. Overstating this is visible at the first milestone."
                  >
                    {({ id: fid }) => (
                      <NumberInput
                        id={fid}
                        min={1}
                        max={9}
                        value={a.solution.trl}
                        onChange={(e) => patch((x) => ({ ...x, solution: { ...x.solution, trl: Number(e.target.value) } }))}
                      />
                    )}
                  </Field>
                </div>
              ) : null}

              {step === 'plan' ? (
                <div className="flex flex-col gap-6">
                  <Field label="Pilot duration" required aside="days">
                    {({ id: fid }) => (
                      <NumberInput
                        id={fid}
                        value={a.pilotPlan.durationDays}
                        onChange={(e) =>
                          patch((x) => ({ ...x, pilotPlan: { ...x.pilotPlan, durationDays: Number(e.target.value) } }))
                        }
                      />
                    )}
                  </Field>
                  {a.pilotPlan.durationDays > c.pilot.durationDays ? (
                    <InlineNote tone="hold" title="Longer than the published pilot window">
                      The challenge sets {c.pilot.durationDays} days. A longer plan is not blocked, but say in your
                      approach why the outcome cannot be measured inside the published window.
                    </InlineNote>
                  ) : null}

                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-h3 text-ink">Milestones</h3>
                      <Button
                        size="sm"
                        onClick={() =>
                          patch((x) => ({
                            ...x,
                            pilotPlan: {
                              ...x.pilotPlan,
                              milestones: [
                                ...x.pilotPlan.milestones,
                                { name: '', deliverable: '', acceptanceTest: '', dayOffset: 30 },
                              ],
                            },
                            commercials: {
                              ...x.commercials,
                              milestoneCostsPaise: [...x.commercials.milestoneCostsPaise, 0],
                            },
                          }))
                        }
                      >
                        Add a milestone
                      </Button>
                    </div>

                    {a.pilotPlan.milestones.length === 0 ? (
                      <InlineNote tone="hold" title="No milestones yet">
                        Every payment is attached to an acceptance test. Without milestones there is nothing to pay
                        against.
                      </InlineNote>
                    ) : (
                      <ol className="flex flex-col gap-4">
                        {a.pilotPlan.milestones.map((m, i) => (
                          <li key={i} className="sheet-flat px-4 py-4">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-label text-ink">Milestone {i + 1}</p>
                              <Button
                                size="sm"
                                tone="destructive"
                                onClick={() =>
                                  patch((x) => ({
                                    ...x,
                                    pilotPlan: {
                                      ...x.pilotPlan,
                                      milestones: x.pilotPlan.milestones.filter((_, j) => j !== i),
                                    },
                                    commercials: {
                                      ...x.commercials,
                                      milestoneCostsPaise: x.commercials.milestoneCostsPaise.filter((_, j) => j !== i),
                                    },
                                  }))
                                }
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="flex flex-col gap-4">
                              <Field label="Name" required>
                                {({ id: fid }) => (
                                  <Input
                                    id={fid}
                                    value={m.name}
                                    onChange={(e) =>
                                      patch((x) => {
                                        x.pilotPlan.milestones[i]!.name = e.target.value;
                                        return x;
                                      })
                                    }
                                  />
                                )}
                              </Field>
                              <Field label="Deliverable" required hint="What will exist at the end of it.">
                                {({ id: fid }) => (
                                  <Textarea
                                    id={fid}
                                    rows={2}
                                    value={m.deliverable}
                                    onChange={(e) =>
                                      patch((x) => {
                                        x.pilotPlan.milestones[i]!.deliverable = e.target.value;
                                        return x;
                                      })
                                    }
                                  />
                                )}
                              </Field>
                              <Field
                                label="Acceptance test"
                                required
                                hint="How the department will test it. Write something a third party could apply."
                              >
                                {({ id: fid }) => (
                                  <Textarea
                                    id={fid}
                                    rows={2}
                                    value={m.acceptanceTest}
                                    onChange={(e) =>
                                      patch((x) => {
                                        x.pilotPlan.milestones[i]!.acceptanceTest = e.target.value;
                                        return x;
                                      })
                                    }
                                  />
                                )}
                              </Field>
                              <Field label="Due on day" required>
                                {({ id: fid }) => (
                                  <NumberInput
                                    id={fid}
                                    value={m.dayOffset}
                                    onChange={(e) =>
                                      patch((x) => {
                                        x.pilotPlan.milestones[i]!.dayOffset = Number(e.target.value);
                                        return x;
                                      })
                                    }
                                  />
                                )}
                              </Field>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <Field
                    label="What you need from the department"
                    required
                    hint="Name each dependency with its lead time. A pilot that stalls in week three usually stalls on one of these."
                  >
                    {({ id }) => (
                      <MultiSelectTags
                        id={id}
                        values={a.pilotPlan.dependencies}
                        onChange={(v) => patch((x) => ({ ...x, pilotPlan: { ...x.pilotPlan, dependencies: v } }))}
                        options={[
                          'Escorted site access on working days, arranged 48 hours ahead',
                          'Read-only sandbox access to the named systems',
                          'One departmental engineer available four hours a week',
                          'Named point of contact for the complaint register',
                          'Power and connectivity at pilot sites',
                        ]}
                        placeholder="Add a dependency"
                      />
                    )}
                  </Field>

                  <KeyValueSheet
                    title="What the department has said it will not provide"
                    items={c.departmentProvides.willNotProvide.map((w, i) => ({
                      label: `Not provided ${i + 1}`,
                      value: w,
                    }))}
                    footnote="Price these into your milestones. They are not negotiable after award without a change request."
                  />
                </div>
              ) : null}

              {step === 'commercials' ? (
                <div className="flex flex-col gap-6">
                  {a.pilotPlan.milestones.length === 0 ? (
                    <InlineNote tone="hold" title="Add milestones first">
                      Costs attach to milestones, so there is nothing to price yet.
                    </InlineNote>
                  ) : (
                    <section className="sheet-flat">
                      <p className="border-b border-ink px-4 py-2 text-label text-ink">Cost per milestone</p>
                      <ul>
                        {a.pilotPlan.milestones.map((m, i) => (
                          <li key={i} className="ledger-row px-4 py-3">
                            <Field label={`Milestone ${i + 1}${m.name ? ` — ${m.name}` : ''}`} required>
                              {({ id: fid }) => (
                                <MoneyInput
                                  id={fid}
                                  valuePaise={a.commercials.milestoneCostsPaise[i] ?? 0}
                                  onChangePaise={(p) =>
                                    patch((x) => {
                                      x.commercials.milestoneCostsPaise[i] = p;
                                      x.commercials.totalPaise = x.commercials.milestoneCostsPaise.reduce(
                                        (sum, y) => sum + y,
                                        0,
                                      );
                                      return x;
                                    })
                                  }
                                />
                              )}
                            </Field>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <StatLedger
                    title="Against the published budget"
                    rows={[
                      { label: 'Your total', value: money(total) },
                      { label: 'Published pilot budget', value: money(c.pilot.budgetPaise) },
                    ]}
                    total={{
                      label: overBudget ? 'Over by' : 'Under by',
                      value: (
                        <span className={overBudget ? 'text-seal' : 'text-verify'}>
                          {money(Math.abs(c.pilot.budgetPaise - total))}
                        </span>
                      ),
                    }}
                  />

                  {overBudget ? (
                    <div className="flex flex-col gap-4">
                      <InlineNote tone="hold" title="Your price is above the published budget">
                        <p className="max-w-doc">
                          This does not block your application, and it is not automatically a mark against you. The
                          department needs a written justification so it can weigh scope against price rather than
                          guessing.
                        </p>
                      </InlineNote>
                      <Field
                        label="Why the work costs more than the published budget"
                        required
                        hint="Say what the extra buys, and what the department would lose by cutting back to the budget."
                      >
                        {({ id: fid }) => (
                          <Textarea
                            id={fid}
                            rows={5}
                            value={a.commercials.overBudgetJustification ?? ''}
                            onChange={(e) =>
                              patch((x) => ({
                                ...x,
                                commercials: { ...x.commercials, overBudgetJustification: e.target.value },
                              }))
                            }
                          />
                        )}
                      </Field>
                    </div>
                  ) : null}

                  <Field
                    label="Cost basis"
                    required
                    hint="How the price is built up: hardware at cost, engineering at day rates, and so on. At least 30 characters."
                    aside={`${a.commercials.costBasis.length} / 30`}
                  >
                    {({ id: fid }) => (
                      <Textarea
                        id={fid}
                        rows={4}
                        value={a.commercials.costBasis}
                        onChange={(e) =>
                          patch((x) => ({ ...x, commercials: { ...x.commercials, costBasis: e.target.value } }))
                        }
                      />
                    )}
                  </Field>

                  <InlineNote tone="neutral" title="When you get paid">
                    Payment follows written acceptance of a milestone, and the ageing clock starts on the acceptance
                    date against a configured {policyNumber('payment.milestone.limit.days')}-day limit. The clock is
                    visible to you, to the department and on the public transparency page.
                  </InlineNote>
                </div>
              ) : null}

              {step === 'data' ? (
                <div className="flex flex-col gap-6">
                  <InlineNote tone="neutral" title="Asking for less scores better">
                    Data minimisation is a scored criterion on data-intensive challenges. Request the fields you need to
                    produce the outcome, and no more.
                  </InlineNote>

                  <Field label="Fields you need" required>
                    {({ id }) => (
                      <MultiSelectTags
                        id={id}
                        values={a.dataSecurity.dataRequested}
                        onChange={(v) => patch((x) => ({ ...x, dataSecurity: { ...x.dataSecurity, dataRequested: v } }))}
                        options={c.departmentProvides.fields}
                        placeholder="Add a field the challenge offers"
                      />
                    )}
                  </Field>

                  <DataTierSelector
                    value={a.dataSecurity.tier}
                    onChange={(tier) => patch((x) => ({ ...x, dataSecurity: { ...x.dataSecurity, tier } }))}
                  />

                  {a.dataSecurity.tier === 'production' && c.departmentProvides.dataTier !== 'production' ? (
                    <InlineNote tone="seal" title="This challenge does not offer production data">
                      The department has granted {c.departmentProvides.dataTier} tier. Requesting production access here
                      will go to a joint approval and will slow the pilot; say why the outcome cannot be measured at the
                      granted tier.
                    </InlineNote>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field
                      label="Where the data will be processed"
                      required
                      hint="Processing outside India needs prior written consent, which is rarely given."
                    >
                      {({ id: fid }) => (
                        <Input
                          id={fid}
                          value={a.dataSecurity.processingLocation}
                          onChange={(e) =>
                            patch((x) => ({
                              ...x,
                              dataSecurity: { ...x.dataSecurity, processingLocation: e.target.value },
                            }))
                          }
                          placeholder="Mumbai region, within India"
                        />
                      )}
                    </Field>
                    <Field label="Sub-processors" hint="Name every one. An unnotified sub-processor is a reportable incident.">
                      {({ id }) => (
                        <MultiSelectTags
                          id={id}
                          values={a.dataSecurity.subProcessors}
                          onChange={(v) =>
                            patch((x) => ({ ...x, dataSecurity: { ...x.dataSecurity, subProcessors: v } }))
                          }
                          options={['Managed cloud hosting, Mumbai region', 'Managed cloud hosting, Hyderabad region', 'SMS gateway', 'Map tile provider']}
                          placeholder="Add a sub-processor"
                        />
                      )}
                    </Field>
                  </div>

                  <Field label="Certifications you hold" hint="Security certifications are checked, never relaxed.">
                    {({ id }) => (
                      <MultiSelectTags
                        id={id}
                        values={a.dataSecurity.certifications}
                        onChange={(v) =>
                          patch((x) => ({ ...x, dataSecurity: { ...x.dataSecurity, certifications: v } }))
                        }
                        options={[...CERTIFICATIONS]}
                        placeholder="Add a certification"
                      />
                    )}
                  </Field>
                </div>
              ) : null}

              {step === 'declarations' ? (
                <div className="flex flex-col gap-6">
                  <div className="sheet-flat flex flex-col gap-4 px-4 py-4">
                    <Checkbox
                      checked={a.declarations.conflict}
                      onChange={(v) => patch((x) => ({ ...x, declarations: { ...x.declarations, conflict: v } }))}
                      label="I have a conflict of interest to declare"
                      detail="A relationship with the department, its officers or an evaluator. Declaring one does not disqualify you; concealing one does."
                    />
                    {a.declarations.conflict ? (
                      <Field label="Describe the conflict" required>
                        {({ id: fid }) => (
                          <Textarea
                            id={fid}
                            rows={3}
                            value={a.declarations.conflictDetail ?? ''}
                            onChange={(e) =>
                              patch((x) => ({ ...x, declarations: { ...x.declarations, conflictDetail: e.target.value } }))
                            }
                          />
                        )}
                      </Field>
                    ) : null}

                    <Checkbox
                      checked={a.declarations.debarred}
                      onChange={(v) => patch((x) => ({ ...x, declarations: { ...x.declarations, debarred: v } }))}
                      label="This entity is currently debarred by a government body"
                      detail="A true declaration here fails the conduct rule, which is not relaxable. A false one is a contract breach."
                    />
                    <Checkbox
                      checked={a.declarations.blacklisted}
                      onChange={(v) => patch((x) => ({ ...x, declarations: { ...x.declarations, blacklisted: v } }))}
                      label="This entity is currently blacklisted"
                    />
                    <Checkbox
                      checked={a.declarations.startupDeclaration}
                      onChange={(v) =>
                        patch((x) => ({ ...x, declarations: { ...x.declarations, startupDeclaration: v } }))
                      }
                      label="I claim recognised startup status for the purpose of relief"
                      detail="Checked against the recognition register. Relief covers prior turnover and prior experience only."
                    />
                  </div>

                  <Field
                    label="Authorised signatory"
                    required
                    hint="The person who can bind this entity. Their name is recorded with the submission timestamp."
                  >
                    {({ id: fid }) => (
                      <Input
                        id={fid}
                        value={a.declarations.signatureName ?? ''}
                        onChange={(e) =>
                          patch((x) => ({ ...x, declarations: { ...x.declarations, signatureName: e.target.value } }))
                        }
                      />
                    )}
                  </Field>

                  <InlineNote tone="neutral" title="Documents">
                    Your registration documents come from your profile and do not need re-uploading here. Anything
                    challenge-specific is attached at the pilot stage against a milestone.
                  </InlineNote>
                </div>
              ) : null}

              {step === 'review' ? (
                <div className="flex flex-col gap-6">
                  {Object.entries(missing).some(([, m]) => m.length > 0) ? (
                    <InlineNote tone="seal" title="This application is not complete">
                      <ul className="list-disc pl-5">
                        {Object.entries(missing)
                          .filter(([, m]) => m.length > 0)
                          .map(([slug, m]) => (
                            <li key={slug}>
                              <button
                                type="button"
                                className="underline underline-offset-2"
                                onClick={() => navigate(`/s/applications/${a.id}/edit/${slug}`)}
                              >
                                {STEPS.find((x) => x.slug === slug)?.title}
                              </button>
                              : {m.join('; ')}
                            </li>
                          ))}
                      </ul>
                    </InlineNote>
                  ) : (
                    <InlineNote tone="verify" title="Everything required is present">
                      Read it through once more. Once submitted it cannot be edited, because evaluators score what was
                      submitted.
                    </InlineNote>
                  )}

                  <KeyValueSheet
                    title="What you are about to submit"
                    items={[
                      { label: 'Challenge', value: `${c.caseId} — ${c.title}` },
                      { label: 'Your reference', value: <span className="tnum">{a.caseId}</span> },
                      { label: 'Technology readiness', value: `${a.solution.trl} of 9` },
                      { label: 'Milestones', value: <span className="tnum">{a.pilotPlan.milestones.length}</span> },
                      { label: 'Total price', value: <span className="tnum">{money(total)}</span> },
                      {
                        label: 'Against budget',
                        value: overBudget ? (
                          <Badge tone="hold">Over by {money(total - c.pilot.budgetPaise)}</Badge>
                        ) : (
                          <Badge tone="verify">Within budget</Badge>
                        ),
                      },
                      { label: 'Data tier requested', value: a.dataSecurity.tier },
                      { label: 'Authorised signatory', value: a.declarations.signatureName ?? '—' },
                    ]}
                  />

                  {rub ? (
                    <section className="sheet-flat">
                      <h3 className="border-b border-ink px-4 py-2 text-label text-ink">
                        You will be scored against this, unchanged
                      </h3>
                      <ul>
                        {rub.criteria.map((crit) => (
                          <li key={crit.id} className="ledger-row flex items-baseline justify-between px-4 py-2">
                            <span className="text-body text-ink">{crit.label}</span>
                            <span className="text-data text-ink tnum">{crit.weightPercent}%</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </WizardShell>

            <Modal
              open={confirmSubmit}
              onClose={() => setConfirmSubmit(false)}
              title="Submit this application?"
              description="Submitted applications cannot be edited. Evaluators score exactly what is sent."
              footer={
                <>
                  <Button onClick={() => setConfirmSubmit(false)}>Go back</Button>
                  <Button
                    tone="primary"
                    loading={submit.isPending}
                    loadingLabel="Submitting"
                    onClick={() =>
                      submit.mutate(a.id, {
                        onSuccess: (res) => {
                          track({
                            name: 'application_submitted',
                            applicationId: a.id,
                            referenceNumber: res.data.receipt.reference,
                          });
                          setConfirmSubmit(false);
                          setReceipt(res.data.receipt);
                        },
                        onError: (err) => {
                          const api = err instanceof PrayogApiError ? err : null;
                          setConfirmSubmit(false);
                          pushToast(
                            'seal',
                            api?.message ?? 'The application was not submitted.',
                            api?.details.join(' ') ?? 'Everything you entered is preserved.',
                          );
                        },
                      })
                    }
                  >
                    Submit the application
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-3">
                <p className="text-body text-ink">
                  The closing time is taken from the server, not from your browser. If the window closes while this
                  dialog is open, the submission is refused and your draft is preserved.
                </p>
                <p className="text-body text-ink-soft">
                  Applications close {dayTime(c.timeline.closesOn)}.
                </p>
              </div>
            </Modal>

            <Modal
              open={Boolean(receipt)}
              onClose={() => {
                setReceipt(null);
                navigate(`/s/applications/${a.id}`);
              }}
              title="Submitted"
              description="Keep this reference. It is the same one the department sees."
              footer={
                <Button
                  tone="primary"
                  onClick={() => {
                    setReceipt(null);
                    navigate(`/s/applications/${a.id}`);
                  }}
                >
                  Open the application
                </Button>
              }
            >
              {receipt ? (
                <KeyValueSheet
                  items={[
                    { label: 'Reference', value: <span className="tnum">{receipt.reference}</span> },
                    { label: 'Submitted at', value: dayTime(receipt.at) },
                    { label: 'Submission checksum', value: <span className="tnum">{receipt.hash.slice(0, 16)}</span> },
                    { label: 'Applications close', value: dayTime(c.timeline.closesOn) },
                    {
                      label: 'What happens next',
                      value: `The eligibility rules have already run. The department shortlists at gate 2, and you will be told the outcome with the reasons either way.`,
                    },
                  ]}
                />
              ) : null}
            </Modal>

            <p className="sr-only" aria-live="polite">
              {saveState === 'saved' ? `Draft saved at ${savedAt ? dayTime(savedAt) : ''}` : ''}
            </p>
          </div>
        );
      }}
    </QueryState>
  );
}
