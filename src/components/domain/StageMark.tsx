/**
 * Nine small drawings, one per stage.
 *
 * The how-it-works page had illustration down its left edge — three scenes in
 * the act legend — and nothing down its right, so the run itself read as nine
 * paragraphs of text with a number beside each. These put the thing each stage
 * actually produces next to the sentence describing it: a form with a measured
 * reading on it, a notice pinned up, a stack of applications, a sieve, a scored
 * card, a signed schedule, a meter under observation, a countersigned report, a
 * contract with copies going out.
 *
 * Small on purpose. Each one is about 96×72 and is read at a glance beside a
 * paragraph, not looked at — which is why they are line only, in the product's
 * own stroke weight, with no fills beyond the paper the object sits on. They
 * cost about half a kilobyte each and make no image request.
 *
 * `currentColor` carries the act's ink, so the drawings warm from saffron to
 * green as the reader moves from framing to proving, without a second palette.
 */

const SHEET = { fill: 'var(--sheet)' };
const LEDGER = { fill: 'var(--ledger)' };
const RULE = { stroke: 'var(--rule)' };
const SOFT = { stroke: 'var(--ink-soft)' };
const INK = { stroke: 'var(--ink)' };

function Mark({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 96 72"
      role="img"
      aria-label={label}
      className="block w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** S1 — a reading taken off a meter and written onto a form. */
function StageFraming() {
  return (
    <Mark label="A meter is read and the figure written onto a challenge form.">
      <rect x="46" y="12" width="38" height="48" rx="3" {...SHEET} {...RULE} />
      <rect x="46" y="12" width="38" height="8" rx="3" {...LEDGER} {...RULE} />
      <path d="M53 30h24M53 38h20M53 46h16" {...RULE} />
      <circle cx="24" cy="34" r="15" {...LEDGER} {...INK} />
      <circle cx="24" cy="34" r="9" {...RULE} />
      <path d="M24 34l7-6" strokeWidth={2} />
      <path d="M39 40h8" strokeDasharray="2 3" />
      <path d="m44 37 4 3-4 3" />
    </Mark>
  );
}

/** S2 — the notice, pinned where anyone can read it. */
function StagePublish() {
  return (
    <Mark label="A challenge notice pinned to a public board.">
      <rect x="18" y="10" width="46" height="52" rx="3" {...SHEET} {...INK} />
      <path d="M26 24h30M26 32h30M26 40h22M26 48h26" {...RULE} />
      <circle cx="41" cy="10" r="3.5" {...SHEET} />
      <path d="M72 20v34" {...SOFT} strokeDasharray="3 4" />
      <path d="M68 26h8M68 36h8M68 46h8" {...SOFT} />
    </Mark>
  );
}

/** S3 — applications arriving, one on top of another. */
function StageApply() {
  return (
    <Mark label="Applications arriving from several companies.">
      <rect x="12" y="26" width="40" height="30" rx="3" {...LEDGER} {...RULE} />
      <rect x="18" y="20" width="40" height="30" rx="3" {...SHEET} {...RULE} />
      <rect x="24" y="14" width="40" height="30" rx="3" {...SHEET} {...INK} />
      <path d="M31 24h26M31 31h20" {...RULE} />
      <path d="M74 44v-16" />
      <path d="m68 34 6-6 6 6" />
    </Mark>
  );
}

/** S4 — the sieve: rules run, some pass, some do not. */
function StageScreen() {
  return (
    <Mark label="A rule sieve: some applications pass, some are held.">
      <path d="M22 14h52L54 38v18l-12 6V38Z" {...LEDGER} {...INK} />
      <path d="M28 20h40" {...RULE} />
      <circle cx="24" cy="58" r="5" {...SHEET} />
      <path d="m21.5 58 2 2 4-4.5" strokeWidth={1.8} />
      <circle cx="78" cy="58" r="5" {...SHEET} {...SOFT} />
      <path d="m76 56 4 4M80 56l-4 4" {...SOFT} strokeWidth={1.6} />
    </Mark>
  );
}

/** S5 — a rubric card, scored, with a written reason under each mark. */
function StageScore() {
  return (
    <Mark label="A rubric card with scores and a written reason on each line.">
      <rect x="14" y="10" width="52" height="52" rx="3" {...SHEET} {...INK} />
      <rect x="14" y="10" width="52" height="9" rx="3" {...LEDGER} {...RULE} />
      <path d="M21 29h20M21 41h20M21 53h20" {...RULE} />
      <rect x="46" y="25" width="13" height="8" rx="2" {...LEDGER} />
      <rect x="46" y="37" width="13" height="8" rx="2" {...LEDGER} />
      <rect x="46" y="49" width="13" height="8" rx="2" {...LEDGER} />
      <path d="M76 18v40M70 22l6-6 6 6" {...SOFT} />
    </Mark>
  );
}

/** S6 — a milestone schedule, countersigned. */
function StageContract() {
  return (
    <Mark label="A milestone schedule with a signature across the foot of it.">
      <rect x="16" y="8" width="50" height="56" rx="3" {...SHEET} {...INK} />
      <path d="M24 20h34M24 28h26M24 36h30" {...RULE} />
      <circle cx="26" cy="46" r="2.5" {...LEDGER} />
      <circle cx="38" cy="46" r="2.5" {...LEDGER} />
      <circle cx="50" cy="46" r="2.5" {...LEDGER} />
      <path d="M28.5 46h7M40.5 46h7" {...RULE} />
      <path d="M24 56c4-5 7 3 11-2s7 4 12-2" strokeWidth={1.8} />
      <path d="M74 30a8 8 0 1 1 0 16 8 8 0 0 1 0-16ZM74 46v8l-4-3-4 3v-8" {...SOFT} />
    </Mark>
  );
}

/** S7 — the pilot running, and the readings coming off it. */
function StageRun() {
  return (
    <Mark label="A pilot running, with readings plotted week by week.">
      <path d="M14 58h68" {...INK} strokeWidth={1.8} />
      <path d="M14 58V12" {...INK} strokeWidth={1.8} />
      <path d="M20 24h56" {...SOFT} strokeDasharray="3 4" />
      <path d="M22 20c10 8 16 6 22 14s14 12 32 14" strokeWidth={1.8} />
      <circle cx="22" cy="20" r="2.4" {...SHEET} />
      <circle cx="44" cy="34" r="2.4" {...SHEET} />
      <circle cx="76" cy="48" r="2.4" {...SHEET} />
    </Mark>
  );
}

/** S8 — a report re-derived from the raw records, and sealed. */
function StageValidate() {
  return (
    <Mark label="A validation report re-derived from the raw records and sealed.">
      <rect x="12" y="12" width="34" height="46" rx="3" {...LEDGER} {...RULE} />
      <path d="M18 24h22M18 32h18M18 40h22M18 48h14" {...RULE} />
      <path d="M50 34h10" strokeDasharray="2 3" />
      <path d="m56 31 4 3-4 3" />
      <rect x="62" y="16" width="22" height="30" rx="3" {...SHEET} {...INK} />
      <circle cx="73" cy="54" r="8" strokeWidth={1.8} />
      <path d="m69.5 54 2.5 2.5 4.5-5" strokeWidth={1.8} />
    </Mark>
  );
}

/** S9 — one validated solution, copied out to other departments. */
function StageScale() {
  return (
    <Mark label="A validated solution copied out to other departments.">
      <rect x="10" y="24" width="28" height="26" rx="3" {...SHEET} {...INK} />
      <path d="m17 37 3.5 3.5L28 33" strokeWidth={1.8} />
      <path d="M40 37h12" strokeDasharray="2 3" />
      <path d="M52 37 46 31M52 37l-6 6" />
      <rect x="58" y="10" width="26" height="18" rx="3" {...LEDGER} {...RULE} />
      <rect x="58" y="34" width="26" height="18" rx="3" {...LEDGER} {...RULE} />
      <rect x="58" y="58" width="26" height="10" rx="3" {...LEDGER} {...RULE} />
      <path d="M64 19h14M64 43h14" {...RULE} />
    </Mark>
  );
}

/** In stage order, so `STAGE_MARK[i]` is the mark for `STAGES[i]`. */
export const STAGE_MARK: readonly (() => JSX.Element)[] = [
  StageFraming,
  StagePublish,
  StageApply,
  StageScreen,
  StageScore,
  StageContract,
  StageRun,
  StageValidate,
  StageScale,
];
