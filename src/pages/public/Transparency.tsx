import { useId, type ReactNode } from 'react';
import { useTransparency } from '@/services/hooks';
import { QueryState, WidgetBoundary } from '@/components/layout/QueryState';
import { FreshnessLine, PageHeader } from '@/components/layout/Shell';
import { StatLedger } from '@/components/ledger/Ledger';
import { StatSkeleton } from '@/components/ui/Feedback';
import { useReveal } from '@/lib/reveal';
import { money, moneyScaled, num, percent } from '@/lib/format';

/*
 * The four inks, used here exactly as they are used everywhere else in the
 * product. Verify is something cleared, hold is something waiting or near a
 * limit, seal is something refused or overdue, and saffron is something still
 * open. A figure on this page picks its ink from what it means, never from a
 * rotation of chart colours.
 */
type Tone = 'verify' | 'hold' | 'seal' | 'open';

/** The well an icon sits in: a lit wash of its own ink, with the ink on top. */
const WELL: Record<Tone, string> = {
  verify: 'border-verify bg-gradient-to-br from-verify-wash to-sheet text-verify',
  hold: 'border-hold bg-gradient-to-br from-hold-wash to-sheet text-hold',
  seal: 'border-seal bg-gradient-to-br from-seal-wash to-sheet text-seal',
  open: 'border-saffron bg-gradient-to-br from-saffron to-hold-wash text-deep',
};

/** A solid fill: a bar, a legend dot, a rail. Never text. */
const FILL: Record<Tone, string> = {
  verify: 'bg-verify',
  hold: 'bg-hold',
  seal: 'bg-seal',
  open: 'bg-saffron',
};

/** The same fills for SVG, which cannot read a Tailwind class. */
const STROKE: Record<Tone, string> = {
  verify: 'var(--verify)',
  hold: 'var(--hold)',
  seal: 'var(--seal)',
  open: 'var(--saffron)',
};

/*
 * A measured quantity is drawn as a fill that travels from its own ink into
 * the accent beside it, so a bar carries light along its length rather than
 * reading as a flat block of colour.
 */
const BAR: Record<Tone, string> = {
  verify: 'from-verify to-signal',
  hold: 'from-hold to-saffron',
  seal: 'from-seal to-hold',
  open: 'from-hold to-saffron',
};

/*
 * The rail across the head of a panel runs from its own ink into the accent
 * next to it and lets go before the far edge, so a card carries colour without
 * a second border being drawn round it.
 */
const RAIL: Record<Tone, string> = {
  verify: 'from-verify via-signal to-transparent',
  hold: 'from-hold via-saffron to-transparent',
  seal: 'from-seal via-hold to-transparent',
  open: 'from-saffron via-verify to-transparent',
};

/*
 * Every card on this page is tinted by what it measures rather than sitting on
 * plain paper. The tint is a gradient on the panel itself, not a second
 * element, so it blends into the page wash instead of drawing a box inside one.
 */
const TINT: Record<Tone, string> = {
  verify: 'from-verify-wash',
  hold: 'from-hold-wash',
  seal: 'from-seal-wash',
  open: 'from-hold-wash',
};

/** The flat wash, for a row that is filled rather than gradiented. */
const WASH: Record<Tone, string> = {
  verify: 'bg-verify-wash',
  hold: 'bg-hold-wash',
  seal: 'bg-seal-wash',
  open: 'bg-hold-wash',
};

/** The marginal rule down the left edge of a row, in the ink of its meaning. */
const EDGE: Record<Tone, string> = {
  verify: 'border-l-verify',
  hold: 'border-l-hold',
  seal: 'border-l-seal',
  open: 'border-l-saffron',
};

/*
 * The chip that says in words what the ink says in colour. Saffron cannot be
 * read as text on paper, so the open chip takes the dark saffron cut.
 */
const CHIP: Record<Tone, string> = {
  verify: 'border-verify bg-verify-wash text-verify',
  hold: 'border-hold bg-hold-wash text-hold',
  seal: 'border-seal bg-seal-wash text-seal',
  open: 'border-saffron bg-hold-wash text-saffron-ink',
};

/* ------------------------------------------------------------------- marks
 * One drawn mark per kind of figure, so a reader can tell at a glance whether
 * a card is measuring time, money, an outcome or a count of people.
 */

