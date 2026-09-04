import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useContract, useSession, useSignContract } from '@/services/hooks';
import { policyNumber } from '@/config/policies';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { ClauseReader, IpPositionCard } from '@/components/domain/Legal';
import { KeyValueSheet, StatLedger } from '@/components/ledger/Ledger';
import { SealStamp } from '@/components/domain/SealStamp';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { Modal } from '@/components/ui/Overlay';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { countOf, day, dayTime, money, shortHash } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function ContractReader() {
  const { id } = useParams();
  const query = useContract(id);
  const sign = useSignContract(id);
  const session = useSession();
  const pushToast = useUi((s) => s.pushToast);

  // Signing is two steps on purpose: read and confirm, then name and execute.
  const [stepOne, setStepOne] = useState(false);
  const [stepTwo, setStepTwo] = useState(false);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [justSigned, setJustSigned] = useState(false);

  return (
    <QueryState query={query} errorTitle="Unable to load this contract." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { contract, pilot, milestones, startup, department } = payload.data;
        const signed = contract.status === 'signed';
        const total = milestones.reduce((s, m) => s + m.paymentPaise, 0);

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb
                items={[
                  { label: 'Pilots', to: '/s/pilots' },
                  { label: pilot.caseId, to: `/s/pilots/${pilot.id}` },
                  { label: 'Contract' },
                ]}
              />
            </div>

            <PageHeader
              title="Pilot agreement"
              lead={`${contract.templateId} ${contract.templateVersion} between ${department.name} and ${startup.legalName}. Read the plain-language position first; the operative wording is beneath each one.`}
              servedAt={payload.servedAt}
              onRefresh={() => void query.refetch()}
              aside={
                signed ? (
                  <SealStamp
                    tone="cleared"
                    date={contract.signedOn}
                    by={contract.signature?.name}
                    animate={justSigned}
                  />
                ) : (
                  <StatusBadge status={contract.status} />
                )
              }
            />

            <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <IpPositionCard position="startup_retains" clauseIds={['CL-IP-01', 'CL-IP-02']} />
              <StatLedger
                title="Money summary"
                rows={milestones.map((m) => ({
                  label: `Milestone ${m.index} — ${m.name}`,
                  value: money(m.paymentPaise),
                  detail: `Due ${day(m.dueOn)}`,
                }))}
                total={{ label: 'Contract value', value: money(total) }}
              />
            </div>

            <div className="mb-8">
              <KeyValueSheet
                title="Milestone summary"
                items={milestones.map((m) => ({
                  label: `Milestone ${m.index}`,
                  value: (
                    <span>
                      <span className="block text-body text-ink">{m.name}</span>
                      <span className="mt-1 block text-micro text-ink-soft">Acceptance test: {m.acceptanceTest}</span>
                      <span className="mt-0.5 block text-micro text-ink-soft">
                        Evidence: {m.evidenceRequired.join(', ')}
                      </span>
                    </span>
                  ),
                  hint: `${money(m.paymentPaise)} · due ${day(m.dueOn)}`,
                }))}
                footnote={`Payment follows written acceptance, within the configured ${policyNumber('payment.milestone.limit.days')}-day limit. The ageing clock is visible to you and to the department.`}
              />
            </div>

            {contract.deviations.length > 0 ? (
              <div className="mb-8">
                <InlineNote tone="hold" title={`${countOf(contract.deviations.length, 'clause')} ${contract.deviations.length === 1 ? 'departs' : 'depart'} from the standard template`}>
                  <ul className="mt-1 list-disc pl-5">
                    {contract.deviations.map((dev) => (
                      <li key={dev.clauseId}>
                        <span className="text-ink">
                          {dev.clauseId} — {dev.level} deviation
                        </span>
                        : {dev.reason} Approved by {dev.approvedBy}.
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-micro text-ink-soft">
                    Deviations are highlighted in the clause list below so you can see what is not standard.
                  </p>
                </InlineNote>
              </div>
            ) : null}

            <section aria-labelledby="clauses-heading" className="mb-8">
              <h2 id="clauses-heading" className="mb-4 text-h2 text-ink">
                Clauses
              </h2>
              <ClauseReader clauseIds={contract.clauseIds} deviations={contract.deviations} />
            </section>

            {signed ? (
              <section aria-labelledby="signature-heading">
                <h2 id="signature-heading" className="mb-3 text-h2 text-ink">
                  Signature
                </h2>
                <KeyValueSheet
                  items={[
                    { label: 'Signed by', value: contract.signature?.name ?? '—' },
                    { label: 'Designation', value: contract.signature?.designation ?? '—' },
                    { label: 'Signed at', value: dayTime(contract.signedOn) },
                    { label: 'Method', value: contract.signature?.method ?? '—' },
                    {
                      label: 'Signature checksum',
                      value: <span className="tnum">{shortHash(contract.signature?.hash ?? '')}</span>,
                    },
                    { label: 'Generated on', value: day(contract.generatedOn) },
                  ]}
                  footnote="This build uses a mock signing provider. The record here is a demonstration record, not a legally executed signature."
                />
              </section>
            ) : (
              <section aria-labelledby="sign-heading" className="sticky bottom-0 -mx-4 border-t border-rule bg-sheet px-4 py-4 md:-mx-6 md:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-doc">
                    <h2 id="sign-heading" className="text-h3 text-ink">
                      Signing this contract starts the pilot
                    </h2>
                    <p className="mt-1 text-body text-ink-soft">
                      The {pilot.durationDays}-day pilot window begins, sandbox credentials are issued, and the first
                      milestone becomes due. You keep your intellectual property throughout.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Button tone="primary" onClick={() => setStepOne(true)}>
                      Sign the pilot agreement
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* Step one: confirm you have read it. */}
            <Modal
              open={stepOne}
              onClose={() => setStepOne(false)}
              title="Before you sign — step 1 of 2"
              description="Confirm what you are agreeing to. The next step captures the signatory."
              footer={
                <>
                  <Button onClick={() => setStepOne(false)}>Cancel</Button>
                  <Button
                    tone="primary"
                    unavailableReason={readConfirmed ? undefined : 'Confirm you have read the contract first.'}
                    onClick={() => {
                      setStepOne(false);
                      setStepTwo(true);
                    }}
                  >
                    Continue to sign
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <KeyValueSheet
                  items={[
                    { label: 'Contract value', value: <span className="tnum">{money(total)}</span> },
                    { label: 'Pilot duration', value: `${pilot.durationDays} days from signature` },
                    { label: 'Milestones', value: <span className="tnum">{milestones.length}</span> },
                    { label: 'IP position', value: 'You retain ownership; government takes a purpose licence' },
                    { label: 'Data tier', value: pilot.sandbox.dataTier },
                    {
                      label: 'Payment',
                      value: `Within ${policyNumber('payment.milestone.limit.days')} days of written acceptance`,
                    },
                    {
                      label: 'Exit',
                      value: 'Thirty days to hand over data and documentation in an open format; accepted milestones remain payable',
                    },
                  ]}
                />
                {contract.deviations.length > 0 ? (
                  <InlineNote tone="hold" title="This contract is not entirely standard">
                    {contract.deviations.map((dev) => `${dev.clauseId}: ${dev.reason}`).join(' ')}
                  </InlineNote>
                ) : null}
                <Checkbox
                  checked={readConfirmed}
                  onChange={setReadConfirmed}
                  label="I have read the clauses and the deviations, and I am authorised to bind this entity."
                  detail="You can still cancel at the next step."
                />
              </div>
            </Modal>

            {/* Step two: name the signatory and execute. */}
            <Modal
              open={stepTwo}
              onClose={() => setStepTwo(false)}
              title="Sign the pilot agreement — step 2 of 2"
              description="The signatory name, designation and timestamp are recorded against the contract."
              footer={
                <>
                  <Button onClick={() => setStepTwo(false)}>Go back</Button>
                  <Button
                    tone="primary"
                    unavailableReason={
                      name.trim().length < 3
                        ? 'Enter the name of the person signing.'
                        : designation.trim().length < 2
                          ? 'Enter the signatory designation.'
                          : undefined
                    }
                    loading={sign.isPending}
                    loadingLabel="Signing"
                    onClick={() =>
                      sign.mutate(
                        { name, designation, confirmed: true },
                        {
                          onSuccess: (res) => {
                            setStepTwo(false);
                            setJustSigned(true);
                            pushToast('verify', res.message ?? 'Signed.', 'The pilot window has started.');
                          },
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            pushToast(
                              'seal',
                              api?.message ?? 'The signature was not recorded.',
                              'Nothing has been executed. Your entries are preserved.',
                            );
                          },
                        },
                      )
                    }
                  >
                    Sign and start the pilot
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <Field label="Signatory name" required>
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={name || (session.data?.data.user?.name ?? '')}
                      onChange={(e) => setName(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Designation" required>
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="Director and authorised signatory"
                    />
                  )}
                </Field>
                <InlineNote tone="neutral" title="Mock signing provider">
                  This build represents Aadhaar eSign with a mock provider. No live government signing service is
                  called, and the record produced is a demonstration record rather than a legally executed signature.
                </InlineNote>
                <p className="text-micro text-ink-soft">
                  <Badge tone="neutral">Recorded</Badge> Name, designation, timestamp and a checksum over the contract
                  content.
                </p>
              </div>
            </Modal>
          </div>
        );
      }}
    </QueryState>
  );
}
