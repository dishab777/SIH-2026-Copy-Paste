import { useId } from 'react';
import { percent } from '@/lib/format';

export type OutcomeKey = 'validated' | 'validated_with_qualifications' | 'not_validated';

export interface OutcomeSlice {
  key: OutcomeKey;
  label: string;
  detail: string;
  count: number;
  colour: string;
}

/**
 * The ink each finding is written in on paper.
 *
 * Exported because the same three findings are named in the results table and
 * in the key above it, and a finding that is green in the drawing and carbon in
 * the table is two different facts to a reader rather than one.
 */
export const OUTCOME_INK: Record<OutcomeKey, string> = {
  validated: 'text-verify',
  validated_with_qualifications: 'text-hold',
  not_validated: 'text-seal',
};

const OUTCOME_WASH: Record<OutcomeKey, string> = {
  validated: 'bg-verify-wash',
  validated_with_qualifications: 'bg-hold-wash',
  not_validated: 'bg-seal-wash',
};

const OUTCOME_RAIL: Record<OutcomeKey, string> = {
  validated: 'border-l-verify',
  validated_with_qualifications: 'border-l-hold',
  not_validated: 'border-l-seal',
};

/**
 * The three findings a validator can sign, drawn.
 *
 * A finding has to survive a photocopy, a monochrome print and a reader who
 * cannot separate green from red, so each one is a different *shape* rather
 * than the same shape in a different colour. They are all the same object —
 * the seal an officer presses against a signature — in its three states: signed
 * through, signed with a question left open on the file, and broken.
 *
 * Decorative on purpose. Every place one of these appears, the finding is also
 * written out in words beside it.
 */
export function OutcomeMark({ outcome, size = 20 }: { outcome: OutcomeKey; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className="block shrink-0"
    >
      {outcome === 'not_validated' ? (
        /*
         * A snapped ring: two arcs slipped past each other along the break, so
         * it reads as broken at a glance rather than as a circle with a nick.
         */
        <g>
          <path d="M16.5 19.8A9 9 0 0 1 4.2 7.5" transform="translate(-0.9 0.9)" />
          <path d="M7.5 4.2A9 9 0 0 1 19.8 16.5" transform="translate(0.9 -0.9)" />
        </g>
      ) : (
        <circle cx="12" cy="12" r="9" />
      )}

      {outcome === 'validated' ? (
        <>
          <path d="M7.4 13.9c1.5-3.4 2.6-3 3 0c0.4-2.4 1.5-2.4 2 0c0.6-0.6 1.6-1.4 3.4-2.6" strokeWidth={1.4} />
          <path d="M8.4 16.5h7.2" strokeWidth={1.1} />
        </>
      ) : null}

      {outcome === 'validated_with_qualifications' ? (
        <>
          <path d="M9.6 10.1a2.5 2.5 0 1 1 2.5 2.9v1.2" />
          <path d="M12.1 16.1h0.01" strokeWidth={1.9} />
        </>
      ) : null}
    </svg>
  );
}

/**
 * What happened to every pilot that finished, as one circle.
 *
 * The point of the drawing is the proportion, and a proportion of a whole is
 * the one job a pie does better than a bar. There are exactly three findings a
 * validator can sign, so there are exactly three slices — a pie fails when it
 * has twelve, not when it has three.
 *
 * Drawn as arcs with a hole, so the total sits in the middle where the eye
 * lands, and every slice is also written out beside it as a label and a figure:
 * a reader who cannot separate the colours still gets the whole answer from the
 * list, and each row carries the finding's mark so it survives without colour.
 */
