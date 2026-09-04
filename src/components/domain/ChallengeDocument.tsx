import { rubric } from '@/config/rubrics';
import { rule } from '@/config/rules';
import { citationShort } from '@/config/policies';
import { template } from '@/config/templates';
import { day, money, num } from '@/lib/format';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { KeyValueSheet, StatLedger } from '@/components/ledger/Ledger';
import { IpPositionCard, DataTierSelector } from './Legal';
import { RelaxationNotice } from './Eligibility';
import { useChallengeSection } from './ChallengeSectionContext';
import type { Challenge, ClarificationThread, Department } from '@/types/models';

export const CHALLENGE_SECTIONS = [
  { id: 'problem', label: 'Problem' },
  { id: 'baseline', label: 'Baseline' },
  { id: 'outcome', label: 'Outcome' },
  { id: 'measurement', label: 'Measurement' },
  { id: 'support', label: 'Department support' },
  { id: 'data', label: 'Data' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'budget', label: 'Pilot budget' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'ip', label: 'IP position' },
  { id: 'handling', label: 'Data handling' },
  { id: 'cyber', label: 'Cybersecurity' },
  { id: 'rubric', label: 'Evaluation rubric' },
  { id: 'agreement', label: 'Pilot agreement' },
  { id: 'qa', label: 'Questions and answers' },
] as const;

/**
 * One part of the challenge. Only the selected one is mounted, so a reader
 * comparing two challenges on eligibility is looking at eligibility and nothing
 * else, and the browser is not carrying sixteen sections it cannot see.
 */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { active, seq } = useChallengeSection();
  if (active !== id) return null;

  return (
    <section
      id={id}
      key={seq}
      aria-labelledby={`${id}-heading`}
      className="panel-in"
    >
      <h2 id={`${id}-heading`} className="font-display text-h1 text-ink">
        {title}
      </h2>
      <div className="mt-5 max-w-doc">{children}</div>
    </section>
  );
}

export interface ChallengeDocumentProps {
  challenge: Challenge;
  department?: Department;
  clarifications: ClarificationThread[];
  /** Draft review renders the same page with a watermark and no apply action. */
  draft?: boolean;
}

