/**
 * Fails the build when a spacing class is written that the scale does not have.
 *
 * Tailwind does not warn about a missing step — it emits nothing, and the
 * element quietly has no padding. That is how forty-nine dead classes, one of
 * them the padding on every challenge card, survived a visual review: the text
 * sat flush against the border and nothing anywhere said why.
 *
 * Run by `npm run check` alongside typecheck and lint.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const config = readFileSync('tailwind.config.ts', 'utf8');
const block = config.match(/spacing:\s*\{([\s\S]*?)\n {4}\}/);
if (!block) {
  console.error('check-spacing: could not find the spacing scale in tailwind.config.ts');
  process.exit(1);
}

const allowed = new Set(
  [...block[1].matchAll(/^\s*'?([\w.]+)'?:/gm)].map((m) => m[1]),
);

const PREFIXES = [
  'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
  'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
  'gap', 'gap-x', 'gap-y', 'space-x', 'space-y',
  // These fail exactly as silently, and an anchor landing under the sticky bar
  // is harder to spot than a missing padding.
  'scroll-m', 'scroll-mt', 'scroll-mb', 'scroll-ml', 'scroll-mr',
  'scroll-p', 'scroll-pt', 'scroll-pb', 'scroll-pl', 'scroll-pr',
  'inset', 'inset-x', 'inset-y', 'top', 'bottom',
];
const pattern = new RegExp(`(?<![\\w-])-?(${PREFIXES.join('|')})-([\\w.]+)(?![\\w-])`, 'g');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

const bad = [];
for (const file of walk('src')) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(pattern)) {
      const [, prefix, value] = m;
      // Bracket values and CSS-variable values are deliberate escapes.
      if (value.startsWith('[') || value === 'auto' || value === 'full') continue;
      // Only flag what is actually inside a className, so a hyphenated word
      // in a config string is not mistaken for a utility.
      if (!/class(Name)?=/.test(line)) continue;
      if (!allowed.has(value)) bad.push(`${file}:${i + 1}  ${prefix}-${value}`);
    }
  });
}

if (bad.length > 0) {
  console.error(`check-spacing: ${bad.length} class(es) use a step the scale does not define.`);
  console.error('These emit no CSS at all. Add the step to tailwind.config.ts, or use one that exists.\n');
  for (const b of bad) console.error('  ' + b);
  process.exit(1);
}

console.log(`check-spacing: every spacing class resolves (${allowed.size} steps defined).`);
