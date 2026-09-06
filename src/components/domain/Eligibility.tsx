import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { citationShort } from '@/config/policies';
import { NON_RELAXABLE_CATEGORIES, RELAXABLE_CATEGORIES, rule, type RuleOutcome } from '@/config/rules';
import { dayTime } from '@/lib/format';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, RadioGroup, Textarea } from '@/components/ui/Field';
import { InlineNote } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Overlay';
import type { EligibilityResult } from '@/types/models';

/**
 * The relief categories are vocabulary this product authors, not a record
 * somebody filed, so they are written in the reader's language. The rule engine
 * keeps the canonical English; this holds the key it is written under, because
 * a constant at module scope cannot call the hook itself.
 */
const CATEGORY_KEYS: Record<string, { labelKey: string }> = {
  'prior turnover': { labelKey: 'taxonomy.relaxation.category.priorTurnover' },
  'prior experience': { labelKey: 'taxonomy.relaxation.category.priorExperience' },
  'technical capability': { labelKey: 'taxonomy.relaxation.category.technicalCapability' },
  quality: { labelKey: 'taxonomy.relaxation.category.quality' },
  cybersecurity: { labelKey: 'taxonomy.relaxation.category.cybersecurity' },
  performance: { labelKey: 'taxonomy.relaxation.category.performance' },
  safety: { labelKey: 'taxonomy.relaxation.category.safety' },
  'domain requirements': { labelKey: 'taxonomy.relaxation.category.domainRequirements' },
};

/** A screening result as it reads inside a sentence, not as a badge. */
const RESULT_KEYS: Record<RuleOutcome, { labelKey: string }> = {
  pass: { labelKey: 'taxonomy.eligibility.result.pass' },
  fail: { labelKey: 'taxonomy.eligibility.result.fail' },
  review: { labelKey: 'taxonomy.eligibility.result.review' },
};

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
  const { t } = useTranslation();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={['sheet-flat', compact ? '' : ''].join(' ')}>
      <Heading className="border-b border-ink px-4 py-2 text-label text-ink">{t('taxonomy.relaxation.heading')}</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-rule px-4 py-3 md:border-b-0 md:border-r">
          <p className="text-label text-ink">{t('taxonomy.relaxation.mayBeRelaxed')}</p>
          <p className="mt-1 text-micro text-ink-soft">{t('taxonomy.relaxation.basis', { citation: citationShort('GFR-2017-173') })}</p>
          <ul className="mt-2 space-y-1">
            {RELAXABLE_CATEGORIES.map((c) => (
              <li key={c} className="flex items-center gap-2 text-body text-ink">
                <span aria-hidden className="text-verify">
                  ✓
                </span>
                <span className="capitalize">{t(CATEGORY_KEYS[c]?.labelKey ?? c)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 py-3">
          <p className="text-label text-ink">{t('taxonomy.relaxation.neverRelaxed')}</p>
          <p className="mt-1 text-micro text-ink-soft">
            {t('taxonomy.relaxation.bar')}
          </p>
          <ul className="mt-2 space-y-1">
            {NON_RELAXABLE_CATEGORIES.map((c) => (
              <li key={c} className="flex items-center gap-2 text-body text-ink">
                <span aria-hidden className="text-ink-soft">
                  —
                </span>
                <span className="capitalize">{t(CATEGORY_KEYS[c]?.labelKey ?? c)}</span>
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
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EligibilityResult | null>(null);
  const [nextResult, setNextResult] = useState<'pass' | 'fail' | 'review'>('pass');
  const [justification, setJustification] = useState('');

  if (results.length === 0) {
    return <p className="text-body text-ink-soft">{t('taxonomy.eligibility.notRun')}</p>;
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
                    {t('taxonomy.eligibility.provenance', {
                      citation: citationShort(r.citation),
                      ruleId: r.ruleId,
                      version: r.ruleVersion,
                      checked: dayTime(r.evaluatedAt),
                    })}
                  </p>
                  {r.relaxationApplied ? (
                    <p className="mt-1 text-micro text-ink">
                      <Badge tone="verify">{t('taxonomy.eligibility.reliefApplied')}</Badge>{' '}
                      <span className="text-ink-soft">{t('taxonomy.eligibility.reliefUnchanged')}</span>
                    </p>
                  ) : null}
                  {r.changedSince ? (
                    <p className="mt-2 border-l-2 border-l-hold bg-hold-wash px-2 py-1 text-micro text-ink">
                      {t('taxonomy.eligibility.changedSince', {
                        what: r.changedSince.what,
                        at: dayTime(r.changedSince.at),
                      })}
                    </p>
                  ) : null}
                  {r.override ? (
                    <p className="mt-2 border-l-2 border-l-verify bg-verify-wash px-2 py-1 text-micro text-ink">
                      {t('taxonomy.eligibility.overrideRecord', {
                        result: t(RESULT_KEYS[r.override.result].labelKey),
                        by: r.override.by,
                        at: dayTime(r.override.at),
                        justification: r.override.justification,
                      })}
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
                      {t('taxonomy.eligibility.overrideAction')}
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
        title={t('taxonomy.eligibility.overrideTitle')}
        description={t('taxonomy.eligibility.overrideLead')}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>{t('taxonomy.eligibility.cancel')}</Button>
            <Button
              tone="primary"
              loading={overrideBusy}
              loadingLabel={t('taxonomy.eligibility.recording')}
              disabled={justification.trim().length < 20}
              onClick={async () => {
                if (!editing || !onOverride) return;
                await onOverride({ ruleId: editing.ruleId, result: nextResult, justification });
                setEditing(null);
              }}
            >
              {t('taxonomy.eligibility.recordOverride')}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="flex flex-col gap-6">
            <InlineNote tone="hold" title={t('taxonomy.eligibility.engineDecided')}>
              {editing.evidence}
            </InlineNote>
            <RadioGroup
              legend={t('taxonomy.eligibility.newResult')}
              name="override-result"
              value={nextResult}
              onChange={(v) => setNextResult(v as 'pass' | 'fail' | 'review')}
              options={[
                { value: 'pass', label: t('taxonomy.eligibility.choice.pass'), detail: t('taxonomy.eligibility.choice.passDetail') },
                { value: 'review', label: t('taxonomy.eligibility.choice.review'), detail: t('taxonomy.eligibility.choice.reviewDetail') },
                { value: 'fail', label: t('taxonomy.eligibility.choice.fail'), detail: t('taxonomy.eligibility.choice.failDetail') },
              ]}
            />
            <Field
              label={t('taxonomy.eligibility.justificationLabel')}
              required
              hint={t('taxonomy.eligibility.justificationHint')}
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
                  placeholder={t('taxonomy.eligibility.justificationPlaceholder')}
                />
              )}
            </Field>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
