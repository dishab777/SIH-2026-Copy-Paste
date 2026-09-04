import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GATE_DECISIONS, gateSlaDays } from '@/config/gates';
import { citationShort } from '@/config/policies';
import { useGate, useGateDecision, usePilot, useRequestWaiver, useSession } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { CaseWorkspace } from '@/components/layout/CaseWorkspace';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { FileCover } from '@/components/domain/FileCover';
import { SealStamp } from '@/components/domain/SealStamp';
import { ApprovalBar } from '@/components/patterns/ApprovalBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, RadioGroup, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Overlay';
import { Breadcrumb } from '@/components/ui/Nav';
import { AuditTrail } from '@/components/domain/RiskIncident';
import { dayTime } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import type { GateDecision as GateDecisionValue } from '@/config/gates';
import { platformNowIso } from '@/config/clock';

export default function GateDecision() {
  const { gateId } = useParams();
  const navigate = useNavigate();
  const query = useGate(gateId);
  const decide = useGateDecision(gateId);
  const waive = useRequestWaiver(gateId);
  const session = useSession();
  const pushToast = useUi((s) => s.pushToast);
  // Blocked actions send the person to the field that is holding them up.
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const [decision, setDecision] = useState<GateDecisionValue>('clear');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [waiverReason, setWaiverReason] = useState('');
  const [stamped, setStamped] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  // Pull the pilot record when this gate sits on a pilot, so the dock has its evidence.
  const entityId = query.data?.data.entity.type === 'pilot' ? query.data.data.entity.id : undefined;
  const pilot = usePilot(entityId);

  return (
    <QueryState query={query} errorTitle="Unable to load this gate." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { record, definition, preconditions, owner, canDecide, decisionRoleRequired, reasonMinChars, waiverAuthority, entity, ladder, audit } =
          payload.data;

        const unmet = preconditions.filter((p) => p.result !== 'pass');
        const waived = record.waiver?.status === 'granted';
        const decided = record.status === 'cleared' || record.status === 'rejected';
        const canClear = unmet.length === 0 || waived;
        const reasonShort = reason.trim().length < reasonMinChars;

        const ownerNames = Object.fromEntries(ladder.map((g) => [g.ownerId, owner.id === g.ownerId ? owner.name : g.ownerId]));

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb
                items={[
                  { label: 'Department', to: '/d' },
                  {
                    label: entity.caseId,
                    to: entity.type === 'challenge' ? `/d/challenges/${entity.id}` : `/d/pilots/${entity.id}`,
                  },
                  { label: `Gate ${record.gate.slice(1)}` },
                ]}
              />
            </div>

            <CaseWorkspace
              gates={ladder}
              currentGate={record.gate}
              ownerNames={ownerNames}
              evidence={pilot.data?.data.evidence ?? []}
              audit={audit}
              next={[
                {
                  id: record.id,
                  caseId: entity.caseId,
                  title: entity.title,
                  requiredAction: decided
                    ? `Gate ${record.gate.slice(1)} is decided. Nothing is waiting here.`
                    : `Decide gate ${record.gate.slice(1)}: ${definition.name}`,
                  ownerId: owner.id,
                  ownerName: owner.name,
                  waitingSinceDays: record.dwellDays,
                  slaDays: gateSlaDays(record.gate),
                  href: `/d/gates/${record.id}`,
                  entityType: record.entityType,
                  amountPaise: entity.budgetPaise,
                },
              ]}
              linked={[
                {
                  caseId: entity.caseId,
                  label: entity.title,
                  to: entity.type === 'challenge' ? `/d/challenges/${entity.id}` : `/d/pilots/${entity.id}`,
                  detail: entity.type === 'challenge' ? 'Challenge workspace' : 'Pilot workspace',
                },
                ...(entity.type === 'pilot'
                  ? [
                      {
                        caseId: `${entity.caseId}/AUDIT`,
                        label: 'Read-only audit viewer',
                        to: `/v/audit/pilot/${entity.id}`,
                        detail: 'Every action on this case, in order',
                      },
                    ]
                  : []),
              ]}
            >
              <div className="noting-page flex flex-col gap-6">
                <FileCover
                  className="noting-full"
                  caseId={entity.caseId}
                  title={entity.title}
                  department={entity.departmentId}
                  owner={owner.name}
                  ownerInitials={owner.initials}
                  gate={record.gate}
                  gateName={definition.name}
                  amountPaise={entity.budgetPaise}
                  sla={{ startedOn: record.enteredOn, limitDays: gateSlaDays(record.gate) }}
                  status={
                    decided ? (
                      <SealStamp
                        tone={record.status === 'cleared' ? 'cleared' : 'rejected'}
                        gate={record.gate}
                        date={record.decidedOn}
                        by={owner.initials}
                        animate={stamped}
                      />
                    ) : (
                      <StatusBadge status={record.status} />
                    )
                  }
                />

                {/* 1. Decision — what am I deciding? */}
                {/*
                  A noting sheet has a ruled margin, and the authority for what
                  is written sits in it. The heading and the text share one left
                  edge past that margin, the way they do on the printed form.
                */}
                <section aria-labelledby="decides-heading" className="relative">
                  <p className="noting-margin text-micro text-ink-soft">
                    {citationShort('PRAYOG-SOP-4')}
                    <span className="mt-1 block">Owner: {decisionRoleRequired.replace(/_/g, ' ')}</span>
                    <span className="block">Window: {gateSlaDays(record.gate)} working days</span>
                  </p>
                  <h2 id="decides-heading" className="text-h2 text-ink">
                    What gate {record.gate.slice(1)} decides
                  </h2>
                  <p className="mt-2 max-w-doc font-doc text-doc text-ink">{definition.decides}</p>
                </section>

                {/* 2. Evidence — what conditions must be met? */}
                <section aria-labelledby="preconditions-heading">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                    <h2 id="preconditions-heading" className="text-h2 text-ink">
                      Preconditions
                    </h2>
                    <p className="text-label text-ink tnum">
                      {preconditions.length - unmet.length} of {preconditions.length} met
                    </p>
                  </div>

                  <ul className="sheet-flat">
                    {preconditions.map((p) => {
                      const def = definition.preconditions.find((x) => x.key === p.key);
                      return (
                        <li
                          key={p.key}
                          className={[
                            'ledger-row border-l-2 px-4 py-4',
                            p.result === 'pass'
                              ? 'border-l-transparent'
                              : p.result === 'review'
                                ? 'border-l-hold bg-hold-wash'
                                : 'border-l-seal bg-seal-wash',
                          ].join(' ')}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 max-w-doc">
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden
                                  className={p.result === 'pass' ? 'text-verify' : p.result === 'review' ? 'text-ink' : 'text-seal'}
                                >
                                  {p.result === 'pass' ? '✓' : p.result === 'review' ? '◐' : '✗'}
                                </span>
                                <p className="text-body text-ink">{def?.label ?? p.key}</p>
                                {p.result !== 'pass' ? <Badge tone="seal">Blocking</Badge> : null}
                              </div>
                              {def ? <p className="mt-1 text-micro text-ink-soft">{def.detail}</p> : null}
                              <p className="mt-1 text-body text-ink">{p.note}</p>
                              {def ? (
                                <p className="mt-1 text-micro text-ink-soft">{citationShort(def.citation)}</p>
                              ) : null}
                            </div>
                            {p.result !== 'pass' && def ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    entity.type === 'challenge'
                                      ? `/d/challenges/${entity.id}`
                                      : `/d/pilots/${entity.id}`,
                                  )
                                }
                              >
                                Open {def.fixHint}
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {record.waiver ? (
                  <InlineNote
                    tone={record.waiver.status === 'granted' ? 'verify' : 'hold'}
                    title={`Waiver ${record.waiver.status}`}
                  >
                    <p className="max-w-doc">{record.waiver.reason}</p>
                    <p className="mt-1 text-micro text-ink-soft">
                      Requested by {record.waiver.requestedBy} on {dayTime(record.waiver.at)} · authority:{' '}
                      {record.waiver.authority}
                    </p>
                    <p className="mt-2 text-micro text-ink-soft">
                      A waiver does not mark the precondition as met. It is recorded separately as an exception.
                    </p>
                  </InlineNote>
                ) : null}

                {/* The decision itself, or the record of it. */}
                {decided ? (
                  <section aria-labelledby="recorded-heading" className="sheet-flat">
                    <h2 id="recorded-heading" className="border-b border-ink px-4 py-2 text-label text-ink">
                      Decision recorded
                    </h2>
                    <div className="px-4 py-4">
                      <p className="text-data text-ink">
                        {GATE_DECISIONS.find((d) => d.value === record.decision)?.label ?? record.decision} ·{' '}
                        {dayTime(record.decidedOn)}
                      </p>
                      <p className="mt-2 max-w-doc font-doc text-doc text-ink">{record.reason}</p>
                      <p className="mt-3 text-micro text-ink-soft">
                        Recorded by {owner.name}. This record is immutable; a change needs a fresh decision at this gate.
                      </p>
                    </div>
                  </section>
                ) : (
                  <section aria-labelledby="decision-heading">
                    <h2 id="decision-heading" className="mb-3 text-h2 text-ink">
                      Decision
                    </h2>

                    <div className="sheet-flat px-4 py-4">
                      <RadioGroup
                        legend="What are you recording?"
                        name="gate-decision"
                        required
                        value={decision}
                        onChange={(v) => setDecision(v as GateDecisionValue)}
                        options={GATE_DECISIONS.map((d) => ({
                          value: d.value,
                          label: d.label,
                          detail: d.consequence,
                          disabled: d.value === 'clear' && !canClear,
                          disabledReason:
                            d.value === 'clear' && !canClear
                              ? `Gate ${record.gate.slice(1)} cannot clear while ${unmet.length} precondition${unmet.length === 1 ? ' is' : 's are'} unmet. No role can bypass this.`
                              : undefined,
                        }))}
                      />

                      <div className="mt-6">
                        <Field
                          label="Written reason"
                          required
                          hint={`At least ${reasonMinChars} characters. This becomes part of the permanent record for ${entity.caseId}.`}
                          aside={`${reason.trim().length} / ${reasonMinChars}`}
                          error={formError}
                        >
                          {({ id, describedBy, invalid }) => (
                            <Textarea
                              ref={reasonRef}
                              id={id}
                              aria-describedby={describedBy}
                              invalid={invalid}
                              rows={5}
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Set out what you tested, what you found and why this is the right decision."
                            />
                          )}
                        </Field>
                      </div>
                    </div>

                    {/* 3. Consequence + 4. Notification + 5. Audit */}
                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <section className="sheet-flat">
                        <h3 className="border-b border-ink px-4 py-2 text-label text-ink">
                          If you clear gate {record.gate.slice(1)}
                        </h3>
                        <ul className="px-4 py-3">
                          {definition.consequences.map((c) => (
                            <li key={c} className="flex gap-2 py-1 text-body text-ink">
                              <span aria-hidden className="text-ink-soft">
                                ·
                              </span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </section>
                      <section className="sheet-flat">
                        <h3 className="border-b border-ink px-4 py-2 text-label text-ink">Who is notified</h3>
                        <ul className="px-4 py-3">
                          {definition.notifies.map((n) => (
                            <li key={n} className="flex gap-2 py-1 text-body text-ink">
                              <span aria-hidden className="text-ink-soft">
                                ·
                              </span>
                              {n}
                            </li>
                          ))}
                        </ul>
                        <p className="border-t border-rule px-4 py-2 text-micro text-ink-soft">
                          Recorded to the audit trail as <span className="tnum">gate_decision_recorded</span>, with your
                          name, the timestamp and a checksum.
                        </p>
                      </section>
                    </div>
                  </section>
                )}

                <section aria-labelledby="trail-heading">
                  <h2 id="trail-heading" className="mb-3 text-h2 text-ink">
                    What has already happened on this case
                  </h2>
                  <AuditTrail items={audit.slice(0, 12)} dense />
                </section>
              </div>

              {!decided ? (
                <ApprovalBar
                  consequence={
                    decision === 'clear'
                      ? `Clearing gate ${record.gate.slice(1)} takes effect immediately: ${definition.consequences[0]?.toLowerCase() ?? 'the case moves forward'}.`
                      : GATE_DECISIONS.find((d) => d.value === decision)?.consequence ?? ''
                  }
                  notifies={definition.notifies}
                  blocked={
                    decision === 'clear' && !canClear
                      ? {
                          title: `Gate ${record.gate.slice(1)} cannot clear.`,
                          reasons: [
                            ...unmet.map((u) => u.note),
                            `The only route past an unmet precondition is a waiver from the ${waiverAuthority}, recorded separately.`,
                          ],
                        }
                      : undefined
                  }
                >
                  {decision === 'clear' && !canClear ? (
                    <Button tone="destructive" onClick={() => setWaiverOpen(true)}>
                      Request a waiver
                    </Button>
                  ) : null}
                  <Button
                    tone={decision === 'reject' ? 'destructive' : 'primary'}
                    aria-describedby="gate-action-block"
                    unavailableReason={
                      !canDecide
                        ? `Deciding this gate needs ${decisionRoleRequired.replace(/_/g, ' ')} access.`
                        : decision === 'clear' && !canClear
                          ? 'A precondition is unmet. Clear it, or request a waiver.'
                          : reasonShort
                            ? `Write ${reasonMinChars - reason.trim().length} more characters of reason first.`
                            : undefined
                    }
                    onUnavailable={() => {
                      if (canDecide && reasonShort) reasonRef.current?.focus();
                    }}
                    onClick={() => {
                      setFormError(undefined);
                      setConfirming(true);
                    }}
                  >
                    {decision === 'clear'
                      ? `Clear gate ${record.gate.slice(1)}`
                      : decision === 'return'
                        ? 'Return with observations'
                        : decision === 'reject'
                          ? 'Reject this case'
                          : 'Defer the decision'}
                  </Button>
                  <p id="gate-action-block" className="max-w-[30ch] text-micro text-ink-soft">
                    {!canDecide
                      ? `You can read this gate. Deciding it needs ${decisionRoleRequired.replace(/_/g, ' ')} access.`
                      : reasonShort
                        ? `${reasonMinChars - reason.trim().length} more characters of written reason.`
                        : ''}
                  </p>
                </ApprovalBar>
              ) : null}
            </CaseWorkspace>

            {/* Confirmation restates the consequence before anything happens. */}
            <Modal
              open={confirming}
              onClose={() => setConfirming(false)}
              title={
                decision === 'clear'
                  ? `Clear gate ${record.gate.slice(1)} on ${entity.caseId}?`
                  : `Record this decision on ${entity.caseId}?`
              }
              description="This is written to the permanent record. It cannot be edited afterwards."
              footer={
                <>
                  <Button onClick={() => setConfirming(false)}>Go back</Button>
                  <Button
                    tone={decision === 'reject' ? 'destructive' : 'primary'}
                    loading={decide.isPending}
                    loadingLabel="Recording"
                    onClick={() =>
                      decide.mutate(
                        { decision, reason },
                        {
                          onSuccess: (res) => {
                            track({
                              name: 'gate_decision_recorded',
                              caseId: entity.caseId,
                              gate: record.gate,
                              decision,
                            });
                            setConfirming(false);
                            setStamped(decision === 'clear');
                            pushToast('verify', res.message ?? 'Decision recorded.', res.data.consequences.join(' · '));
                          },
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            setConfirming(false);
                            setFormError(api ? [api.message, ...api.details].join(' ') : 'The decision was not recorded.');
                            pushToast('seal', api?.message ?? 'The decision was not recorded.', 'Your written reason is preserved.');
                          },
                        },
                      )
                    }
                  >
                    {decision === 'clear' ? `Clear gate ${record.gate.slice(1)}` : 'Record the decision'}
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                {decision === 'clear' ? (
                  <div>
                    <p className="text-label text-ink-soft">This will</p>
                    <ul className="mt-1 list-disc pl-5 text-body text-ink">
                      {definition.consequences.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-body text-ink">{GATE_DECISIONS.find((d) => d.value === decision)?.consequence}</p>
                )}
                <div>
                  <p className="text-label text-ink-soft">Notifies</p>
                  <p className="text-body text-ink">{definition.notifies.join(' · ')}</p>
                </div>
                <div>
                  <p className="text-label text-ink-soft">Your written reason</p>
                  <p className="mt-1 max-w-doc border-l-2 border-l-rule bg-ledger px-3 py-2 font-doc text-doc text-ink">
                    {reason}
                  </p>
                </div>
                <p className="text-micro text-ink-soft">
                  Signed as {session.data?.data.user?.name ?? 'you'} · {dayTime(platformNowIso())}
                </p>
              </div>
            </Modal>

            {/* A waiver is an exception on the record, never a shortcut. */}
            <Modal
              open={waiverOpen}
              onClose={() => setWaiverOpen(false)}
              title={`Request a waiver at gate ${record.gate.slice(1)}`}
              description={`A waiver goes to the ${waiverAuthority}. It never marks a precondition as met — it is recorded separately as an exception against this case.`}
              footer={
                <>
                  <Button onClick={() => setWaiverOpen(false)}>Cancel</Button>
                  <Button
                    tone="destructive"
                    loading={waive.isPending}
                    loadingLabel="Requesting"
                    unavailableReason={
                      waiverReason.trim().length < 80
                        ? `Write ${80 - waiverReason.trim().length} more characters of justification.`
                        : undefined
                    }
                    onClick={() =>
                      waive.mutate(
                        { reason: waiverReason },
                        {
                          onSuccess: (res) => {
                            setWaiverOpen(false);
                            setWaiverReason('');
                            pushToast('hold', res.message ?? 'Waiver requested.');
                          },
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            pushToast('seal', api?.message ?? 'The waiver was not requested.', 'Your text is preserved.');
                          },
                        },
                      )
                    }
                  >
                    Request the waiver
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <InlineNote tone="seal" title="Preconditions this waiver would cover">
                  <ul className="list-disc pl-5">
                    {unmet.map((u) => (
                      <li key={u.key}>{u.note}</li>
                    ))}
                  </ul>
                </InlineNote>
                <Field
                  label="The case for the waiver"
                  required
                  hint="At least 80 characters. Explain why the precondition cannot be met and what mitigates the risk of proceeding without it."
                  aside={`${waiverReason.trim().length} / 80`}
                >
                  {({ id, describedBy, invalid }) => (
                    <Textarea
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      rows={6}
                      value={waiverReason}
                      onChange={(e) => setWaiverReason(e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </Modal>
          </div>
        );
      }}
    </QueryState>
  );
}
