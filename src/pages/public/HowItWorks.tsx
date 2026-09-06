import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { STAGES } from '@/config/stages';
import { GATES, gateSlaDays, type GateId } from '@/config/gates';
import { ROLES } from '@/config/rbac';
import { citationShort } from '@/config/policies';
import { GateFile } from '@/components/domain/GateFile';
import { ACT_SCENE } from '@/components/domain/ActScene';
import { STAGE_MARK } from '@/components/domain/StageMark';
import { SectionRail } from '@/components/patterns/SectionRail';
import { FigureCard, MarkClock, MarkCleared, MarkHold } from '@/components/ledger/FigureCard';
import { usePortalLink } from '@/lib/portal';
import { useReveal } from '@/lib/reveal';
import { countOf, durationWords, num } from '@/lib/format';

/*
 * How it works.
 *
 * The page used to argue "this process is defensible" with two grids of
 * identical cards — nine stage boxes, then seven gate boxes. A grid is a bad
 * drawing of an order: it says these nine things exist, and nothing about the
 * fact that they happen one after another and that seven of the joins are
 * signatures.
 *
 * So the middle of the page is now a single spine. The nine stages are threaded
 * onto one rule, the seven gates cut across it, and the three acts stand beside
 * it as a legend that lights up as you pass through them. Under it, the same
 * process drawn a second way — to scale, on a calendar — because "how long does
 * this actually take" is the question the spine raises and the old page ducked.
 */

/* Framing, running, proving: the three acts a case passes through. */
interface Act {
  key: string;
  title: string;
  lead: string;
  /** Zero-based stage indices, inclusive. */
  from: number;
  to: number;
  /** Read as text on paper, so this is the darkened cut, never the lit one. */
  ink: string;
  glyph: string;
}

const ACTS: readonly Act[] = [
  {
    key: 'framing',
    title: 'Framing the problem',
    lead: 'A department writes down what is wrong, what it costs today, and what it would pay to have be true instead.',
    from: 0,
    to: 2,
    ink: 'var(--saffron-ink)',
    glyph: 'M5 20V4h9l1.6 2.4H19V15h-5l-1.6-2.4H5',
  },
  {
    key: 'choosing',
    title: 'Choosing who runs it',
    lead: 'Rules run against verified facts, experts score against a rubric that was published before anyone applied, and one pilot is awarded.',
    from: 3,
    to: 5,
    ink: 'var(--saffron-ink)',
    glyph: 'M12 3.5 4.5 7v5.5c0 4.2 3.1 7.4 7.5 8.5 4.4-1.1 7.5-4.3 7.5-8.5V7Z',
  },
  {
    key: 'proving',
    title: 'Proving what happened',
    lead: 'The pilot is measured against its own baseline, checked by somebody who does not work for the department, and only then bought.',
    from: 6,
    to: 8,
    ink: 'var(--verify)',
    glyph: 'M4 12.5 9.5 18 20 6.5',
  },
];

function actOf(stageIndex: number): number {
  const i = ACTS.findIndex((a) => stageIndex >= a.from && stageIndex <= a.to);
  return i === -1 ? 0 : i;
}

/** Every gate cleared by the stages in one act, in order, without repeats. */
function gatesOfAct(act: Act): GateId[] {
  const seen: GateId[] = [];
  for (let i = act.from; i <= act.to; i += 1) {
    const g = STAGES[i]?.gate as GateId | undefined;
    if (g && !seen.includes(g)) seen.push(g);
  }
  return seen;
}

function daysOfAct(act: Act): [number, number] {
  let min = 0;
  let max = 0;
  for (let i = act.from; i <= act.to; i += 1) {
    min += STAGES[i]?.typicalDurationDays[0] ?? 0;
    max += STAGES[i]?.typicalDurationDays[1] ?? 0;
  }
  return [min, max];
}

function ownerLabel(ownerRole: string): string {
  return ROLES.find((r) => r.id === ownerRole)?.label ?? ownerRole.replace(/_/g, ' ');
}

/* ------------------------------------------------------------------ marks
 * Drawn here rather than imported, so the page carries no icon set and every
 * glyph sits on the one stroke weight the product uses.
 */
