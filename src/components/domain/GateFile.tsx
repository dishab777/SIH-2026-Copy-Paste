import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GATES } from '@/config/gates';

/**
 * The case file — the product's signature object.
 *
 * A case in PRAYOG is not a status bar; it is a file, and the seven gates are
 * seven entries written down it. Three are stamped, one is open with somebody's
 * name against it, three are still blank. Drawing the actual artefact is what
 * lets the page claim "from challenge to contract" and be believed: you can
 * count the decisions.
 *
 * It replaces an abstract stair of extruded treads. That drawing was a diagram
 * of a process rather than a picture of this one, and at any angle other than
 * the intended one it read as a broken zigzag.
 *
 * Built from CSS 3D transforms, so it stays selectable text at about a
 * kilobyte and every colour comes from the tokens.
 */

export interface GateFileProps {
  /** Index of the gate the featured case is standing on, 0 to 6. */
  at?: number;
  /** The case this file belongs to. */
  caseId?: string;
  title?: string;
  district?: string;
}

type Row = { id: string; name: string; state: 'cleared' | 'open' | 'ahead' };

/** Dates are demonstration seed values, so they live with the fixture clock. */
const CLEARED_ON = ['12 Jun', '28 Jun', '19 Jul'];

export function GateFile({ at = 3, caseId, title, district }: GateFileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);

  /*
   * The file turns a few degrees towards the pointer. It is the only motion on
   * the object, and it is there because a flat rendering of a tilted thing
   * looks like a mistake until it moves.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;

    const onMove = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      setTilt({ x: 5 - dy * 6, y: -10 + dx * 10 });
    };
    const onLeave = (): void => setTilt(null);

    window.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const rows: Row[] = GATES.map((g, i) => ({
    id: g.id,
    name: g.name,
    state: i < at ? 'cleared' : i === at ? 'open' : 'ahead',
  }));

  const style = tilt ? ({ '--file-x': `${tilt.x}deg`, '--file-y': `${tilt.y}deg` } as CSSProperties) : undefined;

  return (
    <div ref={ref} className="file">
      {/* One sentence carries the whole drawing for a screen reader. */}
      <p className="sr-only">
        {title ? `${title}. ` : ''}This case has cleared {at} of {GATES.length} gates. It is standing on gate {at},{' '}
        {GATES[at]?.name}. Each gate is a written decision with an owner and a date.
      </p>

      <div aria-hidden className="file-body" style={style}>
        <span className="file-tab px-3 py-1 text-micro font-semibold text-deep">Open case</span>

        {/* The cover. */}
        <div className="border-b border-deep-rule px-4 pb-4 pt-6">
          <p className="type-register text-micro text-saffron">{caseId ?? 'CH-2026-0143'}</p>
          <p className="mt-1 font-display text-h3 text-deep-ink">{title ?? 'Smart water leakage detection'}</p>
          {district ? <p className="mt-0.5 text-micro text-deep-dim">{district}</p> : null}
        </div>

        {/* The seven entries. */}
        <ol className="pb-1">
          {rows.map((r, i) => (
            <li
              key={r.id}
              data-state={r.state}
              className="file-row file-deal"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <span className="type-register text-micro">{r.id}</span>
              <span className="truncate text-label">{r.name}</span>
              {r.state === 'cleared' ? (
                <span className="flex items-center gap-2">
                  <span className="type-register text-micro text-deep-dim">{CLEARED_ON[i] ?? ''}</span>
                  <span className="file-seal text-micro">✓</span>
                </span>
              ) : r.state === 'open' ? (
                <span className="flex items-center gap-2">
                  <span className="file-open-dot" />
                  <span className="text-micro font-semibold uppercase tracking-stamp text-saffron">Open</span>
                </span>
              ) : (
                <span className="text-micro text-deep-dim">—</span>
              )}
            </li>
          ))}
        </ol>

        <p className="border-t border-deep-rule px-4 py-3 text-micro text-deep-dim">
          Every line above has an owner, a written reason and a date. All seven are public.
        </p>
      </div>
    </div>
  );
}
