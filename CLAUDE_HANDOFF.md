# CLAUDE_HANDOFF.md

Context handoff for continuing the **PRAYOG** build in a fresh Claude Code session.
Working directory: `C:\Users\Parth\Downloads\prayog` (Windows 11, Node v24.19.0, npm 11.17.0, not a git repo).
Read this file top to bottom before touching anything.

---

## 1. PROJECT OBJECTIVE

### The exact original goal

The user pasted a ~15,000-word specification titled **"PRAYOG — Complete Product, Technical, UX, Frontend and Demo Build Specification"** (124 numbered sections) and instructed:

> "idc about phases start the process now dont stop until all phases are completed and dont talk much do more work stop next only when all the phases are completed and dont tell me or ask me after every phase completion just complete all phases and i am keeping away my laptop now dont stop untile the final production product is ready. START NOW!"

So: **build the entire application, all 18 phases, without stopping for check-ins.** Minimal chat, maximum code.

### What the final output must accomplish

PRAYOG (Sanskrit: "trial / application"), tagline **"From challenge to contract"**, is a **government innovation-procurement operating system** — not a startup marketplace. It must make this lifecycle understandable, traceable and auditable:

```
Problem → Outcome → Challenge → Discovery → Eligibility → Evaluation →
Pilot → Measurement → Validation → Procurement → Scale
```

A complete **frontend application against mocked APIs** (MSW). No real backend. But the architecture must behave like production: every workflow functions, every route navigable, every primary action works, every route has realistic seeded data, every data surface supports loading / populated / empty / partial-failure / error / forbidden states. **No disconnected static mock screens.**

### The non-negotiable spine of the product

- **Nine stages** (S1–S9) and **seven gates** (G0–G6). A gate is not a status — it is an auditable decision record with owner, preconditions, decision, reason, timestamp, evidence, audit record.
- **Seven product truths**, all visible in the UI, not buried in docs:
  1. Outcome, not specification (solution-language checker flags vendor naming / tech prescription).
  2. Startups get **relief, not a lower quality bar** (only prior turnover + prior experience relaxable).
  3. Money moves on evidence (acceptance starts a visible payment ageing clock).
  4. Startup retains its IP by default (plain-language position first, legal text second).
  5. Production data is a decision, not a toggle (synthetic / masked / production tiers).
  6. Every decision is defensible (rubrics, audit, override reasons, exportable audit pack).
  7. **A pilot is not a purchase** (G5 success still requires an explicit G6 pathway decision).
- **Nothing statutory is hardcoded.** All thresholds, timelines, clause text, citations, rubric weights, SLAs, RBAC come from `src/config/*` and surface in `/a/config`.

### The demo story that must work end to end

