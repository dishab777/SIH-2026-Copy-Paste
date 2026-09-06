import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The government identity a procurement portal carries.
 *
 * Two marks belong at the head of this product: the Union, and the Government
 * of Maharashtra, whose departments own every challenge in it.
 *
 * The Union mark is the national flag, drawn to the Flag Code's own
 * proportions — 3:2, three equal bands, a navy chakra of twenty-four spokes
 * whose diameter is three quarters of the white band. It is drawn rather than
 * fetched because it is geometry, not artwork, and because a drawn flag cannot
 * arrive at the wrong aspect ratio or fail to load.
 *
 * The **State Emblem of India** is a different thing and is deliberately not
 * drawn here: its use is restricted by the State Emblem of India (Prohibition
 * of Improper Use) Act, 2005 to the authorities that Act names. State emblems
 * are restricted comparably. Both are slots instead — drop the official file
 * the programme is entitled to use into `public/emblems/` under the filename
 * below and it replaces what is drawn here, at the right size, with no other
 * edit:
 *
 *   public/emblems/state-emblem-of-india.svg     (replaces the flag, if you
 *                                                 are entitled to the emblem)
 *   public/emblems/government-of-maharashtra.svg
 *
 * The lockup beside each mark follows the reader's language rather than
 * stacking both: भारत सरकार in Hindi, Government of India in English. A
 * masthead that says the same thing twice is not bilingual, it is doubled.
 */

/**
 * Where each emblem's artwork is looked for, in order.
 *
 * Both extensions, because the file that arrives is whatever the programme was
 * given — the Government of India emblem is usually distributed as a PNG and
 * the state emblems as either. Trying both means dropping the file in is the
 * whole job; nobody has to convert it first or edit this line.
 */
const SLOT: Record<'india' | 'maharashtra', readonly string[]> = {
  india: ['/emblems/state-emblem-of-india.svg', '/emblems/state-emblem-of-india.png'],
  maharashtra: ['/emblems/government-of-maharashtra.svg', '/emblems/government-of-maharashtra.png'],
};

/**
 * An emblem, from the official file where the programme has supplied one and
 * from what is drawn here where it has not.
 *
 * Height-constrained rather than width-constrained: supplied artwork is taller
 * than it is wide, the bar has a fixed height, and letting the width follow
 * keeps any file from being squashed into a box it was not drawn for.
 */
function Emblem({ slot, size, fallback }: { slot: keyof typeof SLOT; size: number; fallback: React.ReactNode }) {
  /* Which candidate is being tried. Past the end of the list, nothing was
     supplied and the drawn stand-in takes over. */
  const [at, setAt] = useState(0);
  const src = SLOT[slot][at];
  if (!src) return <>{fallback}</>;
  return (
    <img
      key={src}
      src={src}
      alt=""
      aria-hidden
      onError={() => setAt((i) => i + 1)}
      style={{ height: size, width: 'auto' }}
      className="block shrink-0 object-contain"
    />
  );
}

/* ------------------------------------------------------------------- marks */

/**
 * The national flag, to the Flag Code's proportions.
 *
 * 3:2. Three equal horizontal bands — India saffron, white, India green. The
 * chakra is navy, centred, twenty-four evenly spaced spokes, diameter three
 * quarters of the white band's height.
 */
function Tricolour({ height }: { height: number }) {
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg
      viewBox="0 0 90 60"
      style={{ height, width: height * 1.5 }}
      role="img"
      aria-label="Flag of India"
      className="block shrink-0 rounded-[1px]"
      shapeRendering="geometricPrecision"
    >
      <rect x="0" y="0" width="90" height="20" fill="#FF9933" />
      <rect x="0" y="20" width="90" height="20" fill="#FFFFFF" />
      <rect x="0" y="40" width="90" height="20" fill="#138808" />
      <g stroke="#000080" fill="none">
        <circle cx="45" cy="30" r="7.5" strokeWidth="0.9" />
        <circle cx="45" cy="30" r="1.5" fill="#000080" stroke="none" />
        {spokes.map((a) => (
          <line key={a} x1="45" y1="30" x2="45" y2="22.5" strokeWidth="0.45" transform={`rotate(${a} 45 30)`} />
        ))}
      </g>
      {/* A hairline, so the white band still reads as flag against the deep ground. */}
      <rect x="0" y="0" width="90" height="60" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * The state mark, until the official file is supplied: an empty plate at the
 * right proportion, dashed so it reads as a slot rather than as an emblem.
 */
function StatePlate({ size, tone }: { size: number; tone: string }) {
  return (
    <span
      title="Government of Maharashtra emblem — drop the official file into public/emblems/"
      className="flex shrink-0 items-center justify-center rounded-full border border-dashed"
      style={{ height: size, width: size, borderColor: tone }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
        <circle cx="12" cy="12" r="9" stroke={tone} strokeWidth="1.1" />
        <path d="M12 7.5c1.9 1.6 2.8 3 2.8 4.4a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.8 2.8-4.4Z" stroke={tone} strokeWidth="1.1" />
      </svg>
    </span>
  );
}

/**
 * The Union emblem, for the middle of the strip: the official file where the
 * programme has supplied one, and a marked slot where it has not.
 *
 * Deliberately NOT the flag's fallback. The flag and the emblem are two
 * different marks doing two different jobs here — the flag identifies the
 * Union beside its name on the left, and the emblem stands alone in the centre
 * as the seal of the state. Falling one back to the other would put the flag in
 * both places or the emblem in neither.
 */
export function StateEmblem({ size = 38 }: { size?: number }) {
  return (
    <Emblem
      slot="india"
      size={size}
      fallback={
        <span
          title="State Emblem of India — drop the official file into public/emblems/"
          className="flex shrink-0 items-center justify-center rounded-sheet border border-dashed"
          style={{ height: size, width: size * 0.8, borderColor: 'var(--deep-dim)' }}
        >
          <svg
            width={size * 0.5}
            height={size * 0.5}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--deep-dim)"
            strokeWidth="1.1"
            aria-hidden
            focusable="false"
          >
            <path d="M5 20h14M7 20V9l5-4 5 4v11M10 20v-5h4v5" />
          </svg>
        </span>
      }
    />
  );
}

/* ----------------------------------------------------------------- lockups */

/**
 * भारत सरकार / Government of India, beside the national flag.
 *
 * One line, in the language being read — a masthead that says the same thing
 * twice is not bilingual, it is doubled. The second line under it used to read
 * "Republic of India"; it said nothing the first line did not.
 */
export function GovernmentOfIndia({ size = 34, tone = 'deep' }: { size?: number; tone?: 'deep' | 'paper' }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language.startsWith('hi');
  const ink = tone === 'deep' ? 'var(--deep-ink)' : 'var(--ink)';
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Tricolour height={size * 0.62} />
      <span className="truncate text-micro font-semibold" style={{ color: ink }}>
        {hindi ? 'भारत सरकार' : 'Government of India'}
      </span>
    </span>
  );
}

export function GovernmentOfMaharashtra({ size = 34, tone = 'deep' }: { size?: number; tone?: 'deep' | 'paper' }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language.startsWith('hi');
  const ink = tone === 'deep' ? 'var(--deep-ink)' : 'var(--ink)';
  const dim = tone === 'deep' ? 'var(--deep-dim)' : 'var(--ink-soft)';
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="truncate text-micro font-semibold" style={{ color: ink }}>
        {hindi ? 'महाराष्ट्र शासन' : 'Government of Maharashtra'}
      </span>
      <Emblem slot="maharashtra" size={size} fallback={<StatePlate size={size} tone={dim} />} />
    </span>
  );
}
