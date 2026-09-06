/**
 * Three drawn scenes, one per act.
 *
 * The page explains a process, and a process is easier to believe when you can
 * see somebody doing it. These are not decoration and not stock illustration:
 * each one draws the actual artefact that act produces — a measured baseline, a
 * scored rubric, a countersigned seal — in the product's own line weight and
 * its own two accents.
 *
 * Line art rather than a picture, because it inherits the palette: every stroke
 * is `currentColor` or a token, so the scenes cannot drift from the theme and
 * they cost about a kilobyte each with no image request.
 */

function Scene({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 300 150"
      role="img"
      aria-label={label}
      className="block w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** The paper the scene is drawn on, so a figure reads as an object on a desk. */
const SHEET = { fill: 'var(--sheet)' };
const LEDGER = { fill: 'var(--ledger)' };
const RULE = { stroke: 'var(--rule)' };
const INK = { stroke: 'var(--ink)' };
const SOFT = { stroke: 'var(--ink-soft)' };
const SAFFRON = { stroke: 'var(--saffron-ink)' };
const SAFFRON_FILL = { fill: 'var(--saffron)' };
const VERIFY = { stroke: 'var(--verify)' };
const VERIFY_FILL = { fill: 'var(--verify-wash)' };

/**
 * Act one. An officer at a desk, measuring what the problem costs today: a
 * meter under a magnifier, and the reading written onto a form. The saffron
 * bubble is the question the whole act exists to answer.
 */
export function SceneFraming() {
  return (
    <Scene label="An officer measures what the problem costs today and writes the reading onto a challenge form.">
      {/* the desk */}
      <path d="M18 128h264" {...INK} strokeWidth={2} />
      <path d="M52 128v14M248 128v14" {...SOFT} />

      {/* the form, ruled */}
      <rect x="150" y="52" width="96" height="72" rx="6" {...SHEET} {...RULE} />
      <path d="M162 70h60M162 82h72M162 94h48M162 106h56" {...RULE} />
      <rect x="150" y="52" width="96" height="12" rx="6" {...LEDGER} {...RULE} />

      {/* the meter being read */}
      <circle cx="72" cy="84" r="26" {...LEDGER} {...INK} />
      <circle cx="72" cy="84" r="18" {...RULE} />
      <path d="M72 84 84 72" {...SAFFRON} strokeWidth={2.4} />
      <circle cx="72" cy="84" r="2.6" {...SAFFRON_FILL} stroke="none" />
      {/* the magnifier over it */}
      <circle cx="92" cy="64" r="18" {...RULE} />
      <path d="M105 77 118 90" {...INK} strokeWidth={2.4} />

      {/* the officer */}
      <circle cx="42" cy="46" r="12" {...SHEET} {...INK} />
      <path d="M22 82a20 20 0 0 1 40 0" {...INK} />

      {/* the question */}
      <path d="M112 26h74a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-52l-12 11v-11h-10a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8Z" {...SAFFRON} />
      <path d="M132 40h34M132 50h22" {...SAFFRON} />

      {/* the reading, carried across */}
      <path d="M118 96h26" {...SAFFRON} strokeDasharray="3 4" />
      <path d="m140 92 6 4-6 4" {...SAFFRON} />
    </Scene>
  );
}

/**
 * Act two. Three applications against one published rubric: the rubric on the
 * left with its scores, the applicants on the right, one of them lifted and
 * ticked. Nothing is chosen by the drawing that was not scored first.
 */
export function SceneChoosing() {
  return (
    <Scene label="Three applications are scored against one published rubric, and one is awarded the pilot.">
      {/* the rubric */}
      <rect x="18" y="26" width="104" height="104" rx="8" {...SHEET} {...RULE} />
      <rect x="18" y="26" width="104" height="16" rx="8" {...LEDGER} {...RULE} />
      <path d="M30 60h48M30 78h48M30 96h48M30 114h48" {...RULE} />
      <path d="M92 56l5 5 9-10M92 74l5 5 9-10M92 92l5 5 9-10" {...VERIFY} strokeWidth={2} />
      <path d="M92 110h14" {...RULE} />

      {/* the applicants */}
      <rect x="152" y="72" width="56" height="46" rx="6" {...LEDGER} {...RULE} />
      <path d="M162 88h30M162 100h20" {...RULE} />

      <rect x="224" y="72" width="56" height="46" rx="6" {...LEDGER} {...RULE} />
      <path d="M234 88h30M234 100h20" {...RULE} />

      {/* the one that cleared, lifted */}
      <rect x="188" y="30" width="56" height="46" rx="6" {...SHEET} {...VERIFY} strokeWidth={2} />
      <rect x="188" y="30" width="56" height="46" rx="6" {...VERIFY_FILL} stroke="none" />
      <rect x="188" y="30" width="56" height="46" rx="6" {...VERIFY} strokeWidth={2} />
      <path d="M198 46h30M198 58h18" {...VERIFY} />
      <circle cx="244" cy="30" r="11" fill="var(--verify)" stroke="none" />
      <path d="m239 30 3.4 3.6 7-7.4" stroke="var(--sheet)" strokeWidth={2.2} />

      {/* the desk line */}
      <path d="M140 130h150" {...INK} strokeWidth={2} />
    </Scene>
  );
}

/**
 * Act three. The pilot measured against its own baseline, and somebody who does
 * not work for the department putting a seal on the reading. The dotted line is
 * the baseline; the solid one is what actually happened.
 */
export function SceneProving() {
  return (
    <Scene label="The pilot is measured against its baseline and an independent validator signs the finding.">
      {/* the chart */}
      <rect x="18" y="24" width="152" height="94" rx="8" {...SHEET} {...RULE} />
      <path d="M34 104h122" {...RULE} />
      <path d="M34 104V38" {...RULE} />
      {/* the baseline */}
      <path d="M34 70h122" {...SOFT} strokeDasharray="4 5" />
      {/* what happened */}
      <path d="M40 92c18 2 26-10 40-14s26 6 40-8 22-22 30-26" {...VERIFY} strokeWidth={2.4} />
      <circle cx="150" cy="44" r="4" fill="var(--verify)" stroke="none" />

      {/* the validator, separate from the department */}
      <circle cx="236" cy="44" r="13" {...SHEET} {...INK} />
      <path d="M214 82a22 22 0 0 1 44 0" {...INK} />

      {/* the seal being applied */}
      <circle cx="236" cy="106" r="22" {...VERIFY_FILL} {...VERIFY} strokeWidth={2} />
      <circle cx="236" cy="106" r="15" {...VERIFY} />
      <path d="m229 106 5 5 10-11" {...VERIFY} strokeWidth={2.4} />

      {/* the reading carried into the seal */}
      <path d="M176 74h34" {...SAFFRON} strokeDasharray="3 4" />
      <path d="m206 70 6 4-6 4" {...SAFFRON} />

      <path d="M18 132h264" {...INK} strokeWidth={2} />
    </Scene>
  );
}

export const ACT_SCENE = [SceneFraming, SceneChoosing, SceneProving] as const;