export function ChallengeDocument({ challenge: c, department, clarifications, draft }: ChallengeDocumentProps) {
  const rub = (() => {
    try {
      return rubric(c.rubricId);
    } catch {
      return null;
    }
  })();
  const agreement = (() => {
    try {
      return template(c.legal.templateId);
    } catch {
      return null;
    }
  })();
  const milestoneTotal = c.pilot.milestones.reduce((s, m) => s + m.paymentPaise, 0);

  return (
    <article>
      {/*
        Truth 4 stays pinned above whichever panel is open. Which section you
        are reading does not change who owns the intellectual property, and a
        founder should never have to go looking for that answer.
      */}
      <div className="mb-8">
        <IpPositionCard position={c.legal.ipPosition} clauseIds={[...c.legal.ipClauseIds, ...c.legal.dataClauseIds]} />
      </div>

      <Section id="problem" title="The problem">
        <dl className="space-y-4">
          {[
            { label: 'Who is affected', value: c.problem.whoAffected },
            { label: 'What happens today', value: c.problem.whatHappensToday },
            { label: 'How often', value: c.problem.frequency },
            { label: 'What it costs', value: c.problem.costToday },
            { label: 'Why it has not been solved', value: c.problem.currentLimitations },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-label text-ink-soft">{row.label}</dt>
              <dd className="mt-1 font-doc text-doc text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="baseline" title="The baseline">
        <p className="font-doc text-doc text-ink">
          {c.baseline.metric} is currently {num(c.baseline.currentValue, 1)} {c.baseline.unit}.
        </p>
        <div className="mt-4">
          <KeyValueSheet
            items={[
              { label: 'Measured by', value: c.baseline.method },
              { label: 'Source of truth', value: c.baseline.sourceOfTruth },
              { label: 'Measurement period', value: c.baseline.period },
            ]}
          />
        </div>
      </Section>

      <Section id="outcome" title="The outcome sought">
        <p className="font-doc text-doc text-ink">{c.outcome.statement}</p>
        <div className="mt-4">
          <KeyValueSheet
            items={[
              {
                label: 'Target',
                value: `${c.outcome.targetMetric} ${c.outcome.direction === 'decrease' ? 'reduced to' : 'raised to'} ${num(c.outcome.magnitude, 1)} ${c.outcome.unit} or better`,
              },
              {
                label: 'Minimum acceptable',
                value: `${num(c.outcome.minimumAcceptable, 1)} ${c.outcome.unit}`,
                hint: 'Below the target but still an improvement worth paying for.',
              },
              {
                label: 'Failure threshold',
                value: `${num(c.outcome.failureThreshold, 1)} ${c.outcome.unit}`,
                hint: 'At or beyond this, the pilot has not achieved its outcome.',
              },
            ]}
          />
        </div>
        <p className="mt-4 text-body text-ink-soft">
          The department has not specified how to achieve this. Propose your own approach; you are scored on the outcome
          and on whether it can be measured.
        </p>
      </Section>

      <Section id="measurement" title="How success will be measured">
        <p className="font-doc text-doc text-ink">{c.outcome.method}</p>
        <p className="mt-3 text-body text-ink-soft">
          The same method is used for the baseline and the pilot period, and an independent validator will attempt to
          re-derive the result from raw departmental records rather than from a supplier dashboard.
        </p>
      </Section>

      <Section id="support" title="What the department provides">
        <KeyValueSheet
          items={[
            { label: 'Systems', value: c.departmentProvides.systems.join(', ') },
            { label: 'Site access', value: c.departmentProvides.siteAccess },
            { label: 'People', value: c.departmentProvides.users },
            { label: 'Staff time', value: `${c.departmentProvides.staffTimeHoursPerWeek} hours a week` },
          ]}
        />
        <div className="mt-4 border-l-2 border-l-seal bg-seal-wash px-4 py-3">
          <p className="text-label text-ink">What the department will not provide</p>
          <ul className="mt-1 list-disc pl-5 text-body text-ink">
            {c.departmentProvides.willNotProvide.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-micro text-ink-soft">Price these into your milestones.</p>
        </div>
      </Section>

      <Section id="data" title="Data">
        <KeyValueSheet
          items={[
            { label: 'What is shared', value: c.departmentProvides.data },
            { label: 'Fields', value: c.departmentProvides.fields.join(', ') },
            { label: 'Volume', value: c.departmentProvides.volume },
            { label: 'How it is accessed', value: c.departmentProvides.accessMethod },
          ]}
        />
        <div className="mt-6">
          <DataTierSelector value={c.departmentProvides.dataTier} readOnly />
        </div>
      </Section>

      <Section id="eligibility" title="Eligibility">
        <div className="mb-6">
          <RelaxationNotice />
        </div>
        <ul className="sheet-flat">
          {c.eligibility.ruleIds.map((id) => {
            const def = (() => {
              try {
                return rule(id);
              } catch {
                return null;
              }
            })();
            if (!def) return null;
            return (
              <li key={id} className="ledger-row px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body text-ink">{def.label}</p>
                    <p className="mt-0.5 text-micro text-ink-soft">{def.explanation}</p>
                    <p className="mt-1 text-micro text-ink-soft">
                      {citationShort(def.citation)} · rule {def.id} v{def.version} · effective {day(def.effectiveFrom)}
                    </p>
                  </div>
                  <Badge tone={def.relief === 'relaxable' ? 'verify' : 'neutral'}>
                    {def.relief === 'relaxable' ? 'May be relaxed' : 'Not relaxed'}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="budget" title="Pilot budget">
        <StatLedger
          rows={[
            { label: 'Pilot duration', value: `${c.pilot.durationDays} days` },
            { label: 'Budget head', value: c.pilot.budgetHead },
            { label: 'Approval authority', value: c.pilot.approvalAuthority },
          ]}
          total={{ label: 'Pilot budget', value: money(c.pilot.budgetPaise) }}
        />
      </Section>

      <Section id="milestones" title="Milestones and acceptance tests">
        <p className="text-body text-ink-soft">
          Money moves on evidence. Each milestone carries an acceptance test, the evidence needed to pass it, and the
          payment released when it does.
        </p>
        <ol className="mt-4 sheet-flat">
          {c.pilot.milestones.map((m) => (
            <li key={m.id} className="ledger-row px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 max-w-doc">
                  <p className="text-micro text-ink-soft tnum">Milestone {m.index} · day {m.dueDayOffset}</p>
                  <p className="mt-0.5 text-body text-ink">{m.name}</p>
                  <p className="mt-2 text-label text-ink-soft">Acceptance test</p>
                  <p className="text-body text-ink">{m.acceptanceTest}</p>
                  <p className="mt-2 text-label text-ink-soft">Evidence required</p>
                  <p className="text-body text-ink">{m.evidenceRequired.join(', ')}</p>
                </div>
                <span className="shrink-0 text-data text-ink tnum">{money(m.paymentPaise)}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="rule-total mt-0 flex items-baseline justify-between px-4 py-3">
          <span className="text-body font-medium text-ink">Total across milestones</span>
          <span className="text-data font-medium text-ink tnum">{money(milestoneTotal)}</span>
        </div>
        {milestoneTotal !== c.pilot.budgetPaise ? (
          <p className="mt-2 border-l-2 border-l-seal bg-seal-wash px-3 py-2 text-body text-ink">
            Milestone payments total {money(milestoneTotal)} against a pilot budget of {money(c.pilot.budgetPaise)}. This
            challenge cannot clear gate 0 until they match.
          </p>
        ) : null}
      </Section>

      <Section id="timeline" title="Timeline">
        <KeyValueSheet
          items={[
            { label: 'Published', value: c.timeline.publishedOn ? day(c.timeline.publishedOn) : 'Not published yet' },
            { label: 'Applications close', value: c.timeline.closesOn ? day(c.timeline.closesOn) : '—' },
            {
              label: 'Award expected',
              value: c.timeline.awardedOn ? day(c.timeline.awardedOn) : 'Within the gate 3 window after applications close',
            },
            { label: 'Pilot duration', value: `${c.pilot.durationDays} days from contract signature` },
          ]}
        />
      </Section>

      <Section id="ip" title="Intellectual property">
        <IpPositionCard position={c.legal.ipPosition} clauseIds={c.legal.ipClauseIds} />
      </Section>

      <Section id="handling" title="Data handling">
        <p className="font-doc text-doc text-ink">
          Departmental data may be used only for the pilot purpose written into the agreement, at the tier granted, and
          for no longer than the stated period. Erasure is certified in writing within thirty days of the pilot closing.
        </p>
        <p className="mt-3 text-micro text-ink-soft">
          Clauses {c.legal.dataClauseIds.join(', ')} · {citationShort('DPDP-2023-S8')}
        </p>
      </Section>

      <Section id="cyber" title="Cybersecurity">
        <KeyValueSheet
          items={[
            { label: 'Level required', value: <span className="capitalize">{c.legal.cyberLevel}</span> },
            {
              label: 'Incident reporting',
              value: 'Within the statutory window from detection, to the department and to CERT-In.',
              citation: citationShort('CERTIN-2022-DIR'),
            },
            { label: 'Log retention', value: 'For the statutory period, held within India.' },
          ]}
        />
      </Section>

      <Section id="rubric" title="How you will be scored">
        {rub ? (
          <>
            <p className="text-body text-ink-soft">
              {rub.label} {rub.version}, effective {day(rub.effectiveFrom)}. This is the rubric evaluators will use.
              Nothing is added to it after applications close.
            </p>
            <ol className="mt-4 sheet-flat">
              {rub.criteria.map((crit) => (
                <li key={crit.id} className="ledger-row px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 max-w-doc">
                      <p className="text-body text-ink">{crit.label}</p>
                      <p className="mt-0.5 text-micro text-ink-soft">{crit.definition}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-micro text-ink-soft">What a 5 looks like</summary>
                        <p className="mt-1 text-body text-ink">{crit.anchors[5]?.descriptor}</p>
                        <p className="mt-1 text-micro text-ink-soft">A 3: {crit.anchors[3]?.descriptor}</p>
                      </details>
                    </div>
                    <span className="shrink-0 text-data text-ink tnum">{crit.weightPercent}%</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="rule-total flex items-baseline justify-between px-4 py-3">
              <span className="text-body font-medium text-ink">Total weight</span>
              <span className="text-data font-medium text-ink tnum">
                {rub.criteria.reduce((s, x) => s + x.weightPercent, 0)}%
              </span>
            </div>
          </>
        ) : (
          <p className="text-body text-ink-soft">No rubric attached yet.</p>
        )}
      </Section>

      <Section id="agreement" title="Pilot agreement">
        {agreement ? (
          <KeyValueSheet
            items={[
              { label: 'Template', value: `${agreement.label} ${agreement.version}` },
              { label: 'Effective from', value: day(agreement.effectiveFrom) },
              { label: 'Owner', value: agreement.owner },
              { label: 'What it covers', value: agreement.summary },
            ]}
            footnote="The full clause set is in the contract reader once a pilot is awarded, and in the public template library now."
          />
        ) : null}
      </Section>

      <Section id="qa" title="Questions and answers">
        {clarifications.length === 0 ? (
          <p className="text-body text-ink-soft">
            No questions have been asked yet. Answers are published here for every applicant to read, not sent privately.
          </p>
        ) : (
          <ol className="sheet-flat">
            {clarifications.map((q) => (
              <li key={q.id} className="ledger-row px-4 py-4">
                <p className="font-doc text-doc text-ink">{q.question}</p>
                <p className="mt-1 text-micro text-ink-soft">Asked {day(q.askedOn)} · {q.askedByMasked}</p>
                {q.answer ? (
                  <>
                    <p className="mt-3 border-l-2 border-l-verify bg-verify-wash px-3 py-2 font-doc text-doc text-ink">
                      {q.answer}
                    </p>
                    <p className="mt-1 text-micro text-ink-soft">
                      Answered {day(q.answeredOn)}
                      {q.answeredBy ? ` by ${q.answeredBy}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="mt-2">
                    <StatusBadge status="pending" label="Awaiting an answer from the department" />
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>

      {draft ? null : (
        <p className="mt-8 text-micro text-ink-soft">
          Published by {department?.name ?? 'the department'} on {day(c.timeline.publishedOn)}. Case {c.caseId}.
        </p>
      )}
    </article>
  );
}
