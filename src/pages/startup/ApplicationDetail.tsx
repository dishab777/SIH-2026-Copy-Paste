import { Link, useParams } from 'react-router-dom';
import { usePortalLink } from '@/lib/portal';
import { rubric } from '@/config/rubrics';
import { useApplication, usePilots } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { EligibilityChecklist } from '@/components/domain/Eligibility';
import { day, dayTime, fileSize, money, num, shortHash } from '@/lib/format';

const NEXT_STEP: Record<string, { title: string; body: string; action?: { label: string; to: string } }> = {
  draft: {
    title: 'Finish and submit this application',
    body: 'Nothing has been sent to the department yet. Your draft is saved and can be picked up at any step.',
  },
  submitted: {
    title: 'With the department for eligibility screening',
    body: 'The rules ran automatically when you submitted. A human reviews anything the engine could not decide.',
  },
  screening: {
    title: 'With the department for eligibility screening',
    body: 'You will be told the result and the rule behind it, either way.',
  },
  eligible: {
    title: 'Eligible — waiting on the shortlist decision',
    body: 'The department shortlists at gate 2. Every application gets an explicit decision; none is dropped quietly.',
  },
  needs_review: {
    title: 'A rule needs a human decision',
    body: 'Something changed or could not be checked automatically. This is not a rejection, and you will be told the outcome with the reason.',
  },
  ineligible: {
    title: 'Not eligible for this challenge',
    body: 'The rules that were not met are listed below, with the evidence used and the rule cited.',
  },
  shortlisted: {
    title: 'Shortlisted — with the evaluation panel',
    body: 'You will be scored against the rubric that was published with the challenge, unchanged.',
  },
  under_evaluation: {
    title: 'With the evaluation panel',
    body: 'Scores are released once the panel records its minutes.',
  },
  awarded: {
    title: 'Awarded — the pilot is yours',
    body: 'Read the contract clauses, then sign in two steps. The pilot workspace opens once it is signed.',
  },
  not_selected: {
    title: 'Not selected',
    body: 'Your scores against each published criterion are below, with the written reason each evaluator gave.',
  },
  withdrawn: { title: 'Withdrawn', body: 'This application was withdrawn.' },
};

