import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * A run of cards read one at a time.
 *
 * For a sequence — nine stages, seven gates — where a grid would say "here are
 * nine things" and stop. The one you are on is lifted and lit; the ones either
 * side stay on screen, set back, because what is behind and what is ahead is
 * the fact the section exists to state.
 *
 * It is a list, not a slideshow: every card stays in the document and in the
 * tab order, so a reader who does not use the arrows still reads all nine in
 * order. The arrows and the markers are a convenience over the top of that.
 */
export interface CardCarouselProps<T> {
  items: readonly T[];
  itemKey: (item: T, index: number) => string;
  render: (item: T, index: number, live: boolean) => ReactNode;
  /** Named for the reader: "stage", "gate". Used in the control labels. */
  unit: string;
  label: string;
  /**
   * How long each card holds before the run moves on, in milliseconds.
   *
   * Measured from the end of the glide, not from the start of it — the run
   * reads as nine steps of the same length, and at five seconds the pause
   * between them had begun to feel like a stall rather than a beat. Long
   * enough to take in a heading, a line and the tags under it; anyone reading
   * further has already hovered, which stops the run.
   *
   * Pass 0 to leave it still until somebody moves it.
   */
  dwellMs?: number;
}

export function CardCarousel<T>({ items, itemKey, render, unit, label, dwellMs = 3900 }: CardCarouselProps<T>) {
  const [at, setAt] = useState(0);
  /*
   * Two ways the run stops, and they are not the same thing.
   *
   * `held` is a pointer over the run or focus inside it: somebody is reading
   * this card, so it waits — and carries on when they leave. `taken` is a
   * deliberate move on an arrow or a marker: they are steering it now, and a
   * run that resumes after you have chosen a card takes it away from you.
   */
  const [held, setHeld] = useState(false);
  const [taken, setTaken] = useState(false);
  const running = !held && !taken;
  const trackRef = useRef<HTMLOListElement>(null);
  const last = items.length - 1;

  const clamp = (i: number): number => Math.min(last, Math.max(0, i));
  /*
   * Both of these update from the current value rather than the one this render
   * closed over. Three clicks in quick succession otherwise all read the same
   * index, and the run advances one card instead of three.
   */
  const step = (delta: number): void => setAt((cur) => clamp(cur + delta));
  const goTo = (i: number): void => setAt(() => clamp(i));
  /** Any deliberate move is also a decision to stop being moved. */
  const take = (fn: () => void) => (): void => {
    setTaken(true);
    fn();
  };

  /*
   * The run advances itself, and wraps, so a reader who leaves it alone sees
   * all nine without touching anything.
   *
   * It used to stop entirely for a reader who had asked for reduced motion,
   * which meant they never saw stages two to nine at all — the setting cost
   * them the content, not just the animation. The two are separable: the CSS
   * already drops the 520ms slide under `prefers-reduced-motion`, so what those
   * readers get is the same run with a cut instead of a glide. Nothing moves;
   * the card changes.
   *
   * WCAG's requirement for content that updates on its own is a way to stop
   * it, and there are three: hovering it, focusing it, or touching any control.
   */
  useEffect(() => {
    if (!running || dwellMs <= 0 || items.length < 2) return undefined;
    const id = window.setInterval(() => setAt((cur) => (cur >= last ? 0 : cur + 1)), dwellMs);
    return () => window.clearInterval(id);
  }, [running, dwellMs, items.length, last]);

  /*
   * Focusing a card brings it forward. Without this, tabbing through the run
   * moves focus to a card that is scaled back and half transparent, which is
   * the one thing a keyboard reader must never have happen.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const onFocus = (e: FocusEvent): void => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
      if (card) {
        // Tabbing onto a card is steering it, not glancing at it.
        setTaken(true);
        goTo(Number(card.dataset.index ?? '0'));
      }
    };
    track.addEventListener('focusin', onFocus);
    return () => track.removeEventListener('focusin', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setTaken(true);
          step(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setTaken(true);
          step(-1);
        }
      }}
    >
      <div className="carousel-viewport -mx-4 md:-mx-6">
        {/*
         * The travel is a declaration, not a variable the stylesheet reads.
         *
         * Setting `--at` here and letting the CSS compute the translate looks
         * tidier and does not animate: a transition does not start when the
         * only thing that changed is an unregistered custom property, so the
         * track was recomputed rather than transitioned and every duration on
         * it was unreachable. `--step` stays in CSS because it is the one part
         * that varies by breakpoint.
         */}
        <ol
          ref={trackRef}
          className="carousel-track"
          style={{ transform: `translateX(calc(${at} * var(--step) * -1))` } as CSSProperties}
        >
          {items.map((item, i) => (
            <li
              key={itemKey(item, i)}
              data-index={i}
              data-live={String(i === at)}
              className="carousel-card"
              aria-roledescription="slide"
              aria-label={`${unit} ${i + 1} of ${items.length}`}
            >
              {render(item, i, i === at)}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={take(() => step(-1))}
          disabled={at === 0}
          aria-label={`Previous ${unit}`}
          className="press flex h-11 w-11 items-center justify-center rounded-pill border border-deep-rule text-deep-ink hover:border-saffron hover:text-saffron disabled:cursor-not-allowed disabled:border-deep-rule disabled:text-deep-rule"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
            <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <ol className="flex items-center gap-2">
          {items.map((item, i) => (
            <li key={itemKey(item, i)} className="flex">
              <button
                type="button"
                onClick={take(() => goTo(i))}
                aria-label={`${unit} ${i + 1}`}
                aria-current={i === at ? 'true' : undefined}
                className="press flex h-5 items-center"
              >
                <span
                  aria-hidden
                  className="carousel-dot"
                  data-live={String(i === at)}
                  data-running={String(running && i === at)}
                  style={running && i === at ? ({ '--dwell': `${dwellMs}ms` } as CSSProperties) : undefined}
                />
              </button>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={take(() => step(1))}
          disabled={at === last}
          aria-label={`Next ${unit}`}
          className="press flex h-11 w-11 items-center justify-center rounded-pill border border-deep-rule text-deep-ink hover:border-saffron hover:text-saffron disabled:cursor-not-allowed disabled:border-deep-rule disabled:text-deep-rule"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
            <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/*
        Said out loud for a reader who cannot see the run move — but only once
        they have taken hold of it. Announcing every five seconds while it
        advances on its own is not help, it is a screen reader talking over
        whatever else the reader is doing.
      */}
      <p aria-live="polite" className="sr-only">
        {running ? '' : `${unit} ${at + 1} of ${items.length}`}
      </p>
    </div>
  );
}