const MARK = {
  width: 22,
  height: 22,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function ClockMark() {
  return (
    <svg {...MARK} aria-hidden focusable="false">
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 5.6V10.2l3.1 1.8" />
    </svg>
  );
}

function RupeeMark() {
  return (
    <svg {...MARK} aria-hidden focusable="false">
      <path d="M5.75 4.75h8.5M5.75 8h8.5" />
      <path d="M5.75 4.75c4.4 0 6.6 1.3 6.6 3.6s-2.2 3.6-6.6 3.6" />
      <path d="m8.2 11.95 6.05 4.25" />
    </svg>
  );
}

function RingMark() {
  return (
    <svg {...MARK} aria-hidden focusable="false">
      <circle cx="10" cy="10" r="7" strokeOpacity="0.35" />
      <path d="M10 3a7 7 0 0 1 5.6 11.2" />
      <circle cx="10" cy="10" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FunnelMark() {
  return (
    <svg {...MARK} aria-hidden focusable="false">
      <path d="M3.25 5.25h13.5M5.5 10h9M8.25 14.75h3.5" />
    </svg>
  );
}

function SealedMark() {
  return (
    <svg {...MARK} aria-hidden focusable="false">
      <rect x="4.25" y="8.75" width="11.5" height="7.5" rx="2.25" />
      <path d="M7.25 8.75V6.5a2.75 2.75 0 0 1 5.5 0v2.25" />
    </svg>
  );
}

/** The ruled sheet the numbers are printed on. It labels every table card. */
function TableMark() {
  return (
    <svg {...MARK} width={14} height={14} aria-hidden focusable="false">
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.5" />
      <path d="M2.75 7.75h14.5M8.25 7.75v8.5" />
    </svg>
  );
}

/* ------------------------------------------------------------- primitives */

/**
 * A quantity laid against the thing it is measured by.
 *
 * The track is the whole of the comparison, the fill is the figure, and the
 * hairline is the allowance — so "past it" is a shape before it is a sentence.
 * A bar without a track and a mark is decoration; this is the smallest drawing
 * that still carries an argument.
 */
function Meter({
  tone,
  value,
  ceiling,
  benchmark,
  caption,
}: {
  tone: Tone;
  value: number;
  ceiling: number;
  benchmark?: number;
  caption?: ReactNode;
}) {
  const share = (part: number): number =>
    ceiling > 0 ? Math.max(0, Math.min(100, (part / ceiling) * 100)) : 0;
  const width = share(value);
  const mark = benchmark === undefined ? null : share(benchmark);

  return (
    <div>
      <div className="relative h-2.5 w-full rounded-pill bg-ledger">
        <div
          className={['h-full rounded-pill bg-gradient-to-r shadow-sheet', BAR[tone]].join(' ')}
          style={{ width: `${width}%` }}
        />
        {mark === null ? null : (
          <span aria-hidden className="absolute -inset-y-1 w-px bg-ink" style={{ left: `${mark}%` }} />
        )}
      </div>
      {caption ? <p className="mt-2 text-micro text-ink-soft">{caption}</p> : null}
    </div>
  );
}

/** A state written in words, a dot and a wash together — never colour alone. */
function ToneChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-micro font-semibold',
        CHIP[tone],
      ].join(' ')}
    >
      <span aria-hidden className={['h-1.5 w-1.5 shrink-0 rounded-pill', FILL[tone]].join(' ')} />
      {children}
    </span>
  );
}

/**
 * A headline figure: the mark, the small label, the quantity at display size,
 * the comparison drawn, and — the part that makes it mean anything — what it
 * should be measured against, written out. A number without its comparison is
 * a decoration.
 */
function FigureCard({
  mark,
  tone,
  label,
  value,
  unit,
  chip,
  meter,
  against,
  delay,
}: {
  mark: ReactNode;
  tone: Tone;
  label: string;
  value: string;
  unit?: string;
  chip: string;
  meter: ReactNode;
  against: string;
  delay: string;
}) {
  return (
    <div
      className={[
        'sheet reveal lift-on-hover relative overflow-hidden rounded-block bg-gradient-to-br to-transparent px-5 py-6',
        TINT[tone],
      ].join(' ')}
      data-delay={delay}
    >
      <span
        aria-hidden
        className={['pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r', RAIL[tone]].join(' ')}
      />
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border shadow-sheet',
            WELL[tone],
          ].join(' ')}
        >
          {mark}
        </span>
        <ToneChip tone={tone}>{chip}</ToneChip>
      </div>
      <dt className="field-label mt-5">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap items-baseline gap-x-2 font-display text-display text-ink tnum">
        {value}
        {unit ? <span className="text-h3 font-normal text-ink-soft">{unit}</span> : null}
      </dd>
      <dd className="mt-5">{meter}</dd>
      <dd className="mt-3 text-micro text-ink-soft">{against}</dd>
    </div>
  );
}

/**
 * The numbers behind a drawing, given a card of their own.
 *
 * The chart is never the record. Whatever is drawn on this page, the figures
 * it was drawn from are printed beside it on the same screen — which is the
 * promise the page makes and the reason a reader can check it rather than
 * trust it. Giving them a titled card says so on the face of it.
 */
function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-sheet border border-rule bg-ledger shadow-sheet">
      <p className="field-label flex items-center gap-2 border-b border-rule px-4 py-3">
        <TableMark />
        The numbers behind it
      </p>
      <div className="overflow-x-auto scroll-quiet px-2 py-1">{children}</div>
    </div>
  );
}

