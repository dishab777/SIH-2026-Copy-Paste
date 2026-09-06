import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GATES, gateSlaDays } from '@/config/gates';
import { policyNumber } from '@/config/policies';
import {
  useApproveMilestone,
  useDecideChange,
  usePilot,
  useRejectMilestone,
  useSession,
  useUpdateIncident,
} from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { CaseWorkspace } from '@/components/layout/CaseWorkspace';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { FileCover } from '@/components/domain/FileCover';
import { MilestoneCard, MilestoneTimeline, EvidenceVault } from '@/components/domain/Milestones';
import { RiskRegister, IncidentLog, ChangeRequestList } from '@/components/domain/RiskIncident';
import { PaymentAgeingBar } from '@/components/domain/SlaClock';
import { MeasurementChart, beyondTarget, kpiStatus, progress } from '@/components/charts/MeasurementChart';
import { DataTierBadge } from '@/components/domain/Legal';
import { KeyValueSheet, StatLedger } from '@/components/ledger/Ledger';
import { StatusBadge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Breadcrumb, Tabs } from '@/components/ui/Nav';
import { day, dayTime, daysBetween, money, percent, countOf } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function PilotSteering() {
  const { id } = useParams();
  const query = usePilot(id);
  const approve = useApproveMilestone();
  const reject = useRejectMilestone();
  const updateIncident = useUpdateIncident();
  const decideChange = useDecideChange();
  const session = useSession();
  const pushToast = useUi((s) => s.pushToast);
  const [tab, setTab] = useState('milestones');

  const reviewWindow = policyNumber('sla.milestone.review.days');
  const paymentLimit = policyNumber('payment.milestone.limit.days');

  return (
    <QueryState query={query} errorTitle="Unable to load this pilot." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const d = payload.data;
        const p = d.pilot;
        const users = session.data?.data.user ? [session.data.data.user] : [];
        const openGate = d.gates.find((g) => g.status === 'open' || g.status === 'blocked');
        const awaiting = d.milestones.filter((m) => m.status === 'submitted' || m.status === 'under_review');
        const elapsed = Math.min(p.durationDays, Math.max(0, daysBetween(p.startedOn)));
        const headline = d.kpis[0];

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb items={[{ label: 'Pilots', to: '/d/pilots' }, { label: p.caseId }]} />
            </div>

            <CaseWorkspace
              gates={d.gates}
              currentGate={p.currentGate}
              ownerNames={Object.fromEntries(d.gates.map((g) => [g.ownerId, g.ownerId]))}
              evidence={d.evidence}
              audit={[]}
              next={awaiting.map((m) => ({
                id: m.id,
                caseId: m.caseId,
                title: `Milestone ${m.index} — ${m.name}`,
                requiredAction: 'Record a met, partially met or not met finding against the acceptance test',
                ownerId: p.departmentId,
                ownerName: d.department.shortName,
                waitingSinceDays: m.submittedOn ? daysBetween(m.submittedOn) : 0,
                slaDays: reviewWindow,
                href: `/d/pilots/${p.id}`,
                entityType: 'pilot',
                amountPaise: m.paymentPaise,
              }))}
              linked={[
                {
                  caseId: d.challenge.caseId,
                  label: `Challenge — ${d.challenge.title}`,
                  to: `/d/challenges/${d.challenge.id}`,
                  detail: 'The published challenge this pilot came from',
                },
                {
                  caseId: `${p.caseId}/MEASURE`,
                  label: 'Measurement',
                  to: `/d/pilots/${p.id}/measurement`,
                  detail: 'Baseline against pilot, data quality and attribution',
                },
                ...(d.validation
                  ? [
                      {
                        caseId: d.validation.caseId,
                        label: 'Independent validation',
                        to: `/v/validate/${p.id}`,
                        detail: d.validation.status === 'signed' ? 'Signed' : 'In progress',
                      },
                    ]
                  : []),
                ...(d.procurement
                  ? [
                      {
                        caseId: d.procurement.caseId,
                        label: 'Procurement and scale-up',
                        to: `/d/scale/${p.id}`,
                        detail: `Readiness ${d.procurement.readiness.total} of 100`,
                      },
                    ]
                  : []),
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
                  actions={
                    openGate ? (
                      <LinkButton tone="primary" size="sm" to={`/d/gates/${openGate.id}`}>
                        Open gate {openGate.gate.slice(1)}
                      </LinkButton>
                    ) : undefined
                  }
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

                {p.blocked ? (
                  <InlineNote tone="seal" title={`This pilot is blocked at ${p.currentGate}`}>
                    <p className="max-w-doc">{p.blocked.reason}</p>
                    <p className="mt-1 text-micro text-ink-soft">Blocked since {day(p.blocked.since)}.</p>
                  </InlineNote>
                ) : null}

                {/* Where the pilot stands, in one ruled strip rather than four giant cards. */}
                <section aria-label="Pilot at a glance" className="sheet-flat">
                  <dl className="grid grid-cols-2 md:grid-cols-4">
                    {[
                      {
                        label: 'Elapsed',
                        value: `Day ${elapsed} of ${p.durationDays}`,
                        detail: `Ends ${day(p.endsOn)}`,
                      },
                      {
                        label: 'KPI achievement',
                        value: headline ? percent(progress(headline)) : '—',
                        detail: headline
                          ? beyondTarget(headline) > 0
                            ? `${kpiStatus(headline)} · ${percent(beyondTarget(headline))} past target`
                            : kpiStatus(headline)
                          : 'No measure recorded',
                      },
                      {
                        label: 'Budget released',
                        value: money(p.spentPaise),
                        detail: `of ${money(p.budgetPaise)}`,
                      },
                      {
                        label: 'Open risks',
                        value: String(d.risks.filter((r) => r.status !== 'closed').length),
                        detail: `${d.incidents.filter((i) => i.status !== 'resolved').length} open incidents`,
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

                {awaiting.length > 0 ? (
                  <InlineNote tone="hold" title={`${countOf(awaiting.length, 'milestone submission is', 'milestone submissions are')} waiting on you`}>
                    The review window is {reviewWindow} calendar days from submission. Gate 4 cannot clear while a
                    milestone lacks an explicit met, partially met or not met finding.
                  </InlineNote>
                ) : null}

                <Tabs
                  items={[
                    { id: 'milestones', label: 'Milestones', count: d.milestones.length },
                    { id: 'evidence', label: 'Evidence', count: d.evidence.length },
                    { id: 'measurement', label: 'Measurement' },
                    { id: 'risks', label: 'Risks', count: d.risks.filter((r) => r.status !== 'closed').length },
                    { id: 'incidents', label: 'Incidents', count: d.incidents.filter((i) => i.status !== 'resolved').length },
                    { id: 'changes', label: 'Changes', count: d.changeRequests.length },
                    { id: 'money', label: 'Money' },
                    { id: 'sandbox', label: 'Sandbox' },
                  ]}
                  value={tab}
                  onChange={setTab}
                >
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
                          busy={approve.isPending || reject.isPending}
                          error={
                            approve.error instanceof PrayogApiError
                              ? [approve.error.message, ...approve.error.details].join(' ')
                              : reject.error instanceof PrayogApiError
                                ? [reject.error.message, ...reject.error.details].join(' ')
                                : undefined
                          }
                          onDecide={async ({ finding, note }) => {
                            if (finding === 'not_met') {
                              await reject.mutateAsync(
                                { milestoneId: m.id, note, revisionRequired: true },
                                {
                                  onSuccess: () => {
                                    track({ name: 'milestone_returned', milestoneId: m.id, finding });
                                    pushToast('hold', `Milestone ${m.index} returned for revision.`, 'The startup has been told exactly what to fix.');
                                  },
                                  onError: (err) => {
                                    const api = err instanceof PrayogApiError ? err : null;
                                    pushToast('seal', api?.message ?? 'The finding was not recorded.', 'Your note is preserved.');
                                  },
                                },
                              );
                              return;
                            }
                            await approve.mutateAsync(
                              { milestoneId: m.id, finding, note },
                              {
                                onSuccess: (res) => {
                                  track({ name: 'milestone_accepted', milestoneId: m.id, amountPaise: m.paymentPaise });
                                  track({ name: 'claim_raised', claimId: res.data.claim.id, amountPaise: res.data.claim.amountPaise });
                                  pushToast('verify', res.message ?? `Milestone ${m.index} accepted.`, `Claim ${res.data.claim.caseId} raised.`);
                                },
                                onError: (err) => {
                                  const api = err instanceof PrayogApiError ? err : null;
                                  pushToast('seal', api?.message ?? 'The finding was not recorded.', 'Your note is preserved.');
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
                        Every file carries who uploaded it, when, its checksum, its scan result and who verified it.
                        Nothing here has a permanent public URL.
                      </p>
                      <EvidenceVault items={d.evidence} />
                    </div>
                  ) : null}

                  {tab === 'measurement' ? (
                    <div className="flex flex-col gap-6">
                      {d.kpis.length === 0 ? (
                        <EmptyState
                          title="No measures recorded on this pilot."
                          body="A pilot without a measure cannot clear gate 5, because there is nothing for a validator to re-derive."
                        />
                      ) : (
                        d.kpis.map((k) => <MeasurementChart key={k.id} kpi={k} />)
                      )}
                      <div>
                        <LinkButton to={`/d/pilots/${p.id}/measurement`}>Open the full measurement view</LinkButton>
                      </div>
                    </div>
                  ) : null}

                  {tab === 'risks' ? <RiskRegister risks={d.risks} users={users} /> : null}

                  {tab === 'incidents' ? (
                    <IncidentLog
                      incidents={d.incidents}
                      users={users}
                      busy={updateIncident.isPending}
                      onResolve={async ({ id: incidentId, resolution }) => {
                        await updateIncident.mutateAsync(
                          { id: incidentId, status: 'resolved', resolution },
                          {
                            onSuccess: () => pushToast('verify', 'Incident closed.'),
                            onError: (err) => {
                              const api = err instanceof PrayogApiError ? err : null;
                              pushToast('seal', api?.message ?? 'The incident was not closed.', 'Your text is preserved.');
                            },
                          },
                        );
                      }}
                    />
                  ) : null}

                  {tab === 'changes' ? (
                    <ChangeRequestList
                      items={d.changeRequests}
                      busy={decideChange.isPending}
                      onDecide={async (input) => {
                        await decideChange.mutateAsync(input, {
                          onSuccess: (res) =>
                            pushToast(
                              input.status === 'approved' ? 'verify' : 'hold',
                              res.message ?? 'Change decision recorded.',
                            ),
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            pushToast('seal', api?.message ?? 'The decision was not recorded.', 'Your note is preserved.');
                          },
                        });
                      }}
                    />
                  ) : null}

                  {tab === 'money' ? (
                    <div className="flex flex-col gap-6">
                      <StatLedger
                        title="Pilot money"
                        rows={[
                          { label: 'Contracted', value: money(p.budgetPaise) },
                          {
                            label: 'Accepted milestones',
                            value: money(
                              d.milestones
                                .filter((m) => m.status === 'approved' || m.status === 'paid')
                                .reduce((s, m) => s + m.paymentPaise, 0),
                            ),
                          },
                          {
                            label: 'Paid',
                            value: money(d.claims.filter((c) => c.status === 'paid').reduce((s, c) => s + c.netPaise, 0)),
                          },
                          {
                            label: 'Deductions applied',
                            value: money(d.claims.reduce((s, c) => s + c.deductionPaise, 0)),
                          },
                        ]}
                        total={{
                          label: 'Outstanding to the startup',
                          value: money(
                            d.claims.filter((c) => c.status !== 'paid').reduce((s, c) => s + c.netPaise, 0),
                          ),
                        }}
                      />

                      {d.claims.length === 0 ? (
                        <EmptyState
                          title="No claims yet."
                          body="A claim is raised automatically the moment a milestone is accepted, and the ageing clock starts the same day."
                        />
                      ) : (
                        <ul className="sheet-flat">
                          {d.claims.map((c) => {
                            const m = d.milestones.find((x) => x.id === c.milestoneId);
                            return (
                              <li key={c.id} className="ledger-row px-4 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="text-body text-ink">
                                      Milestone {m?.index} — {m?.name}
                                    </p>
                                    <p className="text-micro text-ink-soft tnum">
                                      {c.caseId} · invoice {c.invoiceNumber}
                                    </p>
                                    <p className="mt-1 text-micro text-ink-soft">{c.approvalStep}</p>
                                    {c.holdReason ? (
                                      <p className="mt-1 max-w-doc text-body text-ink">
                                        Held by {c.heldBy}: {c.holdReason}
                                      </p>
                                    ) : null}
                                    {c.deductionReason ? (
                                      <p className="mt-1 max-w-doc text-micro text-ink-soft">{c.deductionReason}</p>
                                    ) : null}
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
                        </ul>
                      )}
                      <div>
                        <LinkButton to="/d/payments">Open the payment ledger</LinkButton>
                      </div>
                    </div>
                  ) : null}

                  {tab === 'sandbox' ? (
                    <div className="flex flex-col gap-6">
                      <KeyValueSheet
                        title="Sandbox"
                        items={[
                          { label: 'Environment', value: p.sandbox.environment },
                          { label: 'Data tier', value: <DataTierBadge tier={p.sandbox.dataTier} /> },
                          {
                            label: 'Credentials expire',
                            value: day(p.sandbox.credentialExpiry),
                            citation: 'CERT-In Directions 2022',
                            hint: `Maximum validity is ${policyNumber('data.credential.maxDays')} days; they must be reissued with a fresh purpose.`,
                          },
                          { label: 'Egress rules', value: p.sandbox.egressRules.join('; ') },
                        ]}
                      />
                      <section className="sheet-flat">
                        <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Access log</h3>
                        <ul>
                          {p.sandbox.accessLog.map((l, i) => (
                            <li key={`${l.at}-${i}`} className="ledger-row flex items-baseline justify-between gap-4 px-4 py-2">
                              <span className="text-body text-ink">{l.action}</span>
                              <span className="text-micro text-ink-soft tnum">
                                {l.actor} · {dayTime(l.at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                      <section>
                        <h3 className="mb-2 text-h3 text-ink">Scope and success criteria</h3>
                        <p className="max-w-doc font-doc text-doc text-ink">{p.scope}</p>
                        <ul className="mt-3 list-disc pl-5 text-body text-ink">
                          {p.successCriteria.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        <p className="mt-3 text-micro text-ink-soft">
                          Contacts: {p.contacts.map((con) => `${con.name} (${con.role})`).join(' · ')}
                        </p>
                        {d.contract ? (
                          <p className="mt-2 text-micro text-ink-soft">
                            Contract {d.contract.templateId} {d.contract.templateVersion}, signed{' '}
                            {day(d.contract.signedOn)}.{' '}
                            <Link to={`/s/contracts/${d.contract.id}`} className="underline underline-offset-2">
                              Read the clauses
                            </Link>
                          </p>
                        ) : null}
                      </section>
                    </div>
                  ) : null}
                </Tabs>
              </div>
            </CaseWorkspace>
          </div>
        );
      }}
    </QueryState>
  );
}
