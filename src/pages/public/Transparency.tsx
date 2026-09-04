import type { ReactNode } from 'react';
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

/** The well an icon sits in: a wash of its own ink, with the ink on top. */
const WELL: Record<Tone, string> = {
  verify: 'bg-verify-wash text-verify',
  hold: 'bg-hold-wash text-hold',
  seal: 'bg-seal-wash text-seal',
  open: 'bg-saffron text-deep',
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

/* ------------------------------------------------------------- primitives */

/**
 * A headline figure: the mark, the small label, the quantity at display size,
 * and — the part that makes it mean anything — what it should be measured
 * against. A number without its comparison is a decoration.
 */
function FigureCard({
  mark,
  tone,
  label,
  value,
  unit,
  against,
  delay,
}: {
  mark: ReactNode;
  tone: Tone;
  label: string;
  value: string;
  unit?: string;
  against: string;
  delay: string;
}) {
  return (
    <div className="sheet reveal lift-on-hover relative overflow-hidden rounded-block px-5 py-6" data-delay={delay}>
      <span
        aria-hidden
        className={['pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r', RAIL[tone]].join(' ')}
      />
      <span
        aria-hidden
        className={['mb-4 flex h-11 w-11 items-center justify-center rounded-sheet shadow-sheet', WELL[tone]].join(' ')}
      >
        {mark}
      </span>
      <dt className="field-label">{label}</dt>
      <dd className="mt-2 flex flex-wrap items-baseline gap-x-2 font-display text-display text-ink tnum">
        {value}
        {unit ? <span className="text-h3 font-normal text-ink-soft">{unit}</span> : null}
      </dd>
      <dd className="mt-2 text-micro text-ink-soft">{against}</dd>
    </div>
  );
}

/**
 * A measure and the table it comes from, in one panel.
 *
 * The chart is never the record. Whatever is drawn here, the numbers behind it
 * are printed beside it on the same screen — which is the promise this page
 * makes and the reason a reader can check it rather than trust it.
 */
function MeasurePanel({
  id,
  mark,
  tone,
  eyebrow,
  title,
  note,
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
        'sheet reveal relative overflow-hidden rounded-block px-5 py-6 md:px-6 md:py-7',
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
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet shadow-sheet',
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
          <p className="mt-2 max-w-[64ch] text-body text-ink-soft">{note}</p>
        </div>
      </div>

      <div className={['mt-6 grid grid-cols-1 gap-6', split ? 'lg:grid-cols-2' : ''].join(' ')}>
        <div className="min-w-0">{chart}</div>
        <div className="min-w-0">
          <p className="field-label mb-3">The numbers behind it</p>
          <div className="overflow-x-auto scroll-quiet">{table}</div>
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
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <WidgetBoundary label="the transparency figures">
        <QueryState query={query} errorTitle="Unable to load programme figures." loading={<StatSkeleton rows={8} />}>
          {(payload) => {
            const d = payload.data;

            /* Every comparison on this page is arithmetic on the payload. Nothing
               statutory is written here: the payment limit and the seven decision
               windows arrive already configured. */
            const windowTotal = d.gateDwell.reduce((s, g) => s + g.slaDays, 0);
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
            const perPilot = totalPilots > 0 ? moneyScaled(d.headline.committedPaise / totalPilots) : '—';

            const dwellCeiling = Math.max(1, ...d.gateDwell.map((g) => Math.max(g.medianDwellDays, g.slaDays)));
            const funnelTop = d.funnel.length > 0 ? d.funnel[0].count : 0;
            const outcomesTotal = d.pilotOutcomes.reduce((s, o) => s + o.count, 0);
            // "Validated" and "validated with qualifications" are both a pilot
            // that proved itself, so the centre of the ring counts them together.
            const validatedOrBetter = d.pilotOutcomes
              .filter((o) => o.outcome.startsWith('Validated'))
              .reduce((s, o) => s + o.count, 0);
            const maxPilots = Math.max(1, ...d.pilotsByDepartment.map((p) => p.pilots));
            const maxCommitted = Math.max(1, ...d.pilotsByDepartment.map((p) => p.committedPaise));

            /* The donut. Ink by meaning where the outcome is one the product
               already has an ink for, and by position only as a last resort. */
            const OUTCOME_TONE: Partial<Record<string, Tone>> = {
              Validated: 'verify',
              'Validated with qualifications': 'hold',
              'Not validated': 'seal',
              'Still running': 'open',
            };
            const ORDER: readonly Tone[] = ['verify', 'hold', 'seal', 'open'];
            const RADIUS = 74;
            const CIRC = 2 * Math.PI * RADIUS;
            const INNER_RADIUS = 48;
            const INNER_CIRC = 2 * Math.PI * INNER_RADIUS;

            let cursor = 0;
            const arcs = d.pilotOutcomes.map((o, i) => {
              const tone = OUTCOME_TONE[o.outcome] ?? ORDER[i % ORDER.length];
              const length = outcomesTotal > 0 ? (o.count / outcomesTotal) * CIRC : 0;
              const arc = { key: o.outcome, tone, length, offset: cursor };
              cursor += length;
              return arc;
            });

            return (
              <div className="flex flex-col gap-10">
                {/* ------------------------------------------------ the strip */}
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FigureCard
                    delay="1"
                    tone={d.medians.publicationToAwardDays <= windowTotal ? 'verify' : 'hold'}
                    mark={<ClockMark />}
                    label="Publication to award"
                    value={num(d.medians.publicationToAwardDays)}
                    unit="days"
                    against={`Median across awarded challenges. The seven decision windows allow ${num(windowTotal)} days between them.`}
                  />
                  <FigureCard
                    delay="2"
                    tone={d.medians.acceptanceToPaymentDays <= d.medians.limitDays ? 'verify' : 'seal'}
                    mark={<ClockMark />}
                    label="Acceptance to payment"
                    value={num(d.medians.acceptanceToPaymentDays)}
                    unit="days"
                    against={`Median for a milestone that has been accepted, against a configured ${num(d.medians.limitDays)}-day limit.`}
                  />
                  <FigureCard
                    delay="3"
                    tone={lateShare > 0 ? 'hold' : 'verify'}
                    mark={<RingMark />}
                    label="Paid inside the limit"
                    value={percent(d.medians.paymentTimelinessPercent)}
                    against={`Share of paid claims settled within the limit. The remaining ${percent(lateShare)} ran past it.`}
                  />
                  <FigureCard
                    delay="4"
                    tone="open"
                    mark={<RupeeMark />}
                    label="Committed to pilots"
                    value={committedFigure}
                    unit={committedUnit.join(' ')}
                    against={`Promised and not yet fully released, across ${num(totalPilots)} pilots — about ${perPilot} each.`}
                  />
                </dl>

                <div className="-mt-4 flex justify-end">
                  <FreshnessLine servedAt={payload.servedAt} onRefresh={() => void query.refetch()} />
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
                    chart={
                      <ul className="flex flex-col gap-4">
                        {d.gateDwell.map((g) => {
                          const over = g.medianDwellDays > g.slaDays;
                          return (
                            <li key={g.gate}>
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="type-register text-label text-ink">{g.gate}</span>
                                <span className="text-data text-ink tnum">{num(g.medianDwellDays)} days</span>
                              </div>
                              <div className="relative mt-1.5 h-2.5 w-full rounded-pill bg-ledger">
                                <div
                                  className={['h-full rounded-pill', over ? FILL.seal : FILL.verify].join(' ')}
                                  style={{ width: `${(g.medianDwellDays / dwellCeiling) * 100}%` }}
                                />
                                <span
                                  aria-hidden
                                  className="absolute -inset-y-1 w-px bg-ink"
                                  style={{ left: `${(g.slaDays / dwellCeiling) * 100}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-micro text-ink-soft">
                                {over
                                  ? `Past the ${g.slaDays}-day decision window by ${g.medianDwellDays - g.slaDays} days`
                                  : `Inside the ${g.slaDays}-day decision window`}
                                {` · ${num(g.clearedCount)} cleared`}
                              </p>
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
                    chart={
                      <ul className="flex flex-col gap-4">
                        {d.funnel.map((f, i) => {
                          const previous = i > 0 ? d.funnel[i - 1] : null;
                          return (
                            <li key={f.stage}>
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="text-body text-ink">{f.stage}</span>
                                <span className="text-data text-ink tnum">{num(f.count)}</span>
                              </div>
                              <div className="mt-1.5 h-2.5 w-full rounded-pill bg-ledger">
                                <div
                                  className="h-full rounded-pill bg-gradient-to-r from-verify to-signal"
                                  style={{ width: `${funnelTop > 0 ? (f.count / funnelTop) * 100 : 0}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-micro text-ink-soft">
                                {share(f.count, funnelTop)} of applications received
                                {previous ? ` · ${num(Math.max(0, previous.count - f.count))} did not go further` : ''}
                              </p>
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
                    note="The outer ring is every pilot the programme can account for. The inner ring is how many validated pilots went on to a scale-up case."
                    chart={
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="relative shrink-0">
                          <svg
                            width="192"
                            height="192"
                            viewBox="0 0 192 192"
                            role="img"
                            focusable="false"
                            aria-label={`Pilot outcomes: ${d.pilotOutcomes
                              .map((o) => `${o.outcome} ${num(o.count)}`)
                              .join(', ')}`}
                          >
                            <circle cx="96" cy="96" r={RADIUS} fill="none" stroke="var(--ledger)" strokeWidth="20" />
                            {arcs.map((a) => (
                              <circle
                                key={a.key}
                                cx="96"
                                cy="96"
                                r={RADIUS}
                                fill="none"
                                stroke={STROKE[a.tone]}
                                strokeWidth="20"
                                strokeDasharray={`${a.length} ${Math.max(0, CIRC - a.length)}`}
                                strokeDashoffset={-a.offset}
                                transform="rotate(-90 96 96)"
                              />
                            ))}
                            <circle
                              cx="96"
                              cy="96"
                              r={INNER_RADIUS}
                              fill="none"
                              stroke="var(--rule)"
                              strokeWidth="8"
                            />
                            <circle
                              cx="96"
                              cy="96"
                              r={INNER_RADIUS}
                              fill="none"
                              stroke="var(--verify)"
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={`${(scaleUpRate / 100) * INNER_CIRC} ${INNER_CIRC}`}
                              transform="rotate(-90 96 96)"
                            />
                          </svg>
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                          >
                            <span className="font-display text-h1 text-ink tnum">
                              {share(validatedOrBetter, outcomesTotal)}
                            </span>
                            <span className="field-label mt-1">validated</span>
                          </div>
                        </div>

                        <ul className="flex min-w-0 flex-col gap-2.5">
                          {arcs.map((a) => (
                            <li key={a.key} className="flex items-center gap-2.5 text-body text-ink">
                              <span
                                aria-hidden
                                className={['h-2.5 w-2.5 shrink-0 rounded-pill', FILL[a.tone]].join(' ')}
                              />
                              {a.key}
                            </li>
                          ))}
                          <li className="mt-1 flex items-center gap-2.5 border-t border-rule pt-3 text-body text-ink">
                            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-pill border-2 border-verify" />
                            Scale-up rate
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
                          {d.pilotOutcomes.map((o) => (
                            <tr key={o.outcome} className="ledger-row">
                              <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
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
                          <ul className="flex flex-col gap-4">
                            {d.pilotsByDepartment.map((p) => (
                              <li key={p.department}>
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="text-body text-ink">{p.department}</span>
                                  <span className="text-data text-ink tnum">
                                    {num(p.pilots)} · {money(p.committedPaise)}
                                  </span>
                                </div>
                                <div className="mt-1.5 h-2 w-full rounded-pill bg-ledger">
                                  <div
                                    className={['h-full rounded-pill', FILL.verify].join(' ')}
                                    style={{ width: `${(p.pilots / maxPilots) * 100}%` }}
                                  />
                                </div>
                                <div className="mt-1 h-2 w-full rounded-pill bg-ledger">
                                  <div
                                    className={['h-full rounded-pill', FILL.open].join(' ')}
                                    style={{ width: `${(p.committedPaise / maxCommitted) * 100}%` }}
                                  />
                                </div>
                                <p className="mt-1.5 text-micro text-ink-soft">
                                  {share(p.committedPaise, committedTotal)} of everything committed
                                </p>
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
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

                  <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      'Confidential documents and the evidence vault of any pilot',
                      'Private startup information beyond what a company chooses to show on its profile',
                      'Internal evaluator comments and any score before results are released',
                      'Commercially sensitive procurement detail while a pathway decision is live',
                    ].map((item) => (
                      <li
                        key={item}
                        className="rounded-sheet border border-deep-rule border-l-2 border-l-saffron bg-deep-2 px-4 py-4 text-body text-deep-ink"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 max-w-doc text-micro text-deep-dim">
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