`CH-2026-0143 "Smart water leakage detection"` (Pune Municipal Corporation) → baseline 180 min → target 120 min → 90-day pilot, ₹15,00,000 → published → `AquaSense Technologies` (`STP-001`) applies as `APP-2026-0087` → screened → evaluated (ranks #1, weighted mean 4.31) → pilot `PL-2026-0031` awarded → contract signed → milestones + evidence + payment ageing → KPI 180 → 113.4 min (**37% reduction vs 30% target**) → independently validated → G5 cleared → **procurement readiness 92/100** → G6 **currently OPEN** → pathway advisor → replication package → scale-up **10 districts, ₹2.4 crore**.

---

## 2. CURRENT STATE

**The build is complete and verified.** Every route in every portal renders with
real data, every business rule is enforced server-side, the demo runs end to end,
and the whole product has been through an accessibility, responsive and
scenario-state sweep in a real browser.

### Gates that are green

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | clean, 0 errors 0 warnings |
| `npm run build` | succeeds |
| App shell, gzipped | 135.5 KB (entry + vendor + router + query + i18n + CSS) |
| Route sweep, six portals | every route renders, exactly one `h1`, no page overflow |
| Responsive, 360 / 768 / 1024 / 1440 | no horizontal page scroll anywhere |
| Accessibility sweep, every route | no unnamed control, no unlabelled input, no heading jump, every table captioned |

### Toolchain

- React 18.3, TypeScript 5.7 (strict, `noUnusedLocals`/`noUnusedParameters`),
  Vite 5.4, Tailwind 3.4, React Router 6.28, TanStack Query 5.62, Zustand 5,
  RHF 7.54, Zod 3.24, MSW 2.7, Recharts 2.15, i18next 24.
- ESLint 9 flat config in `eslint.config.js`: bans `any`, enforces the hook
  rules, and **fails on any use of localStorage/sessionStorage** — the spec's
  no-browser-storage rule is now machine-checked rather than promised.
- `package.json` carries `"allowScripts": { "esbuild": true, "msw": true }`.
  npm 11 blocks postinstall scripts; this is what installs esbuild and the MSW
  worker. **Do not remove.**
- `.claude/launch.json` exists so `preview_start` can run the dev server.

### What exists

- Design system: `src/styles/tokens.css`, `globals.css` (now including a real
  print stylesheet), `tailwind.config.ts` with the spacing scale replaced.
- Config layer, all rendered at `/a/config`: `policies.ts` (29 parameters,
  9 citations), `gates.ts`, `stages.ts`, `rbac.ts`, `rules.ts`, `rubrics.ts`,
  `templates.ts`, and **`clock.ts` (new)** — the single source of "now" for the
  interface and the mock server alike.
- Mock API: 4 fixture builders, in-memory store, server-side session, 10 handler
  modules, 11 scenarios. HMR-aware: editing a handler re-arms the interceptor.
- ~70 typed query hooks, 27 UI primitives, 5 ledger components, 20 domain
  components, 3 patterns, 2 chart components, 6 layout components.
- All 55 pages across six portals, `/dev/styleguide`, four system routes.
- English and Hindi bundles (chrome only, by design — the language menu now says
  so explicitly).
- **`README.md`** — how to run it, the ten-minute demo script, where the rules
  live, and an honest statement about the mock integrations.

### Verified in the browser, this session

- **All six portals walked route by route**, signing in through the PortalGuard
  button rather than a raw fetch (a raw `/api/auth/login` does not invalidate the
  cached `useSession` query).
- **Every scenario exercised**: empty, loading, slow, 403, 500, SLA breached,
  rejected gate, partial failure, mutation failure, stale.
- **Keyboard pass** on the gate decision screen: full tab cycle, visible 3px
  focus ring on every focusable element, logical order.
- **CSV export** produces a real file with a provenance line naming what was
  exported, when, how many rows of how many, and which filters were applied;
  money columns carry their unit.
- **Audit pack export** produces a 12 KB chronological reconstruction of
  CH-2026-0143.
- **Solution-language detection is real**: a fresh draft containing "Siemens
  SCADA", "LoRaWAN", "Microsoft Azure" and "acoustic correlator loggers" produced
  six correctly classified flags across four fields.
- **The demo finale runs end to end**: procurement officer → `/d/scale/PIL-HERO`
  → readiness 92/100 → GeM listing pathway with justification and reasons against
  → gate 6 preconditions flip to pass → *"Gate 6 cleared. 3 downstream changes
  have taken effect."*

### The design pass

The palette, type scale and case layout were reworked after the functional build
was verified. The concept the spec pinned — *ledger and gate* — did not change;
its execution did, from generic govtech to the specific vernacular of a
government file. `README.md` carries the full rationale. The load-bearing facts
for anyone editing this:

- **`src/styles/tokens.css` is the palette and it changed.** Two paper tones
  (`--ledger` khaki board, `--sheet` warmer noting sheet), typewriter carbon
  ink, and three inks of consequence — noting green, seal wax, pencil. Contrast
  is remeasured against `--sheet` in the file header. **`--hold` is now text
  safe at 5.8:1**, which the old amber was not; three comments and the style
  guide that documented the old rule were corrected.
- **`.type-display` / `.text-h1` use Anek's width axis** at 80%. Headings ease
  back towards normal width as they get smaller (h2 87%, h3 94%) — a condensed
  18px subhead just reads as cramped.
- **`.type-register`** is a monospace role for identifiers only. Do not set money
  in it: money is computed with, not quoted, and stays in `tnum`.
- **`.noting-page` / `.noting-margin` / `.noting` / `.noting-entry` / `.monogram`
  in `globals.css`** are the signature device. `.noting-page` rules a whole
  working column and insets every heading past the margin; `.noting-full` opts an
  element out of that inset (the file cover uses it). Below 1024px the margin
  becomes a left-bordered block preceding what it annotates.
- **`.field-label`** is the name of a field on a printed form — caps, letterspaced,
  10px. Use it for labels beside or above a value; never for a sentence.
- **The department and startup section rails were deleted.** Their links moved
  into the top bar. Do not add them back without also removing the duplicates.
- **A top-bar item is a place, never an act.** "New challenge" sat in the
  department bar among six destinations and offered the verb to a procurement
  officer, who cannot create a challenge at all. It now lives on the pipeline
  page it produces cases for, gated on `can(role, 'create', 'challenge')` — the
  same permission the mock API re-checks. The department dashboard's copy of it
  is gated on the same call, and all three entry points say the same three
  words: **Create a challenge**.
- **The spacing scale gained `0.5` (2px) and `1.5` (6px).** Those values were
  already being typed at a dozen call sites and silently producing no padding,
  because the scale was truncated without them.

### One palette, used the same way on every route

The product used to carry two visual registers — paper for working screens, a
separate "night" set for public ones — and the ground changed underneath you as
you navigated. That reads as a fault, not a scheme, and it was the single loudest
complaint about the build. There is now one palette.

- **The deep ground is `--verify` taken down to near-black.** `--deep` (#08170F)
  is the same hue as the ink an approving officer clears in, so a masthead and a
  gate decision belong to one family rather than two schemes. `--saffron` means
  open / waiting / yours; `--signal` means cleared / measured / paid. Those are
  the only two accents in the product. `--cyan`, `--rose` and `--violet` are gone,
  along with their paper-safe `-ink` cuts.
- **The rhythm is identical on every route.** Deep top bar → deep masthead →
  paper working ground → deep footer. A public landing page has a tall masthead
  and a working screen has none, but nothing about the palette depends on which
  portal you are in.
- **`Masthead`** (`src/components/layout/Masthead.tsx`) is that band: eyebrow,
  display headline, lead, and up to four figures. Every public page uses it.
  `PageHeader` is its paper echo on working screens — a saffron rule, then the
  title.
- **`.deep` / `.deep-field` / `.slab` / `.column3d` / `.ticker` / `.reveal`** live
  at the foot of `globals.css`. `.deep-field` is bounded on purpose — an earlier
  version spread it past the viewport before rotating it in perspective, which
  produced a composited layer several times the size of the screen and cost more
  to rasterise than the rest of the page combined.
- **A gradient ground must also declare `background-color`, and declare it with
  `background-image`, not the `background` shorthand.** `.deep-field` had
  `background: <gradients>`, which computes `background-color: transparent`;
  the element carried `.deep` as well and the shorthand silently reset it, so
  the ledger showed through wherever a gradient did not paint.
- **Do not name a utility class after a Tailwind one.** The extruded card was
  first called `.block`, which collided with Tailwind's `display:block` utility
  and gave every `<span className="block">` a card shadow. It is `.slab`.
- **Bricolage Grotesque loads from Google Fonts** via `index.html`. It is the only
  network font dependency; everything else is self-hosted under `public/fonts/`.
  If the app must run offline, self-host it the same way and drop the two
  `<link rel="preconnect">` tags.
- **`useReveal`** (`src/lib/reveal.ts`) is one IntersectionObserver for the whole
  page and no-ops entirely under reduced motion, where the stylesheet already
  shows everything.

### The signature is a case file, not a diagram

`GateFile.tsx` draws an open case: a cover with its number and subject, then the
seven gates written down the page — three stamped with a date and a green ring,
one open and flagged saffron, three still blank. It tilts a few degrees towards
the pointer and the rows deal in on load; both stop under reduced motion.

It replaced `GateStair.tsx`, seven extruded treads in CSS 3D. The stair was a
diagram of a process rather than a picture of this one, and at any angle but the
intended one it read as a broken zigzag. If you are tempted to reach for abstract
geometry again: the thing this subject actually owns is the file, and drawing the
file is what lets the page claim "from challenge to contract" and be believed.

### An order is a line, not a grid

`How it works` used to argue "this process is defensible" with two grids of identical cards — nine
stage boxes, then seven gate boxes. A grid is a bad drawing of an order: it says these nine things
exist and nothing about the fact that they happen one after another and that seven of the joins are
signatures. Three devices replaced it, all in `globals.css`:

- **`.run`** — the spine. One rule down the list, running from `--saffron` at the top to
  `--verify` at the bottom, which is the same sentence the hairline under the top bar says: open at
  one end, cleared at the other. `.run-mark` is the opaque 40px marker threaded onto it, carrying
  either a stage number or a gate identifier. `.run-gate` is the bar a decision draws across it —
  a gate is not another step, so it is not another card.
- **`.act-card`** — the three-act legend standing beside the run, lit on the act you are reading.
  Three across from `md`, **never from `sm`**: `sm` is 360px in this product, and three cards on a
  phone measured 110px each and clipped their own headings. The run-time audit caught it; a static
  guard cannot.
- **`.span-strip`** — the same nine stages drawn a second way, to scale on a calendar, with the
  seven decisions marked in saffron. It has a data table beside it, like every other chart here.

The lit act is measured, not observed. An `IntersectionObserver` was tried first and went stale on a
short window: the steps are tall enough that none of them intersects a narrow band, the set empties,
and the legend keeps the wrong card lit. It now recomputes from `getBoundingClientRect().top` against
a reading line at 40% of the viewport, one measurement per frame — the same shape as the top bar's
scroll progress.

### Full bleed, and where the clip has to live

`.full-bleed` pulls a section out to the window edge with
`margin-inline: calc(50% - 50vw)`. `50vw` counts the scrollbar, so the section
overshoots by half a scrollbar on each side, and something has to clip it.

That clip belongs on `.app-root`, the shell's outermost `div` — the only element
in the product as wide as the window. It used to sit on the page wrapper inside
the 1440px column, where it clipped the very bleed it was meant to protect: every
landing band stopped short of the window edge with a strip of ledger showing
beside it, which is what "the home page is not working" meant. Use `clip`, not
`hidden` — `hidden` would break the top bar's sticky positioning.

### The challenge document is panels, not a scroll

`ChallengeSectionContext` owns which part is open; `ChallengeDocumentNav` is the
control and `Section` in `ChallengeDocument` renders `null` unless it is the one
selected. Only one section is mounted at a time. The marker in the index is a
single box that slides between items (measured with `offsetTop`), and the
arriving panel animates with `.panel-in`, keyed on a sequence number so it
restarts on every change.

A challenge is not read front to back — a founder checks the outcome, then the
budget, then eligibility, and compares them against another challenge. If you
add a section, add it to `CHALLENGE_SECTIONS` and the nav picks it up.

### The top bar is deep on every route

There is no header tone switch. `useUi().headerTone` and `src/lib/headerTone.ts`
existed to make the bar transparent over a dark hero and solid elsewhere, and
they are gone: a bar that changes colour per page is exactly what made the
product look like it was changing colour at random. `.topbar` carries
`--deep` unconditionally; `data-scrolled` changes only its elevation and blur.

The bar's own markup is written in the deep inks directly rather than restyled by
a descendant selector. A blanket `.topbar .text-ink { … }` rule would also repaint
the popover panels hanging off it, which are paper.

Below 1024px the primary nav does not fit, and it used to be dropped entirely —
leaving the wordmark as the only way out of a page. There is now a Menu popover
carrying the same destinations in the same order. Every control that duplicates
an icon or a count drops its label below `md`: the four controls plus the
wordmark measured 402px against a 375px window, and the menu button was the one
pushed off the edge.

### Rules added in the last design pass

- **One colour per card grid.** `ChallengeCard` and the stage slabs take a single
  accent. Do not reintroduce a per-sector colour map: it read as a six-category
  chart and implied a difference between cases that does not exist.
- **Motion goes through the tokens.** `--ease`, `--swift`, `--settle`,
  `--arrive` and the `.swift` / `.settle` / `.press` / `.lift-on-hover` / `.rail`
  utilities in `globals.css`. Everything is disabled under reduced motion in one
  block at the foot of that file.
- **`.full-bleed` + `.bleed-root`** let a landing section reach the window rather
  than the 1440px column. Margin-based, so it never counts the scrollbar;
  `.bleed-root` uses `overflow-x: clip` and not `hidden`, because `hidden` would
  break the top bar's sticky positioning.
- **In-page anchors** rely on `scroll-padding-top: 88px` on `<html>`, set once,
  rather than a `scroll-mt-*` on every section. `ChallengeDocumentNav` adds a
  scroll-spy so the index says which section you are in.
- **The top bar** measures its active item and slides one rule between
  destinations (`.nav-rail`), and switches to glass on scroll via
  `data-scrolled`. `Mark.tsx` is the identity: three treads of the gate stair.

### check-design.mjs — the design law, enforced

`node scripts/check-design.mjs` (wired into `npm run check`) reads the scales out of
`tailwind.config.ts` and fails the build on anything that would silently do nothing. It exists
because Tailwind emits no rule at all for a class it does not recognise — no warning, no error, just
an element with no padding or no colour — and this product has been bitten by that repeatedly.

What it catches, each of which has actually shipped here at least once:

| Kind | What it means |
|---|---|
| `dead-spacing` | A step outside the closed scale. `h-9` and `h-11` were live on two CTAs with no height at all. |
| `unknown-colour` | A colour name not in the palette. |
| `dead-opacity` | **`bg-signal/15`, `ring-verify/25`.** Every colour here is `var(--x)`; Tailwind cannot compute an alpha from a value whose channels it does not know, so the whole declaration is dropped. Verified against the built stylesheet. A translucent tint must be its own token — see `--signal-veil`, `--saffron-veil`, `--seal-veil`. |
| `hardcoded-colour` | A literal hex or `rgba()`. An arbitrary value is allowed only when it reads a token, which is how `accent-color` gets the palette. |
| `contrast` | A bright cut used as text on paper, or a paper ink used as text on the deep ground. It skips a line that carries inks from both families, because that is a tone ternary — which is why `Badge`, `Breadcrumb` and `Mark` take a `tone`/`ground` prop. |
| `arbitrary-type`, `hand-set-leading` | The type scale owns size and line-height. |
| `ad-hoc-motion` | A `transition-*`/`duration-*` utility instead of `.swift` / `.settle` / `.press`. |
| `any`, `browser-storage` | The two hard bans. |

A noisy guard gets ignored, so it deliberately checks only what is unambiguously wrong. When it is
wrong, fix the guard — do not add an exception in a component.

### audit-design.js — the checks a static guard cannot make

`public/audit-design.js` is browser code, loaded into a running page:

```js
const s = document.createElement('script');
s.src = '/audit-design.js';
document.head.appendChild(s);
window.__audit();   // contrast, clipping, heading order, unnamed controls
```

It exists because `check-design.mjs` reads class strings, and the things that
actually break in this product are composited at run time. Everything below was
found by this and could not have been found any other way:

- **The primary button had no colour under its gradient.** `.btn-primary` painted
  `background-image` only, so `background-color` stayed transparent and its white
  label measured **1.2 : 1** on the page ground. A gradient is an image; if it does
  not paint, nothing does.
- **`--saffron-ink` cleared on one paper ground and failed on the other** — 5.3 : 1
  on `--sheet`, **4.49 : 1** on `--ledger`. Both grounds have to be measured.
- **The scrolled top bar let the page through.** At 82% opacity the content
  behind lifted the ground enough to drop the dim control labels to **4.35 : 1**.
  It is now 92%, measuring 5.8 : 1. An audit taken at the top of the page never
  reaches this — **scroll before you measure.**

Three parser gaps cost three false alarms before it could be trusted, all of them
worth knowing:

| Reported as | Actually |
|---|---|
| `rgba()` only | Chrome resolves `color-mix()` to **`color(srgb r g b / a)`** — 0-1 floats, not 0-255 |
| every nav label unreadable | the label sits on a pill painted by an **absolutely-positioned sibling**, which no ancestor walk can see; elements with a positive z-index are skipped and counted in `stackedSkipped` |
| `text-ink` on a deep ground | a **tone ternary** — one component correct on either ground. A line carrying inks from both families is skipped |

If it reports something, confirm the mechanism before fixing the symptom; if it
is wrong, fix the audit rather than working around it in a component.

### The nav breakpoint is measured, not guessed

The seven-item primary navigation needs 651px of track and had 518px at 1024,
so between `lg` and `wide` it was overflowing into a horizontal scrollbar inside
the bar. `screens.wide` (1240px) is where it actually fits; below that the Menu
popover carries the same destinations in the same order. If you add a nav item,
re-measure — do not assume `lg` still holds.

### Shared pages are mounted under every portal

An evaluator needs the published challenge; a validator needs the published result; the PMU needs the
transparency figures. Those used to be linked straight at the public route, which mounted
`PublicShell` — so following "Public transparency" from the programme management unit replaced the
whole navigation with the public one and left no way back. It reads as being thrown onto somebody
else's site, and it was the loudest bug report against this build.

Every shared page is now mounted under `/s`, `/d`, `/e`, `/v` and `/a` as well as `/`, and
`src/lib/portal.ts` is how a link to one gets the right prefix. `usePortalLink()` returns a function
that prefixes a path with the portal you are standing in. Two paths cannot be mounted twice and fall
back to the public route by design: `/d/challenges` is the department's own pipeline and
`/a/templates` is the editable register — both are listed in `OCCUPIED`.

The top bar names the portal under the wordmark for the same reason. If you add a shared page, mount
it in all six places and link to it through `usePortalLink()`.

**`portalHref` has no case for `/`.** `portalHref('/d', '/')` returns `/d/`, which is the department
dashboard rather than the demand board — no portal mounts the demand board, because a portal's own
index is its landing page. Anything listing all seven public destinations must special-case it.

### Hindi, and the guard that now enforces it

Switching to Hindi changes the chrome — portal name, all six navigations, the
account and alerts menus, the footer, the register's masthead and pager — and
the page bodies of the public challenge register and document, the demand
board, how-it-works, sign-in and registration, the department pipeline and
workspace, pilots, results and the catalogue. **330 keys, both languages.**

**Navigation labels are translation keys, never English strings.** Every shell
holds `{ to, labelKey }`; `src/config/nav.ts` does the same. A label added to a
bar without a key is the odd one out.

#### scripts/check-i18n.mjs — because a missing key is invisible

A key that does not exist does not throw. i18next falls back to English and,
failing that, **prints the key itself** — so a half-finished translation looks
like a working page with `deptCases.pipeline.heading` written across the top of
it, and nothing in the build says otherwise.

That is exactly what happened here: a translation pass converted eleven page
files to `t()` calls and died before it wrote the bundles, leaving **283 keys
called and absent**. Nothing caught it. `npm run check` now runs
`check-i18n.mjs`, which fails on any key that is called but missing from either
bundle, and prints the file that calls it.

Two traps it was written around, both of which bit while writing it:
- The bundles are TypeScript, not JSON, and are read with a small parser rather
  than imported — a check that must compile the app before it can check the app
  is a check nobody runs.
- A line is a nested object when it **ends with** `{`, not when it contains one.
  Half these values carry `{{interpolation}}`, and treating those as objects hid
  every one of them; the first run reported seven false positives.

#### What is still English

48 of 70 page files, and the shared components that carry their own words:
`Badge`/`StatusBadge` (Awarded, Cleared, Blocked), `SlaClock` (Overdue by three
months, Due in 13 days), `Feedback` (the empty and error states), `QueryState`.
Those four are the highest-value remaining targets by far — they appear on every
screen, so translating them moves more visible text than any single page would.

The mechanism is right and the work is mechanical: lift the string into
`en.ts`, add the Hindi, call `t()`. `check-i18n` fails the build until both
bundles agree, so it cannot be half-done again.

Two rules the bundles keep:
- Whole sentences with named interpolation, never concatenation; counts use
  `_one`/`_other` plural keys.
- **Legal text is absent on purpose.** Clause text is authoritative and lives in
  `config/templates.ts` in its original language with a labelled plain-language
  reading aid beside it. It is never machine-translated into something somebody
  has to sign.

### Two step indicators became one

The challenge studio drew its progress twice: `WizardShell`'s numbered list down
the side, and its own capsule rail across the top of the form, saying the same
eight things. `WizardShell` now takes an optional `rail`, and the capsules —
the better drawing, because they carry each step's state and not only its name —
stand in the column. The form got the width back.

### Pagination lives in the register, not in seven pages

`LedgerTable` takes an optional `pageSize`. Sorting, filtering, the CSV export
and the total all still act on the **whole** register; only what is drawn is
cut. The pager keeps the first and last page and the three around you, with an
ellipsis for the rest — twenty numbered buttons is not navigation, it is a
second table.

On: the evaluator queue (10), the validator queue (10), and the programme
management registers — audit (20), configuration (12), users (12), rules (10),
integrations (12). Off everywhere else, because a pager under six rows is chrome
pretending to be navigation.

### The chip is a label

It briefly opened a menu of destinations, and every one of them was already a
line above it in the bar. The bar carries the pages; the chip carries the name
of the desk you are sitting at.

### The carousel advances itself

`CardCarousel` takes `dwellMs` (5s on the demand board) and moves on its own,
wrapping at the end, so a reader who leaves it alone sees all nine stages. The
live marker fills over the dwell, so the move is announced rather than sprung
on them mid-sentence.

**Any sign of attention stops it permanently** — hovering the run, tabbing into
it, or touching a control. It does not resume. Resuming is what makes these
things infuriating: the moment you look away from the card you were reading, it
leaves. The `aria-live` region is also silent while it is advancing on its own;
announcing a slide change every five seconds is a screen reader talking over
whatever else the reader is doing.

It does not run at all under `prefers-reduced-motion: reduce`. A thing that
moves on its own is precisely what that setting is about, and the arrows and
markers are still there.

### Testing in the Browser pane: two things that look like bugs and are not

Both of these cost real time before they were understood. Neither is a fault in
the product.

1. **Programmatic scrolling does not dispatch `scroll`.** `window.scrollTo` and
   `scrollIntoView` move the page but fire no event, so every scroll-driven
   feature reads as frozen — including the top bar's own progress hairline and
   its scrolled state, which are pre-existing and known good. Fire
   `window.dispatchEvent(new Event('scroll'))` after moving.

2. **`prefers-reduced-motion: reduce` is ON in the pane.** So anything correctly
   gated behind it — the carousel's autoplay, the reveal-on-scroll — is disabled
   and looks broken. To verify such a feature, stub `window.matchMedia` to
   return `{ matches: false }` for that query and force a remount by navigating
   away and back client-side; the effect then re-reads it.

Related, and also environmental: **the MSW session store is in memory and resets
on reload.** A full page reload signs you back in as `USR-D01-OFF`. To test a
signed-out or another-role state, drive the account menu in the UI rather than
POSTing to `/api/auth/login`, because a raw fetch changes the server's mind
without invalidating the client's cached session.

### useActiveAnchor

`src/lib/inview.ts`. An index beside a long document lights the entry for the
section on screen, so it says where you are and not only where you could go. It
measures positions against a reading line on every frame the page moves rather
than watching for intersections — the observer version went stale on short
windows, exactly as it did on the how-it-works act legend.

**Verifying it in the Browser pane needs a synthetic event.** Programmatic
`window.scrollTo` and `scrollIntoView` do not dispatch `scroll` in that
automation context — the top bar's own progress hairline is frozen there too, so
this is not a bug in the page. Fire `window.dispatchEvent(new Event('scroll'))`
after moving, or every scroll-driven feature reads as broken.

### Signing in

`/login` leads with a real credential form — work email, password with a reveal
toggle, `autocomplete="username"` and `"current-password"`, a Zod schema that
checks shape only. **Sign-in deliberately does not apply the password policy:**
doing so would lock out an account created before the policy was tightened,
which is exactly the account that most needs to get in and change its password.

The demonstration switcher is still there, below, because a reviewer should not
have to hold seven sets of credentials to see seven screens — but it is no
longer the headline.

`POST /api/auth/login` now takes `{ email, password }` beside the old
`{ userId }` / `{ role }`. **The one thing a real backend must replace** is
marked in the handler and stated on the page itself: there are no stored hashes
here, so the credential path resolves the address and accepts any password that
was typed. A real implementation verifies the hash, rate-limits the attempt, and
returns the same refusal for a wrong password as for an unknown address, so the
response cannot be used to enumerate accounts. The client is already written
against that contract — it renders whatever refusal it is given and never
distinguishes the two cases.

### The chip shows your portal, not the pavement

Signed in, the chip under the wordmark lists **your portal and nothing else**.
The public site is the front of the building; somebody already through the door
does not need directions back to it. Signed out, the chip is the public site,
because that is then the only thing there is — and signing out navigates to
`/` rather than leaving you on a page you can no longer open.

The Menu below the navigation breakpoint follows the same rule: it renders the
`links` it was given, which is already the right list either way.

### A sequence is not a grid

`CardCarousel` (`src/components/patterns/CardCarousel.tsx`) reads a run of cards
one at a time with the neighbours left on screen, set back. The demand board's
nine stages use it: a grid of nine equal blocks said "here are nine things",
which is true and not the point — they happen in order, and what is behind and
what is ahead is the fact the section exists to state.

It is a list, not a slideshow. Every card stays in the document and in the tab
order, focus brings a card forward (otherwise tabbing lands on something scaled
back and half transparent), and both controls update from the current index
rather than the one their render closed over — three quick clicks advanced one
card before that.

### The three acts, drawn

`src/components/domain/ActScene.tsx` holds three line-art scenes, one per act of
How it works: an officer measuring what the problem costs today, three
applications scored against one published rubric, a validator sealing a reading
against its baseline. They are not stock illustration — each draws the artefact
that act actually produces, in the product's own line weight, with every stroke
a token, so they cannot drift from the palette and cost about a kilobyte each
with no image request.

### The notice board and the document room

The public site is narrowed to what a procurement portal actually publishes:
**you may read what is needed without an account, and you register to read the
documents and anything that names a company.**

Open to anyone: `/` the demand board, `/challenges` the register (every field on
a card is one a tender notice carries anyway), `/how-it-works`, and the sign-in
and sign-up routes. Everything else mounted on the public shell is wrapped in
`RequireAccount` — the challenge *document* with its rubric, clauses, data tiers
and field lists; `/results`, `/catalogue`, `/startups/:id` which join a named
company to a measured verdict; `/templates`; `/transparency`. Only the PUBLIC
shell's copies are guarded: being inside a portal already means being signed in,
and `PortalGuard` has already refused anyone who should not be there.

Like `PortalGuard`, it refuses in the open rather than redirecting, because a
bounce to `/login` hides the boundary and loses the page the reader wanted.
`publicLinksFor(signedIn)` in `src/config/nav.ts` drives the top bar and the
footer, so neither offers a link the next click would refuse.

**The gate was not enough on its own.** `/api/results` carries `startup.tradeName`
and the validator's name for every finished pilot, and the demand board fetches
it to draw three counts — so gating the page would have left the identifying
payload crossing the wire to a signed-out visitor. The handler now projects by
role: signed out it answers `{ id, outcome }` and nothing else. `ResultRow` makes
every identifying field optional and `isIdentified()` narrows it, so a component
cannot read a company name it was never sent.

### The register — one LedgerTable, nineteen files

`LedgerTable` is used by 20 call sites, so one redesign lifts every screen in the
product and the blast radius is total. What it now does:

- **One bound object.** The controls used to sit on their own sheet with a gap
  under it, which read as a toolbar that happened to be near a table. Masthead,
  ruled body and double-ruled total are one rounded panel.
- **A deep masthead**, the same ground every page in this product opens on, with
  a register mark, the row count, the active-filter pill and four drawn controls.
  The `<thead>` continues it under a saffron hairline, so a long table's column
  names stay the masthead when they stick.
- **Filters moved out of the header cells** into a row of their own behind a
  Filter toggle. They were making every header in the product twice as tall
  whether or not anybody was filtering.
- **An empty state that says what happened** — it names the filters that excluded
  everything and offers the way back. This is the state readers actually reach;
  emptiness before filtering is handled upstream by `QueryState` on 13 sites.
- `title` is the one new prop, and it is optional.

Four live bugs were fixed in the same pass, all found by surveying the call sites
rather than by looking at the component:

| Bug | Where it bit |
|---|---|
| A stale filter survived a wholesale `columns`/`rows` swap, so every row was excluded and the table read as empty | `/d/reports`: filter, switch report, blank page. Fixed by resetting on a stable `columns.map(c => c.key).join('|')` signature — keying off the array itself would loop on all 20 sites, since every one builds it inline |
| A `<Link>` inside a clickable row navigated **and** fired the row handler | `/d/payments`: the pilot link also opened the approval dialog. The row handler now ignores clicks that land on `a,button,input,select,label` |
| The frozen first column inherited a transparent background, so the table scrolled visibly under it | Every neutral row, below `md`. `TONE_WASH.neutral` is a real colour now, and the frozen cell carries the row's wash rather than inheriting it |
| Row windowing assumed 44px rows and drifted | `/a/audit`, 400 rows, already taller than 44 with a 2-line actor and wrapped prose. Windowing is gone: above 200 rows the body scrolls in place instead. Doing it correctly needs measured heights, and rendering 400 rows costs less than getting that wrong |

Also: `admin/Rules.tsx` gained the `min-w-0` its `1fr` track needed — without it
the register's intrinsic width pushed the 420px rule editor off screen at `lg`.

**Do not**, on the evidence of that survey: switch to `table-layout: fixed` (four
sites declare under half their width), truncate or single-line cells (fifteen
stack three lines in the first column), change `px-3 py-2 align-top` (four widget
classes assume a plain block td, and `admin/Users`' `Switch` bleeds into the
padding on purpose), move `TONE_FIGURE` onto the child (eleven right-aligned
cells already put a widget with its own ink inside, and it should win), or add
anything that measures on mount (`department/Pilots` renders inside a `<details>`,
so it computes against a 0×0 box there and nowhere else).

### Sign-up

`/register` is a chooser; `/register/startup` and `/register/expert` are the forms.
Government officers are deliberately absent — `account.officersSelfRegister` is
`false`, and the page says why rather than leaving somebody hunting for a link.

The account half was missing entirely: neither form collected a password. Both
now open on the same account section (name, designation, work email, mobile,
password, confirm) built from one shared Zod shape, so the two cannot drift.

- `PasswordInput` has a real reveal toggle with a pressed state and announces
  caps lock; `PasswordStrength` is never colour alone — segments, a verdict and
  what is still missing.
- `src/lib/password.ts` holds the measuring logic, because three things need the
  same answer: the meter, the schema, and the server-side check.
- **The rule is configuration.** `account.password.minLength`, `.minClasses`,
  `.maxLength` and `account.terms.version` are in the ledger at `/a/config`, and
  the consent records the version it accepted.
- `POST /api/auth/register` parses with the same schema the form used, refuses a
  duplicate address with 409, and returns a receipt — never an echo of what was
  typed, and never the password.

### The view switcher — the public site is a place, not a dashboard

The application opens on `/` while a session is already held (`USR-D01-OFF`, the department nodal
officer), so the public bar looked like the signed-in home screen. Switching role then navigated to
that role's portal and replaced those seven links with six work links, which read as a screen
vanishing rather than a deliberate move between two places.

The chip under the wordmark, which already said which portal you are standing in, is now the control
that says how to leave it (`src/components/layout/ViewSwitcher.tsx`):

- **Inside a portal** it lists the seven public destinations, each resolved through `portalHref` so
  following one keeps your navigation and your identity. The two `OCCUPIED` fall-throughs and the
  demand board are labelled "leaves your portal" rather than silently doing it.
- **On the public site** it says so in as many words, and offers the way back — "Back to your own
  work", naming the role you are signed in as, or a route to `/login` if you are not.

The seven destinations live in `src/config/nav.ts` as `PUBLIC_LINKS`. `PublicShell` reads it and so
does the switcher; a second copy would have drifted the first time one was renamed. Below the nav
breakpoint the chip is hidden, so the Menu popover carries both groups under their own headings.

**Nine hardcoded public links inside signed-in portals were dropped onto the public shell** and are
now fixed: a page that lives in exactly one portal names its own prefix (`/e/challenges`,
`/v/results`, `/s/challenges`), and a page mounted under every portal goes through `usePortalLink()`.
`startups/:id` was mounted in one place only and is now mounted in all six. Two offers that ended at
the portal guard are gone: the catalogue's "Adopt this in my department" is gated on
`can(role, 'create', 'challenge')` rather than a hand-written role list that included the PMU, and a
published challenge only offers "Open the departmental workspace" when `portalFor(role) === '/d'`.

### The page head, and the two grounds

`PageHeader` renders `.page-head`: the same deep gradient band the public pages open on, rounded into
the working column, with a receding surveyor's grid. Every working screen in every portal opens on
it, which is what stopped a startup's "Waiting on you" reading as an unstyled document. It takes an
optional `eyebrow` naming the kind of screen.

The consequence to remember: **the aside of a PageHeader is on the deep ground.** A `Badge` there
needs `ground="deep"`, and paper inks are unreadable on it. The guard catches the static cases.

### The spacing scale, and why there is a check for it

`npm run check` runs typecheck, lint and `scripts/check-spacing.mjs`. The last
one fails on any `p-` / `m-` / `gap-` class whose step the scale does not
define, because **Tailwind emits nothing for a missing step rather than
warning**. Forty-nine such classes were live in the codebase and doing nothing:
`px-5` on every challenge card (which is why the text sat flush against the
border), `pl-5` on twenty-eight bulleted lists, `mt-10` on most section gaps.

The scale now runs 2/4/6/8/12/16/20/24/28/32/40/48/64. If you need a step that
is not there, add it to `tailwind.config.ts` — the check will tell you the
moment you have not.

### Typography and colour rules that are load-bearing

Four defects were found and fixed by measuring rather than by eye. Each has a
rule attached; breaking the rule reintroduces the defect.

- **Never set `line-height` by hand.** The scale in `tailwind.config.ts` carries
  it for every size. Ad-hoc `leading-*` had the same 15px paragraph reading at
  1.6 in one card and 1.87 in the next, and a 108px headline at 0.92 put the
  tail of a "p" through the line beneath it.
- **`.type-register` must not set `font-size`.** It did (`0.92em`), and it
  silently beat every `text-*` class used alongside it — a figure asking for
  24px came out at 13.8px. It now sets family, `font-size-adjust` and tracking
  only; the caller owns the size.
- **The lit accents are not text colours on paper.** `--saffron` measures
  1.9 : 1 on `--sheet`. Use `--saffron-ink` for a label on a card, and the lit
  cuts (`--saffron`, `--signal`) only on the deep ground or as a non-text rail.
- **The signature is a case file, not abstract geometry.** `GateFile.tsx` draws
  the object this subject actually owns. Its predecessor, `GateStair.tsx`, was
  seven extruded treads whose offsets had to be computed from the stair's own
  centroid to stay centred at any scale — an earlier version measured the
  projected drawing and fed the miss back as an offset, and oscillated. If you
  are tempted back towards abstract 3D, that is the cost, and the drawing still
  read as a broken zigzag at the end of it.

Two notes on verifying this work in the browser pane: it runs with
`prefers-reduced-motion: reduce`, so every animation is off and what you see is
the static fallback; and it serves **stale frames** after a navigation until
something forces a repaint. `window.scrollBy(0, 1)` before a screenshot is
enough. A screenshot that looks identical after a change is usually the pane,
not the code — verify with `getComputedStyle` before believing it.

### What is deliberately not there

- **No automated test suite.** Verification is manual plus scripted in-browser
  probes. If the next session adds one, Vitest + Testing Library against the same
  MSW handlers is the natural fit, and the business-rule table in §6 is the list
  of cases to write first.
- **Hindi covers the chrome only.** ~99 keys of navigation and shell. Page
  content, case content and legal text stay in the language they were written in
  — the language menu states this rather than implying full translation.
- **Print is styled but not proofed on paper.** The stylesheet is correct and
  loaded; nobody has run an actual print preview.

## 3. COMPLETE DECISION LOG

### Design decisions (from the mandated §122 pre-build architecture, delivered in chat and approved with "START NOW")

| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| D1 | **The dwell rail** — the gate ladder's vertical gap between nodes is proportional to days actually spent at that gate: `gap = clamp(28px, 28 + days × 1.4, 168px)`, hairline tick every 7 days, `⋮` break mark above the cap with the true figure still printed. | This is the product's signature. It makes institutional delay physically visible in the primary navigation — the one thing a generic pipeline widget can never say. | An evenly-spaced stepper. |
| D2 | **`SealStamp` is a form, not a colour** — double-hairline rect rotated −1.5°, taking the status's own colour (verify for cleared, seal for rejected). | §13 allows `--seal` on at most one major element per viewport. A red stamp on a *cleared* gate would clash semantically and burn the red budget. | A red badge for every stamp. |
| D3 | **`--hold` (#B47500) is never used for body text.** Measured 3.83:1 on white — fails AA. Amber appears only as a 2px marker, border or wash; the words stay in `--ink`. | §101 demands 4.5:1; §110 bans colour-only status. It also structurally enforces "status = wash + marker + words". | Darkening the hex (would violate "use exactly this palette"). |
| D4 | **Citation gutter** — decision and document surfaces print the rule citation, effective date and actor in micro type beside the claim; deliberately *not* on list and dashboard surfaces. | Government files have marginalia; provenance becomes ambient and proves §7 on the surface. Restricting it was the deliberate "remove one accessory". | Tooltips. |
| D5 | Public landing hero = **a sentence of fact plus a table**, ~180px tall. | §30 bans a marketing hero; the hero must prove government demand. | Gradient hero, three feature cards. |
| D6 | `FileCover` is a **ruled government form**: boxed case id, subject line, then a hairline-divided strip of cells. | §19 explicitly bans a rounded dashboard card. | Rounded card. |
| D7 | Template **cards only on `/templates`**. | §35 says so; everywhere else uses ruled rows. | Cards throughout. |

### Architecture decisions

| # | Decision | Why |
|---|---|---|
| A1 | **`evaluatePreconditions()`** lives in `mocks/handlers/challenges.ts` and is re-run on every gate read and every gate decision. | A stale pass is not a pass. Imported by `handlers/gates.ts`. |
| A2 | **Business rules are enforced server-side in MSW, not in components.** | §111 and §118. Components surface the error; they do not own the rule. |
| A3 | **Money is paise (integers) everywhere.** `MoneyInput` takes and returns paise. | No float ever touches a rupee. |
| A4 | **Every API response carries `servedAt`** (shifted 3h back under the `stale` scenario). | §98 freshness on money and gate decisions. |
| A5 | **Fixed seed clock** `NOW = 2026-09-03T10:42+05:30`; `db.now()` advances from it in real time. | Keeps day counts, ageing and dwell internally consistent. |
| A6 | **Role switching goes through `POST /api/auth/login`**, mutating server-side session state. | So the switch genuinely changes what the API permits. |
| A7 | **Hero case complete through G5 with G6 open.** | The demo finishes on a *live* action while every upstream screen still has real content. |
| A8 | `handlers/util.ts::gate()` applies the active scenario **before** handler logic. | Scenario states are genuine API behaviour, not component pretence. |
| A9 | **Config accessors throw on unknown keys.** | Fails loudly if a component invents a threshold. |
| A10 | **A challenge owns gates 0–3 only; its pilot owns 4–6.** An awarded challenge has G0–G3 cleared and no open gate. | A challenge sitting at "gate 5" is meaningless — that decision is about the pilot. |
| A11 | Charts are **lazily imported**; `vite.config.ts` has explicit `MOCK_DEPS` and `CHART_DEPS` lists so msw's and recharts' dependency trees stay out of the app shell. | §102's ≤200 KB gzipped public-route budget. Measured at 117.4 KB. |
| A12 | **`src/mocks/browser.ts` falls back to patching `window.fetch`** when a service worker cannot register. | The in-app browser pane refuses service workers; without this the app is a blank page. |
| A13 | **`PortalGuard`** names the portal, names who you are, and refuses — with no way through. It used to offer one-click "Sign in as …" buttons for the roles the portal wanted; those are gone, and so is the seven-role switcher that was in the account menu. `/login` is the only door. | §97: never hide a boundary — but a refusal that hands you the way around itself is decoration. Changing who you are is an act, and it happens on the sign-in page. |
| A14 | **Jurisdiction is a second, separate check from RBAC**, in `src/config/jurisdiction.ts` (the `REACH` table) and enforced by `src/mocks/handlers/jurisdiction.ts`, an `http.all('/api/*')` handler registered **first**. It resolves the record a path names, works out who owns it, and refuses with `403 OUT_OF_JURISDICTION` if the signed-in account has no standing. Returning nothing falls through to the real handler. | RBAC answers "may this role do this to this kind of thing". It cannot answer "is this your case" — a Pune officer holds identical permissions to a Kota officer and neither may open the other's file. Putting it in front of every endpoint means a link is never an authorisation, whatever produced it: a notification, an alert, a bookmark, a redirect after signing in. |
| A15 | **`/api/challenges/:id` serves two documents.** `?view=case-file` is the department's working record (gate ladder, applicants, drafts); without it, the published notice, which any account may read. `useChallenge(id, 'case-file')` is passed by the department workspace only. | One URL cannot be both. Publishing a challenge publishes the challenge, not who applied to it or what the department decided. |
| A16 | **The session starts signed out** (`src/mocks/store/session.ts`, `currentUserId = null`). | It used to open on `USR-D01-OFF`, so the product booted inside a department: the public site showed the document room, "Sign in" appeared to sign you in as a stranger, and a reload after signing out put you back at that stranger's desk. |
| A17 | **Site policies live in `src/config/legal.ts`**, with English and Hindi in the same record, rendered by one page at `/legal/:document` mounted under every portal. | A policy is a document the programme revises, like every other rule in `config/`. Both languages together because a clause and its translation are one decision: edited apart, they drift, and a privacy policy that says two different things in two languages is worse than one that says nothing. **These are the site's own policies (privacy, terms, copyright, accessibility, disclaimer), authored bilingually — not the contract clause library, which stays English (see constraint 9).** |

| A18 | **`Select` is not a `<select>`.** It renders a button and a listbox of our own (`src/components/ui/Field.tsx`), keeps the `e.target.value` call signature the twenty-two call sites already used, and measures on open so it flips upwards and caps its height inside whatever scrolls around it. | The closed control could be styled and the open list could not. Every filter, report picker and rubric chooser broke character at the moment somebody used it: system font, system blue, square corners, dropped over a page set in Bricolage and Anek. The cost is that keyboard, typeahead and click-away are now ours to maintain — written out in full rather than half-done. |
| A19 | **`SectionRail` switches sections; it does not scroll to them** (`src/components/patterns/SectionRail.tsx`). Used by the clause library, the audit pack and the seven gates. | Three screens had grown a sticky index down the left that then rendered every section under it anyway. Picking "Intellectual property" out of a list of six means *show me that one*; what it did was scroll to a heading with the other five still attached. The rail carries a step to the next section at the foot of the panel, so the set is still one document. |
| A20 | **A percentage against "Target achieved" is capped at 100** — `progress()` for the figure, `beyondTarget()` for the overshoot, both in `MeasurementChart.tsx`. `achievement()` stays uncapped for anything that wants the raw ratio. | It was printing "Target achieved · 111%". The 111 was real — the share of the *targeted improvement* made — but next to those words it reads as a share of the target, and a target cannot be 111 per cent achieved. The overshoot is now stated as what it is: how far past the target the reading sits. |
| A21 | **A blocking screen takes the masthead.** The conflict declaration and the scoring workspace open on `PageHeader` like every other screen in the product. | They were the two screens in the evaluator portal that opened on a bare `h1` over loose paragraphs, which is why they read as unfinished. A screen that stops somebody has to be the most legible thing in the portal, not the least — it is the point at which a person is asked to put their name to a statement. |
| A22 | **One page, one scroll.** `ScoreWorkspace` no longer caps and scrolls its proposal column; the case shell's rail and dock stick instead. | A column with `overflow-auto` inside a page that also scrolls gives the wheel two possible meanings depending on where the pointer is, and the page itself never moves. |

| A23 | **Content is negotiated at the API.** The client sends `Accept-Language`; `ok()` runs the response through `src/mocks/content/localise.ts`, which walks every string and swaps the ones the dictionary in `src/content/` has. `challenge.title` is still a `string`. | The alternative was making every content field a bilingual pair and teaching fifty screens to unwrap it. Switching to Hindi used to give a Hindi masthead over an English challenge — title, department, state, company, officer, problem statement, baseline, unit all still English. That is an English product with translated furniture. |
| A24 | **Identifiers are never translated** — the `NEVER_TRANSLATE` key list in the localiser. Case IDs, hashes, references, emails, slugs and foreign keys pass through untouched. | A case number is the same number in every language, and translating one would break search, sort and every join in the store. |
| A25 | **Gate names, stage titles and role labels translate through `useSay()`** (`src/lib/contentText.ts`), not `t()`. | They are read straight out of `config/*` by the component that draws them, so no request carries them. Keying them would mean a second table kept in step by hand, and `check-i18n` cannot see a key assembled at run time anyway. |
| A26 | **The two government emblems are slots, not artwork.** `public/emblems/` takes the official files; until then the Union mark is the national flag, drawn to the Flag Code proportions, and the state mark is a dashed plate. | The State Emblem of India is restricted by the 2005 Act to the authorities it names, and this build says on every policy page that it is a demonstration. Drawing a passable imitation would be worse than either shipping the real file or shipping nothing. |
| A27 | **The sign-in and registration pages have their own shell** (`AuthShell`, `Shell bare`). No navigation, no account menu, no alerts. | The bar above a sign-in form carried the whole site, every link working. A door that offers seven ways not to go through it is a detour — and for somebody already signed in it handed them the full document room from the one screen whose purpose is to change who they are. |
| A28 | **`startMockApi` probes `/api/health` before trusting the worker**, and falls back to the patched fetch if the answer did not come from a handler. `call()` reads the body as text and reports `MOCK_API_UNAVAILABLE` when it is not JSON. | `worker.start()` resolving means the registration succeeded, not that the worker is controlling the page. In the gap, requests reach the dev server, which answers every unknown path with index.html — so `.json()` threw a SyntaxError, which is not a `PrayogApiError`, so every screen reported its generic outage line. The sign-in page is where it showed, because it fetches on mount and is often the first page of a session. |
| A29 | **A link inside a portal goes through `usePortalLink()`**, and `scripts/check-links.mjs` fails the build on a bare public path in any page that is not the public site. Where a portal already owns the path, the shared page gets an alias inside that portal — `/d/notices/:slug`, `/a/library` — rather than falling back to the public route. | Nine pages are mounted under every portal. Linking one by its public path swaps the entire shell: a startup clicked a challenge on Matches and landed on the public navigation with no way back. Six screens did it, and nothing caught it, because the link works — it just works somewhere else. The `OCCUPIED` fallback was the same bug in the helper that exists to prevent it. |
| A30 | **The bar shows the destinations it can fit**, measured, not at a breakpoint — and re-measured once the webfonts land. When they do not fit the strip goes `invisible` and the Menu carries them. | `wide` was chosen when the widest portal had six destinations; the startup portal has eight and Hindi labels are longer. Measured at 1240px: Profile ended at x=934 and the controls began at x=859. A breakpoint cannot know how many destinations a portal has or how long they are in the language being read. |
| A31 | **`prefers-reduced-motion` removes the animation, not the content.** The stage run still advances; the CSS drops the 520ms slide so it cuts instead of glides. | Stopping the run entirely cost those readers stages two to nine — the setting took the content, not just the motion. WCAG asks for a way to stop auto-updating content, and there are three: hover, focus, or any control. |
### Decisions that must NOT be changed without strong justification

1. The **dwell rail** proportional spacing (D1).
2. `SealStamp` colour-follows-status (D2).
3. `--hold` never as text (D3).
4. **Paise-integer money** (A3).
5. **Server-side rule enforcement in MSW** (A2) — never move a rule into a component.
6. **No browser storage APIs anywhere** (§11) — Zustand and TanStack Query only.
7. **No `any` in TypeScript** (§123).
8. The **exact palette, spacing scale and radii** — pinned by the brief.
9. **Legal clause text is never machine-translated**; the Hindi bundle deliberately omits it.
10. **Mock integrations are always labelled as mocks** (§111) — `/a/integrations` and the site footer both say so.
11. The **fetch fallback** in `mocks/browser.ts` (A12).
12. **Jurisdiction is checked at the API, in one place, before any handler** (A14). Never move it into a route guard, a link filter or a component — those answer "should we show this control", which is worth nothing to somebody who arrived from a notification or a pasted URL. `PortalGuard` and `RequireAccount` exist so a refusal reads as a sentence rather than a screen of failed panels; they are not the protection.
13. **No refusal screen offers a way around itself** (A13). The demonstration accounts live on `/login` and nowhere else.
14. **No native `<select>`** (A18). If a new control needs a dropdown, use `Select`.
15. **A long register of sections gets a rail, not an index** (A19). If a page needs to show six of anything at full length, it shows one.
16. **Seeded content is translated at the API, never in a component** (A23). A new content field needs a dictionary entry, not a bilingual type.
17. **No official emblem artwork is committed to this repository** (A26). `public/emblems/` is the slot; both .svg and .png are tried.
18. **Never link a shared page by its public path from inside a portal** (A29). `check-links` enforces it.

---

## 4. ARCHITECTURE AND IMPLEMENTATION

### Layer diagram

```
index.html ──> src/main.tsx  (dynamic import of mocks/browser, then RouterProvider)
                    │
                    ├─ mocks/browser.ts ─> handlers/* ─> store/db.ts (in-memory)
                    │     (service worker, or a patched fetch if that is refused)
                    │
                    └─ routes/index.tsx ─> routes/shells/* ─> layout/Shell
                                              └─ PortalGuard ─> pages/**
components ──> config/* (policies, gates, rbac, rules, rubrics, templates, stages)
```

### Directory map

| Path | Purpose |
|---|---|
| `src/config/` | **The single source of truth for policy.** Components read it; they never contain a threshold, duration, citation or clause. `/a/config` renders `CONFIG_PARAMETERS` verbatim. |
| `src/types/models.ts` | All data contracts plus the `ApiResponse<T>` envelope. |
| `src/lib/` | `format` (Intl-based Indian money/dates/words), `sla` (the one clock), `analytics` (typed events), `ids` (seeded RNG, digest, error refs). |
| `src/mocks/fixtures/` | Deterministic seed builders. `NOW` and `iso()` come from `buildCore.ts`. |
| `src/mocks/store/` | `db.ts` (in-memory database), `session.ts` (server-side signed-in user), `types.ts`. |
| `src/mocks/handlers/` | One file per domain. `util.ts` has `ok/fail/forbidden/notFound/gate/partialFailure/emptyIfScenario/requirePermission`. |
| `src/services/hooks.ts` | Every typed query and mutation. **Add new hooks here, not in pages.** |
| `src/components/ui/` | Global, domain-free primitives, each with all eight states. |
| `src/components/ledger/` | `LedgerTable` (sorting, per-column filters, column visibility, selection, keyboard nav, saved views, CSV export, virtualisation >200 rows) plus `DataRow`, `KeyValueSheet`, `StatLedger`, `ComparisonMatrix`. |
| `src/components/domain/` | Knows about gates, money, evidence, policy; reads `config/`, never literals. |
| `src/components/patterns/` | `WizardShell`, `ApprovalBar`, `PermissionGate`. |
| `src/components/layout/` | `Shell`, `TopBar`, `CommandPalette`, `CaseWorkspace`, `QueryState`/`WidgetBoundary`, `PortalGuard`. |
| `src/routes/` | Router plus 6 portal shells (each passes `allow={[...roles]}` to `Shell`). |

### The standard page shape (copy this)

```tsx
export default function SomePage() {
  const query = useSomething(id);
  return (
    <QueryState
      query={query}
      errorTitle="Unable to load X."
      loading={<TableSkeleton rows={5} columns={5} />}
      isEmpty={(d) => d.data.length === 0}
      empty={{ title: '…', body: '…', action: { label: '…', to: '…' } }}
    >
      {(payload) => ( /* payload.data, payload.servedAt, payload.message */ )}
    </QueryState>
  );
}
```

Every page is a **default export** (the router lazy-imports them).

### Stable ids in the seeded data

- Hero challenge: id `CHL-014`, case `CH-2026-0143`, slug `smart-water-leakage-detection-pune`.
- Hero application: id `APP-HERO`, case `APP-2026-0087`.
- Hero pilot: id `PIL-HERO`, case `PL-2026-0031`. Its open gate record is `GTR-PIL-HERO-G6`.
- Hero startup: `STP-001` (AquaSense Technologies); its user is `USR-STP-001`.
- Department `DEP-01` Pune Municipal Corporation — officer `USR-D01-OFF` (R. Bhat, the default session), admin `USR-D01-ADM`, procurement `USR-D01-PRO` (D. Patil).
- PMU `USR-PMU-01`; evaluators `USR-EVAL-01..12`; validators `USR-VAL-01..03`.
- Catalogue `CAT-001`; scale-up `SCL-HERO` / `SC-2026-0004`.

### Seeded data shape (after the fixes in §6)

- 24 challenges. `GATE_DISTRIBUTION` in `buildChallenges.ts` places them: 2 at G0, 2 at G1, 9 at G2 (7 with a live application window, 2 closed for screening), 4 at G3, 3 at G4, 2 at G5, 2 at G6 — with the hero pinned to index 13.
- Blocked cases: index 11 (gate 0, genuinely missing legal pre-clearance) and index 19 (gate 2, genuinely has applications in needs review). Waiver requested on index 9.
- 9 pilots. Pune owns three: `PL-2026-0031` (validated, gate 6 open), one executing at day 52 of 90, one validated.
- The first evaluator account always sits on a live panel with undeclared assignments, so the COI interstitial is demonstrable.

---

## 5. REQUIREMENTS AND CONSTRAINTS

### Functional (§117) — the checklist to finish against

**Government:** create challenge · define baseline · define outcome · configure eligibility · configure evaluation · configure pilot · configure milestones · publish · review applicants · screen eligibility · **override eligibility with justification** · evaluate · clear gates · award pilot · monitor pilot · approve milestones · track payment · measure KPI · request validation · review validation · make procurement decision · select pathway · generate package · scale.

**Startup:** register · complete profile · verify startup info · discover challenges · understand fit · apply · save draft · resume · submit · sign contract · submit milestone evidence · track KPI · track payment · view ageing.

**Evaluator:** receive assignment · complete COI · score proposal · submit rationale · view own submission (others hidden until released).

**Validator:** review evidence · review KPI · **re-derive metric** · submit validation.

**Admin:** configure rules · rubrics · templates · SLAs · manage users · audit.

### Non-functional

- WCAG 2.1 AA / GIGW: semantic landmarks, one `h1` per page, keyboard nav, skip link, focus trap and restoration, 2px verify focus ring at 2px offset, `aria-live` polite for status and assertive for blocking errors, chart↔table toggle, 4.5:1 text and 3:1 UI contrast, 200% zoom, reduced motion.
- Public route initial JS ≤ 200 KB gzipped — **measured at 117.4 KB**. LCP < 2.5 s on 4× CPU throttle and slow 4G — not yet measured.
- Breakpoints 360 / 768 / 1024 / 1440. Below 1024 the gate ladder becomes a horizontal strip; below 768 a one-line summary opening a sheet, the dock becomes a bottom sheet, tables become stacked `DataRow` lists.
- Strict TS, no `any`. No browser storage. No hardcoded policy, statute or clause.

### Explicit user instructions

- "**dont stop until all phases are completed**", "**dont talk much do more work**", "**dont tell me or ask me after every phase completion**".
- "**UPDATE IT AFTER FEW STEPS AND JUST BEFORE THE CONTEXT WINDOW IS FULL CREATE IT**" — refresh this handoff periodically and definitely before running out of context.

### Anti-patterns that fail the build (§110)

Cream background · terracotta identity · black+neon · generic SaaS dashboard · gradient hero · excessive rounded cards · huge marketing hero · decorative charts · icon-only status · colour-only status · unnecessary animation · stock illustration · giant KPI cards · excessive shadows · card grids for unrelated info · fake AI scores · fake API integrations · hardcoded legal rules · dead buttons · placeholder pages · lorem ipsum · hidden permissions · silent failures.

---

## 6. PROBLEMS AND BUGS

### Confirmed environment gotchas (do not rediscover)

1. **npm 11 blocks postinstall scripts.** Fixed with `allowScripts` in `package.json` plus `npm rebuild esbuild`. Already done.
2. **The `Bash` tool cannot reliably take large multi-file heredocs** — several attempts died with `unexpected EOF` on apostrophes and backticks. Use the `Write` tool for source files, or write a small `.cjs` script and run it with node. That pattern works well for surgical edits.
3. **The in-app browser pane refuses to register a service worker.** `src/mocks/browser.ts` catches that and falls back to patching `window.fetch`, running the same MSW handlers through `handler.run()`. **Do not remove the fallback.**
4. The Bash tool's working directory persists between calls; a failed `cd` leaves you somewhere unexpected. Prefer absolute paths.
5. A **full page reload resets the mock session** to `USR-D01-OFF`. Inside the SPA the role switcher persists. To switch roles from `javascript_tool` without a reload: `fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({role:'evaluator'})})`.

### Bugs found and fixed during verification

| Bug | Root cause | Fix |
|---|---|---|
| Only 2 open challenges on the demand board | `gateIndex = index % 7` put just 4 cases at gate 2, and `index % 2 === 1` halved that | Explicit `GATE_DISTRIBUTION` weighted towards gate 2 |
| Three challenges shared one slug, so `/challenges/:slug` always opened the wrong case | slug was `title-district`, and the problem library is walked twice into the same department | Slug ends in the case number; second-pass titles name their scope |
| Challenges sat at gates 4–6, which belong to their pilot | `currentGate` came straight from the distribution | Challenges cap at gate 3; awarded ones have G0–G3 cleared and no open gate (A10) |
| Cases flagged `blocked` had all preconditions passing | the flag was cosmetic, not backed by data | The gate 0 case genuinely lacks legal pre-clearance; the gate 2 case genuinely has applications in needs review |
| The evaluator queue held only finished panels, so the COI interstitial could not be shown | panels were created only for awarded challenges | Closed-window gate 2 challenges carry a shortlist; the first evaluator account always sits on a live panel |
| The approval bar collapsed its text column to ~60px | a `shrink-0` actions block starved the `max-w-doc` text block | Text block is `min-w-0 flex-1 basis-full lg:basis-auto` |
| Top bar overflowed at ~1280px | 7 nav links, tagline and 5 controls with no shrink rules | Tagline `xl:` only, nav scrolls, controls `shrink-0`, search label shortened |
| Closed challenges read "Overdue by 6 months" for their application window | the SLA clock was applied regardless of status | Clock only for open windows; closed ones read "Closed 12 Mar 2026" |
| Vendor chunk was 193 KB gzipped, over budget | msw pulls `graphql` and `tldts`; recharts pulls `lodash` and `victory-vendor`; all landed in `vendor` | `MOCK_DEPS` and `CHART_DEPS` lists in `vite.config.ts` |
| `date-fns` shipped in the app shell | `lib/format.ts` imported it | `lib/format.ts` now uses `Intl` only |
| A reload lost the demo session, so `/e` and `/v` always showed forbidden | the mock session is module state | `PortalGuard` (A13) |
| The pathway decision failed silently for the wrong role | no permission gate on the form | `PermissionGate` wraps the decision; the API refusal also surfaces as a toast with the text preserved |
| An in-flight pilot showed "Target achieved 103.7%" at day 52 | the KPI used the final figure regardless of progress | `achieved` is interpolated by `dayOfPilot / duration` for executing pilots |
| The freshness line said "this is older than it should be" on fresh data | the client compared `servedAt` against `Date.now()` while the server stamps the seeded clock | New `src/config/clock.ts`; the interface and the mock server both read `platformNow()`. Every wall-clock read in the app was routed through it |
| The evaluator queue listed ten applications twice | the demo challenge got both a generated panel and its hand-built `PNL-HERO` | The generic builder skips the hero challenge |
| An evaluation with three scores on it read `not_started` | status was drawn independently of the scores | Status follows the scores: any score means `in_progress` |
| `/transparency` ignored the empty scenario | it is an aggregate, and `emptyIfScenario` only wraps lists | The handler reads its source collections through `emptyIfScenario` so a programme that has run nothing reports zeroes |
| The scenario switcher appeared to do nothing | TanStack Query served cached answers from the previous condition | Choosing a scenario calls `queryClient.resetQueries()` |
| The rejected-gate scenario never showed a rejected gate | it only forced a precondition to fail | `asScenarioGate()` presents the open gate as rejected, with the reason a real refusal carries, without writing to the store |
| Under the 500 scenario the app said "You are signed in as public" | a failed `/api/auth/me` was read as a role | `PortalGuard` and the identity chip now distinguish "signed out" from "we could not find out" |
| The primary action on the gate screen was unreachable by keyboard | a plain `disabled` button leaves the tab order entirely | New `unavailableReason` on `Button`: the control stays tabbable, reads as unavailable with the reason, and sends focus to whatever is blocking it. Applied to 16 primary actions |
| The style guide emitted three `h1`s and overflowed at 360px | type specimens were real headings; a scrolling strip inside a grid cell widened the page; `sr-only` spans escaped the scroll container | Specimens are `<p>`; `FileCover` takes a `headingLevel`; grid and flex children got `min-w-0`; scroll containers are `relative` so absolute children are contained |
| Panels rendered `h3` directly under a page `h1` on 12 routes | panel components hardcoded `h3` | `headingLevel` prop on `StatLedger`, `KeyValueSheet`, `BarLedger`, `MeasurementChart`, `RelaxationNotice`, `EmptyState` |
| A closed challenge read "Overdue by 4 months" on the public page | the SLA clock ran regardless of status | Same rule as the pipeline: clock while open, closed date otherwise |
| Multiselect labels pointed at nothing | 18 `Field` render props ignored the `id` they were handed | All 18 pass `id={id}`; the control also falls back to its placeholder as a name |
| Comparison tables had no accessible name | no `<caption>` | `ComparisonMatrix` captions itself from what it compares |
| Error toasts vanished after 7 seconds | every toast was on the same timer | Failure toasts stay until dismissed; confirmations still expire |
| A table skeleton injected 25 `<style>` tags | the keyframe was inline per element | One `@keyframes skeleton-pulse` in `globals.css` |
| A CSV export could not say where it came from | headers only | A provenance line: what, when, how many rows of how many, which filters. Money columns carry their unit |
| Nothing printed properly | `.no-print` was defined and never used | A real print stylesheet: chrome off, gate ladder kept, scroll containers expanded, page-break rules, and a footer stating this is a demonstration build |
| `npm run lint` failed on a clean install | the script referenced an ESLint config that did not exist | ESLint 9 flat config added; passes with 0 errors and 0 warnings |

### Specification §118 test cases — verified live against the running API

| # | Case | Result |
|---|---|---|
| 1 | Evaluation weights total 95 → cannot continue | **PASS** — `WEIGHTS_NOT_100`, "Adjust the weights by 5 percentage points." |
| 2 | Startup applies twice | **PASS** — `DUPLICATE_APPLICATION` with the existing reference |
| 3 | Application after the deadline | **PASS** — `CHALLENGE_CLOSED`, decided on the server clock |
| 4 | Evaluator scores before COI | **PASS** — identity withheld; proposal 403 `COI_REQUIRED`; cannot even create the scoring record; declaring opens it; declaring a conflict returns `RECUSED`; a short rationale returns `RATIONALE_TOO_SHORT` |
| 5 | Evaluator submits twice | **PASS** — `ALREADY_SUBMITTED`; editing a finalised evaluation returns `EVALUATION_FINAL` |
| 6 | Department clears a gate with a missing precondition | **PASS** — `PRECONDITIONS_UNMET` naming the unmet condition |
| 7 | The programme unit attempts the same bypass | **PASS** — same refusal, no role exemption |
| 8 | Admin requests a waiver | **PASS** — recorded as a separate exception naming the authority |
| 9 | Milestone payments exceed the pilot budget | **PASS** — `BUDGET_EXCEEDED` with both figures |
| 10 | Milestone accepted → payment ageing begins | **PASS** — a claim is raised and appears on the ageing ledger at day 0 |
| 11 | DPIIT expires after submission | **PASS** — routed to needs review with what changed and when |
| 12 | Rule changes while in use | **PASS** — "24 live challenges reference this rule…"; deleting returns `RULE_IN_USE` |
| 13 | Document scan fails | **PASS** (seeded) — failed scans render with an inline Replace file action |
| 14 | One dashboard widget fails | **PASS** — the measurement panel and the transparency figures fail alone, each with a reference id and a Try again, while the rest of the page and the shell stay intact |
| 15 | Mutation fails | **PASS** — a 403 on the pathway decision surfaced as "Your role cannot approve this procurement. Your text is preserved." |
| — | Deduction without a reason code | **PASS** — `REASON_CODE_REQUIRED` |
| — | Deduction above the configured cap | **PASS** — `DEDUCTION_TOO_LARGE` |
| — | Bulk approving claims with exceptions | **PASS** — `EXCEPTIONS_PRESENT`, listing them |

### Measured bundle sizes (gzipped, `npx vite build`)

| Chunk | gz | In the public initial payload? |
|---|---|---|
| `index` | 18.7 KB | yes |
| `vendor` (react, react-dom, zustand) | 67.2 KB | yes |
| `router` | 6.2 KB | yes |
| `query` | 10.4 KB | yes |
| `i18n` | 15.0 KB | yes |
| `index.css` | 9.7 KB | yes |
| **App shell total** | **135.5 KB** | **under the 200 KB budget** |
| `forms` (zod + RHF) | 23.5 KB | no — lazy, register and wizard routes only |
| `charts` (recharts + d3 + lodash) | 130.5 KB | no — lazy, inside `MeasurementChart` |
| `mockapi` (msw + graphql + tldts + fixtures) | 168.2 KB | only because this build has no backend; a real deployment drops the import and the chunk with it |

### Failed approaches — do not repeat

- Writing several `.ts` files in one bash heredoc block. Always fails on quoting.

---

## 7. IMPORTANT CONTEXT FROM THIS CONVERSATION

- The user first interrupted an implementation attempt to run the `/frontend-design` skill on the spec. The mandated **§122 pre-build architecture** (token table, ASCII wireframes for the demand board and gate decision screen, component map, route map, three-sentence rationale, anti-pattern review) **was produced and delivered in chat**, and the user replied "START NOW". That design is the contract; §3 records its binding decisions.
- The user's tolerance for chat is near zero. Write code; report at the end or when genuinely blocked.
- The brief pins the palette, typography, spacing and radii exactly, including things resembling a known "AI default" broadsheet look. **The brief's own words win.** Differentiation was spent on four choices: the dwell rail, the seal as a form, the citation gutter, and a landing page whose hero is a table.
- Three-sentence rationale, reusable in a README: *PRAYOG is organised around decisions rather than data, so its primary navigation is a ladder of seven auditable gates whose spacing encodes how long each decision actually took. Every number carries its provenance in the margin, because in public procurement an unexplained figure is inadmissible. Money, gates and evidence are bound in one direction only: a milestone is accepted, which starts a visible payment clock, which ages in public.*
- Seed counts follow §104. If you regenerate fixtures, preserve: 8 departments, 3 states, 24 challenges across all 7 gates with 2 blocked and 1 waiver, 60 startups with the DPIIT mix, 140 applications with 6 auto-fail and 4 needs-review, 12 evaluators with 2 conflicts and 1 outlier, 9 pilots in the exact status split, 30 milestones, 14 claims with 2 overdue and 1 deduction, 5 incidents, 1 change request moving money and time, and the full audit trail on the hero case.

---

## 8. NEXT STEPS (prioritised)

The build is finished. Nothing on this list is required for the product to be
demonstrated or handed over — each is an improvement on a working system, in the
order that would add the most.

### 1 — An automated test suite

The only real gap. Vitest plus Testing Library, run against the same MSW handlers
the app uses, so the tests exercise the actual business rules rather than mocks of
them. The §118 table in §6 is the list of cases to write first: every row there was
verified by hand and should be a test. Start with the four that protect the spine —
preconditions block a gate for every role, the COI gate withholds identity, money
never exceeds the pilot budget, and a rubric whose weights miss 100 cannot be saved.

### 2 — Proof the print output on paper

`src/styles/globals.css` now has a real print stylesheet — chrome removed, the gate
ladder kept because it is the case history, scroll containers expanded, page-break
rules, and a footer stating this is a demonstration build. It has never been through
an actual print preview. Check the gate decision screen, the challenge document and
the audit trail at A4.

### 3 — Decide how far Hindi should go

Today ~99 keys cover navigation and shell chrome; page copy, case content and legal
text stay in English, and the language menu states that position explicitly. If full
UI translation is wanted, the work is mechanical but large: every page string moves
into `src/i18n/en.ts` and `hi.ts`. Case content written by departments and
applicants should still never be machine-translated — that part is a product
position, not a gap.

### 4 — Smaller things worth doing

- The evidence dock and command palette have not had a dedicated keyboard pass; the
  gate decision screen has.
- `/a/rubrics` and `/a/taxonomy` are master–detail screens whose right pane starts
  empty. That is correct, but a first-run hint would read better than a bare prompt.
- The `charts` chunk is 130 KB gzipped, dominated by d3 and lodash pulled in by
  Recharts. If chart weight ever matters, the four chart shapes actually used could
  be hand-drawn as SVG and the dependency dropped entirely.

### Current blockers

None.

---

## 9. INSTRUCTIONS FOR THE NEXT CLAUDE

**Understand immediately**
- The build is **complete, verified and running**. All 55 pages exist across six portals; typecheck and lint are clean; the production build succeeds; every route has been walked in a browser at four viewport widths; every scenario has been exercised; the demo runs end to end. What remains is listed in §8, and none of it blocks a handover.
- The user wants silent, continuous work. Do not narrate. Do not ask permission per phase.

**Inspect first (in this order)**
1. `src/routes/index.tsx` — the route map and every page's entry point.
2. `src/services/hooks.ts` — the hook for almost every page already exists; read it before writing anything.
3. `src/config/gates.ts` and `src/config/policies.ts` — the vocabulary of the whole product.
4. `src/pages/department/GateDecision.tsx` and `src/pages/public/DemandBoard.tsx` — the two best worked examples of house style.
5. `src/components/layout/QueryState.tsx` — the loading/empty/error contract every page follows.

**Do NOT redo**
- Anything in §2's completed list. Verify it; do not rewrite it to "finish" it.
- The config layer, fixtures, handlers, component library or routing.
- The §122 design exercise.
- Multi-file bash heredocs.

**Preserve**
- The 11 "must not change" decisions in §3.
- The seeded ids in §4 — pages and demos deep-link to them.
- `tsconfig.json` strictness and the truncated Tailwind spacing scale.
- The fetch fallback in `mocks/browser.ts`.

**Continue with** whatever the user asks for. If they ask for "the next thing", §8 item 1 — an automated test suite — is the only real gap left.

**House style for new or edited pages**
Sentence case. Buttons name their consequence ("Clear gate 2", never "Submit"). Errors say what happened, why it matters, what to do, and carry a reference. Empty states carry one primary action. Every figure carries provenance. Status = wash + 2px marker + words. Tables are hairline-ruled with zero radius. Document surfaces use `font-doc` at `max-w-doc` (68ch). One `h1` per page. Never remove a control the user lacks permission for — wrap it in `PermissionGate`.

---

## 10. SOURCE OF TRUTH

### Facts verified against the running application
- `npm run typecheck` and `npm run lint` are clean; `npm run build` succeeds.
- Every route in all six portals renders with seeded data, carries exactly one
  `h1`, and produces no horizontal page scroll at 360, 768, 1024 or 1440 px.
- The accessibility sweep reports nothing on any route: no unnamed control, no
  unlabelled input, no skipped heading level, every table captioned.
- All eleven scenarios behave as described, including partial widget failure.
- CSV and audit-pack exports produce real files; the audit pack for CH-2026-0143
  is 12 KB of chronological record.
- The solution-language checker flags vendor names and technology prescriptions in
  a freshly drafted challenge, not just in seeded data.
- The demo finale (pathway decision → gate 6 clears) works.
- Every §118 row marked PASS in §6 was executed against the live API in the browser.
- Bundle sizes in §6 are read from real build output.

### Decisions we intentionally made
- Everything in §3 (D1–D7, A1–A13, and the eleven do-not-change items).
- Hero case complete through G5 with **G6 open** (A7).
- Fixed seed clock (A5).
- `--hold` excluded from body text on measured contrast grounds (D3).

### Assumptions that still need verification
- **Screen readers.** The structure has been checked programmatically — names,
  labels, heading order, captions, focus order, focus visibility — and the gate
  decision screen has had a real keyboard pass. Nobody has listened to it with
  NVDA, JAWS or VoiceOver.
- **Performance under constraint.** LCP under 4× CPU throttle and slow 4G has not
  been measured. Bundle sizes are measured and under budget.
- **Contrast.** `--ink-soft` 5.6:1, `--verify` 6.4:1, `--seal` 7.3:1,
  `--hold` 3.83:1 were computed by hand, not measured with a tool. The `--hold`
  figure is load-bearing — it is why that colour is excluded from body text — and
  is the one worth spot-checking.
- **Print output** is styled but has never been through a print preview.
- **Seed counts.** 140 applications, 30 milestones, 14 claims are what the builders
  intend. Challenge, pilot, gate, panel and evaluation counts have all been read
  back from the running API; the rest have not been counted directly.
