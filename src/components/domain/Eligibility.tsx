import { useState } from 'react';
import { citationShort } from '@/config/policies';
import { NON_RELAXABLE_CATEGORIES, RELAXABLE_CATEGORIES, rule } from '@/config/rules';
import { dayTime } from '@/lib/format';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, RadioGroup, Textarea } from '@/components/ui/Field';
import { InlineNote } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import type { EligibilityResult } from '@/types/models';

/**
 * Relief, not a lower bar. The two lists are printed side by side so the
 * distinction is on the screen rather than in a policy document.
 */
export function RelaxationNotice({
  compact,
  headingLevel = 3,
}: {
  compact?: boolean;
  /** Where this panel sits in the page outline. Pass 2 when it follows the h1 directly. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={['sheet-flat', compact ? '' : ''].join(' ')}>
      <Heading className="border-b border-ink px-4 py-2 text-label text-ink">Startup relief</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-rule px-4 py-3 md:border-b-0 md:border-r">
          <p className="text-label text-ink">May be relaxed</p>
          <p className="mt-1 text-micro text-ink-soft">Under {citationShort('GFR-2017-173')}, for a recognised startup.</p>
          <ul className="mt-2 space-y-1">
            {RELAXABLE_CATEGORIES.map((c) => (
              <li key={c} className="flex items-center gap-2 text-body text-ink">
                <span aria-hidden className="text-verify">
                  ✓
                </span>
                <span className="capitalize">{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 py-3">
          <p className="text-label text-ink">Never relaxed</p>
          <p className="mt-1 text-micro text-ink-soft">
            Relief is on turnover and experience. The quality bar does not move.
          </p>
          <ul className="mt-2 space-y-1">
            {NON_RELAXABLE_CATEGORIES.map((c) => (
              <li key={c} className="flex items-center gap-2 text-body text-ink">
                <span aria-hidden className="text-ink-soft">
                  —
                </span>
                <span className="capitalize">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export interface EligibilityChecklistProps {
  results: EligibilityResult[];
  /** Present only for a screening officer. Absent for applicants. */
  onOverride?: (input: { ruleId: string; result: 'pass' | 'fail' | 'review'; justification: string }) => Promise<void>;
  overrideBusy?: boolean;
  overrideError?: string;
}

export function EligibilityChecklist({ results, onOverride, overrideBusy, overrideError }: EligibilityChecklistProps) {
  const [editing, setEditing] = useState<EligibilityResult | null>(null);
  const [nextResult, setNextResult] = useState<'pass' | 'fail' | 'review'>('pass');
  const [justification, setJustification] = useState('');

  if (results.length === 0) {
    return <p className="text-body text-ink-soft">The rule engine has not run against this application yet.</p>;
  }

  return (
    <>
      <ul className="sheet-flat">
        {results.map((r) => {
          const def = (() => {
            try {
              return rule(r.ruleId);
            } catch {
              return null;
            }
          })();
          const effective = r.override?.result ?? r.result;
          return (
            <li key={r.ruleId} className="ledger-row px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body text-ink">{def?.label ?? r.ruleId}</p>
                  {def ? <p className="mt-0.5 max-w-[68ch] text-micro text-ink-soft">{def.explanation}</p> : null}
                  <p className="mt-1 text-micro text-ink-soft">{r.evidence}</p>
                  <p className="mt-1 text-micro text-ink-soft">
                    {citationShort(r.citation)} · rule {r.ruleId} v{r.ruleVersion} · checked {dayTime(r.evaluatedAt)}
                  </p>
                  {r.relaxationApplied ? (
                    <p className="mt-1 text-micro text-ink">
                      <Badge tone="verify">Relief applied</Badge>{' '}
                      <span className="text-ink-soft">The technical bar is unchanged.</span>
                    </p>
                  ) : null}
                  {r.changedSince ? (
                    <p className="mt-2 border-l-2 border-l-hold bg-hold-wash px-2 py-1 text-micro text-ink">
                      Changed after submission: {r.changedSince.what}, on {dayTime(r.changedSince.at)}. Moved to needs
                      review rather than rejected.
                    </p>
                  ) : null}
                  {r.override ? (
                    <p className="mt-2 border-l-2 border-l-verify bg-verify-wash px-2 py-1 text-micro text-ink">
                      Overridden to {r.override.result} by {r.override.by} on {dayTime(r.override.at)}. “
                      {r.override.justification}”
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={effective} />
                  {onOverride ? (
                    <Button
                      size="sm"
                      tone="quiet"
                      onClick={() => {
                        setEditing(r);
                        setNextResult(effective === 'pass' ? 'fail' : 'pass');
                        setJustification('');
                      }}
                    >
                      Override with reasons
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Override an automated eligibility result"
        description="An override is only valid with a written justification. It becomes part of the audit record and a gate 2 precondition."
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              tone="primary"
              loading={overrideBusy}
              loadingLabel="Recording"
              disabled={justification.trim().length < 20}
              onClick={async () => {
                if (!editing || !onOverride) return;
                await onOverride({ ruleId: editing.ruleId, result: nextResult, justification });
                setEditing(null);
              }}
            >
              Record override
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="flex flex-col gap-6">
            <InlineNote tone="hold" title="What the engine decided">
              {editing.evidence}
            </InlineNote>
            <RadioGroup
              legend="New result"
              name="override-result"
              value={nextResult}
              onChange={(v) => setNextResult(v as 'pass' | 'fail' | 'review')}
              options={[
                { value: 'pass', label: 'Pass', detail: 'The applicant meets this requirement despite the automated result.' },
                { value: 'review', label: 'Needs review', detail: 'Keep it open for a further check.' },
                { value: 'fail', label: 'Fail', detail: 'The applicant does not meet this requirement.' },
              ]}
            />
            <Field
              label="Written justification"
              required
              hint="At least 20 characters. This is read by the applicant and by anyone auditing the decision."
              error={overrideError}
              aside={`${justification.trim().length} / 20`}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  rows={4}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why the automated result is being changed, and on what evidence."
                />
              )}
            </Field>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
