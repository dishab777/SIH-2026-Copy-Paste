import { useLayoutEffect, useRef, useState } from 'react';
import { CHALLENGE_SECTIONS } from './ChallengeDocument';
import { useChallengeSection } from './ChallengeSectionContext';

/**
 * The index of a challenge, as a control rather than a table of contents.
 *
 * Choosing a part of the file opens that part and closes the one before it, so
 * the reader is always looking at one thing. The marker slides from where it
 * was to where it is going: the movement is what says the two are alternatives,
 * which a highlight that blinks off one and on at the next cannot.
 */
export function ChallengeDocumentNav() {
  const { active, setActive } = useChallengeSection();
  const listRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const measure = (): void => {
      const item = list.querySelector<HTMLElement>(`[data-for="${active}"]`);
      if (!item) return;
      setBox({ top: item.offsetTop, height: item.offsetHeight });
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(list);
    return () => ro?.disconnect();
  }, [active]);

  return (
    <nav
      aria-label="Parts of this challenge"
      className="scroll-quiet lg:sticky lg:top-20 lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto lg:pr-2"
    >
      <p className="field-label mb-3">In this challenge</p>

      <div ref={listRef} className="relative" role="tablist" aria-orientation="vertical">
        {/* One box that travels, rather than sixteen that blink. */}
        <span
          aria-hidden
          className="settle absolute inset-x-0 rounded-block border border-verify bg-verify-wash"
          style={box ? { top: box.top, height: box.height, opacity: 1 } : { opacity: 0, height: 0 }}
        />

        {CHALLENGE_SECTIONS.map((s, i) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              data-for={s.id}
              aria-selected={isActive}
              aria-controls={s.id}
              onClick={() => setActive(s.id)}
              className={[
                'swift relative flex w-full items-center gap-3 rounded-block px-3 py-2 text-left text-body',
                isActive ? 'font-medium text-ink' : 'text-ink-soft hover:bg-ledger hover:text-ink',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'type-register w-4 shrink-0 text-micro',
                  isActive ? 'text-verify' : 'text-ink-soft',
                ].join(' ')}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
