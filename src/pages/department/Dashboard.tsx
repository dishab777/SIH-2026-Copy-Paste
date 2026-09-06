import { Link } from 'react-router-dom';
import { useDepartmentDashboard, useSession } from '@/services/hooks';
import { QueryState, WidgetBoundary } from '@/components/layout/QueryState';
import { FreshnessLine, PageHeader } from '@/components/layout/Shell';
import { StatLedger } from '@/components/ledger/Ledger';
import { StatSkeleton, TableSkeleton, EmptyState } from '@/components/ui/Feedback';
import { Badge, type StatusTone } from '@/components/ui/Badge';
import { SlaClock, PaymentAgeingBar } from '@/components/domain/SlaClock';
import { LinkButton } from '@/components/ui/Button';
import { countOf, durationWords, money, moneyScaled, num, percent } from '@/lib/format';
import { readClock, type ClockState } from '@/lib/sla';
import { platformNow } from '@/config/clock';
import { gate, type GateId } from '@/config/gates';
import { can } from '@/config/rbac';
import type { WaitingItem } from '@/types/models';

/* ------------------------------------------------------------------ marks
 * Drawn here rather than pulled from a library, because the product's line
 * weight is one value and an imported set brings its own.
 */
type GlyphName = 'tray' | 'hourglass' | 'ladder' | 'coins' | 'person' | 'arrow' | 'flag' | 'receipt';

const GLYPH: Record<GlyphName, string> = {
  tray: 'M3.5 14h4.3l1.4 2.4h5.6l1.4-2.4h4.3M5.6 5.5h12.8l2.1 8.5v4.4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V14z',
  hourglass:
    'M7.5 3.5h9M7.5 20.5h9M9 3.5v3c0 1.8 3 3.3 3 5.5s-3 3.7-3 5.5v3M15 3.5v3c0 1.8-3 3.3-3 5.5s3 3.7 3 5.5v3',
  ladder: 'M6 3.5v17M18 3.5v17M6 8h12M6 12h12M6 16h12',
  coins:
    'M4 6.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5-3.6 2.5-8 2.5-8-1.1-8-2.5ZM4 6.5v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5M4 11.5v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5',
  person: 'M12 12.2a3.85 3.85 0 1 0 0-7.7 3.85 3.85 0 0 0 0 7.7ZM4.8 20.5a7.2 7.2 0 0 1 14.4 0',
  arrow: 'M5 12h13M13 7l5 5-5 5',
  flag: 'M6 21V3.5M6 4.5h11l-2.2 3.6L17 11.7H6',
  receipt: 'M6 3.5h12v17l-2.5-1.8-2.5 1.8-2.5-1.8L8.5 20.5 6 18.7zM9.5 8.5h5M9.5 12.5h5',
};

function Icon({ name, size = 20 }: { name: GlyphName; size?: number }) {
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
      className="shrink-0"
    >
      <path d={GLYPH[name]} />
    </svg>
  );
}

/* ---------------------------------------------------------------- reading */

/**
 * The instant a case started waiting.
 *
 * The payload counts the wait in whole days, so the moment it began has to be
 * reconstructed before a clock can be read off it. Doing it once per row and
 * handing the result to both the reading and the dial is what stops the two
 * from disagreeing by a tick when the render straddles midnight.
 */
function waitingSince(item: WaitingItem): string {
  return new Date(platformNow().getTime() - item.waitingSinceDays * 86_400_000).toISOString();
}

/*
 * Which gate a case stands at.
 *
 * The dashboard names the gate inside the sentence it writes for the required
 * action rather than as a field of its own, so it is read back out here. An
 * officer's first question on this screen is which decision is being asked of
 * them, and that decision is the gate — the name beside it comes from the gate
 * register in config, never from this file.
 */
const GATE_IN_ACTION = /\b(G[0-6])\b/;

function gateOf(item: WaitingItem): GateId | null {
  const found = GATE_IN_ACTION.exec(item.requiredAction);
  return found ? (found[1] as GateId) : null;
}

