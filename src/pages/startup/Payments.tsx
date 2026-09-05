import { Link } from 'react-router-dom';
import { usePayments } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { StatLedger } from '@/components/ledger/Ledger';
import { PaymentAgeingBar } from '@/components/domain/SlaClock';
import {
  FigureCard,
  MarkRupee,
  MarkClock,
  MarkHold,
  MarkOverdue,
} from '@/components/ledger/FigureCard';
import { day, money, moneyScaled, num, countOf } from '@/lib/format';

export default function StartupPayments() {
  const query = usePayments();

  return (
    <div>
      <QueryState
        query={query}
        errorTitle="Unable to load your payments."
        loading={<TableSkeleton rows={6} columns={7} />}
        isEmpty={(d) => d.data.items.length === 0}
        empty={{
          title: 'Nothing is owed to you yet.',
          body: 'A claim is raised the moment a department accepts a milestone, and the ageing clock starts on that date rather than on your invoice.',
          action: { label: 'Open your pilots', to: '/s/pilots' },
        }}
      >
        {(payload) => {
          const d = payload.data;
          const held = d.items.filter((i) => i.claim.status === 'on_hold');
          const overdue = d.items.filter((i) => i.daysRemaining < 0 && i.claim.status !== 'paid');

          return (
            <>
              <PageHeader
                eyebrow="Money owed to you"
                title="Payments"
                lead={`Every accepted milestone, with the day it was accepted and how long the money has been outstanding against a ${d.limitDays}-day limit.`}
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={
                  d.totals.overdueCount > 0 ? (
                    <Badge tone="seal" ground="deep">
                      {countOf(d.totals.overdueCount, 'payment', 'payments')} past the limit
                    </Badge>
                  ) : (
                    <Badge tone="verify" ground="deep">
                      Every claim inside the limit
                    </Badge>
                  )
                }
              />

              {/*
                The five figures a founder actually opens this screen for, before
                any of the detail. Outstanding first, because that is the
                question; the oldest wait beside it, because that is the one that
                turns into a problem.
              */}
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FigureCard
                  label="Outstanding"
                  value={moneyScaled(d.totals.outstandingPaise)}
                  detail={`across ${countOf(d.items.filter((i) => i.claim.status !== 'paid').length, 'claim', 'claims')}`}
                  tone={d.totals.outstandingPaise > 0 ? 'hold' : 'verify'}
                  mark={MarkRupee}
                />
                <FigureCard
                  label="Oldest claim"
                  value={`${num(d.totals.oldestDays)} days`}
                  detail={`against a ${num(d.limitDays)}-day limit from acceptance`}
                  tone={d.totals.oldestDays > d.limitDays ? 'seal' : d.totals.oldestDays > d.limitDays * 0.7 ? 'hold' : 'verify'}
                  mark={MarkClock}
                />
                <FigureCard
                  label="Past the limit"
                  value={num(d.totals.overdueCount)}
                  detail="counted on the public transparency page"
                  tone={d.totals.overdueCount > 0 ? 'seal' : 'verify'}
                  mark={MarkOverdue}
                />
                <FigureCard
                  label="On hold"
                  value={num(held.length)}
                  detail={held.length > 0 ? 'each one names who is holding it' : 'nothing is being held'}
                  tone={held.length > 0 ? 'hold' : 'verify'}
                  mark={MarkHold}
                />
              </div>

              <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col gap-4">
                  {overdue.length > 0 ? (
                    <InlineNote tone="seal" title={`${countOf(overdue.length, 'payment is', 'payments are')} past the limit`}>
                      <ul className="list-disc pl-5">
                        {overdue.map((i) => (
                          <li key={i.claim.id}>
                            {money(i.claim.netPaise)} accepted {day(i.claim.acceptedOn)}, {Math.abs(i.daysRemaining)}{' '}
                            days over. Currently: {i.claim.approvalStep.toLowerCase()}.
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-micro text-ink-soft">
                        This ageing is visible to the department and counted on the public transparency page.
                      </p>
                    </InlineNote>
                  ) : null}

                  {held.length > 0 ? (
                    <InlineNote tone="hold" title={`${countOf(held.length, 'claim is', 'claims are')} on hold`}>
                      <ul className="list-disc pl-5">
                        {held.map((i) => (
                          <li key={i.claim.id}>
                            <span className="text-ink">{i.claim.heldBy}</span> is holding {money(i.claim.netPaise)}:{' '}
                            {i.claim.holdReason}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-micro text-ink-soft">
                        A hold always names who is holding it and what is needed. It is never just marked pending.
                      </p>
                    </InlineNote>
                  ) : null}
                </div>

                {/* The summary panel from the reference: label and value, ruled,
                    with the total set apart. It repeats the strip above in exact
                    figures, because a founder reconciling against a bank
                    statement needs the rupees, not the rounded crore. */}
                <StatLedger
                  headingLevel={2}
                  title="Owed to you"
                  rows={[
                    { label: 'Claims outstanding', value: num(d.items.filter((i) => i.claim.status !== 'paid').length) },
                    { label: 'Paid to date', value: money(d.items.filter((i) => i.claim.status === 'paid').reduce((sum, i) => sum + i.claim.netPaise, 0)) },
                    { label: 'Oldest claim', value: `${num(d.totals.oldestDays)} days` },
                    { label: 'Past the limit', value: num(d.totals.overdueCount) },
                    { label: 'Configured limit', value: `${num(d.limitDays)} days from acceptance` },
                  ]}
                  total={{ label: 'Total outstanding', value: money(d.totals.outstandingPaise) }}
                />
              </div>

              <LedgerTable
                caption="Your payment claims"
                exportName="prayog-my-payments"
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
                columns={[
                  {
                    key: 'milestone',
                    header: 'Milestone',
                    width: '22%',
                    sortValue: (i) => i.claim.caseId,
                    filterValue: (i) => `${i.milestone?.name ?? ''} ${i.pilot.title}`,
                    render: (i) => (
                      <span>
                        <span className="block text-body text-ink">
                          {i.milestone ? `Milestone ${i.milestone.index} — ${i.milestone.name}` : '—'}
                        </span>
                        <span className="block text-micro text-ink-soft tnum">
                          <Link to={`/s/pilots/${i.pilot.id}`} className="underline underline-offset-2">
                            {i.pilot.caseId}
                          </Link>{' '}
                          · {i.claim.caseId}
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
                    filterValue: (i) => i.claim.invoiceNumber,
                    render: (i) => (
                      <span>
                        <span className="type-register block">{i.claim.invoiceNumber}</span>
                        <span className="block text-micro text-ink-soft">{day(i.claim.invoiceOn)}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    unit: '₹',
                    align: 'right',
                    sortValue: (i) => i.claim.amountPaise,
                    render: (i) => money(i.claim.amountPaise),
                  },
                  {
                    key: 'elapsed',
                    header: 'Days elapsed',
                    unit: 'days',
                    align: 'right',
                    sortValue: (i) => i.daysElapsed,
                    render: (i) => (
                      <span className={i.daysRemaining < 0 && i.claim.status !== 'paid' ? 'text-seal' : ''}>
                        {num(i.daysElapsed)}
                      </span>
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
                        <span className="max-w-[28ch] text-micro text-ink-soft">
                          {i.claim.status === 'on_hold'
                            ? `${i.claim.heldBy}: ${i.claim.holdReason}`
                            : i.claim.approvalStep}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'expected',
                    header: 'Expected by',
                    align: 'right',
                    sortValue: (i) => i.daysRemaining,
                    render: (i) =>
                      i.claim.paidOn ? (
                        <span>
                          <span className="block tnum">{day(i.claim.paidOn)}</span>
                          <span className="type-register block text-micro text-ink-soft">{i.claim.paymentReference}</span>
                        </span>
                      ) : (
                        <span className={i.daysRemaining < 0 ? 'text-seal' : ''}>
                          {day(new Date(new Date(i.claim.acceptedOn).getTime() + i.limitDays * 86_400_000).toISOString())}
                        </span>
                      ),
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
                          <span className="block max-w-[28ch] text-micro text-ink-soft">{i.claim.deductionReason}</span>
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      ),
                  },
                  {
                    key: 'ageing',
                    header: 'Ageing',
                    width: '20%',
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
                ]}
                totalRow={
                  <span className="flex flex-wrap items-baseline justify-between gap-4">
                    <span className="text-body text-ink">
                      {d.items.filter((i) => i.claim.status !== 'paid').length} claims outstanding ·{' '}
                      {d.totals.overdueCount} past the limit
                    </span>
                    <span className="text-data text-ink tnum">{money(d.totals.outstandingPaise)}</span>
                  </span>
                }
              />

              <div className="mt-6">
                <InlineNote tone="neutral" title="How a deduction works">
                  A department can deduct only for a reason on the published list, up to {d.maxDeductionPercent}% of the
                  claim, and must show you the recomputed amount before it pays. Anything beyond that needs a separate
                  competent-authority order.{' '}
                  <span className="text-ink-soft">
                    Reason codes: {d.deductionReasons.map((x) => x.label).join(' · ')}.
                  </span>
                </InlineNote>
              </div>

              <p className="mt-4 text-micro text-ink-soft">
                <Badge tone="neutral">Bank details</Badge> are managed in your payment profile and cannot be changed from
                this screen.
              </p>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
