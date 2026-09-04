import { useState } from 'react';
import { day, fileSize, money, shortHash } from '@/lib/format';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, FileDrop, RadioGroup, Textarea } from '@/components/ui/Field';
import { InlineNote } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import { SlaClock } from './SlaClock';
import type { Evidence, Milestone, PaymentClaim } from '@/types/models';

export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <ol className="sheet-flat">
      {milestones.map((m) => (
        <li key={m.id} className="ledger-row flex items-center gap-4 px-4 py-3">
          <span
            aria-hidden
            className={[
              'inline-flex h-6 w-6 shrink-0 items-center justify-center border text-micro',
              m.status === 'paid' || m.status === 'approved'
                ? 'border-verify text-verify'
                : m.status === 'rejected' || m.status === 'revision_required'
                  ? 'border-seal text-seal'
                  : 'border-rule text-ink-soft',
            ].join(' ')}
          >
            {m.index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body text-ink">{m.name}</span>
            <span className="block text-micro text-ink-soft">Due {day(m.dueOn)}</span>
          </span>
          <span className="shrink-0 text-data text-ink tnum">{money(m.paymentPaise)}</span>
          <StatusBadge status={m.status} />
        </li>
      ))}
    </ol>
  );
}

export interface MilestoneCardProps {
  milestone: Milestone;
  evidence: Evidence[];
  claim?: PaymentClaim;
  reviewWindowDays: number;
  /** Startup side. */
  onSubmitEvidence?: (files: { fileName: string; type: string; sizeBytes: number }[]) => Promise<void>;
  /** Department side. */
  onDecide?: (input: { finding: 'met' | 'partially_met' | 'not_met'; note: string }) => Promise<void>;
  busy?: boolean;
  error?: string;
}

