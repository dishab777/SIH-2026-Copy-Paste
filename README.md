# PRAYOG

**From challenge to contract.**

An innovation-procurement operating system for government departments: a complete
React frontend running against a mocked API, built so that every workflow works
rather than being illustrated.

A department frames an operational problem as a measurable outcome, publishes it,
screens applicants against published rules, has it scored against a published
rubric, awards a milestone-based pilot, measures the result, has that result
checked by someone who did not run the pilot, and only then decides whether to buy
anything. Seven gates record each of those decisions with an owner, a written
reason and a timestamp.

---

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>. No backend, no database, no environment file.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Type-check the project, then build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint: bans `any`, enforces the hook rules, and fails the build if anything reaches for browser storage |

If `npm install` reports that build scripts were blocked, the `allowScripts`
block in `package.json` is what unblocks `esbuild` and `msw`; keep it.

---

## The demonstration script

The seeded data is built around one case that runs the whole length of the
product. Following it takes about ten minutes.

**CH-2026-0143 — Smart water leakage detection**, Pune Municipal Corporation.
Non-revenue water at 38 percent; the department wants it measured down, and does
not want to be told which sensor to buy.

1. **The public sees real demand.** `/` lists what departments actually need.
   Open the challenge at `/challenges/smart-water-leakage-detection-pune`: the
   problem, the baseline it is measured against, the outcome sought, the rubric it
   will be scored with, and the standard IP position — all before anyone signs in.