export default function StartupApplicationDetail() {
  const link = usePortalLink();
  const { id } = useParams();
  const query = useApplication(id);
  const pilots = usePilots();

  return (
    <QueryState query={query} errorTitle="Unable to load this application." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { application: a, challenge: c, evaluations } = payload.data;
        const next = NEXT_STEP[a.status] ?? { title: a.status.replace(/_/g, ' '), body: '' };
        const released = evaluations.some((e) => e.released);
        const pilot = pilots.data?.data.find((p) => p.pilot.applicationId === a.id);
        const rub = (() => {
          try {
            return rubric(c.rubricId);
          } catch {
            return null;
          }
        })();

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb
                items={[
                  { label: 'Applications', to: '/s/applications' },
                  { label: a.caseId },
                ]}
              />
            </div>

            <PageHeader
              title={c.title}
              lead={`${a.caseId} against ${c.caseId}. ${c.district}, ${c.state}.`}
              servedAt={payload.servedAt}
              onRefresh={() => void query.refetch()}
              aside={<StatusBadge status={a.status} />}
            />

            {/* The next step, stated before anything else. */}
            <div className="mb-8">
              <InlineNote tone={a.status === 'awarded' ? 'verify' : a.status === 'ineligible' ? 'seal' : 'hold'} title={next.title}>
                <p className="max-w-doc">{next.body}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {a.status === 'draft' ? (
                    <LinkButton size="sm" tone="primary" to={`/s/applications/${a.id}/edit/eligibility`}>
                      Continue the application
                    </LinkButton>
                  ) : null}
                  {a.status === 'awarded' && pilot ? (
                    <>
                      <LinkButton size="sm" tone="primary" to={`/s/contracts/${pilot.pilot.contractId}`}>
                        Read and sign the contract
                      </LinkButton>
                      <LinkButton size="sm" to={`/s/pilots/${pilot.pilot.id}`}>
                        Open the pilot workspace
                      </LinkButton>
                    </>
                  ) : null}
                  <LinkButton size="sm" to={link(`/challenges/${c.slug}`)}>
                    Re-read the challenge
                  </LinkButton>
                </div>
              </InlineNote>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-8">
                <section aria-labelledby="timeline-heading">
                  <h2 id="timeline-heading" className="mb-3 text-h2 text-ink">
                    What has happened
                  </h2>
                  <ol className="sheet-flat">
                    {a.timeline.map((t, i) => (
                      <li key={`${t.at}-${i}`} className="ledger-row px-4 py-3">
                        <p className="text-micro text-ink-soft tnum">{dayTime(t.at)}</p>
                        <p className="mt-0.5 text-body text-ink">{t.label}</p>
                        <p className="text-micro text-ink-soft">{t.actor}</p>
                      </li>
                    ))}
                  </ol>
                </section>

                <section aria-labelledby="eligibility-heading">
                  <h2 id="eligibility-heading" className="mb-1 text-h2 text-ink">
                    Your eligibility
                  </h2>
                  <p className="mb-3 max-w-doc text-body text-ink-soft">
                    Each rule shows the result, the evidence used, the rule cited and when it was checked. Where relief
                    applied, it says so.
                  </p>
                  {a.eligibility.length === 0 ? (
                    <EmptyState
                      title="The rules have not run yet."
                      body="They run automatically the moment you submit."
                    />
                  ) : (
                    <EligibilityChecklist results={a.eligibility} />
                  )}
                </section>

                <section aria-labelledby="submission-heading">
                  <h2 id="submission-heading" className="mb-3 text-h2 text-ink">
                    What you submitted
                  </h2>
                  <div className="flex flex-col gap-4">
                    <KeyValueSheet
                      title="Solution"
                      items={[
                        { label: 'Understanding of the problem', value: a.solution.problemUnderstanding || '—' },
                        { label: 'Approach', value: a.solution.approach || '—' },
                        { label: 'What already exists', value: a.solution.existingSolution || '—' },
                        { label: 'What will be built', value: a.solution.proposedDevelopment || '—' },
                        { label: 'Technology readiness', value: `${a.solution.trl} of 9` },
                      ]}
                    />
                    <KeyValueSheet
                      title="Commercials"
                      items={[
                        ...a.commercials.milestoneCostsPaise.map((cost, i) => ({
                          label: `Milestone ${i + 1}`,
                          value: <span className="tnum">{money(cost)}</span>,
                        })),
                        {
                          label: 'Total',
                          value: <span className="tnum">{money(a.commercials.totalPaise)}</span>,
                          hint: `Published pilot budget ${money(c.pilot.budgetPaise)}`,
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
                  </div>
                </section>

                <section aria-labelledby="scores-heading">
                  <h2 id="scores-heading" className="mb-3 text-h2 text-ink">
                    Your scores
                  </h2>
                  {!released ? (
                    <InlineNote tone="hold" title="Scores are not released yet">
                      They are released once the panel records its minutes. You will then see your score on every
                      published criterion, with the written reason behind it.
                    </InlineNote>
                  ) : (
                    <div className="sheet-flat">
                      {rub ? (
                        <ul>
                          {rub.criteria.map((crit) => {
                            const scores = evaluations
                              .map((e) => e.scores.find((s) => s.criterionId === crit.id))
                              .filter((s): s is NonNullable<typeof s> => Boolean(s));
                            const mean = scores.length
                              ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
                              : null;
                            return (
                              <li key={crit.id} className="ledger-row px-4 py-3">
                                <div className="flex flex-wrap items-baseline justify-between gap-3">
                                  <span className="min-w-0 max-w-doc">
                                    <span className="block text-body text-ink">{crit.label}</span>
                                    <span className="block text-micro text-ink-soft">{crit.definition}</span>
                                  </span>
                                  <span className="text-data text-ink tnum">
                                    {mean === null ? '—' : `${num(mean, 1)} of 5`}
                                    <span className="ml-2 text-micro text-ink-soft">{crit.weightPercent}%</span>
                                  </span>
                                </div>
                                {scores.length ? (
                                  <ul className="mt-2">
                                    {scores.map((s, i) => (
                                      <li key={`${crit.id}-${i}`} className="border-t border-rule py-2">
                                        <p className="max-w-doc text-body text-ink">{s.rationale}</p>
                                        <p className="text-micro text-ink-soft">{s.evidenceReference}</p>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      {a.scores ? (
                        <div className="rule-total flex items-baseline justify-between px-4 py-3">
                          <span className="text-body font-medium text-ink">
                            Weighted mean across {a.scores.evaluatorCount} evaluators
                          </span>
                          <span className="text-data font-medium text-ink tnum">{num(a.scores.weightedMean, 2)} of 5</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>
              </div>

              <aside className="lg:sticky lg:top-20 lg:self-start">
                <div className="flex flex-col gap-4">
                  <KeyValueSheet
                    title="This application"
                    dense
                    items={[
                      { label: 'Reference', value: <span className="tnum">{a.referenceNumber ?? 'Not submitted'}</span> },
                      { label: 'Submitted', value: a.submittedAt ? dayTime(a.submittedAt) : 'Not yet' },
                      { label: 'Last saved', value: dayTime(a.lastSavedAt) },
                      { label: 'Signed by', value: a.declarations.signatureName ?? '—' },
                      {
                        label: 'Applications close',
                        value: c.timeline.closesOn ? day(c.timeline.closesOn) : '—',
                        hint: 'The closing time is the server clock, not your browser clock.',
                      },
                    ]}
                  />

                  <section className="sheet-flat">
                    <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Your documents</h3>
                    <ul>
                      {a.documents.map((doc) => (
                        <li key={doc.id} className="ledger-row px-4 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-body text-ink">{doc.type}</span>
                              <span className="block text-micro text-ink-soft">{fileSize(doc.sizeBytes)}</span>
                              <span className="block text-micro text-ink-soft tnum">{shortHash(doc.hash)}</span>
                            </span>
                            <StatusBadge
                              status={doc.scan}
                              label={doc.scan === 'clean' ? 'Clean' : doc.scan === 'pending' ? 'Scanning' : 'Failed'}
                            />
                          </div>
                        </li>
                      ))}
                      {a.documents.length === 0 ? (
                        <li className="px-4 py-2 text-body text-ink-soft">No documents attached.</li>
                      ) : null}
                    </ul>
                  </section>

                  {a.clarifications.length > 0 ? (
                    <section className="sheet-flat">
                      <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Clarifications</h3>
                      <ul>
                        {a.clarifications.map((q) => (
                          <li key={q.id} className="ledger-row px-4 py-2">
                            <p className="text-body text-ink">{q.question}</p>
                            {q.answer ? (
                              <p className="mt-1 text-micro text-ink">{q.answer}</p>
                            ) : (
                              <Badge tone="hold">Awaiting an answer</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <p className="text-micro text-ink-soft">
                    Public clarifications on this challenge are published on{' '}
                    <Link to={link(`/challenges/${c.slug}#qa`)} className="underline underline-offset-2">
                      the challenge page
                    </Link>
                    , where every applicant sees the same answers.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
