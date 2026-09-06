import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GATES, gateSlaDays } from '@/config/gates';
import { policyNumber, citationShort } from '@/config/policies';
import { usePilot, useSubmitMilestone } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { CaseWorkspace } from '@/components/layout/CaseWorkspace';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { FileCover } from '@/components/domain/FileCover';
import { MilestoneCard, MilestoneTimeline, EvidenceVault } from '@/components/domain/Milestones';
import { RiskRegister, ChangeRequestList } from '@/components/domain/RiskIncident';
import { PaymentAgeingBar } from '@/components/domain/SlaClock';
import { MeasurementChart, kpiStatus, progress } from '@/components/charts/MeasurementChart';
import { DataTierBadge } from '@/components/domain/Legal';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { StatusBadge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Breadcrumb, Tabs } from '@/components/ui/Nav';
import { day, dayTime, daysBetween, money, moneyScaled, countOf, percent } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import { platformNowIso } from '@/config/clock';

export default function StartupPilotWorkspace() {
  const { id } = useParams();
  const query = usePilot(id);
  const submitMilestone = useSubmitMilestone();
  const pushToast = useUi((s) => s.pushToast);
  const [tab, setTab] = useState('overview');

  const reviewWindow = policyNumber('sla.milestone.review.days');
  const paymentLimit = policyNumber('payment.milestone.limit.days');

  return (
    <QueryState query={query} errorTitle="Unable to load this pilot." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const d = payload.data;
        const p = d.pilot;
        const elapsed = Math.min(p.durationDays, Math.max(0, daysBetween(p.startedOn)));
        const due = d.milestones.filter((m) => ['not_started', 'in_progress', 'revision_required'].includes(m.status));
        const headline = d.kpis[0];
        const paid = d.claims.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.netPaise, 0);
        const owed = d.claims.filter((c) => c.status !== 'paid').reduce((sum, c) => sum + c.netPaise, 0);
        // 'accepted' is not a milestone status: the department approves, and the
        // claim it raises is what later reads paid.
        const accepted = d.milestones.filter((m) => m.status === 'approved' || m.status === 'paid').length;

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb items={[{ label: 'Pilots', to: '/s/pilots' }, { label: p.caseId }]} />
            </div>

            <CaseWorkspace
              gates={d.gates}
              currentGate={p.currentGate}
              ownerNames={Object.fromEntries(d.gates.map((g) => [g.ownerId, g.ownerId]))}
              evidence={d.evidence}
              audit={[]}
              next={due.map((m) => ({
                id: m.id,
                caseId: m.caseId,
                title: `Milestone ${m.index} — ${m.name}`,
                requiredAction:
                  m.status === 'revision_required'
                    ? `Revise and resubmit: ${m.reviewNote ?? 'see the department finding'}`
                    : `Submit evidence: ${m.evidenceRequired.join(', ')}`,
                ownerId: p.startupId,
                ownerName: d.startup.tradeName,
                waitingSinceDays: 0,
                slaDays: Math.max(1, daysBetween(platformNowIso(), m.dueOn)),
                href: `/s/pilots/${p.id}`,
                entityType: 'pilot',
                amountPaise: m.paymentPaise,
              }))}
              linked={[
                {
                  caseId: d.challenge.caseId,
                  label: `The challenge — ${d.challenge.title}`,
                  to: `/challenges/${d.challenge.slug}`,
                  detail: 'What you were asked to do',
                },
                ...(d.contract
                  ? [
                      {
                        caseId: d.contract.caseId,
                        label: 'Your contract',
                        to: `/s/contracts/${d.contract.id}`,
                        detail: `${d.contract.templateId} ${d.contract.templateVersion} · ${d.contract.status.replace(/_/g, ' ')}`,
                      },
                    ]
                  : []),
                {
                  caseId: `${p.caseId}/PAY`,
                  label: 'Payments',
                  to: '/s/payments',
                  detail: 'Ageing on every accepted milestone',
                },
              ]}
            >
              <div className="flex flex-col gap-6">
                <FileCover
                  caseId={p.caseId}
                  title={p.title}
                  department={d.department.shortName}
                  owner={d.startup.tradeName}
                  ownerInitials={d.startup.tradeName.slice(0, 2).toUpperCase()}
                  gate={p.currentGate}
                  gateName={GATES.find((g) => g.id === p.currentGate)?.name}
                  amountPaise={p.budgetPaise}
                  sla={{ startedOn: p.gateEnteredOn, limitDays: gateSlaDays(p.currentGate) }}
                  status={<StatusBadge status={p.status} />}
                  extra={[
                    {
                      label: 'Pilot day',
                      value: (
                        <span className="tnum">
                          {elapsed} of {p.durationDays}
                        </span>
                      ),
                    },
                  ]}
                />

                {/* Where the pilot stands, before a tab is touched. The same
                    ruled strip the department's screen carries — this side had
                    nothing, which is backwards: it is the startup's money. */}
                <section aria-label="Pilot at a glance" className="sheet-flat">
                  <dl className="grid grid-cols-2 md:grid-cols-4">
                    {[
                      {
                        label: 'Elapsed',
                        value: `Day ${elapsed} of ${p.durationDays}`,
                        detail: `Ends ${day(p.endsOn)}`,
                      },
                      {
                        label: 'Measured outcome',
                        value: headline ? percent(progress(headline)) : '—',
                        detail: headline ? kpiStatus(headline) : 'No measure recorded',
                      },
                      {
                        label: 'Milestones accepted',
                        value: `${accepted} of ${d.milestones.length}`,
                        detail: due.length > 0 ? `${due.length} due from you` : 'Nothing due from you',
                      },
                      {
                        label: 'Paid to you',
                        value: moneyScaled(paid),
                        detail: owed > 0 ? `${moneyScaled(owed)} still owed` : 'Nothing outstanding',
                      },
                    ].map((cell, i) => (
                      <div key={cell.label} className={['px-4 py-3', i < 3 ? 'border-r border-rule' : ''].join(' ')}>
                        <dt className="text-micro text-ink-soft">{cell.label}</dt>
                        <dd className="mt-1 text-data text-ink tnum">{cell.value}</dd>
                        <dd className="text-micro text-ink-soft">{cell.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {due.length > 0 ? (
                  <InlineNote tone="hold" title={`${countOf(due.length, 'milestone is', 'milestones are')} due from you`}>
                    Once you submit, the department has {reviewWindow} calendar days to record a finding. The clock is
                    visible to both of you.
                  </InlineNote>
                ) : null}

                <Tabs
                  items={[
                    { id: 'overview', label: 'Overview' },
                    { id: 'milestones', label: 'Milestones', count: d.milestones.length },
                    { id: 'evidence', label: 'Evidence', count: d.evidence.length },
                    { id: 'sandbox', label: 'Sandbox' },
                    { id: 'risks', label: 'Risks', count: d.risks.filter((r) => r.status !== 'closed').length },
                    { id: 'changes', label: 'Changes', count: d.changeRequests.length },
                  ]}
                  value={tab}
                  onChange={setTab}
                >
                  {tab === 'overview' ? (
                    <div className="flex flex-col gap-6">
                      <section className="sheet-flat overflow-hidden rounded-block">
                        <header className="border-b border-ink bg-ledger px-4 py-3">
                          <p className="field-label !text-saffron-ink">What you agreed to run</p>
                          <h2 className="mt-0.5 font-display text-h3 text-ink">Scope</h2>
                        </header>
                        <p className="max-w-doc px-4 py-5 font-doc text-doc text-ink">{p.scope}</p>
                      </section>

                      <section className="sheet-flat overflow-hidden rounded-block">
                        <header className="border-b border-ink bg-ledger px-4 py-3">
                          <p className="field-label !text-saffron-ink">
                            {countOf(p.successCriteria.length, 'criterion')} · checked by someone outside the department
                          </p>
                          <h2 className="mt-0.5 font-display text-h3 text-ink">Success criteria</h2>
                          <p className="mt-1.5 max-w-doc text-micro text-ink-soft">
                            An independent validator reports against every one of these, and the report is published
                            whether or not the pilot succeeded.
                          </p>
                        </header>
                        <ol>
                          {p.successCriteria.map((sc, i) => (
                            <li key={sc} className="ledger-row flex gap-3 px-4 py-3">
                              <span
                                aria-hidden
                                className="type-register mt-0.5 shrink-0 text-micro text-saffron-ink tnum"
                              >
                                {i + 1}.
                              </span>
                              <span className="text-body text-ink">{sc}</span>
                            </li>
                          ))}
                        </ol>
                      </section>

                      {d.kpis.length > 0 ? (
                        <section aria-labelledby="measurement-heading">
                          <div className="mb-3">
                            <p className="field-label !text-saffron-ink">
                              Read by the validator from your raw records, not from this page
                            </p>
                            <h2 id="measurement-heading" className="mt-0.5 font-display text-h3 text-ink">
                              Where the measurement stands
                            </h2>
                          </div>
                          <div className="flex flex-col gap-4">
                            {d.kpis.map((k) => (
                              <MeasurementChart key={k.id} kpi={k} />
                            ))}
                          </div>
                        </section>
                      ) : null}

                      <KeyValueSheet
                        title="Contacts"
                        items={p.contacts.map((con) => ({
                          label: con.role,
                          value: (
                            <span>
                              {con.name}
                              <span className="mt-0.5 block text-micro text-ink-soft">{con.email}</span>
                            </span>
                          ),
                        }))}
                      />

                      {d.validation?.status === 'signed' ? (
                        <InlineNote
                          tone={d.validation.outcome === 'not_validated' ? 'seal' : 'verify'}
                          title={`Independent validation — ${d.validation.outcome?.replace(/_/g, ' ')}`}
                        >
                          <p className="max-w-doc">{d.validation.publishedSummary}</p>
                          <p className="mt-1 text-micro text-ink-soft">
                            Signed {day(d.validation.signedAt)} · report {d.validation.caseId}
                          </p>
                        </InlineNote>
                      ) : null}
                    </div>
                  ) : null}

                  {tab === 'milestones' ? (
                    <div className="flex flex-col gap-6">
                      <MilestoneTimeline milestones={d.milestones} />
                      {d.milestones.map((m) => (
                        <MilestoneCard
                          key={m.id}
                          milestone={m}
                          evidence={d.evidence.filter((e) => e.milestoneId === m.id)}
                          claim={d.claims.find((c) => c.milestoneId === m.id)}
                          reviewWindowDays={reviewWindow}
                          busy={submitMilestone.isPending}
                          error={
                            submitMilestone.error instanceof PrayogApiError
                              ? [submitMilestone.error.message, ...submitMilestone.error.details].join(' ')
                              : undefined
                          }
                          onSubmitEvidence={async (files) => {
                            await submitMilestone.mutateAsync(
                              { milestoneId: m.id, evidence: files },
                              {
                                onSuccess: (res) => {
                                  track({
                                    name: 'milestone_evidence_submitted',
                                    milestoneId: m.id,
                                    evidenceCount: files.length,
                                  });
                                  pushToast(
                                    'verify',
                                    res.message ?? 'Evidence submitted.',
                                    `The department has ${reviewWindow} days to record a finding.`,
                                  );
                                },
                                onError: (err) => {
                                  const api = err instanceof PrayogApiError ? err : null;
                                  pushToast(
                                    'seal',
                                    api?.message ?? 'The evidence was not submitted.',
                                    'Your files are still attached to the form.',
                                  );
                                },
                              },
                            );
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {tab === 'evidence' ? (
                    <div className="flex flex-col gap-4">
                      <p className="max-w-doc text-body text-ink-soft">
                        Every file you submit carries a checksum, the time it arrived and who verified it. That record is
                        what a validator re-derives from later.
                      </p>
                      <EvidenceVault items={d.evidence} />
                    </div>
                  ) : null}

                  {tab === 'sandbox' ? (
                    <div className="flex flex-col gap-6">
                      <KeyValueSheet
                        title="Your sandbox"
                        items={[
                          { label: 'Environment', value: p.sandbox.environment },
                          { label: 'Data tier granted', value: <DataTierBadge tier={p.sandbox.dataTier} /> },
                          {
                            label: 'Credentials expire',
                            value: day(p.sandbox.credentialExpiry),
                            citation: citationShort('CERTIN-2022-DIR'),
                            hint: 'Credentials expire and are reissued against a fresh stated purpose.',
                          },
                        ]}
                      />
                      <section className="sheet-flat">
                        <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Egress rules</h3>
                        <ul>
                          {p.sandbox.egressRules.map((r) => (
                            <li key={r} className="ledger-row flex gap-3 px-4 py-2">
                              <span aria-hidden className="text-ink-soft">
                                ·
                              </span>
                              <span className="text-body text-ink">{r}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                      <section className="sheet-flat">
                        <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Access log</h3>
                        <ul>
                          {p.sandbox.accessLog.map((l, i) => (
                            <li key={`${l.at}-${i}`} className="ledger-row flex flex-wrap items-baseline justify-between gap-3 px-4 py-2">
                              <span className="text-body text-ink">{l.action}</span>
                              <span className="text-micro text-ink-soft tnum">
                                {l.actor} · {dayTime(l.at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="border-t border-rule px-4 py-2 text-micro text-ink-soft">
                          Every query is logged and retained in India for the statutory period. The department and the
                          validator can both read this log.
                        </p>
                      </section>
                    </div>
                  ) : null}

                  {tab === 'risks' ? (
                    <div className="flex flex-col gap-4">
                      <p className="max-w-doc text-body text-ink-soft">
                        The risk register is shared with the department. Raising a risk early is not an admission — an
                        unreviewed register blocks gate 4 for both of you.
                      </p>
                      {d.risks.length === 0 ? (
                        <EmptyState
                          title="No risks recorded."
                          body="A pilot with no risks usually means none were looked for. Raise the ones you can see."
                        />
                      ) : (
                        <RiskRegister risks={d.risks} users={[]} />
                      )}
                    </div>
                  ) : null}

                  {tab === 'changes' ? (
                    <div className="flex flex-col gap-4">
                      <p className="max-w-doc text-body text-ink-soft">
                        A change request states its effect on money, on time and on scope before anyone decides. Work
                        outside the agreement without one is unpaid work.
                      </p>
                      <ChangeRequestList items={d.changeRequests} />
                    </div>
                  ) : null}
                </Tabs>

                {/* Money is never more than one screen away. */}
                <section aria-labelledby="money-heading">
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="field-label !text-saffron-ink">
                        The clock starts the day a milestone is accepted, not the day it is invoiced
                      </p>
                      <h2 id="money-heading" className="mt-0.5 font-display text-h3 text-ink">
                        What you are owed on this pilot
                      </h2>
                    </div>
                    <Link to="/s/payments" className="text-label text-ink-soft underline underline-offset-2 hover:text-ink">
                      Open the payment ledger
                    </Link>
                  </div>
                  {d.claims.length === 0 ? (
                    <EmptyState
                      title="No claims yet."
                      body="A claim is raised automatically when a milestone is accepted, and the ageing clock starts the same day."
                    />
                  ) : (
                    <ul className="sheet-flat">
                      {d.claims.map((c) => {
                        const m = d.milestones.find((x) => x.id === c.milestoneId);
                        return (
                          <li key={c.id} className="ledger-row px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-body text-ink">
                                  Milestone {m?.index} — {m?.name}
                                </p>
                                <p className="type-register text-micro text-ink-soft">{c.caseId}</p>
                                <p className="mt-1 text-micro text-ink-soft">
                                  {c.status === 'on_hold' ? `Held by ${c.heldBy}: ${c.holdReason}` : c.approvalStep}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <StatusBadge status={c.status} />
                                <PaymentAgeingBar
                                  acceptedOn={c.acceptedOn}
                                  limitDays={paymentLimit}
                                  amountPaise={c.amountPaise}
                                  deductionPaise={c.deductionPaise}
                                  paidOn={c.paidOn}
                                  reference={c.paymentReference}
                                />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                      <li className="rule-total flex items-baseline justify-between px-4 py-3">
                        <span className="text-body font-medium text-ink">Outstanding on this pilot</span>
                        <span className="text-data font-medium text-ink tnum">
                          {money(d.claims.filter((c) => c.status !== 'paid').reduce((s, c) => s + c.netPaise, 0))}
                        </span>
                      </li>
                    </ul>
                  )}
                </section>

                {d.contract ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-block border border-rule bg-ledger px-4 py-4">
                    <span className="min-w-0">
                      <span className="field-label block">Your contract</span>
                      <span className="mt-0.5 block text-body text-ink">
                        {d.contract.templateId} {d.contract.templateVersion} ·{' '}
                        {d.contract.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <LinkButton size="sm" to={`/s/contracts/${d.contract.id}`}>
                      Read the clauses
                    </LinkButton>
                  </div>
                ) : null}
              </div>
            </CaseWorkspace>
          </div>
        );
      }}
    </QueryState>
  );
}
