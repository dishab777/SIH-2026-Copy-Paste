import { readClock, clockMarkerClass, clockWashClass, type ClockState } from '@/lib/sla';
import { day, money } from '@/lib/format';

export interface SlaClockProps {
  startedOn: string;
  limitDays: number;
  /** Adds the acceptance date and the day-of-limit reading. Required on money. */
  showDetail?: boolean;
  label?: string;
  compact?: boolean;
}

/** The ink a clock reads in. Never colour alone — the words say it too. */
const CLOCK_INK: Record<ClockState, string> = {
  comfortable: 'text-verify',
  due_soon: 'text-hold',
  overdue: 'text-seal',
};

/**
 * The dial. A ring drawn as one SVG arc, filled clockwise by how much of the
 * window has been used — so "day 8 of 15" is a shape before it is a sentence,
 * and a column of claims can be scanned without reading a single number.
 *
 * It is decorative: the words beside it carry the whole meaning, which is what
 * makes this safe on a monochrome print and for a reader who cannot separate
 * the three inks.
 */
function Dial({ fraction, state, size = 26 }: { fraction: number; state: ClockState; size?: number }) {
  const r = size / 2 - 2.5;
  const c = 2 * Math.PI * r;
  const used = Math.max(0, Math.min(1, fraction));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      focusable="false"
      className={['shrink-0', CLOCK_INK[state]].join(' ')}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth="2.5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${c * used} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/**
 * One clock for every deadline. It always says the words — "Due in 4 days",
 * never "4d" — and carries a drawn dial beside them, so the state is legible at
 * a glance, survives a monochrome print, and never depends on colour alone.
 */
export function SlaClock({ startedOn, limitDays, showDetail, label, compact }: SlaClockProps) {
  const reading = readClock(startedOn, limitDays);
  const tone: ClockState = reading.state;
  const used = Math.max(0, reading.daysElapsed) / Math.max(1, limitDays);

  return (
    <span
      className={[
        'inline-flex items-center gap-2.5 rounded-pill border-l-2 py-1 pl-2 pr-3',
        clockMarkerClass(tone),
        tone !== 'comfortable' ? clockWashClass(tone) : '',
      ].join(' ')}
    >
      {compact ? null : <Dial fraction={used} state={tone} />}
      <span className="inline-flex flex-col">
        <span className={['text-data font-semibold', CLOCK_INK[tone]].join(' ')}>
          {label ? `${label} — ` : ''}
          {reading.words}
        </span>
        {showDetail && !compact ? (
          <span className="text-micro text-ink-soft tnum">
            Day {Math.max(0, reading.daysElapsed)} of {limitDays}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export interface PaymentAgeingBarProps {
  acceptedOn: string;
  limitDays: number;
  amountPaise: number;
  deductionPaise?: number;
  paidOn?: string;
  reference?: string;
}

/**
 * Payment ageing is never hidden. The bar shows acceptance date, configured
 * limit, current age and what is left — in words and in figures.
 */
export function PaymentAgeingBar({
  acceptedOn,
  limitDays,
  amountPaise,
  deductionPaise = 0,
  paidOn,
  reference,
}: PaymentAgeingBarProps) {
  const reading = readClock(acceptedOn, limitDays, paidOn ? new Date(paidOn) : undefined);
  const pct = Math.max(0, Math.min(1, reading.daysElapsed / Math.max(1, limitDays)));
  const over = reading.daysRemaining < 0;

  return (
    <div className="min-w-[220px]">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-2.5">
          <Dial fraction={pct} state={paidOn ? 'comfortable' : reading.state} size={30} />
          <span className="text-micro text-ink-soft">
            Accepted {day(acceptedOn)}
            <span className="block tnum">
              day {Math.max(0, reading.daysElapsed)} of {limitDays}
            </span>
          </span>
        </span>
        {/* The amount is what the clock is about, so it is set as a figure. */}
        <span
          className={[
            'font-display text-h3 tnum',
            paidOn ? 'text-verify' : over ? 'text-seal' : 'text-ink',
          ].join(' ')}
        >
          {money(amountPaise - deductionPaise)}
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-ledger"
        role="img"
        aria-label={
          paidOn
            ? `Paid on ${day(paidOn)} after ${reading.daysElapsed} days`
            : `${reading.words}, day ${Math.max(0, reading.daysElapsed)} of ${limitDays}`
        }
      >
        <div
          className={[
            'h-full rounded-pill',
            paidOn ? 'bg-verify' : over ? 'bg-seal' : pct > 0.7 ? 'bg-hold' : 'bg-verify',
          ].join(' ')}
          style={{ width: `${Math.min(100, pct * 100)}%` }}
        />
      </div>
      <p className={['mt-2 text-micro', over && !paidOn ? 'font-semibold text-seal' : 'text-ink-soft'].join(' ')}>
        {paidOn ? `Paid ${day(paidOn)}${reference ? ` · ${reference}` : ''}` : reading.words}
        {deductionPaise > 0 ? ` · ${money(deductionPaise)} deducted` : ''}
      </p>
    </div>
  );
}