export function MilestoneCard({
  milestone: m,
  evidence,
  claim,
  reviewWindowDays,
  onSubmitEvidence,
  onDecide,
  busy,
  error,
}: MilestoneCardProps) {
  const [files, setFiles] = useState<{ fileName: string; type: string; sizeBytes: number }[]>([]);
  const [deciding, setDeciding] = useState(false);
  const [finding, setFinding] = useState<'met' | 'partially_met' | 'not_met'>('met');
  const [note, setNote] = useState('');

  const canSubmit = onSubmitEvidence && ['not_started', 'in_progress', 'revision_required', 'rejected'].includes(m.status);
  const canDecide = onDecide && ['submitted', 'under_review'].includes(m.status);

  return (
    <article className="sheet-flat">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink px-4 py-3">
        <div>
          <p className="text-micro text-ink-soft tnum">
            {m.caseId} · milestone {m.index}
          </p>
          <h2 className="mt-0.5 text-h3 text-ink">{m.name}</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={m.status} />
          <span className="text-data text-ink tnum">{money(m.paymentPaise)}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-rule px-4 py-3 md:border-b-0 md:border-r">
          <p className="text-label text-ink-soft">What is required</p>
          <p className="mt-1 max-w-doc text-body text-ink">{m.requirement}</p>
          <p className="mt-3 text-label text-ink-soft">Acceptance test</p>
          <p className="mt-1 max-w-doc text-body text-ink">{m.acceptanceTest}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-label text-ink-soft">Evidence required</p>
          <ul className="mt-1 list-disc pl-5 text-body text-ink">
            {m.evidenceRequired.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="mt-3 text-label text-ink-soft">Dates</p>
          <p className="mt-1 text-body text-ink">
            Due {day(m.dueOn)}
            {m.submittedOn ? ` · submitted ${day(m.submittedOn)}` : ''}
            {m.acceptedOn ? ` · accepted ${day(m.acceptedOn)}` : ''}
          </p>
          {m.submittedOn && !m.acceptedOn ? (
            <div className="mt-2">
              <SlaClock startedOn={m.submittedOn} limitDays={reviewWindowDays} showDetail label="Department review" />
            </div>
          ) : null}
        </div>
      </div>

      {m.acceptanceFinding ? (
        <div className="border-t border-rule px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-label text-ink-soft">Acceptance finding</span>
            <StatusBadge status={m.acceptanceFinding} />
          </div>
          {m.reviewNote ? <p className="mt-1 max-w-doc text-body text-ink">{m.reviewNote}</p> : null}
        </div>
      ) : null}

      {evidence.length > 0 ? (
        <div className="border-t border-rule">
          <p className="px-4 pt-3 text-label text-ink-soft">Evidence on file</p>
          <ul>
            {evidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-2 last:border-b-0">
                <span className="min-w-0">
                  <span className="block truncate text-body text-ink">{e.fileName}</span>
                  <span className="block text-micro text-ink-soft">
                    {e.type} · {fileSize(e.sizeBytes)} · checksum {shortHash(e.hash)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge
                    status={e.scan}
                    label={e.scan === 'clean' ? 'Scan clean' : e.scan === 'pending' ? 'Scan pending' : 'Scan failed'}
                  />
                  {e.scan === 'failed' ? (
                    <Button size="sm" tone="destructive">
                      Replace file
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {claim ? (
        <div className="border-t border-rule px-4 py-3">
          <p className="text-label text-ink-soft">Payment</p>
          <p className="mt-1 text-body text-ink">
            {claim.status === 'paid'
              ? `Paid ${day(claim.paidOn)} · reference ${claim.paymentReference}`
              : `${claim.approvalStep}${claim.holdReason ? ` — ${claim.holdReason}` : ''}`}
          </p>
        </div>
      ) : null}

      {canSubmit ? (
        <div className="border-t border-rule px-4 py-4">
          {m.status === 'revision_required' ? (
            <div className="mb-3">
              <InlineNote tone="seal" title="Returned for revision">
                {m.reviewNote}
              </InlineNote>
            </div>
          ) : null}
          <FileDrop
            label="Attach the evidence for this milestone"
            hint={`Required: ${m.evidenceRequired.join(', ')}. Files are scanned before the department can open them.`}
            onFiles={(f) => setFiles((prev) => [...prev, ...f])}
          />
          {files.length > 0 ? (
            <ul className="mt-3">
              {files.map((f) => (
                <li key={f.fileName} className="flex items-center justify-between border-b border-rule py-2 text-body">
                  <span>{f.fileName}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.fileName !== f.fileName))}
                    className="text-micro text-ink-soft underline underline-offset-2 hover:text-seal"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {error ? <p className="mt-3 text-micro text-seal">{error}</p> : null}
          <div className="mt-4">
            <Button
              tone="primary"
              disabled={files.length === 0}
              loading={busy}
              loadingLabel="Submitting"
              onClick={async () => {
                await onSubmitEvidence?.(files);
                setFiles([]);
              }}
            >
              Submit milestone evidence
            </Button>
          </div>
        </div>
      ) : null}

      {canDecide ? (
        <div className="border-t border-rule px-4 py-4">
          <p className="text-body text-ink">
            The acceptance test must be answered explicitly: met, partially met, or not met. Acceptance starts the payment
            clock.
          </p>
          <div className="mt-3">
            <Button tone="primary" onClick={() => setDeciding(true)}>
              Record acceptance finding
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={deciding}
        onClose={() => setDeciding(false)}
        title={`Milestone ${m.index} — acceptance finding`}
        description="Accepting this milestone starts the payment ageing clock. Returning it tells the startup exactly what to fix."
        footer={
          <>
            <Button onClick={() => setDeciding(false)}>Cancel</Button>
            <Button
              tone={finding === 'not_met' ? 'destructive' : 'primary'}
              loading={busy}
              loadingLabel="Recording"
              disabled={note.trim().length < 20}
              onClick={async () => {
                await onDecide?.({ finding, note });
                setDeciding(false);
                setNote('');
              }}
            >
              {finding === 'not_met' ? 'Return for revision' : 'Accept and start the payment clock'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="border-l-2 border-l-rule bg-ledger px-3 py-2">
            <p className="text-label text-ink-soft">Acceptance test</p>
            <p className="mt-1 text-body text-ink">{m.acceptanceTest}</p>
          </div>
          <RadioGroup
            legend="Finding against the acceptance test"
            name="finding"
            value={finding}
            onChange={(v) => setFinding(v as 'met')}
            options={[
              { value: 'met', label: 'Met', detail: 'The test was satisfied in full.' },
              {
                value: 'partially_met',
                label: 'Partially met',
                detail: 'Accepted in part. The shortfall is recorded and carried into validation.',
              },
              { value: 'not_met', label: 'Not met', detail: 'Returned for revision with your written findings.' },
            ]}
          />
          <Field
            label="Written finding"
            required
            hint="At least 20 characters, stating how the test was or was not met. The startup reads this."
            aside={`${note.trim().length} / 20`}
            error={error}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
          {finding !== 'not_met' ? (
            <InlineNote tone="verify" title="What happens next">
              A payment claim for {money(m.paymentPaise)} is raised and the ageing clock starts today. It is visible to
              the startup, to finance and on the public transparency page.
            </InlineNote>
          ) : null}
        </div>
      </Modal>
    </article>
  );
}

export function EvidenceVault({ items }: { items: Evidence[] }) {
  if (items.length === 0) {
    return <p className="text-body text-ink-soft">No evidence has been uploaded against this pilot yet.</p>;
  }
  return (
    <ul className="sheet-flat">
      {items.map((e) => (
        <li key={e.id} className="ledger-row px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-body text-ink">{e.fileName}</p>
              <p className="mt-0.5 text-micro text-ink-soft">
                {e.type} · {fileSize(e.sizeBytes)} · version {e.version}
              </p>
              <p className="mt-0.5 text-micro text-ink-soft">
                Uploaded by {e.uploadedBy} on {day(e.uploadedAt)}
              </p>
              <p className="mt-0.5 text-micro text-ink-soft">Checksum {shortHash(e.hash)}</p>
              {e.verifiedBy ? (
                <p className="mt-0.5 text-micro text-ink-soft">
                  Verified by {e.verifiedBy} on {day(e.verifiedAt)}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={e.scan} label={e.scan === 'clean' ? 'Scan clean' : e.scan === 'pending' ? 'Scan pending' : 'Scan failed'} />
              <StatusBadge status={e.verification} />
              <Badge tone="neutral" title="Documents are never public by default">
                Access: {e.access}
              </Badge>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