/** A measure, the drawing of it, and the table it was drawn from, in one panel. */
function MeasurePanel({
  id,
  mark,
  tone,
  eyebrow,
  title,
  note,
  summary,
  chart,
  table,
  split,
  className,
  delay,
}: {
  id: string;
  mark: ReactNode;
  tone: Tone;
  eyebrow: string;
  title: string;
  note: string;
  summary: ReactNode;
  chart: ReactNode;
  table: ReactNode;
  split?: boolean;
  className?: string;
  delay: string;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      data-delay={delay}
      className={[
        'sheet reveal relative overflow-hidden rounded-block bg-gradient-to-br to-transparent px-5 py-6 md:px-6 md:py-7',
        TINT[tone],
        className ?? '',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={['pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r', RAIL[tone]].join(' ')}
      />
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border shadow-sheet',
            WELL[tone],
          ].join(' ')}
        >
          {mark}
        </span>
        <div className="min-w-0">
          <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            {eyebrow}
          </p>
          <h2 id={`${id}-heading`} className="font-display text-h2 text-ink">
            {title}
          </h2>
          <p className="mt-2 max-w-doc text-body text-ink-soft">{note}</p>
          <p className="mt-4">{summary}</p>
        </div>
      </div>

      <div className={['mt-6 grid grid-cols-1 gap-5', split ? 'lg:grid-cols-2 lg:gap-6' : ''].join(' ')}>
        {/* The panel's own tint falls from the top left, so the drawing inside it
            takes its light from the other corner and the two never stack into
            one flat block of colour. */}
        <div
          className={[
            'min-w-0 rounded-sheet border border-rule bg-gradient-to-bl to-transparent px-4 py-5 shadow-sheet',
            TINT[tone],
          ].join(' ')}
        >
          {chart}
        </div>
        <div className="min-w-0">
          <TableCard>{table}</TableCard>
        </div>
      </div>
    </section>
  );
}

function Th({ children, align }: { children: ReactNode; align?: 'right' }) {
  return (
    <th
      scope="col"
      className={['field-label !text-ink border-b border-ink px-3 py-2', align === 'right' ? 'text-right' : 'text-left'].join(
        ' ',
      )}
    >
      {children}
    </th>
  );
}

/**
 * What happened to every pilot the programme can account for, as one disc.
 *
 * A proportion of a whole is the one job a ring does better than a bar, and
 * there are four things that can have happened. It is drawn as a lit solid
 * rather than an outline — light rakes from the upper left across the whole
 * product and the disc is lit the same way — with the scale-up rate as a
 * second, thinner ring inside it, because that measure is a proportion of the
 * validated slice rather than of the whole.
 *
 * Decorative on purpose: every slice is written out beside it and printed in
 * the table under it, so nothing here depends on separating the inks.
 */
function OutcomeRing({
  slices,
  total,
  innerPercent,
  centreValue,
  centreLabel,
}: {
  slices: readonly { key: string; tone: Tone; count: number }[];
  total: number;
  innerPercent: number;
  centreValue: string;
  centreLabel: string;
}) {
  const id = useId();
  const SIZE = 208;
  const MID = SIZE / 2;
  const RADIUS = 78;
  const BAND = 22;
  const INNER_RADIUS = 50;
  const CIRC = 2 * Math.PI * RADIUS;
  const INNER_CIRC = 2 * Math.PI * INNER_RADIUS;

  let cursor = 0;
  const arcs = slices.map((s, i) => {
    const length = total > 0 ? (s.count / total) * CIRC : 0;
    const arc = { ...s, index: i, length, offset: cursor };
    cursor += length;
    return arc;
  });

  return (
    <div className="relative shrink-0">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        focusable="false"
        aria-label={`Pilot outcomes: ${slices.map((s) => `${s.key} ${num(s.count)}`).join(', ')}.`}
      >
        <defs>
          {/* A soft drop, so the ring reads as a solid lying on the page rather
              than an outline drawn on it. */}
          <filter id={`${id}-drop`} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="var(--ink)" floodOpacity="0.18" />
          </filter>
          {arcs.map((a) => (
            <linearGradient key={a.key} id={`${id}-${a.index}`} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor={STROKE[a.tone]} stopOpacity="1" />
              <stop offset="100%" stopColor={STROKE[a.tone]} stopOpacity="0.74" />
            </linearGradient>
          ))}
          {/* The wash the disc sits in, so it is bedded into the panel rather
              than floating on it. */}
          <radialGradient id={`${id}-bed`}>
            <stop offset="52%" stopColor="var(--verify)" stopOpacity="0.13" />
            <stop offset="100%" stopColor="var(--verify)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={MID} cy={MID} r={MID - 2} fill={`url(#${id}-bed)`} />

        <g filter={`url(#${id}-drop)`}>
          <circle cx={MID} cy={MID} r={RADIUS} fill="none" stroke="var(--ledger)" strokeWidth={BAND} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={MID}
              cy={MID}
              r={RADIUS}
              fill="none"
              stroke={`url(#${id}-${a.index})`}
              strokeWidth={BAND}
              strokeDasharray={`${a.length} ${Math.max(0, CIRC - a.length)}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${MID} ${MID})`}
            />
          ))}
        </g>

        {/* The milled edge of a seal, drawn inside the band — the same object a
            validator presses against a signature. */}
        <circle
          cx={MID}
          cy={MID}
          r={RADIUS - BAND / 2 - 6}
          fill="none"
          stroke="var(--rule)"
          strokeWidth="1"
          strokeDasharray="2 7"
        />

        <circle cx={MID} cy={MID} r={INNER_RADIUS} fill="none" stroke="var(--rule)" strokeWidth="7" />
        <circle
          cx={MID}
          cy={MID}
          r={INNER_RADIUS}
          fill="none"
          stroke="var(--verify)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, innerPercent)) / 100) * INNER_CIRC} ${INNER_CIRC}`}
          transform={`rotate(-90 ${MID} ${MID})`}
        />
      </svg>
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-h1 text-ink tnum">{centreValue}</span>
        <span className="field-label mt-1">{centreLabel}</span>
      </div>
    </div>
  );
}