function Glyph({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

/** A small tag under a step. The reference for this page hangs its detail off
    exactly these, and they are the cheapest way to carry four facts in a line. */
function Tag({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'gate' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-micro',
        tone === 'gate' ? 'border-verify bg-verify-wash text-verify' : 'border-rule bg-ledger text-ink-soft',
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export default function HowItWorks() {
  // The toggle switches the copy in place; it does not navigate to a second page.
  const [side, setSide] = useState<'department' | 'startup'>('department');
  const link = usePortalLink();

  /*
   * Which act the reader is currently standing in. The legend beside the run
   * lights the matching card, which is the only thing on the page that reacts
   * to the scroll — and the reason the three cards are a legend rather than a
   * third grid of boxes.
   */
  const runRef = useRef<HTMLOListElement>(null);
  const [liveAct, setLiveAct] = useState(0);
  /* Which gate is open. Gate 3 — award pilot — is the one people arrive
     asking about, so it is the one that is open when they get here. */
  const [gate, setGate] = useState<GateId>('G3');
  useReveal([side, gate]);

  useEffect(() => {
    const root = runRef.current;
    if (!root) return undefined;
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-act]'));
    if (steps.length === 0) return undefined;

    /*
     * The last stage whose top has passed the reading line — not whichever
     * steps happen to intersect a band. An observer was tried first and drifted
     * on a short window: the steps are tall enough that none of them intersects
     * a narrow band, the set empties, and the legend keeps a stale card lit.
     * This cannot go stale, because it is recomputed from position every frame
     * the page moves.
     */
    let frame = 0;
    const measure = (): void => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let current = 0;
      for (const s of steps) {
        if (s.getBoundingClientRect().top <= line) current = Number(s.dataset.act ?? '0');
      }
      setLiveAct(current);
    };
    // One measurement per frame, never one per scroll event.
    const onScroll = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const totalMin = STAGES.reduce((sum, s) => sum + s.typicalDurationDays[0], 0);
  const totalMax = STAGES.reduce((sum, s) => sum + s.typicalDurationDays[1], 0);
  const windowDays = GATES.reduce((sum, g) => sum + gateSlaDays(g.id), 0);

  return (
    <div className="-mx-4 -mt-6 md:-mx-6">
      {/* ------------------------------------------------------------ hero
          The claim, the control that changes whose page this is, and the
          object that makes the claim testable: a real case with its seven
          gates written down it, standing at the fourth. */}
      <section className="deep deep-field full-bleed px-4 pb-16 pt-12 md:px-6">
        <div className="mx-auto grid max-w-shell grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-pill border border-deep-rule bg-deep-2 px-3 py-1 text-chip uppercase tracking-stamp text-saffron">
              Nine stages, seven gates
            </span>
            <h1 className="max-w-[15ch] font-display text-hero text-deep-ink">How a problem becomes a contract.</h1>
            <p className="mt-5 max-w-[56ch] text-lead text-deep-dim">
              A gate is not a status that quietly changes. It is a decision with an owner, a set of preconditions that
              have to be met, and a written reason that stays on the record for as long as the case exists.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={link('/challenges')}
                className="press inline-flex h-12 items-center rounded-pill bg-saffron px-6 text-body font-semibold text-deep no-underline shadow-saffron"
              >
                See what departments need now
              </Link>
              <a
                href="#gates"
                className="swift inline-flex h-12 items-center rounded-pill border border-deep-rule px-6 text-body text-deep-ink no-underline hover:border-saffron hover:text-saffron"
              >
                Read the seven gates
              </a>
            </div>

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

      {/* ------------------------------------------------------------- run
          The three acts as a legend, and the nine stages threaded onto one
          spine that seven decisions cut across. */}
      <section aria-labelledby="run-heading" className="full-bleed border-t border-rule bg-ledger px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <p className="field-label mb-3">The run, end to end</p>
          <h2 id="run-heading" className="max-w-[24ch] font-display text-hero text-ink">
            One line, cut seven times by a signature.
          </h2>
          <p className="mt-4 max-w-doc text-body text-ink-soft">
            Every stage below is somebody&rsquo;s work and every bar across the line is somebody&rsquo;s decision. The
            three cards beside it are the acts those stages fall into; the one you are reading is lit.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-8 wide:grid-cols-[300px_minmax(0,1fr)]">
            {/* The legend. Three objects, and the only cards on this page. */}
            {/* Three across from md, never at sm — `sm` is 360px in this
                product, and three act cards on a phone are 110px wide each. */}
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-3 wide:sticky wide:top-20 wide:grid-cols-1 wide:self-start">
              {ACTS.map((a, i) => {
                const gates = gatesOfAct(a);
                const [min, max] = daysOfAct(a);
                const Scene = ACT_SCENE[i] ?? ACT_SCENE[0];
                return (
                  <li key={a.key}>
                    <a
                      href={`#stage-${a.from + 1}`}
                      data-live={String(i === liveAct)}
                      className="act-card block h-full px-5 py-5 no-underline"
                    >
                      {/* The act, drawn. A process is easier to believe when
                          you can see somebody doing it, and each scene draws
                          the artefact that act actually produces — a measured
                          baseline, a scored rubric, a countersigned seal. */}
                      <span className="mb-4 block overflow-hidden rounded-sheet border border-rule bg-sheet">
                        <Scene />
                      </span>
                      <span className="field-label block">
                        Act {i + 1} of {ACTS.length}
                      </span>
                      <span className="mt-1 block font-display text-h3 text-ink">{a.title}</span>
                      <span className="mt-2 block text-body text-ink-soft">{a.lead}</span>
                      <span className="mt-4 block border-t border-rule pt-3 text-micro text-ink-soft tnum">
                        Stages {a.from + 1}&ndash;{a.to + 1} · {durationWords(min)} to {durationWords(max)} ·{' '}
                        {gates.join(', ')}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>

            {/* The run itself. */}
            <ol ref={runRef} className="run">
              {STAGES.map((s, i) => {
                const copy = side === 'department' ? s.department : s.startup;
                const act = ACTS[actOf(i)]!;
                const gateId = s.gate as GateId;
                // A gate is what a stage ends at, not what it starts from, so
                // the bar is drawn after the last stage that clears it.
                const closes = STAGES[i + 1]?.gate !== s.gate;
                const g = GATES.find((x) => x.id === gateId);
                const StageDrawing = STAGE_MARK[i] ?? STAGE_MARK[0]!;
                return (
                  <li key={s.id} data-act={String(actOf(i))} id={`stage-${s.index}`} className="scroll-mt-24">
                    <div className="reveal flex gap-4 pb-6" data-delay={String((i % 3) + 1)}>
                      <span className="run-mark font-display text-h3 tnum" style={{ color: act.ink }} aria-hidden>
                        {s.index}
                      </span>

                      <div className="min-w-0 flex-1 pt-1.5">
                        <h3 className="font-display text-h3 text-ink">
                          <span className="sr-only">Stage {s.index}. </span>
                          {s.title}
                        </h3>
                        <p className="mt-0.5 text-micro text-ink-soft">{s.actor}</p>

                        <p className="mt-3 max-w-doc font-doc text-body text-ink">{copy.happens}</p>
                        <p className="mt-2 max-w-doc text-body text-ink-soft">
                          <span className="text-ink">Produces:</span> {copy.produces}
                        </p>

                        <ul className="mt-4 flex flex-wrap gap-2">
                          <li>
                            <Tag>
                              <Glyph
                                d="M12 6.5V12l3.5 2M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Z"
                                size={12}
                              />
                              {durationWords(s.typicalDurationDays[0])} to {durationWords(s.typicalDurationDays[1])}
                            </Tag>
                          </li>
                          <li>
                            <Tag>Works towards {gateId}</Tag>
                          </li>
                        </ul>
                      </div>

                      {/* What this stage produces, drawn. The act legend put
                          illustration down the left of the run and the right
                          edge had none, so nine paragraphs ran unbroken. */}
                      <span
                        aria-hidden
                        className="hidden w-24 shrink-0 self-start rounded-sheet border border-rule bg-sheet px-2 py-2 shadow-sheet md:block"
                        style={{ color: act.ink }}
                      >
                        <StageDrawing />
                      </span>
                    </div>

                    {closes && g ? (
                      <div className="reveal flex gap-4 pb-6" data-delay="2">
                        <span
                          className="run-mark type-register text-micro"
                          style={{ color: 'var(--verify)' }}
                          aria-hidden
                        >
                          {g.id}
                        </span>
                        <a
                          href="#gates"
                          onClick={() => setGate(g.id)}
                          className="run-gate group min-w-0 flex-1 px-5 py-4 no-underline"
                          aria-label={`${g.id}: ${g.name}. Read the full gate.`}
                        >
                          <span className="field-label block">
                            Decision · {gateSlaDays(g.id)}-day window · {ownerLabel(g.ownerRole)}
                          </span>
                          <span className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-display text-h3 text-verify">{g.name}</span>
                            <span className="text-micro text-ink-soft underline underline-offset-2 group-hover:text-verify">
                              {countOf(g.preconditions.length, 'precondition')} — read them
                            </span>
                          </span>
                        </a>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- calendar
          The same nine stages drawn a second way: to scale, so the reader can
          see what the whole thing costs in weeks and how little of it is the
          state's own decision windows. */}
      <section aria-labelledby="clock-heading" className="full-bleed border-t border-rule bg-sheet px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <p className="field-label mb-3">What that adds up to</p>
          <h2 id="clock-heading" className="max-w-[24ch] font-display text-hero text-ink">
            The clock the state has put itself on.
          </h2>
          <p className="mt-4 max-w-doc text-body text-ink-soft">
            Every window below is configured, not aspirational: it is the same number the case screens count against,
            and every breach of it is published on the transparency page whether or not anyone asks.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <FigureCard
              label="Typical, end to end"
              value={`${num(Math.round(totalMin / 7))}–${num(Math.round(totalMax / 7))} weeks`}
              detail={`${num(totalMin)} to ${num(totalMax)} days across all nine stages`}
              mark={MarkClock}
            />
            <FigureCard
              label="Of that, decision windows"
              value={`${num(windowDays)} days`}
              detail="the seven gates added together, at the configured limits"
              tone="hold"
              mark={MarkHold}
            />
            <FigureCard
              label="Signatures required"
              value={num(GATES.length)}
              detail="each with a named owner and a written reason"
              tone="verify"
              mark={MarkCleared}
            />
          </div>

          {/*
           * The chart alone. It used to sit beside a nine-row table of the same
           * stages — the third listing of them on this page, after the spine
           * above and the act legend beside it. The chart says the one thing
           * the spine cannot: how long each stage is compared with the others.
           */}
          <div className="mt-10">
            <h3 className="font-display text-h3 text-ink">Nine stages, drawn to scale</h3>
            <p className="mt-1 text-micro text-ink-soft">
              Each segment is one stage, at its longest typical duration. The saffron rules are the seven decisions.
            </p>

            <div className="mt-4">
              <div
                className="span-strip"
                role="img"
                aria-label="The nine stages sized by typical duration, with the seven gate decisions marked"
              >
                {STAGES.map((s) => (
                  <span
                    key={s.id}
                    className="span-seg"
                    data-gate={String(STAGES[s.index]?.gate !== s.gate)}
                    style={{ width: `${(s.typicalDurationDays[1] / totalMax) * 100}%` }}
                    title={`${s.title} — up to ${durationWords(s.typicalDurationDays[1])}`}
                  />
                ))}
              </div>
              <p className="mt-2 flex items-baseline justify-between text-micro text-ink-soft tnum">
                <span>Day 0</span>
                <span>Day {num(totalMax)}</span>
              </p>
            </div>

            <p className="mt-6 max-w-doc text-body text-ink-soft">
              Discovery is the longest segment by a distance, and it is the one part of the run that is deliberately
              slow: a challenge stays open long enough for a company that has never sold to government to find it, read
              the rubric, and decide whether to spend a week on an application.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- gates
          The part people quote, set as a register on the noting margin rather
          than as seven equal boxes — the same surface an officer records a
          real decision on. */}
      <section
        id="gates"
        aria-labelledby="gates-heading"
        className="full-bleed border-t border-rule bg-ledger px-4 py-16 md:px-6 scroll-mt-24"
      >
        <div className="mx-auto max-w-shell">
          <p className="field-label mb-3">The seven gates, in full</p>
          <h2 id="gates-heading" className="max-w-[22ch] font-display text-hero text-ink">
            No role can clear a gate whose preconditions are unmet.
          </h2>
          <p className="mt-4 max-w-doc text-body text-ink-soft">
            That holds for everyone, including a programme administrator. The only route past an unmet precondition is a
            recorded waiver from a higher authority — and a waiver never marks the precondition as met. It sits beside
            it, naming who granted it and why.
          </p>

          <div className="mt-10">
            <SectionRail
              title="The seven gates"
              note="One at a time. All seven in full is a wall of preconditions nobody reads to the end of."
              label="Gate decisions"
              value={gate}
              onChange={(id) => setGate(id as GateId)}
              sections={GATES.map((g) => ({
                id: g.id,
                label: `${g.id} · ${g.name}`,
                detail: ownerLabel(g.ownerRole),
                count: g.preconditions.length,
              }))}
            >
              {GATES.filter((g) => g.id === gate).map((g) => (
                <article key={g.id} id={`gate-${g.id}`} className="sheet-flat overflow-hidden rounded-block scroll-mt-24">
                  <header className="border-b border-ink bg-ledger px-5 py-5 md:px-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="type-register rounded-pill border border-ink px-3 py-0.5 text-micro text-ink">
                          {g.id}
                        </span>
                        <h3 className="font-display text-h2 text-ink">{g.name}</h3>
                      </div>
                      <p className="text-micro text-ink-soft tnum">
                        {ownerLabel(g.ownerRole)} · {gateSlaDays(g.id)}-day window
                      </p>
                    </div>
                    <p className="mt-3 max-w-doc font-doc text-body text-ink">{g.decides}</p>
                  </header>

                  <div className="grid grid-cols-1 gap-8 px-5 py-6 md:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <div>
                      <p className="field-label">
                        {countOf(g.preconditions.length, 'precondition')} — every one, or a recorded waiver
                      </p>
                      <ul className="mt-3 space-y-3">
                        {g.preconditions.map((pc) => (
                          <li key={pc.key} className="border-l-2 border-rule pl-3">
                            <span className="block text-body text-ink">{pc.label}</span>
                            <span className="mt-0.5 block text-micro text-ink-soft">{pc.detail}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-pill border border-rule bg-ledger px-2 py-0.5 text-micro text-ink-soft">
                                {citationShort(pc.citation)}
                              </span>
                              <span className="text-micro text-ink-soft">{pc.fixHint}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="field-label">If it clears</p>
                      <ul className="mt-3 space-y-2">
                        {g.consequences.map((cq) => (
                          <li key={cq} className="flex gap-2 text-body text-ink">
                            <span aria-hidden className="mt-1.5 shrink-0 text-verify">
                              <Glyph d="M4 12.5 9.5 18 20 6.5" size={12} />
                            </span>
                            {cq}
                          </li>
                        ))}
                      </ul>

                      <p className="field-label mt-6">Who is told</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {g.notifies.map((n) => (
                          <li
                            key={n}
                            className="rounded-pill border border-rule bg-ledger px-2.5 py-1 text-micro text-ink-soft"
                          >
                            {ownerLabel(n)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </SectionRail>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- doors
          Two ways in, both real pages in this product. The reader's own side
          is lit by the toggle at the top; the other stays readable, because
          which side you are on is a thing people change their mind about. */}
      <section aria-labelledby="doors-heading" className="deep full-bleed border-t border-deep-rule px-4 py-16 md:px-6">
        <div className="mx-auto max-w-shell">
          <h2 id="doors-heading" className="max-w-[20ch] font-display text-hero text-deep-ink">
            Where you come in.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[
              {
                key: 'department' as const,
                title: 'You have a problem to solve',
                lead: 'Start at stage 1. The studio turns an operational problem into a measurable outcome and will not let you name a product instead.',
                first: 'First screen: the challenge studio',
                to: '/d/challenges',
                cta: 'Open the department portal',
                second: { label: 'See what other departments have asked for', to: link('/challenges') },
              },
              {
                key: 'startup' as const,
                title: 'You have something that works',
                lead: 'Start at stage 3. Every open challenge carries its budget, its deadline and the exact rubric you will be marked against, before you write a word.',
                first: 'First screen: the open register',
                to: link('/challenges'),
                cta: 'Read the open challenges',
                second: { label: 'See what has already been validated', to: link('/catalogue') },
              },
            ].map((d) => {
              const lit = side === d.key;
              return (
                <article
                  key={d.key}
                  className={[
                    'slab flex h-full flex-col px-6 py-6',
                    lit ? 'shadow-saffron' : '',
                  ].join(' ')}
                  data-accent={lit ? 'saffron' : undefined}
                >
                  <p className="field-label !text-deep-dim">{d.first}</p>
                  <h3 className="mt-2 font-display text-h2 text-deep-ink">{d.title}</h3>
                  <p className="mt-3 max-w-doc text-body text-deep-dim">{d.lead}</p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      to={d.to}
                      className="press inline-flex h-11 items-center rounded-pill bg-saffron px-5 text-label font-semibold text-deep no-underline"
                    >
                      {d.cta}
                    </Link>
                    <Link
                      to={d.second.to}
                      className="swift inline-flex h-11 items-center rounded-pill border border-deep-rule px-5 text-label text-deep-ink no-underline hover:border-saffron hover:text-saffron"
                    >
                      {d.second.label}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