2. **A startup applies.** Sign in as the startup (top-right identity menu, or any
   portal's sign-in prompt). `/s/matches` scores the fit and says why. The
   eligibility panel separates what may be relaxed for a recognised startup —
   prior turnover, prior experience — from what never is: technical capability,
   security, safety.
3. **The department screens.** `/d/challenges/CHL-014/applications` shows the rule
   engine's verdict per applicant with the rule that produced it. An override
   needs a reason and is recorded against the person who made it.
4. **Evaluators score.** `/e` is the assignment queue. Opening a proposal is
   blocked until a conflict declaration is on record — the applicant's identity is
   withheld until you have declared. Scores are anchored to descriptors, and a
   score materially away from the panel mean draws a request for the reasoning.
5. **A gate is decided.** Any gate screen — `/d/gates/GTR-CHL-014-G3` — is the
   same shape: what this decides, the evidence, what happens next, who gets told,
   and the audit. Preconditions are re-tested on every read, so a pass that has
   gone stale is not a pass. Clearing needs a written reason of at least the
   configured length.
6. **The pilot runs.** `/d/pilots/PIL-HERO` carries milestones, evidence with scan
   status, risks, incidents and change requests. Money moves on accepted evidence,
   never on elapsed time.
7. **Money ages in public.** `/s/payments` starts the clock on the day a milestone
   was accepted, not the day an invoice arrived, and the same figure appears on
   `/transparency`.
8. **Someone independent checks.** `/v/validate/PIL-HERO` re-derives the claim
   from the departmental records rather than accepting the supplier's number. A
   report saying the claim could not be reproduced is published the same as one
   that says it could.
9. **A pilot is still not a purchase.** `/d/scale/PIL-HERO` scores procurement
   readiness, then requires an explicit pathway choice with a justification *and*
   the case against it, before gate 6 will clear.

Two side doors are worth opening:

- **`/a/config`** — every threshold, timeline and statutory figure the product
  enforces, as editable rows with citations. Change one and the whole system
  changes with it.
- **The scenario switcher** in the top bar — forces the mock API into empty,
  loading, slow, 403, 500, SLA-breached, rejected-gate, partial-failure,
  mutation-failure or stale-data conditions, live, on whatever screen you are on.

---

## Where the rules live

Nothing statutory is written into a component. Every threshold, window, citation
and clause is a row in `src/config/`, and `/a/config` is that directory rendered
as a screen — the proof, rather than a promise, that the rules are data.

| File | Holds |
| --- | --- |
| `src/config/policies.ts` | 29 configuration parameters: SLA windows, payment limits, deduction caps, minimum reason lengths, and the citation behind each |
| `src/config/gates.ts` | The seven gates: owner role, preconditions, decision window, what each decides |
| `src/config/stages.ts` | The nine stages and who acts in each |
| `src/config/rules.ts` | Eligibility rules, which are relaxable for a recognised startup and which are never |
| `src/config/rubrics.ts` | Evaluation rubrics, criteria, weights and anchored descriptors |
| `src/config/templates.ts` | Clause library, data tiers and their approval conditions |
| `src/config/rbac.ts` | Roles and the actions each may take |
| `src/config/clock.ts` | The demonstration clock — one source of "now" for the interface and the mock server alike |

Changing a value in `src/config/` changes behaviour everywhere it applies: the
gate screens, the payment ageing, the eligibility engine and the public pages,
without touching a component.

---

## About the mock integrations

**This is a demonstration build.** Every government integration in it is a mock
provider. No live government API is called. DPIIT recognition checks, GSTIN
status, Udyam registration, GeM listing, PFMS payment references and e-sign
signatures are all seeded fixtures that behave like the real services — including
their failure modes — but are not connected to them.

The interface says so wherever it matters: `/a/integrations` labels every provider
as a mock and shows when it last "synced", signature blocks are marked as
demonstration records rather than legally executed signatures, and the footer
carries the same statement on every page.

Nothing here should be relied on as a legal, financial or procurement record.

---

## The design

The spec pinned the concept — *ledger and gate* — and the palette, typography and
layout are all taken from the object that concept describes: **a government
procurement file, opened on a screen.**

**Two paper tones, one ink, three inks of consequence.** `--ledger` #E9E6DC is
the khaki board a file is clipped to; `--sheet` #FCFBF7 is the noting sheet
clipped onto it. `--ink` #1A1D1A is typewriter carbon — near-black with a green
cast, not the blue-black of a dashboard. Then three colours that each mean one
thing: `--verify` #1F5C3D is noting green, the ink an officer clears in;
`--seal` #96201C is seal wax, reserved for a refusal; `--hold` #8A5A00 is the
pencil query in the margin. All three clear AA for body text on the sheet. There
is no fourth colour and no gradient.

**Three type roles.** Anek is variable across width 75–125 and weight 100–800, so
the display cut uses that range: **80% width at weight 700**, condensed and
heavy, the way a header rule is set on a sanction order. It is reserved for page
titles and the subject line of a case. Body copy is the same family at normal
width. The third role is a monospace **register**, used only for identifiers
someone reads aloud or copies down — case numbers, payment references,
checksums. Money and measured quantities are deliberately *not* in it: those are
computed with, not quoted, and they stay in Anek's tabular figures where they
align in a column.

**The noting strip.** The signature device. A government noting sheet is printed
with a ruled margin down its left edge, and every observation is written against
it — signed, dated, in the ink of the act. That margin is the spine of this
product. On a gate screen the authority for a decision sits in it while every
heading on the page begins at the same edge past it; on the audit trail every
entry hangs off it with the officer's initials in a boxed monogram, marked green
where they cleared something, red where they refused. One device, learned once,
used everywhere a decision is recorded.

**One palette, green and saffron.** The deep ground every masthead sits on is
`--verify` taken down to near-black: literally the same green as the ink an
approving officer clears in. Saffron is the one warm accent and means the same
thing wherever it appears — open, waiting, yours to act on. `--signal`, the lit
cut of the same green, means cleared, measured, paid. That is the whole set.

It used to be two sets: paper for working screens and a separate night palette
with four accents for public ones. The ground changed underneath you as you
moved between them, which read as a fault rather than as a scheme, and the four
public accents had no relationship to the three paper inks they sat beside. Now
every route has the same rhythm — deep bar, deep masthead, paper working ground,
deep footer — and only the height of the masthead changes.

**The case file.** The signature, in
[`GateFile.tsx`](src/components/domain/GateFile.tsx): an open case drawn as what
it actually is, a file. A cover with its number and subject, then the seven gates
written down the page — three stamped with a date and a green ring, one open and
flagged saffron, three still blank. Built from CSS 3D transforms rather than a
canvas, so it stays selectable text at about a kilobyte, and every colour comes
from the tokens. It tilts a few degrees towards the pointer the way you would
tip a page to read it, and holds completely still for a reader who has asked for
reduced motion.

A diagram of the seven gates would only show how the programme is meant to work.
Drawing a real case, standing where it actually stands, shows that it is working
— which is the harder claim and the only one the page is entitled to make.

**Colour is spent on consequence, not category.** A card is the same colour
whatever sector it belongs to. Colouring them per sector turned a grid into a
chart with six categories and invited the eye to look for a pattern that was not
there — a sector is a fact about a case, not a rank or a state. The three inks
are kept for the three things that change what a reader does: cleared, held,
refused.

**One easing curve, three durations.** `--ease` with `--swift` (160ms),
`--settle` (280ms) and `--arrive` (520ms), so a hover, a panel opening and a
section arriving all feel like the same hand. The utilities are `.swift`,
`.settle`, `.press`, `.lift-on-hover` and `.rail`; every one is switched off
under reduced motion.

**The spacing scale is closed, and checked.** It runs
2/4/6/8/12/16/20/24/28/32/40/48/64 and `npm run check` fails the build on a step
that is not in it. Tailwind does not warn about a missing step — it emits
nothing, and the element quietly has no padding. That is how `px-5` on every
challenge card survived a visual review with the text sitting flush against the
border, along with forty-eight other dead classes.

**The type scale carries its own leading.** Every size in
[`tailwind.config.ts`](tailwind.config.ts) ships with a line-height, and nothing
in the product sets one by hand. Leading tightens as type grows — 1.08 at 92px,
1.6 at 15px, 1.74 for the serif document voice — because a headline set at body
copy's ratio falls apart and body copy set at a headline's ratio stops being a
paragraph. Setting them ad hoc is what made the same 15px paragraph read at 1.6
in one card and 1.87 in the next.

**Display type.** Bricolage Grotesque carries the public voice — a variable
grotesque with real quirk in its terminals, set from 34px to 108px with
`clamp()` so a phone gets a headline rather than a wall. Anek keeps the reading
and all the Devanagari. The monospace register still carries identifiers only.

**One navigation per portal.** The department and startup portals used to carry a
left rail that repeated the top bar almost item for item and cost 232px of
working width on every screen. A case screen already has two indexes of its own —
the gate ladder and the evidence dock — and a third spine beside them was what
squeezed the working column. The admin portal keeps its rail, because eight
settings sections genuinely read better as a list, and its top bar stopped
repeating them.

**Status is never colour alone.** Every status is a wash, a 2px marker and the
words together. That is not a contrast workaround — all three inks pass AA. It is
so a status survives a monochrome print, a colour-blind reader and a photocopy,
which is what happens to a government record.

---

## How it is built

React 18 · TypeScript 5.7 (strict, no `any`) · Vite 5 · Tailwind 3 ·
React Router 6 · TanStack Query 5 · Zustand 5 · React Hook Form + Zod ·
MSW 2 · Recharts · i18next (English and Hindi)

**The mock API is a server, not a stub.** `src/mocks/` holds an in-memory store
and handlers that enforce the business rules themselves: a rubric whose weights do
not total 100 is refused, a second application to the same challenge is refused, a
submission after the deadline is refused on the server's clock, a milestone whose
payments exceed the pilot budget is refused, and a gate whose preconditions are
unmet cannot be cleared by anyone — including the programme management unit. The
components never decide any of this. That is why role-switching in the demo is a
real sign-in: the server changes its mind about you, rather than the screen
changing what it shows.

**State.** TanStack Query owns everything the server knows. Zustand owns only
what the browser knows: the open panel, the toast queue, the chosen locale. There
is no third copy. No browser storage API is used anywhere — a lint rule fails the
build if one appears — so a reload starts the demo fresh, which is why each portal
explains who you are and offers a real sign-in rather than silently redirecting.

**Money** is stored as paise integers throughout and formatted once, in Indian
digit grouping, at the edge. No float arithmetic touches a rupee figure.

**Bundles.** The app shell — entry, vendor, router, query, i18n and CSS — is
**126.4 KB gzipped**. Charts (130 KB gz) load only on screens that draw one, and
every route is split. The mock API is its own **169 KB gz** chunk behind a dynamic
import: this demo waits for it before first paint, and a real deployment deletes
that one import and the chunk goes with it.

**Every data surface** supports loading, populated, empty, partial failure, error
and forbidden states. Skeletons are shaped like the content they stand in for.
Every error names what failed, what to do next, and carries a reference id.

---

## Accessibility

One `h1` per page and no skipped heading levels, verified across every route in
every portal. Every control has an accessible name; every input has a label. A
blocked primary action stays in the tab order and reads as unavailable with the
reason, rather than vanishing from the keyboard path the way a plain disabled
button does. Focus is visible on every focusable element. Every chart has a data
table on the same screen. No horizontal page scroll at 360, 768, 1024 or 1440 px.
`prefers-reduced-motion` is respected.

---

## Layout

```
src/
  config/       The rules, as data. Rendered at /a/config.
  mocks/        The mock server: fixtures, in-memory store, handlers, scenarios.
  services/     The typed client and its query hooks. The only place fetch is called.
  components/
    ui/         Primitives: buttons, fields, overlays, feedback.
    ledger/     Ruled tables and key-value sheets.
    domain/     Gate ladder, file cover, SLA clock, evidence dock, seals.
    charts/     Measurement charts, each with its data table.
    layout/     Shell, top bar, portal guard, query states.
    patterns/   Approval bar, permission gate.
  pages/        One directory per portal: public, startup, department, evaluator,
                validator, admin, system.
  routes/       The route table.
  lib/          Formatting, SLA arithmetic, ids.
  styles/       Tokens and global rules.
```

`/dev/styleguide` renders every component in every state on one page.

`npm run typecheck` and `npm run lint` both pass with nothing reported.
