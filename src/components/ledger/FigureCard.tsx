import type { ReactNode } from 'react';

export type FigureTone = 'plain' | 'verify' | 'hold' | 'seal';

const TONE: Record<FigureTone, { well: string; ink: string; rail: string; wash: string }> = {
  plain: { well: 'border-rule bg-ledger', ink: 'text-ink-soft', rail: 'bg-rule', wash: '' },
  verify: { well: 'border-verify bg-verify-wash', ink: 'text-verify', rail: 'bg-verify', wash: 'bg-verify-wash' },
  hold: { well: 'border-hold bg-hold-wash', ink: 'text-hold', rail: 'bg-hold', wash: 'bg-hold-wash' },
  seal: { well: 'border-seal bg-seal-wash', ink: 'text-seal', rail: 'bg-seal', wash: 'bg-seal-wash' },
};

/**
 * One figure, set as a figure.
 *
 * A number a reader is meant to compare — money outstanding, days over — is a
 * quantity, not a sentence: it takes the display face, tabular figures and a
 * label small enough that the number wins. The mark in the well is what lets a
 * strip of five be told apart at a glance, and it is decorative, because the
 * label beside it already says what the figure is.
 */
export function FigureCard({
  label,
  value,
  detail,
  tone = 'plain',
  mark,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: FigureTone;
  mark: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className="sheet-flat lift-on-hover relative overflow-hidden rounded-block px-5 py-5">
      {/* A lit edge in the figure's own ink, so a strip of cards reads as a row
          of states before any of them is read as a number. */}
      <span aria-hidden className={['absolute inset-x-0 top-0 block h-1', t.rail].join(' ')} />
      <span
        aria-hidden
        className={['mb-4 flex h-10 w-10 items-center justify-center rounded-control border', t.well, t.ink].join(' ')}
      >
        {mark}
      </span>
      <p className="field-label">{label}</p>
      <p className={['mt-1 font-display text-figure tnum', tone === 'plain' ? 'text-ink' : t.ink].join(' ')}>{value}</p>
      {detail ? <p className="mt-1.5 text-micro text-ink-soft">{detail}</p> : null}
    </div>
  );
}

/**
 * The marks used on a payments strip. Drawn here rather than imported, so the
 * product carries no icon library and every glyph is one 24px box on one
 * stroke weight.
 */
function glyph(children: ReactNode) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A rupee, for anything denominated in money. */
export const MarkRupee = glyph(
  <>
    <path d="M7 5h10M7 9h10M7 19l7-7c2.2-2.2 0.9-5-2.4-5H7" />
  </>,
);

/** A stamped ring, for money that has cleared. */
export const MarkCleared = glyph(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.3 12.4l2.6 2.5 4.8-5.4" />
  </>,
);

/** A dial, for anything measured against a window. */
export const MarkClock = glyph(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.2V12l3.2 2" />
  </>,
);

/** A hand raised over a stack, for money someone is holding. */
export const MarkHold = glyph(
  <>
    <rect x="4" y="14" width="16" height="5.5" rx="1.4" />
    <path d="M7 14V9.5M12 14V6.5M17 14v-3" />
  </>,
);

/** A broken window, for money past its limit. */
export const MarkOverdue = glyph(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.6v5M12 16.2h0.01" strokeWidth={1.9} />
  </>,
);
