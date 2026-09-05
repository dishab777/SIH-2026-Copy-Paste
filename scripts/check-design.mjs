#!/usr/bin/env node
/**
 * The design law, enforced.
 *
 * Tailwind emits nothing for a class it does not recognise — no warning, no
 * error, just an element with no padding or no colour. That has bitten this
 * repo repeatedly, and a design language applied across ninety files by many
 * hands will not survive on discipline alone.
 *
 * The scales are read out of tailwind.config.ts rather than restated here, so
 * adding a step to the config is the only thing anyone has to do.
 *
 * A noisy guard is worse than no guard — people learn to ignore it — so this
 * checks only things that are unambiguously wrong.
 *
 * What it deliberately does NOT check: contrast against a background that is
 * actually composited at run time — a gradient, a translucent panel over the
 * page wash, a sibling painted behind a label. A static rule for that fires on
 * every legitimate overlay and hairline. Measure those in the browser against
 * the real computed background instead.
 *
 * Run: node scripts/check-design.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/* ------------------------------------------------------- read the scales */

const config = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8');

function block(name) {
  const at = config.indexOf(`${name}: {`);
  if (at < 0) throw new Error(`tailwind.config.ts has no ${name} block`);
  let depth = 0;
  for (let i = config.indexOf('{', at); i < config.length; i += 1) {
    if (config[i] === '{') depth += 1;
    else if (config[i] === '}') {
      depth -= 1;
      if (depth === 0) return config.slice(at, i + 1);
    }
  }
  throw new Error(`unterminated ${name} block`);
}

const keysOf = (name) =>
  new Set([...block(name).matchAll(/^\s{0,10}'?([A-Za-z0-9.-]+)'?\s*:/gm)].map((m) => m[1]).filter((k) => k !== name));

const SPACING = keysOf('spacing');
const COLOURS = keysOf('colors');
const SIZES = keysOf('fontSize');

/*
 * `inset`, `top` and friends inherit Tailwind's own scale, which is the spacing
 * scale plus these. Only `spacing` was replaced in the config, so these still
 * resolve and are not dead classes.
 */
const INSET_EXTRAS = new Set(['auto', 'full', '1/2', '1/3', '2/3', '1/4', '2/4', '3/4']);

/* ------------------------------------------------------------- contrast */

/*
 * The bright cuts are tuned to glow on the deep ground and measure under 2:1 on
 * paper; the paper inks are the reverse. Putting one on the other's ground is
 * the commonest way a screen in this product becomes unreadable, and it is
 * invisible unless you happen to open that exact page.
 */
const DEEP_ONLY = ['saffron', 'signal', 'deep-ink', 'deep-dim'];
const PAPER_ONLY = ['ink', 'ink-soft', 'verify', 'hold', 'seal', 'saffron-ink'];

const PAPER_GROUND = /\b(bg-sheet|bg-ledger|bg-white|bg-verify-wash|bg-hold-wash|bg-seal-wash|sheet-flat|glass)\b/;
const DEEP_GROUND = /\b(bg-deep(-[23])?|deep-field|page-head|slab|file-body|topbar)\b/;

/* --------------------------------------------------- non-colour keywords */

/* Utilities that share a prefix with a colour utility but are not colours. */
const NOT_A_COLOUR = new Set([
  // border-*
  'collapse', 'separate', 'solid', 'dashed', 'dotted', 'double', 'hidden', 'none', 'spacing',
  't', 'r', 'b', 'l', 'x', 'y', 's', 'e',
  // text-*
  'left', 'center', 'right', 'justify', 'start', 'end', 'wrap', 'nowrap', 'balance', 'pretty',
  'ellipsis', 'clip', 'opacity',
  // bg-*
  'cover', 'contain', 'fixed', 'local', 'scroll', 'repeat', 'no-repeat', 'bottom', 'top',
  'origin-border', 'origin-padding', 'origin-content', 'blend-normal', 'blend-multiply',
  // bg-gradient-* is a background-image utility, not a colour.
  'gradient-to-t', 'gradient-to-tr', 'gradient-to-r', 'gradient-to-br', 'gradient-to-b',
  'gradient-to-bl', 'gradient-to-l', 'gradient-to-tl', 'none-gradient', 'clip-text', 'clip-padding',
  'clip-content', 'clip-border',
  // ring/decoration/outline
  'inset', 'offset', 'underline', 'overline', 'line-through', 'wavy', 'current', 'transparent',
  'inherit', 'auto',
]);