/** What kind of thing is waiting, in the word an officer would use for it. */
const STAGE_LABEL: Record<WaitingItem['entityType'], string> = {
  challenge: 'Challenge',
  pilot: 'Pilot',
  application: 'Application',
  payment: 'Payment',
  validation: 'Validation',
};

/*
 * How late a case is, carried as an edge and a wash rather than only as words.
 * The three states are the ones the SLA reader already returns, so the rail on
 * a card and the dial inside it can never tell different stories.
 */
const URGENCY: Record<ClockState, { rail: string; wash: string; words: string; badge: StatusTone }> = {
  overdue: { rail: 'bg-seal', wash: 'from-seal-wash', words: 'Past its window', badge: 'seal' },
  due_soon: { rail: 'bg-hold', wash: 'from-hold-wash', words: 'Close to its window', badge: 'hold' },
  comfortable: { rail: 'bg-verify', wash: 'from-verify-wash', words: 'Inside its window', badge: 'verify' },
};

/* ------------------------------------------------------------- the figures */

type FigureTone = 'verify' | 'hold' | 'seal';

const FIGURE_TONE: Record<FigureTone, { well: string; ink: string; rail: string; wash: string }> = {
  verify: { well: 'border-verify bg-verify-wash text-verify', ink: 'text-verify', rail: 'from-verify', wash: 'from-verify-wash' },
  hold: { well: 'border-hold bg-hold-wash text-hold', ink: 'text-hold', rail: 'from-hold', wash: 'from-hold-wash' },
  seal: { well: 'border-seal bg-seal-wash text-seal', ink: 'text-seal', rail: 'from-seal', wash: 'from-seal-wash' },
};

/**
 * One reading from the morning strip: a drawn mark, the name of the measure,
 * the figure itself and the one sentence that qualifies it. The figure takes
 * the display face because it is read as a quantity rather than as a sentence.
 */
function FigureCard({
  label,
  value,
  detail,
  tone,
  glyph,
}: {
  label: string;
  value: string;
  detail: string;
  tone: FigureTone;
  glyph: GlyphName;
}) {
  const t = FIGURE_TONE[tone];
  return (
    <div
      className={[
        'sheet-flat lift-on-hover relative overflow-hidden rounded-block bg-gradient-to-br to-transparent px-5 py-6',
        t.wash,
      ].join(' ')}
    >
      <span
        aria-hidden
        className={['pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent', t.rail].join(' ')}
      />
      <span
        aria-hidden
        className={[
          'relative flex h-11 w-11 items-center justify-center rounded-sheet border shadow-sheet',
          t.well,
        ].join(' ')}
      >
        <Icon name={glyph} size={22} />
      </span>
      <p className="field-label relative mt-5">{label}</p>
      <p className={['relative mt-1.5 font-display text-figure tnum', t.ink].join(' ')}>{value}</p>
      <p className="relative mt-2 text-micro text-ink-soft">{detail}</p>
    </div>
  );
}

/**
 * The portfolio, drawn.
 *
 * Two concentric rings on one centre: the outer is how much of the money
 * committed has actually left the department, the inner is how much of the book
 * is a running pilot rather than a challenge still open. The rings are a
 * restatement of the ledger printed under them, so the drawing is hidden from a
 * screen reader and the figures beside it are not.
 */