export function OutcomePie({ slices, size = 260 }: { slices: readonly OutcomeSlice[]; size?: number }) {
  const gradId = useId();
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return <p className="text-body text-ink-soft">No pilots have finished yet.</p>;
  }

  const r = size / 2;
  const thickness = size * 0.19;
  const inner = r - thickness;
  // A hairline of ground between slices, so two adjoining colours never touch.
  const gap = 0.012;

  let start = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.count > 0)
    .map((s) => {
      const share = s.count / total;
      const sweep = share * Math.PI * 2;
      const a0 = start + gap / 2;
      const a1 = start + sweep - gap / 2;
      start += sweep;

      const pt = (angle: number, radius: number) => [r + radius * Math.cos(angle), r + radius * Math.sin(angle)];
      const [x0, y0] = pt(a0, r - 1);
      const [x1, y1] = pt(a1, r - 1);
      const [x2, y2] = pt(a1, inner);
      const [x3, y3] = pt(a0, inner);
      const large = sweep - gap > Math.PI ? 1 : 0;

      return {
        ...s,
        share,
        d: [
          `M ${x0} ${y0}`,
          `A ${r - 1} ${r - 1} 0 ${large} 1 ${x1} ${y1}`,
          `L ${x2} ${y2}`,
          `A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3}`,
          'Z',
        ].join(' '),
      };
    });

  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-12">
      {/* The drawing takes the width it is given below its natural size, so the
          ring never pushes a phone into a sideways scroll. */}
      <div className="w-full shrink-0" style={{ maxWidth: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Outcomes of ${total} completed pilots: ${arcs
            .map((a) => `${a.count} ${a.label.toLowerCase()}`)
            .join(', ')}.`}
          className="block h-auto w-full overflow-visible"
        >
          <defs>
            {/* A soft drop, so the ring reads as a solid disc lying on the page
                rather than a flat outline drawn on it. */}
            <filter id={`${gradId}-drop`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="var(--ink)" floodOpacity="0.2" />
            </filter>

            {/* Light rakes from the upper left across the whole product, and the
                disc is lit the same way: each slice is its own ink, carrying
                more of it at the top than at the bottom. No second colour is
                invented — only the strength of the one the slice already has. */}
            {arcs.map((a) => (
              <linearGradient key={a.key} id={`${gradId}-${a.key}`} x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0%" stopColor={a.colour} stopOpacity="1" />
                <stop offset="100%" stopColor={a.colour} stopOpacity="0.76" />
              </linearGradient>
            ))}

            {/* The wash the disc sits in, so it is bedded into the panel rather
                than floating on it. */}
            <radialGradient id={`${gradId}-bed`}>
              <stop offset="0%" stopColor="var(--verify)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--verify)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx={r} cy={r} r={r} fill={`url(#${gradId}-bed)`} />

          <g filter={`url(#${gradId}-drop)`}>
            {arcs.map((a, i) => (
              <path
                key={a.key}
                d={a.d}
                fill={`url(#${gradId}-${a.key})`}
                className="reveal"
                data-delay={String((i % 5) + 1)}
                style={{ transformOrigin: `${r}px ${r}px` }}
              />
            ))}
          </g>

          {/* The milled edge of a seal, drawn inside the ring — the same object
              the three findings are marks of. */}
          <circle
            cx={r}
            cy={r}
            r={inner - 9}
            fill="none"
            stroke="var(--rule)"
            strokeWidth="1"
            strokeDasharray="2 7"
          />

          <text
            x={r}
            y={r + 8}
            textAnchor="middle"
            className="font-display tnum"
            style={{ fontSize: size * 0.25, fontWeight: 800, fill: 'var(--ink)', letterSpacing: '-0.035em' }}
          >
            {total}
          </text>
          <text
            x={r}
            y={r + 32}
            textAnchor="middle"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.075em', fill: 'var(--ink-soft)' }}
          >
            PILOTS FINISHED
          </text>
        </svg>
      </div>

      <ol className="w-full min-w-0 flex-1">
        {slices.map((s, i) => (
          <li key={s.key} className="reveal mb-3 last:mb-0" data-delay={String((i % 5) + 1)}>
            <div
              className={[
                'swift flex items-start gap-4 rounded-sheet border border-rule border-l-2 px-4 py-4',
                OUTCOME_WASH[s.key],
                OUTCOME_RAIL[s.key],
              ].join(' ')}
            >
              <span className={['mt-1', OUTCOME_INK[s.key]].join(' ')}>
                <OutcomeMark outcome={s.key} size={24} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-display text-h3 text-ink">{s.label}</span>
                <span className="mt-1 block text-body text-ink-soft">{s.detail}</span>
                {/* The same proportion as the arc, laid straight, so two slices
                    of similar size can be compared without judging angles. */}
                <span aria-hidden className="mt-3 block h-1 w-full rounded-pill bg-ledger">
                  <span
                    className="block h-1 rounded-pill"
                    style={{ width: `${Math.max((s.count / total) * 100, 1.5)}%`, background: s.colour }}
                  />
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-display text-figure text-ink tnum">{s.count}</span>
                <span className="block text-micro text-ink-soft tnum">{percent((s.count / total) * 100, 0)}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