/* ------------------------------------------------------------ the sweep */

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) files.push(p);
  }
})(SRC);

const problems = [];
const add = (file, line, kind, detail) =>
  problems.push({ file: relative(ROOT, file).replace(/\\/g, '/'), line, kind, detail });

/** Strip the responsive/state prefixes and the `!` override Tailwind allows. */
const bare = (cls) => cls.replace(/^(?:[a-z0-9-]+:)+/, '').replace(/^!/, '');

const SPACING_UTIL =
  /^-?(?:p[xytrbls]?|m[xytrbls]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|scroll-m[xytrbls]?|scroll-p[xytrbls]?|w|h|min-w|min-h|max-w|max-h|size)-(.+)$/;

const COLOUR_UTIL = /^(?:text|bg|border(?:-[xytrbls])?|ring|decoration|from|via|to|fill|stroke|accent|caret|divide-[xy]|outline)-(.+)$/;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    const n = i + 1;
    const isClassLine = /class(Name)?\s*=/.test(line) || /^\s*['"`][a-z0-9!:\-/ ]+['"`],?\s*$/.test(line);

    if (isClassLine) {
      // Arbitrary values carry brackets and parentheses. A tokenizer that drops
      // them cannot see `text-[19px]` or `bg-[rgba(...)]` at all, which is
      // precisely the class of thing worth catching.
      const classes = [...line.matchAll(/[a-zA-Z0-9!:_\-./]+(?:\[[^\]]*\])?/g)].map((m) => m[0]);

      for (const raw of classes) {
        const c = bare(raw);

        // 1. A spacing step that does not exist emits nothing at all.
        const sp = SPACING_UTIL.exec(c);
        if (sp) {
          const step = sp[1];
          const known =
            SPACING.has(step) ||
            INSET_EXTRAS.has(step) ||
            step.startsWith('[') ||
            /^(screen|min|max|fit|doc|shell|dock|hero|full|auto|px)$/.test(step);
          if (!known) add(file, n, 'dead-spacing', `${raw} — "${step}" is not in the spacing scale`);
        }

        // 2. A colour that does not exist emits nothing either.
        const col = COLOUR_UTIL.exec(c);
        if (col) {
          const name = col[1];
          const looksLikeAHue = /^[a-z][a-z0-9-]*$/.test(name) && !NOT_A_COLOUR.has(name);
          if (looksLikeAHue && !COLOURS.has(name) && !SIZES.has(name) && !SPACING.has(name)) {
            // text-* also carries the type scale and a pile of layout keywords;
            // only flag what could not be anything but a colour.
            if (!/^(text|font|leading|tracking|whitespace|break|align|list|underline)-/.test(c) || COLOURS.size === 0) {
              add(file, n, 'unknown-colour', `${raw} — "${name}" is not in the palette`);
            } else if (/^(text|bg|border|fill|stroke)-/.test(c) && !SIZES.has(name)) {
              add(file, n, 'unknown-colour', `${raw} — "${name}" is neither a palette colour nor a type size`);
            }
          }
          /*
           * An arbitrary value is fine when it reads a token — that is how a CSS
           * property Tailwind has no utility for (accent-color) gets the palette.
           * A literal colour is not fine: it is a colour declared outside the
           * tokens, which is the one thing tokens.css exists to prevent.
           */
          if (name.startsWith('[') && !/var\(--/.test(line.slice(line.indexOf(raw)))) {
            add(file, n, 'hardcoded-colour', `${raw} — declare it in tokens.css`);
          }
        }

        /*
         * 3. An opacity modifier on a palette colour emits NOTHING.
         *
         * Every colour in this product is declared as `var(--x)`, and Tailwind
         * cannot compute an alpha from a value it does not know the channels
         * of — so `bg-signal/15` and `ring-verify/25` produce no rule at all,
         * silently. Verified against the built stylesheet. If a translucent
         * tint is needed, add it to tokens.css as its own colour.
         */
        const alpha = /^(?:text|bg|border(?:-[xytrbls])?|ring|decoration|from|via|to|fill|stroke|divide-[xy]|outline)-([a-z][a-z0-9-]*)\/\d+$/.exec(c);
        if (alpha && COLOURS.has(alpha[1])) {
          add(file, n, 'dead-opacity', `${raw} — an opacity modifier on a var() colour emits nothing; add a veil token`);
        }

        // 4. The type scale owns line-height and size.
        if (/^leading-/.test(c)) add(file, n, 'hand-set-leading', `${raw} — the font-size scale carries its own leading`);
        if (/^text-\[\d/.test(c)) add(file, n, 'arbitrary-type', `${raw} — add a step to the type scale instead`);

        // 5. One easing curve, three durations, all behind named classes.
        if (/^(transition|duration|ease)-/.test(c)) {
          add(file, n, 'ad-hoc-motion', `${raw} — use .swift / .settle / .press / .lift-on-hover`);
        }
      }

      /*
       * 5. An accent on the ground it cannot be read on.
       *
       * A line carrying inks from BOTH families is a tone ternary — one
       * component that renders correctly on either ground — so it is skipped.
       * That is the whole reason Breadcrumb and Mark take a `tone` prop.
       */
      const mixesFamilies =
        DEEP_ONLY.some((c) => new RegExp(`text-${c}\\b`).test(line)) &&
        PAPER_ONLY.some((c) => new RegExp(`text-${c}\\b`).test(line));
      const onPaper = !mixesFamilies && PAPER_GROUND.test(line);
      const onDeep = !mixesFamilies && DEEP_GROUND.test(line);
      if (onPaper && !onDeep) {
        for (const c of DEEP_ONLY) {
          if (new RegExp(`(^|[\\s"'!])!?text-${c}\\b`).test(line)) {
            add(file, n, 'contrast', `text-${c} on a paper ground — under 2:1; use text-saffron-ink or an ink`);
          }
        }
      }
      if (onDeep && !onPaper) {
        for (const c of PAPER_ONLY) {
          if (new RegExp(`(^|[\\s"'!])!?text-${c}\\b`).test(line)) {
            add(file, n, 'contrast', `text-${c} on a deep ground — use text-deep-ink / text-deep-dim / text-saffron`);
          }
        }
      }
    }

    // 6. Rules that hold anywhere in a file, not only in a class string.
    const isComment = /^\s*(\/\/|\*|\/\*)/.test(line);
    if (!isComment && /(:\s*any\b|\bas any\b|<any>)/.test(line) && !/eslint-disable/.test(line)) {
      add(file, n, 'any', line.trim().slice(0, 90));
    }
    if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(line)) {
      add(file, n, 'browser-storage', line.trim().slice(0, 90));
    }
  });
}

/* ---------------------------------------------------------------- report */

if (problems.length === 0) {
  console.log(
    `check-design: clean — ${files.length} files against ${SPACING.size} spacing steps, ` +
      `${COLOURS.size} colours and ${SIZES.size} type sizes.`,
  );
  process.exit(0);
}

const byKind = new Map();
for (const p of problems) byKind.set(p.kind, [...(byKind.get(p.kind) ?? []), p]);

console.error(`check-design: ${problems.length} problems in ${new Set(problems.map((p) => p.file)).size} files\n`);
for (const [kind, list] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
  console.error(`  ${kind} (${list.length})`);
  for (const p of list.slice(0, 14)) console.error(`    ${p.file}:${p.line}  ${p.detail}`);
  if (list.length > 14) console.error(`    … and ${list.length - 14} more`);
  console.error('');
}
process.exit(1);