function PortfolioDial({
  committedPaise,
  releasedPaise,
  openChallenges,
  livePilots,
}: {
  committedPaise: number;
  releasedPaise: number;
  openChallenges: number;
  livePilots: number;
}) {
  const releasedShare = committedPaise > 0 ? Math.max(0, Math.min(1, releasedPaise / committedPaise)) : 0;
  const runningShare = openChallenges + livePilots > 0 ? livePilots / (openChallenges + livePilots) : 0;
  const size = 160;
  const rings = [
    { key: 'released', r: 62, colour: 'var(--verify)', portion: releasedShare },
    { key: 'running', r: 46, colour: 'var(--hold)', portion: runningShare },
  ];

  return (
    <div className="sheet-flat relative overflow-hidden rounded-block bg-gradient-to-br from-verify-wash to-transparent px-5 py-6 md:px-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saffron via-verify to-transparent"
      />
      <div className="relative flex flex-wrap items-center gap-6">
        <div aria-hidden className="relative shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} focusable="false">
            {rings.map((ring) => {
              const circumference = 2 * Math.PI * ring.r;
              return (
                <g key={ring.key}>
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={ring.r}
                    fill="none"
                    stroke="var(--ledger)"
                    strokeWidth="12"
                  />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={ring.r}
                    fill="none"
                    stroke={ring.colour}
                    strokeWidth="12"
                    /* A round cap at nothing-yet would draw a dot where no work has been done. */
                    strokeLinecap={ring.portion > 0.02 ? 'round' : 'butt'}
                    strokeDasharray={`${circumference * ring.portion} ${circumference}`}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                </g>
              );
            })}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-figure text-verify tnum">{percent(releasedShare * 100, 0)}</span>
          </span>
        </div>

        <dl className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-verify" />
            <div className="min-w-0">
              <dt className="field-label">Money released</dt>
              <dd className="mt-0.5 text-body text-ink">
                {percent(releasedShare * 100, 0)} of {moneyScaled(committedPaise)} committed
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-hold" />
            <div className="min-w-0">
              <dt className="field-label">Book in flight</dt>
              <dd className="mt-0.5 text-body text-ink">
                {percent(runningShare * 100, 0)} of the book is a running pilot
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** The eyebrow every section on a working page opens with. */
function Eyebrow({ children }: { children: string }) {
  return (
    <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
      <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
      {children}
    </p>
  );
}

export default function DepartmentDashboard() {
  const query = useDepartmentDashboard();
  const session = useSession();
  // A procurement officer shares this portal and cannot frame a challenge.
  // The API refuses either way; offering the act was the only lie.
  const mayCreate = can(session.data?.data.role ?? 'public', 'create', 'challenge');

  return (
    <div>
      <QueryState
        query={query}
        errorTitle="Unable to load your dashboard."
        loading={
          <div className="flex flex-col gap-6">
            <TableSkeleton rows={5} columns={4} />
            <StatSkeleton rows={5} />
          </div>
        }
      >
        {(payload) => {
          const d = payload.data;

          /*
           * The morning reading. Every figure below is derived from the payload
           * with the same clock the rows themselves use — nothing here decides
           * what a limit is, it only counts how many cases are on the wrong
           * side of one.
           */
          const waitingClocks = d.waiting.map((w) => readClock(waitingSince(w), w.slaDays).state);
          const breached = waitingClocks.filter((s) => s === 'overdue').length;
          const nearing = waitingClocks.filter((s) => s === 'due_soon').length;
          const worst: ClockState = breached > 0 ? 'overdue' : nearing > 0 ? 'due_soon' : 'comfortable';
          const oldest = d.waiting.reduce<WaitingItem | null>(
            (found, w) => (found && found.waitingSinceDays >= w.waitingSinceDays ? found : w),
            null,
          );
          const gatesOpen = d.gateDwell.reduce((sum, g) => sum + g.openCases, 0);
          const gatesBlocked = d.gateDwell.reduce((sum, g) => sum + g.blockedCases, 0);
          const urgencyTone: FigureTone =
            worst === 'overdue' ? 'seal' : worst === 'due_soon' ? 'hold' : 'verify';

          return (
            <div className="flex flex-col gap-10">
              <div>
                <PageHeader
                  eyebrow="Department desk"
                  title={d.department.shortName}
                  lead="Sorted by how close each case is to breaching its decision window. The oldest waiting case is first, not the newest."
                  aside={
                    <>
                      {breached > 0 ? (
                        <Badge tone="seal" ground="deep">
                          {countOf(breached, 'case')} past the limit
                        </Badge>
                      ) : null}
                      {mayCreate ? (
                        <LinkButton tone="primary" to="/d/challenges/new/problem">
                          Create a challenge
                        </LinkButton>
                      ) : null}
                    </>
                  }
                />

                {/*
                 * What needs you today, and how late it is — answered in four
                 * figures before a single row is read.
                 */}
                <section
                  aria-label="Where the department stands this morning"
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
                >
                  <FigureCard
                    glyph="tray"
                    tone={urgencyTone}
                    label="Cases waiting on you"
                    value={num(d.waiting.length)}
                    detail={
                      d.waiting.length === 0
                        ? 'Nothing is with this department'
                        : `${num(breached)} past the limit · ${num(nearing)} close to it`
                    }
                  />
                  <FigureCard
                    glyph="hourglass"
                    tone={urgencyTone}
                    label="Oldest wait"
                    value={oldest ? durationWords(oldest.waitingSinceDays) : 'None'}
                    detail={oldest ? `${oldest.caseId} · ${STAGE_LABEL[oldest.entityType]}` : 'No case is waiting'}
                  />
                  <FigureCard
                    glyph="ladder"
                    tone={gatesBlocked > 0 ? 'seal' : 'verify'}
                    label="Gates open"
                    value={num(gatesOpen)}
                    detail={
                      gatesBlocked > 0 ? `${countOf(gatesBlocked, 'case')} blocked at a gate` : 'None blocked at a gate'
                    }
                  />
                  <FigureCard
                    glyph="coins"
                    tone="verify"
                    label="Committed to pilots"
                    value={moneyScaled(d.portfolio.committedPaise)}
                    detail={`${countOf(d.portfolio.livePilots, 'live pilot')} · ${moneyScaled(
                      d.portfolio.releasedPaise,
                    )} released`}
                  />
                </section>

                <FreshnessLine servedAt={payload.servedAt} onRefresh={() => void query.refetch()} />
              </div>

              {/* Who is waiting on you, before anything else. */}
              <section aria-labelledby="waiting-heading">
                <Eyebrow>Your desk today</Eyebrow>
                <h2 id="waiting-heading" className="mb-5 font-display text-h2 text-ink">
                  Who is waiting on you
                </h2>
                {d.waiting.length === 0 ? (
                  <EmptyState
                    title="Nothing is waiting on you."
                    body="Every case in this department is with someone else, or inside its decision window with time to spare."
                    action={{ label: 'Look at the pipeline', to: '/d/challenges' }}
                  />
                ) : (
                  <ul className="flex flex-col gap-4">
                    {d.waiting.map((w) => {
                      const since = waitingSince(w);
                      const clock = readClock(since, w.slaDays);
                      const urgency = URGENCY[clock.state];
                      const standingAt = gateOf(w);
                      const owner = w.ownerName.trim() ? w.ownerName : 'Not yet assigned';
                      return (
                        <li key={w.id} className="panel-in">
                          <Link
                            to={w.href}
                            className={[
                              'sheet-flat lift-on-hover relative block overflow-hidden rounded-block bg-gradient-to-r to-transparent px-5 py-5 no-underline md:px-6',
                              urgency.wash,
                            ].join(' ')}
                          >
                            {/* The edge a case is picked up by: how late it is, before a word is read. */}
                            <span
                              aria-hidden
                              className={['pointer-events-none absolute inset-y-0 left-0 w-1.5', urgency.rail].join(' ')}
                            />

                            <div className="relative pl-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="type-register inline-flex items-center rounded-pill border border-rule bg-sheet px-3 py-0.5 text-micro text-ink-soft">
                                  {w.caseId}
                                </span>
                                {standingAt ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-pill border border-verify bg-verify-wash px-3 py-0.5 text-micro text-verify">
                                    <Icon name="flag" size={13} />
                                    {standingAt} · {gate(standingAt).name}
                                  </span>
                                ) : null}
                                <span className="inline-flex items-center rounded-pill border border-rule bg-ledger px-3 py-0.5 text-micro text-ink-soft">
                                  {STAGE_LABEL[w.entityType]}
                                </span>
                                <span className="md:ml-auto">
                                  <Badge tone={urgency.badge}>{urgency.words}</Badge>
                                </span>
                              </div>

                              <p className="mt-3 max-w-doc font-display text-h3 text-ink">{w.title}</p>
                              <p className="mt-1.5 max-w-doc text-body text-ink-soft">{w.requiredAction}</p>

                              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4">
                                <SlaClock startedOn={since} limitDays={w.slaDays} showDetail />
                                <div className="flex flex-wrap items-center gap-5">
                                  <span className="inline-flex items-center gap-2 text-micro text-ink-soft">
                                    <Icon name="person" size={15} />
                                    Waits on {owner}
                                  </span>
                                  {w.amountPaise ? (
                                    <span className="font-display text-h3 text-ink tnum">{money(w.amountPaise)}</span>
                                  ) : null}
                                  <span className="inline-flex items-center gap-1.5 text-micro font-semibold text-verify">
                                    Open the case
                                    <Icon name="arrow" size={14} />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Where the department is stuck. */}
                <section aria-labelledby="dwell-heading">
                  <Eyebrow>Where cases sit</Eyebrow>
                  <h2 id="dwell-heading" className="font-display text-h2 text-ink">
                    Gate dwell ledger
                  </h2>
                  <p className="mb-5 mt-2 max-w-doc text-body text-ink-soft">
                    Where cases are sitting, and for how long against the configured decision window.
                  </p>
                  <WidgetBoundary label="the gate dwell ledger">
                    <div className="sheet-flat overflow-hidden rounded-block">
                      <div className="field-label grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b-2 border-b-verify bg-verify-wash px-5 py-3 !text-verify">
                        <span>Gate</span>
                        <span>Open cases</span>
                        <span className="text-right">Median dwell</span>
                        <span className="text-right">Window</span>
                      </div>
                      <ul>
                        {d.gateDwell.map((g) => {
                          const over = g.medianDwellDays > g.slaDays;
                          const used = Math.min(100, (g.medianDwellDays / Math.max(1, g.slaDays)) * 100);
                          return (
                            <li
                              key={g.gate}
                              className={[
                                'ledger-row grid grid-cols-[auto_1fr_auto_auto] items-start gap-4 border-l-2 bg-gradient-to-r to-transparent px-5 py-3.5',
                                over
                                  ? 'border-l-seal from-seal-wash'
                                  : g.blockedCases > 0
                                    ? 'border-l-hold from-hold-wash'
                                    : 'border-l-transparent',
                              ].join(' ')}
                            >
                              <span className="font-display text-data text-ink tnum">{g.gate}</span>
                              <span className="min-w-0">
                                <span className="flex flex-wrap items-center gap-2 text-body text-ink">
                                  {g.openCases} open
                                  {g.blockedCases > 0 ? <Badge tone="seal">{g.blockedCases} blocked</Badge> : null}
                                </span>
                                {/* Dwell against the window, drawn — the figures beside it say the same thing. */}
                                <span
                                  aria-hidden
                                  className="mt-2 block h-1.5 w-full overflow-hidden rounded-pill bg-ledger"
                                >
                                  <span
                                    className={[
                                      'block h-full rounded-pill',
                                      over ? 'bg-seal' : used > 70 ? 'bg-hold' : 'bg-verify',
                                    ].join(' ')}
                                    style={{ width: `${used}%` }}
                                  />
                                </span>
                                <span className="mt-1.5 block text-micro text-ink-soft">{gate(g.gate).name}</span>
                              </span>
                              <span className="text-right text-data text-ink tnum">
                                {g.medianDwellDays > 0 ? `${g.medianDwellDays} days` : '—'}
                              </span>
                              <span className="text-right text-data text-ink-soft tnum">{g.slaDays} days</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </WidgetBoundary>
                </section>

                <section aria-labelledby="portfolio-heading">
                  <Eyebrow>The department&rsquo;s book</Eyebrow>
                  <h2 id="portfolio-heading" className="font-display text-h2 text-ink">
                    Portfolio
                  </h2>
                  <p className="mb-5 mt-2 max-w-doc text-body text-ink-soft">
                    What this department has open, what is running, and how much of the money committed has actually
                    left it.
                  </p>
                  <div className="flex flex-col gap-4">
                    <PortfolioDial
                      committedPaise={d.portfolio.committedPaise}
                      releasedPaise={d.portfolio.releasedPaise}
                      openChallenges={d.portfolio.openChallenges}
                      livePilots={d.portfolio.livePilots}
                    />
                    <StatLedger
                      rows={[
                        { label: 'Open challenges', value: num(d.portfolio.openChallenges) },
                        { label: 'Live pilots', value: num(d.portfolio.livePilots) },
                        { label: 'Committed to pilots', value: money(d.portfolio.committedPaise) },
                        { label: 'Released to date', value: money(d.portfolio.releasedPaise) },
                      ]}
                      total={{
                        label: 'Outstanding commitment',
                        value: money(d.portfolio.committedPaise - d.portfolio.releasedPaise),
                      }}
                    />
                  </div>
                </section>
              </div>

              {/* Money owed, always within one screen. */}
              <section aria-labelledby="payment-heading">
                <Eyebrow>Money owed</Eyebrow>
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h2 id="payment-heading" className="font-display text-h2 text-ink">
                    Payment risk
                  </h2>
                  {/* This is the way out of the summary and into the ledger
                      where the money is actually approved, so it is sized like
                      a control rather than like a caption. */}
                  <Link
                    to="/d/payments"
                    className="btn-primary press inline-flex h-11 items-center gap-2.5 rounded-pill px-6 text-body font-semibold text-white no-underline"
                  >
                    <Icon name="receipt" size={18} />
                    Open the payment ledger
                  </Link>
                </div>
                <p className="mb-5 mt-2 max-w-doc text-body text-ink-soft">
                  Claims approaching or past the configured {d.limitDays}-day payment limit. The clock started on
                  acceptance, not on invoice.
                </p>
                {d.paymentRisk.length === 0 ? (
                  <EmptyState
                    title="No claims are outstanding."
                    body="Accepted milestones raise a claim automatically, and the ageing clock starts the same day."
                  />
                ) : (
                  <ul className="sheet-flat overflow-hidden rounded-block">
                    {d.paymentRisk.map((p) => {
                      const state: ClockState = p.claim.paidOn
                        ? 'comfortable'
                        : readClock(p.claim.acceptedOn, d.limitDays).state;
                      const urgency = URGENCY[state];
                      return (
                        <li
                          key={p.claim.id}
                          className={[
                            'ledger-row border-l-2 bg-gradient-to-r to-transparent px-5 py-4',
                            state === 'overdue'
                              ? 'border-l-seal'
                              : state === 'due_soon'
                                ? 'border-l-hold'
                                : 'border-l-verify',
                            urgency.wash,
                          ].join(' ')}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-5">
                            <div className="min-w-0">
                              <p className="font-display text-h3 text-ink">{p.startup.tradeName}</p>
                              <p className="type-register mt-0.5 text-micro text-ink-soft">{p.claim.caseId}</p>
                              <p className="mt-2">
                                <span className="inline-flex items-center rounded-pill border border-rule bg-sheet px-3 py-0.5 text-micro text-ink-soft">
                                  {p.claim.approvalStep}
                                </span>
                              </p>
                              {p.claim.holdReason ? (
                                <p className="mt-2 max-w-doc rounded-control border-l-2 border-l-seal bg-seal-wash px-3 py-2 text-micro text-ink">
                                  Held by {p.claim.heldBy}: {p.claim.holdReason}
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0">
                              <PaymentAgeingBar
                                acceptedOn={p.claim.acceptedOn}
                                limitDays={d.limitDays}
                                amountPaise={p.claim.amountPaise}
                                deductionPaise={p.claim.deductionPaise}
                                paidOn={p.claim.paidOn}
                                reference={p.claim.paymentReference}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
