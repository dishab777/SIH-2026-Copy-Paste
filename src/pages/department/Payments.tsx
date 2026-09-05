import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useApprovePayment,
  useBulkApprove,
  usePayClaim,
  usePayments,
  useSession,
} from '@/services/hooks';
import { can } from '@/config/rbac';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Field, MoneyInput, Select } from '@/components/ui/Field';
import { PermissionGate } from '@/components/patterns/ApprovalBar';
import { PaymentAgeingBar } from '@/components/domain/SlaClock';
import { StatLedger } from '@/components/ledger/Ledger';
import {
  FigureCard,
  MarkRupee,
  MarkCleared,
  MarkClock,
  MarkOverdue,
} from '@/components/ledger/FigureCard';
import { countOf, day, money, moneyScaled, num } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { PaymentRow } from '@/services/hooks';

export default function DepartmentPayments() {
  const query = usePayments();
  const approve = useApprovePayment();
  const pay = usePayClaim();
  const bulk = useBulkApprove();
  const session = useSession();
  const pushToast = useUi((s) => s.pushToast);

  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<PaymentRow | null>(null);
  const [deductionPaise, setDeductionPaise] = useState(0);
  const [reasonCode, setReasonCode] = useState('');

  const role = session.data?.data.role ?? 'public';
  const mayApprove = can(role, 'approve', 'payment');
  const mayPay = can(role, 'pay', 'payment');

  return (
    <div>
      <QueryState
        query={query}
        errorTitle="Unable to load the payment ledger."
        loading={<TableSkeleton rows={8} columns={7} />}
        isEmpty={(d) => d.data.items.length === 0}
        empty={{
          title: 'No claims are outstanding.',
          body: 'A claim is raised the moment a milestone is accepted, and the ageing clock starts the same day.',
          action: { label: 'Open the pilots', to: '/d/pilots' },
        }}
      >
        {(payload) => {
          const d = payload.data;
          const selectedRows = d.items.filter((i) => selected.includes(i.claim.id));
          const selectedWithExceptions = selectedRows.filter((i) => i.claim.exception);
          const overdue = d.items.filter((i) => i.daysRemaining < 0 && i.claim.status !== 'paid');

          return (
            <>
              <PageHeader
                eyebrow="Money the department owes"
                title="Payments"
                lead={`Sorted by ageing, oldest first. The clock starts on acceptance, not on invoice, and it is visible to the startup and on the public transparency page.`}
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={
                  overdue.length > 0 ? (
                    <Badge tone="seal" ground="deep">
                      {countOf(overdue.length, 'claim', 'claims')} past the limit
                    </Badge>
                  ) : (
                    <Badge tone="verify" ground="deep">
                      Every claim inside the limit
                    </Badge>
                  )
                }
              />

              {/*
                What the department owes, before any of the detail. Ageing is
                given its own card rather than a column, because the one thing
                this screen exists to prevent is a claim quietly going past its
                window while somebody reads the table from the top.
              */}
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FigureCard
                  label="Owed to startups"
                  value={moneyScaled(d.totals.outstandingPaise)}
                  detail={`across ${countOf(d.items.filter((i) => i.claim.status !== 'paid').length, 'claim', 'claims')}`}
                  tone={d.totals.outstandingPaise > 0 ? 'hold' : 'verify'}
                  mark={MarkRupee}
                />
                <FigureCard
                  label="Oldest claim"
                  value={`${num(d.totals.oldestDays)} days`}
                  detail={`against a ${num(d.limitDays)}-day limit`}
                  tone={d.totals.oldestDays > d.limitDays ? 'seal' : d.totals.oldestDays > d.limitDays * 0.7 ? 'hold' : 'verify'}
                  mark={MarkClock}
                />
                <FigureCard
                  label="Past the limit"
                  value={num(d.totals.overdueCount)}
                  detail="published on the transparency page"
                  tone={d.totals.overdueCount > 0 ? 'seal' : 'verify'}
                  mark={MarkOverdue}
                />
                <FigureCard
                  label="Paid to date"
                  value={moneyScaled(
                    d.items.filter((i) => i.claim.status === 'paid').reduce((sum, i) => sum + i.claim.netPaise, 0),
                  )}
                  detail={`${countOf(d.items.filter((i) => i.claim.status === 'paid').length, 'claim', 'claims')} released`}
                  tone="verify"
                  mark={MarkCleared}
                />
              </div>

              <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col gap-4">
                  {overdue.length > 0 ? (
                    <InlineNote tone="seal" title={`${countOf(overdue.length, 'claim is', 'claims are')} past the ${d.limitDays}-day limit`}>
                      <ul className="list-disc pl-5">
                        {overdue.slice(0, 4).map((i) => (
                          <li key={i.claim.id}>
                            {i.startup.tradeName} — {money(i.claim.netPaise)}, accepted {day(i.claim.acceptedOn)},{' '}
                            {Math.abs(i.daysRemaining)} days over. {i.claim.approvalStep}.
                          </li>
                        ))}
                      </ul>
                    </InlineNote>
                  ) : null}

                  <InlineNote tone="neutral" title="How bulk approval works">
                    Claims with an exception — a deduction, an expired document, a hold — cannot be approved in bulk.
                    They must be opened individually, because each one needs a decision that survives an audit. The
                    configured batch limit is {d.bulkMax} claims.
                  </InlineNote>
                </div>

                {/* The exact rupees, beside the rounded figures above. A crore
                    is the right unit for a glance and the wrong one for a
                    sanction note. */}
                <StatLedger
                  headingLevel={2}
                  title="Outstanding"
                  rows={[
                    { label: 'Claims outstanding', value: num(d.items.filter((i) => i.claim.status !== 'paid').length) },
                    { label: 'On hold', value: num(d.items.filter((i) => i.claim.status === 'on_hold').length) },
                    { label: 'Past the limit', value: num(d.totals.overdueCount) },
                    { label: 'Oldest claim', value: `${num(d.totals.oldestDays)} days` },
                    { label: 'Configured limit', value: `${num(d.limitDays)} days from acceptance` },
                  ]}
                  total={{ label: 'Owed to startups', value: money(d.totals.outstandingPaise) }}
                />
              </div>

              <LedgerTable
                caption="Payment claims against accepted milestones"
                exportName="prayog-payments"
                rows={d.items}
                rowKey={(i) => i.claim.id}
                rowTone={(i) =>
                  i.claim.status === 'paid'
                    ? 'verify'
                    : i.claim.status === 'on_hold' || i.daysRemaining < 0
                      ? 'seal'
                      : i.daysRemaining <= d.limitDays * 0.3
                        ? 'hold'
                        : undefined
                }
                selectable
                selected={selected}
                onSelectedChange={setSelected}
                onRowOpen={(i) => {
                  setOpen(i);
                  setDeductionPaise(i.claim.deductionPaise);
                  setReasonCode('');
                }}
                savedViews={[
                  { id: 'overdue', label: 'Past the limit first', hiddenColumns: [], sortKey: 'elapsed', sortDirection: 'desc' },
                  { id: 'holds', label: 'Held claims', hiddenColumns: [], filters: { status: 'on_hold' } },
                ]}
                toolbar={
                  selected.length > 0 ? (
                    <PermissionGate allowed={mayApprove} action="approve" resource="payment">
                      <Button
                        size="sm"
                        tone="primary"
                        unavailableReason={
                          selectedWithExceptions.length > 0
                            ? 'Claims with an exception have to be opened one at a time.'
                            : undefined
                        }
                        loading={bulk.isPending}
                        loadingLabel="Approving"
                        onClick={() =>
                          bulk.mutate(selected, {
                            onSuccess: (res) => {
                              pushToast('verify', res.message ?? `${res.data.approved} claims approved.`);
                              setSelected([]);
                            },
                            onError: (err) => {
                              const api = err instanceof PrayogApiError ? err : null;
                              pushToast('seal', api?.message ?? 'Bulk approval failed.', api?.details.join(' '));
                            },
                          })
                        }
                      >
                        {selectedWithExceptions.length > 0
                          ? `${selectedWithExceptions.length} of these have exceptions`
                          : `Approve ${countOf(selected.length, 'claim')}`}
                      </Button>
                    </PermissionGate>
                  ) : undefined
                }
                columns={[
                  {
                    key: 'milestone',
                    header: 'Milestone',
                    width: '22%',
                    sortValue: (i) => i.claim.caseId,
                    filterValue: (i) => `${i.claim.caseId} ${i.milestone?.name ?? ''} ${i.startup.tradeName}`,
                    render: (i) => (
                      <span>
                        <span className="block text-body text-ink">
                          {i.startup.tradeName}
                        </span>
                        <span className="block text-micro text-ink-soft">
                          {i.milestone ? `Milestone ${i.milestone.index} — ${i.milestone.name}` : '—'}
                        </span>
                        <span className="block text-micro text-ink-soft tnum">
                          {i.claim.caseId} ·{' '}
                          <Link to={`/d/pilots/${i.pilot.id}`} className="underline underline-offset-2">
                            {i.pilot.caseId}
                          </Link>
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'accepted',
                    header: 'Accepted on',
                    sortValue: (i) => i.claim.acceptedOn,
                    filterValue: (i) => day(i.claim.acceptedOn),
                    render: (i) => day(i.claim.acceptedOn),
                  },
                  {
                    key: 'invoice',
                    header: 'Invoice',
                    optional: true,
                    filterValue: (i) => i.claim.invoiceNumber,
                    render: (i) => <span className="type-register">{i.claim.invoiceNumber}</span>,
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    unit: '₹',
                    align: 'right',
                    sortValue: (i) => i.claim.amountPaise,
                    filterValue: (i) => String(i.claim.amountPaise / 100),
                    render: (i) => money(i.claim.amountPaise),
                  },
                  {
                    key: 'deduction',
                    header: 'Deduction',
                    unit: '₹',
                    align: 'right',
                    sortValue: (i) => i.claim.deductionPaise,
                    render: (i) =>
                      i.claim.deductionPaise > 0 ? (
                        <span>
                          <span className="block text-seal tnum">−{money(i.claim.deductionPaise)}</span>
                          <span className="block text-micro text-ink-soft">{i.claim.deductionReason}</span>
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      ),
                  },
                  {
                    key: 'elapsed',
                    header: 'Ageing',
                    width: '20%',
                    sortValue: (i) => i.daysElapsed,
                    render: (i) => (
                      <PaymentAgeingBar
                        acceptedOn={i.claim.acceptedOn}
                        limitDays={i.limitDays}
                        amountPaise={i.claim.amountPaise}
                        deductionPaise={i.claim.deductionPaise}
                        paidOn={i.claim.paidOn}
                        reference={i.claim.paymentReference}
                      />
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    sortValue: (i) => i.claim.status,
                    filterValue: (i) => i.claim.status,
                    render: (i) => (
                      <span className="flex flex-col items-start gap-1">
                        <StatusBadge status={i.claim.status} />
                        <span className="text-micro text-ink-soft">{i.claim.approvalStep}</span>
                        {i.claim.exception ? <Badge tone="hold">{i.claim.exception}</Badge> : null}
                      </span>
                    ),
                  },
                ]}
                totalRow={
                  <span className="flex flex-wrap items-baseline justify-between gap-4">
                    <span className="text-body text-ink">
                      {d.items.filter((i) => i.claim.status !== 'paid').length} claims outstanding
                    </span>
                    <span className="text-data text-ink tnum">{money(d.totals.outstandingPaise)}</span>
                  </span>
                }
              />

              <Modal
                open={Boolean(open)}
                onClose={() => setOpen(null)}
                title={open ? `${open.claim.caseId} — ${open.startup.tradeName}` : ''}
                description={
                  open
                    ? `Accepted ${day(open.claim.acceptedOn)}. Day ${open.daysElapsed} of ${open.limitDays}.`
                    : undefined
                }
                width="md"
                footer={
                  open ? (
                    <>
                      <Button onClick={() => setOpen(null)}>Close</Button>
                      {open.claim.status !== 'paid' ? (
                        <>
                          <Button
                            tone="secondary"
                            disabled={!mayApprove}
                            loading={approve.isPending}
                            loadingLabel="Approving"
                            onClick={() =>
                              approve.mutate(
                                {
                                  id: open.claim.id,
                                  deductionPaise: deductionPaise || undefined,
                                  deductionReasonCode: deductionPaise ? reasonCode : undefined,
                                },
                                {
                                  onSuccess: (res) => {
                                    track({ name: 'claim_approved', claimId: open.claim.id, amountPaise: res.data.netPaise });
                                    pushToast('verify', res.message ?? 'Claim approved.');
                                    setOpen(null);
                                  },
                                  onError: (err) => {
                                    const api = err instanceof PrayogApiError ? err : null;
                                    pushToast('seal', api?.message ?? 'The claim was not approved.', api?.details.join(' '));
                                  },
                                },
                              )
                            }
                          >
                            Approve this claim
                          </Button>
                          <Button
                            tone="primary"
                            disabled={!mayPay || open.claim.status === 'on_hold'}
                            loading={pay.isPending}
                            loadingLabel="Releasing"
                            onClick={() =>
                              pay.mutate(open.claim.id, {
                                onSuccess: (res) => {
                                  track({
                                    name: 'claim_paid',
                                    claimId: open.claim.id,
                                    amountPaise: res.data.netPaise,
                                    reference: res.data.paymentReference ?? '',
                                  });
                                  pushToast('verify', res.message ?? 'Paid.');
                                  setOpen(null);
                                },
                                onError: (err) => {
                                  const api = err instanceof PrayogApiError ? err : null;
                                  pushToast('seal', api?.message ?? 'The claim was not paid.', api?.details.join(' '));
                                },
                              })
                            }
                          >
                            Release the payment
                          </Button>
                        </>
                      ) : null}
                    </>
                  ) : undefined
                }
              >
                {open ? (
                  <div className="flex flex-col gap-6">
                    {open.claim.holdReason ? (
                      <InlineNote tone="seal" title={`Held by ${open.claim.heldBy}`}>
                        {open.claim.holdReason}
                      </InlineNote>
                    ) : null}

                    <StatLedger
                      rows={[
                        { label: 'Milestone amount', value: money(open.claim.amountPaise) },
                        {
                          label: 'Deduction',
                          value: deductionPaise > 0 ? `−${money(deductionPaise)}` : money(0),
                          detail: deductionPaise > 0 ? (open.claim.deductionReason ?? 'Reason code required') : undefined,
                        },
                      ]}
                      total={{ label: 'Net payable', value: money(open.claim.amountPaise - deductionPaise) }}
                    />

                    {open.claim.status !== 'paid' ? (
                      <div className="flex flex-col gap-4">
                        <Field
                          label="Deduction"
                          hint={`A deduction needs a reason code, and cannot exceed ${d.maxDeductionPercent}% of the claim without a separate competent-authority order.`}
                        >
                          {({ id: fid, describedBy }) => (
                            <MoneyInput
                              id={fid}
                              describedBy={describedBy}
                              valuePaise={deductionPaise}
                              onChangePaise={setDeductionPaise}
                            />
                          )}
                        </Field>
                        {deductionPaise > 0 ? (
                          <Field label="Reason code" required>
                            {({ id: fid }) => (
                              <Select
                                id={fid}
                                placeholder="Choose a reason code"
                                value={reasonCode}
                                onChange={(e) => setReasonCode(e.target.value)}
                                options={d.deductionReasons.map((r) => ({ value: r.code, label: r.label }))}
                              />
                            )}
                          </Field>
                        ) : null}
                        {deductionPaise > (open.claim.amountPaise * d.maxDeductionPercent) / 100 ? (
                          <InlineNote tone="seal" title="Above the permissible maximum">
                            The configured maximum is {d.maxDeductionPercent}% of the claim, which is{' '}
                            {money((open.claim.amountPaise * d.maxDeductionPercent) / 100)}. A larger deduction needs a
                            separate order and cannot be applied here.
                          </InlineNote>
                        ) : null}
                      </div>
                    ) : (
                      <InlineNote tone="verify" title="Paid">
                        Paid on {day(open.claim.paidOn)} against reference{' '}
                        <span className="type-register">{open.claim.paymentReference}</span>. A payment is never shown as paid
                        without both.
                      </InlineNote>
                    )}
                  </div>
                ) : null}
              </Modal>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
