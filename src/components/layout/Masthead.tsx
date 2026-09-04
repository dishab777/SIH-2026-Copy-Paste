import type { ReactNode } from 'react';

export interface MastheadFigure {
  label: string;
  value: string;
  /** Saffron for something still open, signal for something already proved. */
  tone?: 'plain' | 'open' | 'proved';
}

export interface MastheadProps {
  /** What kind of page this is. Two or three words. */
  eyebrow: string;
  title: ReactNode;
  lead: string;
  /** Up to four. Anything longer stops being scannable and becomes a table. */
  figures?: readonly MastheadFigure[];
  children?: ReactNode;
}

const TONE: Record<NonNullable<MastheadFigure['tone']>, string> = {
  plain: 'text-deep-ink',
  open: 'text-saffron',
  proved: 'text-signal',
};

/**
 * The band every public page opens on.
 *
 * One shape, one ground, one set of inks, on every route — which is the whole
 * point. The product used to switch between a paper masthead and a deep one
 * depending on the page, and navigating looked like the site changing colour
 * rather than like moving through one thing.
 *
 * It bleeds past the 1440px column to the window edge, and the shell root is
 * what clips the overshoot.
 */
export function Masthead({ eyebrow, title, lead, figures, children }: MastheadProps) {
  return (
    <section className="deep deep-field full-bleed border-b border-deep-rule px-4 py-12 md:px-6 lg:py-16">
      <div className="mx-auto max-w-shell">
        <p className="field-label mb-3 flex items-center gap-2 !text-saffron">
          <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
          {eyebrow}
        </p>

        <h1 className="max-w-[20ch] font-display text-hero tracking-mega text-deep-ink">{title}</h1>

        <p className="mt-5 max-w-[58ch] text-lead text-deep-dim">{lead}</p>

        {figures?.length ? (
          <dl className="mt-8 grid max-w-[640px] grid-cols-2 gap-px overflow-hidden rounded-block border border-deep-rule bg-deep-rule sm:grid-cols-3">
            {figures.map((f) => (
              <div key={f.label} className="bg-deep-2 px-4 py-4">
                <dt className="field-label !text-deep-dim">{f.label}</dt>
                <dd className={['mt-1 font-display text-figure tnum', TONE[f.tone ?? 'plain']].join(' ')}>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children}
      </div>
    </section>
  );
}
