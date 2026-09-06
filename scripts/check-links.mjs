#!/usr/bin/env node
/**
 * A link inside a portal must not throw the reader onto the public site.
 *
 * Nine pages are mounted under every portal — the challenge register and its
 * documents, results, the catalogue, the template library, transparency, the
 * startup profiles. They are also mounted on the public site. Linking one of
 * them by its public path from inside a portal swaps the entire shell: a
 * startup clicks a challenge on "Matches" and lands on the public navigation
 * with no way back to their own.
 *
 * `usePortalLink()` exists to prevent that, and six screens simply did not use
 * it — which nothing caught, because the link works. It just works somewhere
 * else.
 *
 * This fails the build on an absolute link to a shared path from any page that
 * is not the public site's own.
 *
 * Run: node scripts/check-links.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** The paths that exist on the public site AND inside every portal. */
const SHARED = [
  'challenges',
  'results',
  'catalogue',
  'templates',
  'how-it-works',
  'transparency',
  'startups',
  'legal',
];

/*
 * Pages that ARE the public site. A link to `/challenges` from the demand
 * board is the public register, correctly — there is no portal to stay in.
 * `usePortalLink` returns the same path there anyway, so these are allowed
 * either way; they are listed so the guard does not report a non-problem.
 */
const PUBLIC_ONLY = new Set([
  'src/pages/public/DemandBoard.tsx',
  'src/pages/public/Login.tsx',
  'src/pages/public/Register.tsx',
  'src/pages/public/RegisterStartup.tsx',
  'src/pages/public/RegisterExpert.tsx',
  'src/pages/dev/Styleguide.tsx',
  /* The 'this page needs an account' screen. It is only ever mounted on the
     public site — inside a portal you are signed in by definition. */
  'src/components/layout/RequireAccount.tsx',
]);

/** `to="/challenges"` and ``to={`/challenges/${slug}`}`` — but not `to={link(...)}`. */
const ABSOLUTE = new RegExp(`to=(?:"/(${SHARED.join('|')})[^"]*"|\\{\`/(${SHARED.join('|')})[^\`]*\`\\})`, 'g');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

const problems = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (PUBLIC_ONLY.has(rel)) continue;

  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    ABSOLUTE.lastIndex = 0;
    const match = ABSOLUTE.exec(line);
    if (match) problems.push({ rel, line: i + 1, text: match[0].trim() });
  });
}

if (problems.length > 0) {
  console.error(`check-links: ${problems.length} link${problems.length === 1 ? '' : 's'} would leave the portal\n`);
  for (const p of problems) console.error(`  ${p.rel}:${p.line}  ${p.text}`);
  console.error('\n  Wrap the path in usePortalLink(): to={link(`/challenges/${slug}`)}');
  console.error('  A shared page is mounted under every portal; the bare path is the public one.');
  process.exit(1);
}

console.log(`check-links: clean — no portal page links at a public path (${SHARED.length} shared paths checked).`);
