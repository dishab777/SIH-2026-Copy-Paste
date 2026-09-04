import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApplication } from '@/services/hooks';
import { rubric } from '@/config/rubrics';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { EligibilityChecklist } from '@/components/domain/Eligibility';
import { DataTierBadge } from '@/components/domain/Legal';
import { countOf, day, fileSize, money, num, shortHash } from '@/lib/format';

const SECTIONS = [
  'Eligibility',
  'Technical approach',
  'Pilot plan',
  'Acceptance tests',
  'Commercials',
  'Data',
  'Cybersecurity',
  'Declarations',
  'Documents',
  'Scores',
] as const;

export default function ApplicantDossier() {
  const { id, appId } = useParams();
  const query = useApplication(appId);
  // Anonymised before scoring: identity is hidden so the proposal is read on its merits.
  const [anonymised, setAnonymised] = useState(true);

  return (
    <QueryState query={query} errorTitle="Unable to load this application." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { application: a, challenge: c, startup: s, evaluations } = payload.data;
        const released = evaluations.some((e) => e.released);
        const name = anonymised ? `Applicant ${a.caseId.slice(-4)}` : s.tradeName;
        const overBudget = a.commercials.totalPaise > c.pilot.budgetPaise;
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
                  { label: 'Challenge pipeline', to: '/d/challenges' },
                  { label: c.caseId, to: `/d/challenges/${c.id}` },
                  { label: 'Applications', to: `/d/challenges/${id}/applications` },
                  { label: a.caseId },
                ]}
              />
            </div>

            <PageHeader
              title={`${name} — dossier`}
              lead={`Submission on the left, verified facts on the right. Nothing on the right came from this application; it came from the registers.`}
              servedAt={payload.servedAt}
              onRefresh={() => void query.refetch()}
              aside={
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.status} />
                  <Button size="sm" onClick={() => setAnonymised((v) => !v)}>
                    {anonymised ? 'Reveal the applicant' : 'Hide the applicant'}
                  </Button>
                </div>
              }
            />

            {anonymised ? (
              <div className="mb-6">
                <InlineNote tone="neutral" title="Anonymised view">
                  The applicant name, city and registration numbers are hidden. Turn this off once scoring is complete,
                  or if you need to check a conflict.
                </InlineNote>
              </div>
            ) : null}

            <nav aria-label="Dossier sections" className="mb-6 flex flex-wrap gap-x-4 gap-y-1">
              {SECTIONS.map((sec) => (
                <a
                  key={sec}
                  href={`#sec-${sec.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-micro text-ink-soft underline underline-offset-2 hover:text-ink"
                >
                  {sec}
                </a>
              ))}
            </nav>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
              {/* Left: what the applicant said. */}
              <div className="flex flex-col gap-8">
                <section id="sec-eligibility">
                  <h2 className="mb-3 text-h2 text-ink">Eligibility</h2>
                  <EligibilityChecklist results={a.eligibility} />
                </section>

                <section id="sec-technical-approach">
                  <h2 className="mb-3 text-h2 text-ink">Technical approach</h2>
                  <dl className="flex flex-col gap-4">
                    {[
                      { label: 'Understanding of the problem', value: a.solution.problemUnderstanding },
                      { label: 'Approach', value: a.solution.approach },
                      { label: 'What already exists', value: a.solution.existingSolution },
                      { label: 'What will be built during the pilot', value: a.solution.proposedDevelopment },
                    ].map((row) => (
                      <div key={row.label}>
                        <dt className="text-label text-ink-soft">{row.label}</dt>
                        <dd className="mt-1 max-w-doc font-doc text-doc text-ink">{row.value || '—'}</dd>
                      </div>
                    ))}
                    <div>
                      <dt className="text-label text-ink-soft">Technology readiness level</dt>
                      <dd className="mt-1 text-data text-ink tnum">{a.solution.trl} of 9</dd>
                    </div>
                  </dl>
                </section>

                <section id="sec-pilot-plan">
                  <h2 className="mb-3 text-h2 text-ink">Pilot plan</h2>
                  <p className="mb-3 text-body text-ink-soft">
                    {a.pilotPlan.durationDays} days against a published pilot window of {c.pilot.durationDays} days.
                  </p>
                  <ol className="sheet-flat" id="sec-acceptance-tests">
                    {a.pilotPlan.milestones.map((m, i) => (
                      <li key={`${m.name}-${i}`} className="ledger-row px-4 py-4">
                        <p className="text-micro text-ink-soft tnum">
                          Milestone {i + 1} · day {m.dayOffset}
                        </p>
                        <p className="mt-0.5 text-body text-ink">{m.name}</p>
                        <p className="mt-2 text-label text-ink-soft">Deliverable</p>
                        <p className="max-w-doc text-body text-ink">{m.deliverable || '—'}</p>
                        <p className="mt-2 text-label text-ink-soft">Acceptance test</p>
                        <p className="max-w-doc text-body text-ink">{m.acceptanceTest || '—'}</p>
                        <p className="mt-2 text-micro text-ink-soft tnum">
                          {money(a.commercials.milestoneCostsPaise[i] ?? 0)}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {a.pilotPlan.dependencies.length ? (
                    <div className="mt-4">
                      <p className="text-label text-ink-soft">What they need from the department</p>
                      <ul className="mt-1 list-disc pl-5 text-body text-ink">
                        {a.pilotPlan.dependencies.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>

                <section id="sec-commercials">
                  <h2 className="mb-3 text-h2 text-ink">Commercials</h2>
                  <div className="sheet-flat">
                    <ul>
                      {a.commercials.milestoneCostsPaise.map((cost, i) => (
                        <li key={i} className="ledger-row flex items-baseline justify-between px-4 py-2">
                          <span className="text-body text-ink">Milestone {i + 1}</span>
                          <span className="text-data text-ink tnum">{money(cost)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rule-total flex items-baseline justify-between px-4 py-3">
                      <span className="text-body font-medium text-ink">Total proposed</span>
                      <span className="text-data font-medium text-ink tnum">{money(a.commercials.totalPaise)}</span>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-rule px-4 py-2">
                      <span className="text-body text-ink-soft">Published pilot budget</span>
                      <span className="text-data text-ink-soft tnum">{money(c.pilot.budgetPaise)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-label text-ink-soft">Cost basis</p>
                  <p className="max-w-doc text-body text-ink">{a.commercials.costBasis || '—'}</p>
                  {overBudget ? (
                    <div className="mt-4">
                      <InlineNote tone="hold" title="Over the published budget">
                        <p className="max-w-doc">
                          {money(a.commercials.totalPaise - c.pilot.budgetPaise)} above the published pilot budget. Being
                          over budget does not disqualify an application; it requires a written justification, which is
                          below.
                        </p>
                        <p className="mt-2 max-w-doc font-doc text-doc text-ink">
                          {a.commercials.overBudgetJustification ?? 'No justification was given.'}
                        </p>
                      </InlineNote>
                    </div>
                  ) : null}
                </section>

                <section id="sec-data">
                  <h2 className="mb-3 text-h2 text-ink">Data</h2>
                  <KeyValueSheet
                    items={[
                      { label: 'Tier requested', value: <DataTierBadge tier={a.dataSecurity.tier} /> },
                      {
                        label: 'Fields requested',
                        value: a.dataSecurity.dataRequested.join(', ') || '—',
                        hint: `The challenge offers ${countOf(c.departmentProvides.fields.length, 'field')}. Asking for fewer scores better on data minimisation.`,
                      },
                      { label: 'Processing location', value: a.dataSecurity.processingLocation || '—' },
                      { label: 'Sub-processors', value: a.dataSecurity.subProcessors.join(', ') || 'None declared' },
                    ]}
                  />
                </section>

                <section id="sec-cybersecurity">
                  <h2 className="mb-3 text-h2 text-ink">Cybersecurity</h2>
                  <KeyValueSheet
                    items={[
                      {
                        label: 'Level required by this challenge',
                        value: <span className="capitalize">{c.legal.cyberLevel}</span>,
                      },
                      {
                        label: 'Certifications declared',
                        value: a.dataSecurity.certifications.length ? (
                          <span className="flex flex-wrap gap-2">
                            {a.dataSecurity.certifications.map((cert) => (
                              <Badge key={cert} tone="verify">
                                {cert}
                              </Badge>
                            ))}
                          </span>
                        ) : (
                          'None declared'
                        ),
                      },
                    ]}
                  />
                </section>

                <section id="sec-declarations">
                  <h2 className="mb-3 text-h2 text-ink">Declarations</h2>
                  <KeyValueSheet
                    items={[
                      {
                        label: 'Conflict of interest',
                        value: a.declarations.conflict ? (
                          <span>
                            <Badge tone="seal">Declared</Badge>
                            <span className="mt-1 block text-body text-ink">{a.declarations.conflictDetail}</span>
                          </span>
                        ) : (
                          <Badge tone="verify">None declared</Badge>
                        ),
                      },
                      {
                        label: 'Debarred',
                        value: a.declarations.debarred ? <Badge tone="seal">Yes</Badge> : <Badge tone="verify">No</Badge>,
                      },
                      {
                        label: 'Blacklisted',
                        value: a.declarations.blacklisted ? <Badge tone="seal">Yes</Badge> : <Badge tone="verify">No</Badge>,
                      },
                      {
                        label: 'Startup declaration',
                        value: a.declarations.startupDeclaration ? (
                          <Badge tone="verify">Signed</Badge>
                        ) : (
                          <Badge tone="neutral">Not claimed</Badge>
                        ),
                      },
                      { label: 'Signed by', value: a.declarations.signatureName ?? '—' },
                      { label: 'Signed on', value: day(a.declarations.signedAt) },
                    ]}
                  />
                </section>

                <section id="sec-documents">
                  <h2 className="mb-3 text-h2 text-ink">Documents</h2>
                  <ul className="sheet-flat">
                    {a.documents.map((doc) => (
                      <li key={doc.id} className="ledger-row flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-body text-ink">{doc.type}</span>
                          <span className="block text-micro text-ink-soft">
                            {doc.fileName} · {fileSize(doc.sizeBytes)} · uploaded {day(doc.uploadedOn)}
                          </span>
                          <span className="block text-micro text-ink-soft tnum">Checksum {shortHash(doc.hash)}</span>
                        </span>
                        <StatusBadge
                          status={doc.scan}
                          label={doc.scan === 'clean' ? 'Scan clean' : doc.scan === 'pending' ? 'Scan pending' : 'Scan failed'}
                        />
                      </li>
                    ))}
                    {a.documents.length === 0 ? (
                      <li className="px-4 py-3 text-body text-ink-soft">No documents attached.</li>
                    ) : null}
                  </ul>
                </section>

                <section id="sec-scores">
                  <h2 className="mb-3 text-h2 text-ink">Scores</h2>
                  {!released ? (
                    <InlineNote tone="hold" title="Scores are not released yet">
                      Individual evaluator scores stay hidden until the panel chair releases results. This is not a
                      permissions problem — it is how the panel is kept independent.
                    </InlineNote>
                  ) : (
                    <div className="sheet-flat">
                      <ul>
                        {evaluations.map((e) => (
                          <li key={e.id} className="ledger-row px-4 py-3">
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-body text-ink">Evaluator {e.evaluatorId.slice(-2)}</span>
                              <span className="text-data text-ink tnum">{num(e.weightedTotal ?? 0, 2)} of 5</span>
                            </div>
                            {rub ? (
                              <ul className="mt-2">
                                {e.scores.map((sc) => {
                                  const crit = rub.criteria.find((x) => x.id === sc.criterionId);
                                  return (
                                    <li key={sc.criterionId} className="border-t border-rule py-2">
                                      <div className="flex items-baseline justify-between gap-3">
                                        <span className="text-micro text-ink-soft">
                                          {crit?.label} · {crit?.weightPercent}%
                                        </span>
                                        <span className="text-data text-ink tnum">{sc.score} of 5</span>
                                      </div>
                                      <p className="mt-1 max-w-doc text-body text-ink">{sc.rationale}</p>
                                      <p className="text-micro text-ink-soft">{sc.evidenceReference}</p>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {a.scores ? (
                        <div className="rule-total flex items-baseline justify-between px-4 py-3">
                          <span className="text-body font-medium text-ink">
                            Panel mean across {a.scores.evaluatorCount} evaluators
                          </span>
                          <span className="text-data font-medium text-ink tnum">{num(a.scores.weightedMean, 2)} of 5</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>
              </div>

              {/* Right: verified facts, from the registers rather than the application. */}
              <aside className="lg:sticky lg:top-20 lg:self-start">
                <div className="flex flex-col gap-4">
                  <KeyValueSheet
                    title="Verified facts"
                    dense
                    items={[
                      { label: 'Legal name', value: anonymised ? 'Withheld in anonymised view' : s.legalName },
                      { label: 'Entity type', value: s.entityType.replace(/_/g, ' ') },
                      { label: 'Incorporated', value: day(s.incorporationDate) },
                      {
                        label: 'CIN',
                        value: anonymised ? 'Withheld' : <span className="tnum">{s.cin}</span>,
                      },
                      {
                        label: 'GST',
                        value: (
                          <span>
                            <StatusBadge status={s.gstStatus} />
                            {!anonymised ? <span className="mt-0.5 block text-micro tnum">{s.gstin}</span> : null}
                          </span>
                        ),
                      },
                      {
                        label: 'DPIIT recognition',
                        value: (
                          <span>
                            <StatusBadge status={s.dpiit.status} />
                            <span className="mt-0.5 block text-micro text-ink-soft">
                              {s.dpiit.validTo ? `Valid to ${day(s.dpiit.validTo)}` : 'No validity on record'} · checked{' '}
                              {day(s.dpiit.lastCheckedAt)}
                            </span>
                          </span>
                        ),
                        citation: 'DPIIT G.S.R. 127(E)',
                      },
                      { label: 'Turnover on record', value: `₹${num(s.turnoverCrore, 2)} crore` },
                      { label: 'Team size', value: <span className="tnum">{num(s.teamSize)}</span> },
                      { label: 'States served', value: s.statesServed.join(', ') },
                    ]}
                    footnote="These come from the registers and the verified profile, not from this application. Every read is recorded in the audit trail."
                  />

                  <section className="sheet-flat">
                    <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Declared deployments</h3>
                    <ul>
                      {s.deployments.map((d) => (
                        <li key={d.id} className="ledger-row px-4 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block text-body text-ink">
                                {anonymised ? 'Client withheld' : d.client}
                              </span>
                              <span className="block text-micro text-ink-soft tnum">{d.year}</span>
                            </span>
                            {d.validated ? <Badge tone="verify">Validated</Badge> : <Badge tone="neutral">Declared</Badge>}
                          </div>
                        </li>
                      ))}
                      {s.deployments.length === 0 ? (
                        <li className="px-4 py-2 text-body text-ink-soft">None on record.</li>
                      ) : null}
                    </ul>
                  </section>

                  <section className="sheet-flat">
                    <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Capabilities on the profile</h3>
                    <div className="flex flex-wrap gap-2 px-4 py-3">
                      {s.capabilities.map((cap) => (
                        <Badge key={cap} tone={c.capabilities.includes(cap) ? 'verify' : 'neutral'}>
                          {cap}
                        </Badge>
                      ))}
                    </div>
                    <p className="border-t border-rule px-4 py-2 text-micro text-ink-soft">
                      Highlighted capabilities are the ones this challenge asks for.
                    </p>
                  </section>
                </div>
              </aside>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
