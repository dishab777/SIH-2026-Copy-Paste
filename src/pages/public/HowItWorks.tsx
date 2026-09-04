import { useState } from 'react';
import { STAGES } from '@/config/stages';
import { GATES, gateSlaDays } from '@/config/gates';
import { citationShort } from '@/config/policies';
import { GateFile } from '@/components/domain/GateFile';
import { useReveal } from '@/lib/reveal';
import { durationWords } from '@/lib/format';

/*
 * Two accents, and they mean here exactly what they mean everywhere else in
 * the product: saffron is work still in front of you, signal is something
 * proved. The three acts used to be three hues, which made colour say "which
 * third of the process is this" — a fact the label beside it already states,
 * and a third hue nothing else in the system used.
 */
type Accent = 'saffron' | 'signal';

/** Framing, running, proving: the three acts a case passes through. */
const ACT: { of: (i: number) => Accent; label: (i: number) => string } = {
  of: (i) => (i < 6 ? 'saffron' : 'signal'),
  label: (i) => (i < 3 ? 'Framing the problem' : i < 6 ? 'Choosing who runs it' : 'Proving what happened'),
};

/** The rail across the top of a card: bright, because it is not text. */
const RAIL: Record<Accent, string> = {
  saffron: 'var(--saffron)',
  signal: 'var(--signal)',
};

/** The stage number, which is text on a sheet and has to be read. */
const NUM: Record<Accent, string> = {
  saffron: 'var(--saffron-ink)',
  signal: 'var(--verify)',
};

export default function HowItWorks() {
  // The toggle switches the copy in place; it does not navigate to a second page.
  const [side, setSide] = useState<'department' | 'startup'>('department');
  useReveal([side]);

  return (
    <div className="-mx-4 -mt-6 md:-mx-6">
      {/* The claim, and the object that makes it: a real case with its seven
          gates written down the page. */}
      <section className="deep deep-field full-bleed px-4 pb-16 pt-12 md:px-6">
        <div className="mx-auto grid max-w-shell grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="field-label mb-3 !text-deep-dim">Nine stages, seven gates</p>
            <h1 className="max-w-[15ch] font-display text-hero text-deep-ink">
              How a problem becomes a contract.
            </h1>
            <p className="mt-5 max-w-[56ch] text-lead text-deep-dim">
              A gate is not a status that quietly changes. It is a decision with an owner, a set of preconditions that
              have to be met, and a written reason that stays on the record for as long as the case exists.
            </p>

            <div
              className="mt-8 inline-flex gap-1 rounded-pill border border-deep-rule p-1"
              role="group"
              aria-label="Show this from the department or startup side"
            >
              {(['department', 'startup'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  aria-pressed={side === s}
                  className={[
                    'swift h-9 whitespace-nowrap rounded-pill px-5 text-label',
                    side === s ? 'bg-saffron font-semibold text-deep' : 'text-deep-dim hover:text-deep-ink',
                  ].join(' ')}
                >
                  {s === 'department' ? 'From the department' : 'From the startup'}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:pl-6">
            <GateFile at={3} />
          </div>
        </div>
      </section>

      {/* The nine stages, grouped into the three acts they actually form. */}
      <section aria-labelledby="stages-heading" className="full-bleed bg-ledger px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <h2 id="stages-heading" className="sr-only">
            The nine stages
          </h2>

          <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {STAGES.map((s, i) => {
              const copy = side === 'department' ? s.department : s.startup;
              const gate = GATES.find((g) => g.id === s.gate);
              const accent = ACT.of(i);
              const firstOfAct = i % 3 === 0;
              return (
                <li key={s.id} className="reveal flex" data-delay={String((i % 3) + 1)}>
                  <article className="flex w-full flex-col overflow-hidden rounded-block border border-rule bg-sheet shadow-sheet">
                    <div aria-hidden className="h-1 w-full" style={{ background: RAIL[accent] }} />
                    <div className="flex flex-1 flex-col px-5 py-5">
                      {firstOfAct ? <p className="field-label mb-3">{ACT.label(i)}</p> : null}

                      <div className="flex items-baseline gap-3">
                        <span
                          className="type-register text-figure"
                          style={{ color: NUM[accent] }}
                        >
                          {String(s.index).padStart(2, '0')}
                        </span>
                        <h3 className="font-display text-h3 text-ink">{s.title}</h3>
                      </div>

                      <p className="mt-1 text-micro text-ink-soft">{s.actor}</p>
                      <p className="mt-4 font-doc text-body text-ink">{copy.happens}</p>
                      <p className="mt-3 text-body text-ink-soft">
                        <span className="text-ink">Produces:</span> {copy.produces}
                      </p>

                      <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-rule pt-4">
                        <div>
                          <dt className="field-label">Typically takes</dt>
                          <dd className="mt-1 text-data text-ink">
                            {durationWords(s.typicalDurationDays[0])} to {durationWords(s.typicalDurationDays[1])}
                          </dd>
                        </div>
                        {gate ? (
                          <div>
                            <dt className="field-label">Clears</dt>
                            <dd className="mt-1 text-data text-ink">{gate.id}</dd>
                            <dd className="mt-0.5 text-micro text-ink-soft">
                              {gateSlaDays(gate.id)}-day window
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* The gates in full, on paper, because this is the part people quote. */}
      <section aria-labelledby="gates-heading" className="full-bleed border-t border-rule bg-sheet px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <p className="field-label mb-3">The seven gates</p>
          <h2 id="gates-heading" className="max-w-[22ch] font-display text-hero text-ink">
            No role can clear a gate whose preconditions are unmet.
          </h2>
          <p className="mt-4 max-w-doc text-body text-ink-soft">
            That holds for everyone, including a programme administrator. The only route past an unmet precondition is a
            recorded waiver from a higher authority — and a waiver never marks the precondition as met. It sits beside
            it, naming who granted it and why.
          </p>

          <ol className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {GATES.map((g, i) => (
              <li key={g.id} className="reveal" data-delay={String((i % 4) + 1)}>
                <article className="h-full rounded-block border border-rule bg-ledger px-5 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className="type-register rounded-pill border border-ink px-3 py-0.5 text-micro text-ink">
                        {g.id}
                      </span>
                      <h3 className="font-display text-h3 text-ink">{g.name}</h3>
                    </div>
                    <span className="field-label">{gateSlaDays(g.id)}-day window</span>
                  </div>

                  <p className="mt-3 font-doc text-body text-ink">{g.decides}</p>
                  <p className="mt-2 text-micro text-ink-soft">Owned by {g.ownerRole.replace(/_/g, ' ')}</p>

                  <p className="field-label mt-5">Preconditions</p>
                  <ul className="mt-2 space-y-3">
                    {g.preconditions.map((p) => (
                      <li key={p.key} className="border-l-2 border-rule pl-3">
                        <span className="block text-body text-ink">{p.label}</span>
                        <span className="mt-0.5 block text-micro text-ink-soft">{p.detail}</span>
                        <span className="mt-0.5 block text-micro text-ink-soft">{citationShort(p.citation)}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
