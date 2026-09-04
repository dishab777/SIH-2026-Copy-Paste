import { useState } from 'react';
import type { RubricDefinition } from '@/config/rubrics';
import { Field, Textarea, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { num } from '@/lib/format';
import type { EvaluationScore } from '@/types/models';

export interface RubricScorerProps {
  rubric: RubricDefinition;
  scores: EvaluationScore[];
  rationaleMinChars: number;
  submitted: boolean;
  busy?: boolean;
  error?: string;
  /** Resume at the last criterion the evaluator touched. */
  startAtCriterionId?: string;
  onSave: (score: EvaluationScore) => Promise<void>;
  onSubmit: () => void;
}

/**
 * One criterion at a time, with its anchored descriptors visible while scoring.
 * The weighted total is shown but deliberately de-emphasised: an evaluator who
 * watches the total while scoring anchors on it.
 */
export function RubricScorer({
  rubric,
  scores,
  rationaleMinChars,
  submitted,
  busy,
  error,
  startAtCriterionId,
  onSave,
  onSubmit,
}: RubricScorerProps) {
  const startIndex = Math.max(
    0,
    rubric.criteria.findIndex((c) => c.id === startAtCriterionId),
  );
  const [index, setIndex] = useState(startIndex);
  const [showTotal, setShowTotal] = useState(false);

  const criterion = rubric.criteria[index]!;
  const existing = scores.find((s) => s.criterionId === criterion.id);
  const [score, setScore] = useState<number | null>(existing?.score ?? null);
  const [rationale, setRationale] = useState(existing?.rationale ?? '');
  const [evidence, setEvidence] = useState(existing?.evidenceReference ?? '');

  function moveTo(next: number): void {
    const target = rubric.criteria[next];
    if (!target) return;
    const found = scores.find((s) => s.criterionId === target.id);
    setIndex(next);
    setScore(found?.score ?? null);
    setRationale(found?.rationale ?? '');
    setEvidence(found?.evidenceReference ?? '');
  }

  const weighted = scores.reduce((sum, s) => {
    const crit = rubric.criteria.find((c) => c.id === s.criterionId);
    return crit ? sum + s.score * (crit.weightPercent / 100) : sum;
  }, 0);

  const complete = rubric.criteria.every((c) => scores.some((s) => s.criterionId === c.id));
  const canSave = score !== null && rationale.trim().length >= rationaleMinChars && evidence.trim().length >= 3;

  return (
    <div className="sheet-flat">
      <div className="border-b border-ink px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-micro text-ink-soft tnum">
              Criterion {index + 1} of {rubric.criteria.length} · {criterion.weightPercent}% weight
            </p>
            <h2 className="mt-0.5 text-h3 text-ink">{criterion.label}</h2>
          </div>
          <p className="text-micro text-ink-soft tnum">
            {scores.length} of {rubric.criteria.length} scored
          </p>
        </div>
        <p className="mt-2 max-w-doc text-body text-ink-soft">{criterion.definition}</p>
      </div>

      {/* Criterion navigation, so an evaluator can move around and resume. */}
      <ol className="flex flex-wrap gap-1 border-b border-rule px-4 py-2">
        {rubric.criteria.map((c, i) => {
          const done = scores.some((s) => s.criterionId === c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => moveTo(i)}
                aria-current={i === index ? 'step' : undefined}
                className={[
                  'inline-flex h-7 w-7 items-center justify-center border text-micro tnum',
                  i === index
                    ? 'border-ink bg-ink text-white'
                    : done
                      ? 'border-verify text-verify'
                      : 'border-rule text-ink-soft',
                ].join(' ')}
              >
                {i + 1}
                <span className="sr-only">
                  {c.label}
                  {done ? ', scored' : ', not scored'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="px-4 py-4">
        {submitted ? (
          <div className="border-l-2 border-l-verify bg-verify-wash px-3 py-2">
            <p className="text-body text-ink">
              You scored this {existing?.score ?? '—'} of 5.
            </p>
            <p className="mt-1 max-w-doc text-body text-ink">{existing?.rationale}</p>
            <p className="mt-1 text-micro text-ink-soft">{existing?.evidenceReference}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Anchored descriptors, visible while scoring rather than in a help panel. */}
            <fieldset className="border-0 p-0">
              <legend className="mb-2 text-label text-ink">
                Score
                <span className="ml-2 font-normal text-ink-soft">required</span>
              </legend>
              <div className="flex flex-col">
                {criterion.anchors.map((anchor) => (
                  <label
                    key={anchor.score}
                    className={[
                      'flex cursor-pointer items-start gap-3 border-b border-rule py-2 last:border-b-0',
                      score === anchor.score ? 'bg-verify-wash' : '',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`score-${criterion.id}`}
                      value={anchor.score}
                      checked={score === anchor.score}
                      onChange={() => setScore(anchor.score)}
                      className="mt-1 h-4 w-4 accent-[color:var(--verify)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-data text-ink tnum">{anchor.score}</span>
                      <span className="block text-body text-ink">{anchor.descriptor}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field
              label="Why this score"
              required
              hint={`At least ${rationaleMinChars} characters. A score without a written reason is not defensible, and the applicant will read this.`}
              aside={`${rationale.trim().length} / ${rationaleMinChars}`}
              error={error}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  rows={5}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
              )}
            </Field>

            <Field
              label="Evidence reference"
              required
              hint={criterion.evidenceHint}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Technical proposal, section 3, paragraph 2"
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                tone="primary"
                disabled={!canSave}
                loading={busy}
                loadingLabel="Saving"
                onClick={async () => {
                  if (score === null) return;
                  await onSave({
                    criterionId: criterion.id,
                    score,
                    rationale,
                    evidenceReference: evidence,
                  });
                  if (index < rubric.criteria.length - 1) moveTo(index + 1);
                }}
              >
                {index < rubric.criteria.length - 1 ? 'Save and go to the next criterion' : 'Save this criterion'}
              </Button>
              {index > 0 ? <Button onClick={() => moveTo(index - 1)}>Back</Button> : null}
              {!canSave ? (
                <p className="text-micro text-ink-soft">
                  {score === null
                    ? 'Choose a score against a descriptor.'
                    : rationale.trim().length < rationaleMinChars
                      ? `${rationaleMinChars - rationale.trim().length} more characters of reasoning.`
                      : 'Point to the part of the proposal you relied on.'}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* The total is available but not in the way. */}
      <div className="border-t border-rule px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowTotal((v) => !v)}
            className="text-micro text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            {showTotal ? 'Hide the running total' : 'Show the running total'}
          </button>
          {showTotal ? (
            <span className="text-micro text-ink-soft tnum">
              Weighted so far: {num(weighted, 2)} of 5 across {scores.length} criteria
            </span>
          ) : (
            <span className="text-micro text-ink-soft">
              Hidden by default — watching the total while scoring anchors the next score.
            </span>
          )}
        </div>

        {!submitted ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button tone="primary" disabled={!complete} onClick={onSubmit}>
              Submit this evaluation
            </Button>
            {!complete ? (
              <span className="text-micro text-ink-soft">
                {rubric.criteria.length - scores.length} criteria still to score.
              </span>
            ) : (
              <Badge tone="hold">Submission is final and cannot be edited</Badge>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