/*
 * Restraint is part of the same statement as the figures, so what is held back
 * is written out as plainly as what is published.
 */
const WITHHELD: readonly string[] = [
  'Confidential documents and the evidence vault of any pilot',
  'Private startup information beyond what a company chooses to show on its profile',
  'Internal evaluator comments and any score before results are released',
  'Commercially sensitive procurement detail while a pathway decision is live',
];

/* ------------------------------------------------------------------- page */

export default function Transparency() {
  const query = useTransparency();
  // The panels arrive as they are scrolled to, and the figures cannot exist
  // until the payload does, so the observer is re-armed when the data lands.
  useReveal([query.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Public accountability"
        title="Programme transparency"
        lead="How long this programme takes, how quickly it pays, and how often its pilots actually work. Every chart here has a data table beside it."
        aside={
          <>
            <span className="inline-flex items-center gap-2 rounded-pill border border-deep-rule bg-deep-2 px-3 py-1.5 text-micro text-deep-dim">
              <TableMark />
              Every chart has its table
            </span>
            <span className="inline-flex items-center gap-2 rounded-pill border border-signal bg-signal-veil px-3 py-1.5 text-micro text-signal">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-pill bg-signal" />
              Aggregate figures only
            </span>
          </>
        }
      />

      <WidgetBoundary label="the transparency figures">
        <QueryState query={query} errorTitle="Unable to load programme figures." loading={<StatSkeleton rows={8} />}>
          {(payload) => {
            const d = payload.data;

            /* Every comparison on this page is arithmetic on the payload. Nothing
               statutory is written here: the payment limit and the seven decision
               windows arrive already configured. */
            const windowTotal = d.gateDwell.reduce((s, g) => s + g.slaDays, 0);
            const gatesInside = d.gateDwell.filter((g) => g.medianDwellDays <= g.slaDays).length;
            const totalPilots = d.pilotsByDepartment.reduce((s, p) => s + p.pilots, 0);
            const departmentsWithPilots = d.pilotsByDepartment.filter((p) => p.pilots > 0).length;
            const committedTotal = d.pilotsByDepartment.reduce((s, p) => s + p.committedPaise, 0);
            const lateShare = Math.max(0, 100 - d.medians.paymentTimelinessPercent);
            const scaleUpRate = d.scaleUpRate.validated > 0 ? (d.scaleUpRate.scaled / d.scaleUpRate.validated) * 100 : 0;

            const share = (part: number, whole: number): string =>
              whole > 0 ? percent((part / whole) * 100, 0) : '—';
            const each = (part: number, whole: number): string => (whole > 0 ? num(part / whole, 1) : '—');

            // moneyScaled already knows where a crore begins; splitting its own
            // output keeps that rule in one place rather than restating it here.
            const [committedFigure, ...committedUnit] = moneyScaled(d.headline.committedPaise).split(' ');
            const perPilot = totalPilots > 0 ? moneyScaled(committedTotal / totalPilots) : '—';

            const awardDelay = d.medians.publicationToAwardDays - windowTotal;
            const paymentDelay = d.medians.acceptanceToPaymentDays - d.medians.limitDays;

            const dwellCeiling = Math.max(1, ...d.gateDwell.map((g) => Math.max(g.medianDwellDays, g.slaDays)));
            const funnelTop = d.funnel.length > 0 ? d.funnel[0].count : 0;
            const funnelEnd = d.funnel.length > 0 ? d.funnel[d.funnel.length - 1].count : 0;
            const outcomesTotal = d.pilotOutcomes.reduce((s, o) => s + o.count, 0);
            // "Validated" and "validated with qualifications" are both a pilot
            // that proved itself, so the centre of the ring counts them together.
            const validatedOrBetter = d.pilotOutcomes
              .filter((o) => o.outcome.startsWith('Validated'))
              .reduce((s, o) => s + o.count, 0);
            const maxPilots = Math.max(1, ...d.pilotsByDepartment.map((p) => p.pilots));
            const maxCommitted = Math.max(1, ...d.pilotsByDepartment.map((p) => p.committedPaise));

            /* Ink by meaning where the outcome is one the product already has an
               ink for, and by position only as a last resort. */
            const OUTCOME_TONE: Partial<Record<string, Tone>> = {
              Validated: 'verify',
              'Validated with qualifications': 'hold',
              'Not validated': 'seal',
              'Still running': 'open',
            };
            const ORDER: readonly Tone[] = ['verify', 'hold', 'seal', 'open'];
            const outcomeRows = d.pilotOutcomes.map((o, i) => ({
              outcome: o.outcome,
              count: o.count,
              tone: OUTCOME_TONE[o.outcome] ?? ORDER[i % ORDER.length],
            }));

            return (
              <div className="flex flex-col gap-10 md:gap-12">
                {/* ------------------------------------------------ the strip */}
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
                  <FigureCard
                    delay="1"
                    tone={awardDelay <= 0 ? 'verify' : 'seal'}
                    mark={<ClockMark />}
                    label="Publication to award"
                    value={num(d.medians.publicationToAwardDays)}
                    unit="days"
                    chip={awardDelay <= 0 ? `${num(-awardDelay)} days spare` : `${num(awardDelay)} days over`}
                    meter={
                      <Meter
                        tone={awardDelay <= 0 ? 'verify' : 'seal'}
                        value={d.medians.publicationToAwardDays}
                        ceiling={Math.max(1, d.medians.publicationToAwardDays, windowTotal)}
                        benchmark={windowTotal}
                        caption={`Hairline: the ${num(windowTotal)} days the seven decision windows allow`}
                      />
                    }
                    against="Median across every challenge that has been awarded, measured from the day it was published."
                  />
                  <FigureCard
                    delay="2"
                    tone={paymentDelay <= 0 ? 'verify' : 'seal'}
                    mark={<ClockMark />}
                    label="Acceptance to payment"
                    value={num(d.medians.acceptanceToPaymentDays)}
                    unit="days"
                    chip={paymentDelay <= 0 ? `${num(-paymentDelay)} days spare` : `${num(paymentDelay)} days over`}
                    meter={
                      <Meter
                        tone={paymentDelay <= 0 ? 'verify' : 'seal'}
                        value={d.medians.acceptanceToPaymentDays}
                        ceiling={Math.max(1, d.medians.acceptanceToPaymentDays, d.medians.limitDays)}
                        benchmark={d.medians.limitDays}
                        caption={`Hairline: the configured ${num(d.medians.limitDays)}-day limit`}
                      />
                    }
                    against="Median for a milestone that has been accepted, measured to the day the money left."
                  />
                  <FigureCard
                    delay="3"
                    tone={lateShare > 0 ? 'hold' : 'verify'}
                    mark={<RingMark />}
                    label="Paid inside the limit"
                    value={percent(d.medians.paymentTimelinessPercent)}
                    chip={lateShare > 0 ? `${percent(lateShare)} ran past` : 'All inside'}
                    meter={
                      <Meter
                        tone={lateShare > 0 ? 'hold' : 'verify'}
                        value={d.medians.paymentTimelinessPercent}
                        ceiling={100}
                        caption={`Out of every paid claim — ${percent(lateShare)} of them ran past the limit`}
                      />
                    }
                    against="Share of claims that were settled within the configured limit rather than after it."
                  />
                  <FigureCard
                    delay="4"
                    tone="open"
                    mark={<RupeeMark />}
                    label="Committed to pilots"
                    value={committedFigure}
                    unit={committedUnit.join(' ')}
                    chip={`${num(totalPilots)} pilots`}
                    meter={
                      <Meter
                        tone="open"
                        value={committedTotal}
                        ceiling={Math.max(1, d.headline.committedPaise)}
                        caption={`${moneyScaled(committedTotal)} of it is committed to pilots already awarded — ${share(
                          committedTotal,
                          d.headline.committedPaise,
                        )}`}
                      />
                    }
                    against={`Promised across every open, closed and awarded challenge — about ${perPilot} for each pilot awarded so far.`}
                  />
                </dl>

                {/* The freshness of the figures is part of the figures, so it is
                    stated on the page rather than tucked into the masthead. */}
                <div className="sheet -mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-block px-5 py-3 md:-mt-6">
                  <p className="flex items-center gap-2.5 text-micro text-ink-soft">
                    <span aria-hidden className="live-dot shrink-0" />
                    Aggregates for the whole programme. Nothing here names an applicant, an evaluator or a record.
                  </p>
                  {/* FreshnessLine carries its own top margin for the ledgers it
                      normally sits under; on this row it has to be pulled back. */}
                  <div className="-mt-3">
                    <FreshnessLine servedAt={payload.servedAt} onRefresh={() => void query.refetch()} />
                  </div>
                </div>

                {/* ----------------------------------- charts and their tables */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <MeasurePanel
                    id="dwell"
                    delay="1"
                    className="lg:col-span-2"
                    split
                    tone="verify"
                    mark={<ClockMark />}
                    eyebrow="How long decisions take"
                    title="Median gate dwell time, in days"
                    note="A gate is a decision with an owner and a window to make it in. The hairline on each bar is that window; a bar that crosses it is a decision the programme took too long over."
                    summary={
                      <ToneChip tone={gatesInside === d.gateDwell.length ? 'verify' : 'hold'}>
                        {num(gatesInside)} of {num(d.gateDwell.length)} gates decided inside their window
                      </ToneChip>
                    }
                    chart={
                      <ul className="flex flex-col gap-1">
                        {d.gateDwell.map((g) => {
                          const over = g.medianDwellDays > g.slaDays;
                          const tone: Tone = over ? 'seal' : 'verify';
                          return (
                            <li key={g.gate} className="swift rounded-control px-3 py-3 hover:bg-sheet">
                              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                                <span className="flex items-center gap-2.5">
                                  <span className="type-register inline-flex items-center rounded-pill border border-rule bg-sheet px-2 py-0.5 text-micro text-ink">
                                    {g.gate}
                                  </span>
                                  <ToneChip tone={tone}>
                                    {over
                                      ? `${num(g.medianDwellDays - g.slaDays)} days over`
                                      : 'Inside the window'}
                                  </ToneChip>
                                </span>
                                <span className="font-display text-h3 text-ink tnum">
                                  {num(g.medianDwellDays)}{' '}
                                  <span className="text-micro font-normal text-ink-soft">days</span>
                                </span>
                              </div>
                              <div className="mt-2.5">
                                <Meter
                                  tone={tone}
                                  value={g.medianDwellDays}
                                  ceiling={dwellCeiling}
                                  benchmark={g.slaDays}
                                  caption={`Window ${num(g.slaDays)} days · ${num(g.clearedCount)} cleared`}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    }
                    table={
                      <table className="w-full border-collapse text-data">
                        <caption className="sr-only">
                          Median gate dwell time in days, against each gate&apos;s decision window
                        </caption>
                        <thead>
                          <tr>
                            <Th>Gate</Th>
                            <Th align="right">Median dwell (days)</Th>
                            <Th align="right">Window (days)</Th>
                            <Th align="right">Cleared</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.gateDwell.map((g) => (
                            <tr key={g.gate} className="ledger-row">
                              <th scope="row" className="type-register px-3 py-2 text-left font-normal text-ink">
                                <span
                                  aria-hidden
                                  className={[
                                    'mr-2.5 inline-block h-2 w-2 rounded-pill align-middle',
                                    g.medianDwellDays > g.slaDays ? FILL.seal : FILL.verify,
                                  ].join(' ')}
                                />
                                {g.gate}
                              </th>
                              <td className="px-3 py-2 text-right text-ink tnum">{num(g.medianDwellDays)}</td>
                              <td className="px-3 py-2 text-right text-ink tnum">{num(g.slaDays)}</td>
                              <td className="px-3 py-2 text-right text-ink tnum">{num(g.clearedCount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    }
                  />

                  <MeasurePanel
                    id="funnel"
                    delay="2"
                    tone="verify"
                    mark={<FunnelMark />}
                    eyebrow="Who gets through"
                    title="Applicant funnel"
                    note="Each bar is measured against the applications received, so the narrowing is the story rather than the raw counts."
                    summary={
                      <ToneChip tone="verify">{share(funnelEnd, funnelTop)} of applications reached a pilot</ToneChip>
                    }
                    chart={
                      <ul className="flex flex-col gap-1">
                        {d.funnel.map((f, i) => {
                          const previous = i > 0 ? d.funnel[i - 1] : null;
                          const last = i === d.funnel.length - 1;
                          return (
                            <li key={f.stage} className="relative pl-10">
                              {/* The stages are one path, so the steps are joined. */}
                              {last ? null : (
                                <span aria-hidden className="absolute bottom-0 left-3.5 top-9 w-px bg-rule" />
                              )}
                              <span
                                aria-hidden
                                className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-pill border border-verify bg-verify-wash font-display text-micro text-verify"
                              >
                                {i + 1}
                              </span>
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <span className="text-body text-ink">{f.stage}</span>
                                <span className="font-display text-h3 text-ink tnum">{num(f.count)}</span>
                              </div>
                              <div className={['mt-2', last ? '' : 'pb-5'].join(' ')}>
                                <Meter
                                  tone="verify"
                                  value={f.count}
                                  ceiling={funnelTop}
                                  caption={`${share(f.count, funnelTop)} of applications received${
                                    previous ? ` · ${num(Math.max(0, previous.count - f.count))} did not go further` : ''
                                  }`}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    }
                    table={
                      <table className="w-full border-collapse text-data">
                        <caption className="sr-only">Applicant funnel, by stage</caption>
                        <thead>
                          <tr>
                            <Th>Stage</Th>
                            <Th align="right">Count</Th>
                            <Th align="right">Share of applications</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.funnel.map((f) => (
                            <tr key={f.stage} className="ledger-row">
                              <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
                                <span
                                  aria-hidden
                                  className={['mr-2.5 inline-block h-2 w-2 rounded-pill align-middle', FILL.verify].join(
                                    ' ',
                                  )}
                                />
                                {f.stage}
                              </th>
                              <td className="px-3 py-2 text-right text-ink tnum">{num(f.count)}</td>
                              <td className="px-3 py-2 text-right text-ink tnum">{share(f.count, funnelTop)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    }
                  />

                  <MeasurePanel
                    id="outcomes"
                    delay="3"
                    tone="hold"
                    mark={<RingMark />}
                    eyebrow="What was proved"
                    title="Pilot outcomes"
                    note="The outer band is every pilot the programme can account for. The thin ring inside it is how many validated pilots went on to a scale-up case."
                    summary={
                      <ToneChip tone="hold">
                        {num(outcomesTotal)} pilots accounted for · {share(validatedOrBetter, outcomesTotal)} validated
                      </ToneChip>
                    }
                    chart={
                      <div className="flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                        <OutcomeRing
                          slices={outcomeRows.map((r) => ({ key: r.outcome, tone: r.tone, count: r.count }))}
                          total={outcomesTotal}
                          innerPercent={scaleUpRate}
                          centreValue={share(validatedOrBetter, outcomesTotal)}
                          centreLabel="validated"
                        />

                        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
                          {outcomeRows.map((r) => (
                            <li
                              key={r.outcome}
                              className={[
                                'flex items-center justify-between gap-3 rounded-control border border-rule border-l-2 px-3 py-2',
                                WASH[r.tone],
                                EDGE[r.tone],
                              ].join(' ')}
                            >
                              <span className="flex min-w-0 items-center gap-2.5 text-body text-ink">
                                <span
                                  aria-hidden
                                  className={['h-2.5 w-2.5 shrink-0 rounded-pill', FILL[r.tone]].join(' ')}
                                />
                                {r.outcome}
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block font-display text-h3 text-ink tnum">{num(r.count)}</span>
                                <span className="block text-micro text-ink-soft tnum">
                                  {share(r.count, outcomesTotal)}
                                </span>
                              </span>
                            </li>
                          ))}
                          <li className="mt-1 flex items-center justify-between gap-3 rounded-control border border-rule border-l-2 border-l-verify px-3 py-2">
                            <span className="flex items-center gap-2.5 text-body text-ink">
                              <span
                                aria-hidden
                                className="h-2.5 w-2.5 shrink-0 rounded-pill border-2 border-verify"
                              />
                              Scale-up rate
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block font-display text-h3 text-ink tnum">
                                {num(d.scaleUpRate.scaled)} of {num(d.scaleUpRate.validated)}
                              </span>
                              <span className="block text-micro text-ink-soft tnum">{percent(scaleUpRate, 0)}</span>
                            </span>
                          </li>
                        </ul>
                      </div>
                    }
                    table={
                      <table className="w-full border-collapse text-data">
                        <caption className="sr-only">Pilot outcomes, with the scale-up rate</caption>
                        <thead>
                          <tr>
                            <Th>Outcome</Th>
                            <Th align="right">Pilots</Th>
                            <Th align="right">Share</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {outcomeRows.map((o) => (
                            <tr key={o.outcome} className="ledger-row">
                              <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
                                <span
                                  aria-hidden
                                  className={[
                                    'mr-2.5 inline-block h-2 w-2 rounded-pill align-middle',
                                    FILL[o.tone],
                                  ].join(' ')}
                                />
                                {o.outcome}
                              </th>
                              <td className="px-3 py-2 text-right text-ink tnum">{num(o.count)}</td>
                              <td className="px-3 py-2 text-right text-ink tnum">{share(o.count, outcomesTotal)}</td>
                            </tr>
                          ))}
                          <tr className="ledger-row">
                            <th scope="row" className="rule-close px-3 py-2 text-left font-normal text-ink">
                              Went on to a scale-up case
                            </th>
                            <td className="rule-close px-3 py-2 text-right text-ink tnum">
                              {num(d.scaleUpRate.scaled)} of {num(d.scaleUpRate.validated)}
                            </td>
                            <td className="rule-close px-3 py-2 text-right text-ink tnum">
                              {share(d.scaleUpRate.scaled, d.scaleUpRate.validated)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    }
                  />

                  <MeasurePanel
                    id="departments"
                    delay="4"
                    className="lg:col-span-2"
                    split
                    tone="open"
                    mark={<RupeeMark />}
                    eyebrow="Where the money went"
                    title="Pilots by department"
                    note="Two measures on one row: how many pilots a department is running, and how much it has committed to them. Money that is committed but not yet released carries the saffron, because it is still open."
                    summary={
                      <ToneChip tone="open">
                        {num(departmentsWithPilots)} of {num(d.pilotsByDepartment.length)} departments have a pilot on
                        the books
                      </ToneChip>
                    }
                    chart={
                      <>
                        <ul aria-hidden className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
                          <li className="flex items-center gap-2 text-micro text-ink-soft">
                            <span className={['h-2.5 w-2.5 rounded-pill', FILL.verify].join(' ')} />
                            Pilots running
                          </li>
                          <li className="flex items-center gap-2 text-micro text-ink-soft">
                            <span className={['h-2.5 w-2.5 rounded-pill', FILL.open].join(' ')} />
                            Committed
                          </li>
                        </ul>
                        {d.pilotsByDepartment.length === 0 ? (
                          <p className="text-body text-ink-soft">No department has a pilot on the books yet.</p>
                        ) : (
                          <ul className="flex flex-col gap-1">
                            {d.pilotsByDepartment.map((p, i) => (
                              <li key={p.department} className="swift rounded-control px-3 py-3 hover:bg-sheet">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                  <span className="flex items-baseline gap-2.5">
                                    <span
                                      aria-hidden
                                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-ledger text-micro text-ink-soft tnum"
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="text-body text-ink">{p.department}</span>
                                  </span>
                                  <span className="text-data text-ink tnum">
                                    {num(p.pilots)} {p.pilots === 1 ? 'pilot' : 'pilots'} · {money(p.committedPaise)}
                                  </span>
                                </div>
                                <div className="mt-2.5 flex flex-col gap-1.5">
                                  <Meter tone="verify" value={p.pilots} ceiling={maxPilots} />
                                  <Meter
                                    tone="open"
                                    value={p.committedPaise}
                                    ceiling={maxCommitted}
                                    caption={`${share(p.committedPaise, committedTotal)} of everything committed to pilots`}
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    }
                    table={
                      <table className="w-full border-collapse text-data">
                        <caption className="sr-only">Pilots and money committed, by department</caption>
                        <thead>
                          <tr>
                            <Th>Department</Th>
                            <Th align="right">Pilots</Th>
                            <Th align="right">Committed</Th>
                            <Th align="right">Share</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.pilotsByDepartment.map((p) => (
                            <tr key={p.department} className="ledger-row">
                              <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
                                <span
                                  aria-hidden
                                  className={[
                                    'mr-2.5 inline-block h-2 w-2 rounded-pill align-middle',
                                    p.pilots > 0 ? FILL.open : FILL.verify,
                                  ].join(' ')}
                                />
                                {p.department}
                              </th>
                              <td className="px-3 py-2 text-right text-ink tnum">{num(p.pilots)}</td>
                              <td className="px-3 py-2 text-right text-ink tnum">{money(p.committedPaise)}</td>
                              <td className="px-3 py-2 text-right text-ink tnum">
                                {share(p.committedPaise, committedTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    }
                  />
                </div>

                {/* --------------------------------------- the detail ledgers */}
                <div className="flex flex-col gap-6">
                  <div className="reveal" data-delay="1">
                    <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                      <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                      The register behind the drawings
                    </p>
                    <p className="max-w-doc text-body text-ink-soft">
                      Every figure above, written out in full with the quantity it is measured against beside it.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="reveal" data-delay="2">
                      <StatLedger
                        headingLevel={2}
                        title="Programme at a glance"
                        rows={[
                          {
                            label: 'Departments participating',
                            value: num(d.headline.departments),
                            detail: `${num(departmentsWithPilots)} of them have at least one pilot on the books`,
                          },
                          {
                            label: 'Open challenges',
                            value: num(d.headline.openProblems),
                            detail: `Accepting applications now, across ${num(d.headline.districts)} districts`,
                          },
                          {
                            label: 'Active pilots',
                            value: num(d.headline.activePilots),
                            detail: `Executing now, out of ${num(totalPilots)} awarded to date`,
                          },
                          {
                            label: 'Startups participating',
                            value: num(d.headline.startups),
                            detail: `${each(d.headline.applications, d.headline.startups)} applications each, on average`,
                          },
                          {
                            label: 'Districts reached',
                            value: num(d.headline.districts),
                            detail: `Across ${num(d.headline.departments)} participating departments`,
                          },
                          {
                            label: 'Applications received',
                            value: num(d.headline.applications),
                            detail: `${share(totalPilots, d.headline.applications)} of them reached a pilot`,
                          },
                        ]}
                        total={{ label: 'Committed to pilots', value: money(d.headline.committedPaise) }}
                      />
                    </div>

                    <div className="reveal" data-delay="3">
                      <StatLedger
                        headingLevel={2}
                        title="How long things take"
                        rows={[
                          {
                            label: 'Publication to award',
                            value: `${num(d.medians.publicationToAwardDays)} days`,
                            detail: `Median across awarded challenges, against ${num(windowTotal)} days of decision window`,
                          },
                          {
                            label: 'Milestone acceptance to payment',
                            value: `${num(d.medians.acceptanceToPaymentDays)} days`,
                            detail: `Median, against a configured ${d.medians.limitDays}-day limit`,
                          },
                          {
                            label: 'Payments made inside the limit',
                            value: percent(d.medians.paymentTimelinessPercent),
                            detail: `Share of paid claims settled within the limit — ${percent(lateShare)} ran past it`,
                          },
                          {
                            label: 'Scale-up rate',
                            value: `${num(d.scaleUpRate.scaled)} of ${num(d.scaleUpRate.validated)}`,
                            detail: `Validated pilots that went on to a scale-up case — ${percent(scaleUpRate, 0)}`,
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------ what is withheld
                    The page closes on the same deep ground it opens on, because
                    restraint is part of the same statement as the figures: this
                    is what is published, and this is what deliberately is not. */}
                <section
                  aria-labelledby="withheld-heading"
                  className="deep deep-field reveal rounded-block px-5 py-8 md:px-8 md:py-10"
                  data-delay="1"
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet bg-deep-3 text-saffron shadow-saffron"
                    >
                      <SealedMark />
                    </span>
                    <div className="min-w-0">
                      <p className="field-label mb-2 flex items-center gap-2 !text-saffron">
                        <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                        Held back on purpose
                      </p>
                      <h2 id="withheld-heading" className="font-display text-h2 text-deep-ink">
                        What is deliberately not published here
                      </h2>
                    </div>
                  </div>

                  <ul className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
                    {WITHHELD.map((item, i) => (
                      <li key={item}>
                        <div className="slab slab-hover flex h-full items-start gap-4 px-5 py-5" data-accent="saffron">
                          <span
                            aria-hidden
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-saffron-veil font-display text-micro text-saffron tnum"
                          >
                            {i + 1}
                          </span>
                          <p className="min-w-0 text-body text-deep-ink">{item}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-7 max-w-doc text-micro text-deep-dim">
                    Aggregate figures are published; the records behind them stay access-controlled and appear in the
                    audit trail when they are opened.
                  </p>
                </section>
              </div>
            );
          }}
        </QueryState>
      </WidgetBoundary>
    </div>
  );
}
