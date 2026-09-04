import { useState } from 'react';
import { CLAUSES, DATA_TIERS, clause, dataTier, type DataTierDefinition } from '@/config/templates';
import { citationShort } from '@/config/policies';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { InlineNote } from '@/components/ui/Feedback';

/** Truth 4, in plain language first. The legal text is one click away, never in front. */
export function IpPositionCard({
  position,
  clauseIds,
}: {
  position: 'startup_retains' | 'joint' | 'government_assigned';
  clauseIds: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const headline =
    position === 'startup_retains'
      ? 'The startup keeps its intellectual property.'
      : position === 'joint'
        ? 'Intellectual property is held jointly.'
        : 'Intellectual property is assigned to government.';
  const body =
    position === 'startup_retains'
      ? 'Everything you bring and everything you build during the pilot stays yours. Government receives a defined purpose licence to use it within the departments named in the agreement — it cannot resell it or license it commercially.'
      : position === 'joint'
        ? 'Both parties hold rights. Commercial use needs the other party’s consent, which is slower for you and more expensive for the department.'
        : 'A non-standard position that removes your ability to commercialise. It needs an order from the competent authority with written reasons, and it raises the price the department pays.';

  return (
    <>
      <section className="border border-rule border-l-2 border-l-verify bg-verify-wash">
        <div className="px-4 py-3">
          <p className="field-label">Default IP position</p>
          <p className="mt-1 max-w-doc text-body text-ink">{headline}</p>
          <p className="mt-2 max-w-doc text-body text-ink-soft">{body}</p>
          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" onClick={() => setOpen(true)}>
              Read the clauses
            </Button>
            {position !== 'startup_retains' ? <Badge tone="hold">Non-default position</Badge> : null}
          </div>
        </div>
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title="Intellectual property clauses" width="lg">
        <ClauseReader clauseIds={clauseIds} />
      </Modal>
    </>
  );
}

export interface ClauseReaderProps {
  clauseIds: readonly string[];
  deviations?: { clauseId: string; level: 'minor' | 'material'; reason: string; approvedBy: string }[];
  /** Adds a left index of clause numbers with anchors. */
  withIndex?: boolean;
}

/**
 * Legal surface: Tiro at 68ch, plain-language position first, clause index,
 * anchors and highlighted deviations. Never a wall of unstructured text.
 */
export function ClauseReader({ clauseIds, deviations = [], withIndex = true }: ClauseReaderProps) {
  const items = clauseIds
    .map((id) => {
      try {
        return clause(id);
      } catch {
        return null;
      }
    })
    .filter((c): c is (typeof CLAUSES)[number] => Boolean(c));

  return (
    <div className={withIndex ? 'grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]' : ''}>
      {withIndex ? (
        <nav aria-label="Clause index" className="lg:sticky lg:top-4 lg:self-start">
          <h3 className="border-b border-ink pb-2 text-label text-ink">Clauses</h3>
          <ol className="mt-2 space-y-1">
            {items.map((c) => {
              const dev = deviations.find((d) => d.clauseId === c.id);
              return (
                <li key={c.id}>
                  <a href={`#clause-${c.id}`} className="text-micro text-ink-soft underline underline-offset-2 hover:text-ink">
                    {c.number} {c.title}
                  </a>
                  {dev ? <span className="ml-1 text-micro text-seal">·{dev.level === 'material' ? ' material' : ' minor'}</span> : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="max-w-doc">
        {items.map((c) => {
          const dev = deviations.find((d) => d.clauseId === c.id);
          return (
            <article key={c.id} id={`clause-${c.id}`} className="border-b border-rule py-6 last:border-b-0">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-h3 text-ink">
                  <span className="mr-2 text-ink-soft tnum">{c.number}</span>
                  {c.title}
                </h4>
                {c.deviation !== 'default' ? <Badge tone="hold">{c.deviation} deviation</Badge> : null}
              </header>

              <p className="mt-2 max-w-doc text-body text-ink">{c.position}</p>

              {dev ? (
                <div className="mt-3">
                  <InlineNote tone={dev.level === 'material' ? 'seal' : 'hold'} title={`Deviation from the standard clause — ${dev.level}`}>
                    <p>{dev.reason}</p>
                    <p className="mt-1 text-micro text-ink-soft">Approved by {dev.approvedBy}.</p>
                  </InlineNote>
                </div>
              ) : null}

              <details className="mt-3 border-l-2 border-l-rule pl-4">
                <summary className="cursor-pointer text-label text-ink-soft">Authoritative text</summary>
                <p className="mt-2 max-w-doc font-doc text-doc text-ink">{c.legalText}</p>
                <p className="mt-2 text-micro text-ink-soft">
                  This is the operative wording. The plain-language line above is a reading aid, not a substitute.
                </p>
              </details>

              <p className="mt-3 text-micro text-ink-soft">
                Risk: {c.riskNote} · Approval level: {c.approvalLevel} · {citationShort(c.citation)}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** Truth 5. A tier is a decision with an approver, a purpose and a duration — never a toggle. */
export function DataTierSelector({
  value,
  onChange,
  readOnly,
}: {
  value: DataTierDefinition['id'];
  onChange?: (tier: DataTierDefinition['id']) => void;
  readOnly?: boolean;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 text-label text-ink">Data tier</legend>
      <p className="mb-3 max-w-doc text-micro text-ink-soft">
        Production access is a decision, not a setting. Each tier states who approves it, for what purpose, for how long
        and what is logged.
      </p>
      <div className="sheet-flat">
        {DATA_TIERS.map((tier) => {
          const selected = tier.id === value;
          return (
            <label
              key={tier.id}
              className={[
                'flex cursor-pointer items-start gap-3 border-b border-rule px-4 py-3 last:border-b-0',
                selected ? 'bg-verify-wash' : '',
                readOnly ? 'cursor-default' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name="data-tier"
                value={tier.id}
                checked={selected}
                disabled={readOnly}
                onChange={() => onChange?.(tier.id)}
                className="mt-1 h-4 w-4 accent-[color:var(--verify)]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-body text-ink">{tier.label}</span>
                  {tier.id === 'production' ? <Badge tone="hold">Joint approval</Badge> : null}
                </span>
                <span className="mt-0.5 block text-body text-ink-soft">{tier.purpose}</span>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  <div>
                    <dt className="text-micro text-ink-soft">Approved by</dt>
                    <dd className="text-micro text-ink">{tier.approval}</dd>
                  </div>
                  <div>
                    <dt className="text-micro text-ink-soft">Duration</dt>
                    <dd className="text-micro text-ink">{tier.duration}</dd>
                  </div>
                  <div>
                    <dt className="text-micro text-ink-soft">Logging</dt>
                    <dd className="text-micro text-ink">{tier.logging}</dd>
                  </div>
                  <div>
                    <dt className="text-micro text-ink-soft">Citation</dt>
                    <dd className="text-micro text-ink">{citationShort(tier.citation)}</dd>
                  </div>
                </dl>
                <ul className="mt-2 list-disc pl-5 text-micro text-ink-soft">
                  {tier.conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DataTierBadge({ tier }: { tier: string }) {
  const def = (() => {
    try {
      return dataTier(tier);
    } catch {
      return null;
    }
  })();
  if (!def) return null;
  return (
    <Badge tone={def.id === 'production' ? 'hold' : def.id === 'masked' ? 'neutral' : 'verify'} title={def.purpose}>
      {def.label} data
    </Badge>
  );
}
