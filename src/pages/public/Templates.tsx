import { useState } from 'react';
import { TEMPLATES, CLAUSES, type ClauseDefinition, type TemplateDefinition } from '@/config/templates';
import { citationShort } from '@/config/policies';
import { useReveal } from '@/lib/reveal';
import { SectionRail } from '@/components/patterns/SectionRail';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ClauseReader } from '@/components/domain/Legal';
import { countOf, day, num } from '@/lib/format';
import { Masthead } from '@/components/layout/Masthead';

const KIND_LABEL: Record<TemplateDefinition['kind'], string> = {
  problem_statement: 'Problem statement',
  evaluation_rubric: 'Evaluation rubric',
  pilot_agreement: 'Pilot agreement',
  ip_clause: 'IP clauses',
  data_clause: 'Data clauses',
  cyber_annexure: 'Cybersecurity annexure',
  risk_register: 'Risk register',
  milestone_schedule: 'Milestone schedule',
  validation_report: 'Validation report',
  gate_note: 'Gate note',
  pathway_justification: 'Procurement pathway justification',
};

/* ------------------------------------------------------------------ marks
 * Drawn here rather than pulled from a library, because the whole product's
 * line weight is one value and an imported set brings its own.
 */
type GlyphName =
  | 'document'
  | 'grid'
  | 'form'
  | 'shield'
  | 'database'
  | 'receipt'
  | 'lock'
  | 'exit'
  | 'clause'
  | 'chevron'
  | 'arrow'
  | 'revision'
  | 'check';

const GLYPH: Record<GlyphName, string> = {
  document: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M9 12h6M9 16h4',
  grid: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  form: 'M9 4h6v3H9zM15 5h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2M9 12h6M9 16h4',
  shield: 'M12 3l7 3v6c0 4.2-3 6.8-7 9-4-2.2-7-4.8-7-9V6zM12 10a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 12 10zM12 13.2V16',
  database: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  lock: 'M7 10V8a5 5 0 0 1 10 0v2M5 10h14v10H5zM12 14v3',
  exit: 'M13 20H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7M15 12H9M18 9l3 3-3 3',
  clause: 'M5 6h14M5 11h14M5 16h9',
  chevron: 'm6 9 6 6 6-6',
  arrow: 'M5 12h13M13 7l5 5-5 5',
  revision: 'M4 20h4L18 10a2.1 2.1 0 0 0-3-3L5 17zM14 6l4 4',
  check: 'm5 13 4 4 10-10',
};

function Icon({ name, size = 20, className = '' }: { name: GlyphName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={['shrink-0', className].join(' ')}
    >
      <path d={GLYPH[name]} />
    </svg>
  );
}

/** What a template physically is, so the card is topped by the object rather than a colour. */
const FORMAT_GLYPH: Record<TemplateDefinition['format'], GlyphName> = {
  Document: 'document',
  Spreadsheet: 'grid',
  Form: 'form',
};

/* --------------------------------------------------------- standing clauses
 * The clauses are grouped by the question a reader actually arrives with —
 * "who owns this", "what may they do with my data", "when do I get paid" —
 * rather than presented as one undifferentiated list of nine.
 *
 * The grouping is derived from the clause identifier, so a clause added to the
 * config appears here without an edit; anything that matches no group falls
 * into a final bucket rather than disappearing.
 */
interface ClauseGroup {
  id: string;
  title: string;
  blurb: string;
  glyph: GlyphName;
}

const GROUP_DEFS: readonly (ClauseGroup & { prefix: string })[] = [
  {
    id: 'ip',
    prefix: 'CL-IP-',
    title: 'Intellectual property',
    blurb: 'Who owns what you build, and what government may do with it afterwards.',
    glyph: 'shield',
  },
  {
    id: 'data',
    prefix: 'CL-DATA-',
    title: 'Departmental data',
    blurb: 'Which records you may touch, for what purpose, and for how long.',
    glyph: 'database',
  },
  {
    id: 'money',
    prefix: 'CL-PAY-',
    title: 'Money',
    blurb: 'When a milestone becomes payable, and what may be taken off it.',
    glyph: 'receipt',
  },
  {
    id: 'security',
    prefix: 'CL-CYBER-',
    title: 'Security incidents',
    blurb: 'What you have to report, to whom, and how quickly.',
    glyph: 'lock',
  },
  {
    id: 'exit',
    prefix: 'CL-EXIT-',
    title: 'Ending the pilot',
    blurb: 'What you hand back if it stops, and what you are still owed.',
    glyph: 'exit',
  },
];

interface ClauseSection extends ClauseGroup {
  clauses: readonly ClauseDefinition[];
}

const GROUPED: readonly ClauseSection[] = GROUP_DEFS.map(({ prefix, ...group }) => ({
  ...group,
  clauses: CLAUSES.filter((c) => c.id.startsWith(prefix)),
})).filter((g) => g.clauses.length > 0);

const UNGROUPED = CLAUSES.filter((c) => !GROUP_DEFS.some((g) => c.id.startsWith(g.prefix)));

const CLAUSE_SECTIONS: readonly ClauseSection[] = UNGROUPED.length
  ? [
      ...GROUPED,
      {
        id: 'other',
        title: 'Other standing clauses',
        blurb: 'The remaining clauses that sit in every contract.',
        glyph: 'clause',
        clauses: UNGROUPED,
      },
    ]
  : GROUPED;

/** The templates a clause is actually written into, read off the templates themselves. */
function carriedBy(clauseId: string): readonly TemplateDefinition[] {
  return TEMPLATES.filter((t) => t.clauses?.includes(clauseId));
}

const IP_DEFAULT = CLAUSES.filter((c) => c.id === 'CL-IP-01' || c.id === 'CL-IP-02');

/* ------------------------------------------------------------ clause entry */

/**
 * One clause, read the way a founder reads it: the plain-language position in
 * the open, the templates that carry it beside the number, and the operative
 * wording folded away underneath until it is asked for.
 */
function ClauseEntry({ clause: c }: { clause: ClauseDefinition }) {
  const carriers = carriedBy(c.id);
  return (
    <li id={`standing-${c.id}`} className="border-b border-rule px-5 py-6 last:border-b-0 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="font-display text-h3 text-ink">
          <span className="type-register mr-3 text-data text-saffron-ink tnum">{c.number}</span>
          {c.title}
        </h4>
        {c.deviation !== 'default' ? <Badge tone="hold">{c.deviation} deviation</Badge> : null}
      </div>

      <p className="mt-3 max-w-doc text-lead text-ink">{c.position}</p>

      {carriers.length ? (
        <p className="mt-4 flex flex-wrap items-center gap-2">
          <span className="field-label">Written into</span>
          {carriers.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft"
            >
              <Icon name={FORMAT_GLYPH[t.format]} size={13} />
              {t.label} {t.version}
            </span>
          ))}
        </p>
      ) : null}

      <details className="group mt-4 rounded-sheet border border-rule bg-ledger">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sheet px-4 py-3 text-label text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Icon name="clause" size={16} />
            The operative wording, the risk it carries and who may vary it
          </span>
          <Icon name="chevron" size={16} className="group-open:rotate-180" />
        </summary>

        <div className="border-t border-rule px-4 py-5">
          <p className="max-w-doc font-doc text-doc text-ink">{c.legalText}</p>
          <p className="mt-3 max-w-doc text-micro text-ink-soft">
            This is the operative wording. The plain-language line above it is a reading aid, not a substitute.
          </p>

          <dl className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-control border border-rule border-l-2 border-l-hold bg-hold-wash px-3 py-2.5">
              <dt className="field-label">Risk it creates</dt>
              <dd className="mt-1 text-micro text-ink">{c.riskNote}</dd>
            </div>
            <div className="rounded-control border border-rule border-l-2 border-l-verify bg-verify-wash px-3 py-2.5">
              <dt className="field-label">Approval to depart from it</dt>
              <dd className="mt-1 text-micro text-ink">{c.approvalLevel}</dd>
            </div>
            <div className="rounded-control border border-rule border-l-2 border-l-rule bg-sheet px-3 py-2.5">
              <dt className="field-label">Authority</dt>
              <dd className="mt-1 text-micro text-ink">{citationShort(c.citation)}</dd>
            </div>
          </dl>
        </div>
      </details>
    </li>
  );
}

/* ------------------------------------------------------------------ page */

export default function Templates() {
  const [preview, setPreview] = useState<TemplateDefinition | null>(null);
  /*
   * Which group of clauses is on the page. Not which one you have scrolled
   * past — the rail chooses, and the other five are not rendered. Intellectual
   * property first because it is the question a founder came here with.
   */
  const [group, setGroup] = useState(CLAUSE_SECTIONS[0]?.id ?? 'ip');
  useReveal([group]);

  const totalUse = TEMPLATES.reduce((sum, t) => sum + t.usageCount, 0);

  return (
    <div className="-mx-4 -mt-6 md:-mx-6">
      <Masthead
        eyebrow="The paperwork, in the open"
        title="Read the contract before you write the proposal."
        lead="These are the documents the programme actually runs on, at the version in force today. A department starts from them; a startup can read every clause — including the ones about your intellectual property — before deciding whether to apply."
        figures={[
          { label: 'Templates in force', value: num(TEMPLATES.length), tone: 'proved' },
          { label: 'Standing clauses', value: num(CLAUSES.length) },
          { label: 'Cases built on them', value: num(totalUse), tone: 'open' },
        ]}
      />

      <section className="full-bleed bg-ledger px-4 py-16 md:px-6" aria-labelledby="templates-heading">
        <div className="mx-auto max-w-shell">
          <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            The library
          </p>
          <h2 id="templates-heading" className="font-display text-h2 text-ink">
            Every template, at the version in force
          </h2>
          <p className="mb-8 mt-3 max-w-doc text-lead text-ink-soft">
            Each one names its owner, the date it took effect and what changed at that version. Open any of them and you
            are reading the document itself, not a description of it.
          </p>

          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {TEMPLATES.map((t, i) => (
              <li key={t.id} className="reveal flex" data-delay={String((i % 5) + 1)}>
                <article className="lift-on-hover group flex w-full flex-col overflow-hidden rounded-block border border-rule bg-sheet shadow-sheet">
                  <span aria-hidden className="rail block h-1 w-full bg-rule" />
                  <div className="flex flex-1 flex-col px-5 py-6">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        aria-hidden
                        className="flex h-11 w-11 items-center justify-center rounded-sheet border border-verify bg-verify-wash text-verify shadow-sheet"
                      >
                        <Icon name={FORMAT_GLYPH[t.format]} size={22} />
                      </span>
                      <Badge tone="neutral">{t.version}</Badge>
                    </div>

                    <p className="field-label mt-5 !text-saffron-ink">{KIND_LABEL[t.kind]}</p>
                    <h3 className="mt-1.5 font-display text-h3 text-ink">{t.label}</h3>
                    <p className="mt-2 flex-1 text-body text-ink-soft">{t.summary}</p>

                    <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sheet border border-rule bg-rule">
                      <div className="bg-ledger px-3 py-2.5">
                        <dt className="field-label">Built on it</dt>
                        <dd className="mt-0.5 font-display text-h3 text-verify tnum">{num(t.usageCount)}</dd>
                      </div>
                      <div className="bg-ledger px-3 py-2.5">
                        <dt className="field-label">Updated</dt>
                        <dd className="mt-0.5 text-data text-ink">{day(t.updatedOn)}</dd>
                      </div>
                      <div className="bg-ledger px-3 py-2.5">
                        <dt className="field-label">Format</dt>
                        <dd className="mt-0.5 text-data text-ink">{t.format}</dd>
                      </div>
                      <div className="bg-ledger px-3 py-2.5">
                        <dt className="field-label">Owner</dt>
                        <dd className="mt-0.5 text-data text-ink">{t.owner}</dd>
                      </div>
                    </dl>

                    <div className="mt-5">
                      <Button tone="primary" block onClick={() => setPreview(t)}>
                        <span className="inline-flex items-center gap-2">
                          Read this template
                          <Icon name="arrow" size={16} />
                        </span>
                      </Button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.label} · ${preview.version}` : ''}
        description={preview ? `${KIND_LABEL[preview.kind]} · in force from ${day(preview.effectiveFrom)}` : undefined}
        width="lg"
        footer={<Button onClick={() => setPreview(null)}>Close</Button>}
      >
        {preview ? (
          <div className="flex flex-col gap-8">
            {/* The docket line: what this file is, before a word of it is read. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-register inline-flex items-center rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft">
                {preview.id}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft">
                <Icon name={FORMAT_GLYPH[preview.format]} size={13} />
                {preview.format}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-verify bg-verify-wash px-3 py-1 text-micro text-verify">
                <Icon name="check" size={13} />
                In force from {day(preview.effectiveFrom)}
              </span>
              <span className="inline-flex items-center rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft">
                {preview.owner}
              </span>
            </div>

            <div className="rounded-sheet border border-rule border-l-2 border-l-hold bg-hold-wash px-5 py-4">
              <p className="field-label flex items-center gap-2">
                <Icon name="revision" size={14} />
                What changed at {preview.version}
              </p>
              <p className="mt-2 max-w-doc text-body text-ink">{preview.changeDiff}</p>
            </div>

            {/*
             * The extract is set as a page, not as interface: serif at the
             * document size, a real measure, and the sections numbered down a
             * ruled margin the way a printed model document numbers its own.
             */}
            <section aria-labelledby="preview-extract">
              <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                From the document
              </p>
              <h3 id="preview-extract" className="mb-4 font-display text-h3 text-ink">
                What the template asks for
              </h3>

              <article className="rounded-block border border-rule bg-sheet px-5 py-8 shadow-sheet md:px-10 md:py-10">
                <div className="mx-auto max-w-doc">
                  <header className="border-b border-ink pb-5 text-center">
                    <p className="field-label">Model document — extract</p>
                    <p className="type-register mt-2 text-micro text-ink-soft">
                      {preview.id} · {preview.version} · {day(preview.effectiveFrom)}
                    </p>
                  </header>

                  <ol className="mt-8 flex flex-col gap-8">
                    {preview.previewSections.map((s, i) => (
                      <li key={s.heading} className="flex gap-5">
                        <span aria-hidden className="type-register w-6 shrink-0 text-data text-saffron-ink tnum">
                          {i + 1}.
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-doc text-doc font-semibold text-ink">{s.heading}</h4>
                          <p className="mt-1.5 font-doc text-doc text-ink">{s.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <p className="rule-total mt-8 pt-4 text-center text-micro text-ink-soft">
                    An extract for reading. The issued file is the operative document.
                  </p>
                </div>
              </article>
            </section>

            {preview.clauses?.length ? (
              <section aria-labelledby="preview-clauses">
                <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                  <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                  {countOf(preview.clauses.length, 'standing clause')}
                </p>
                <h3 id="preview-clauses" className="mb-4 font-display text-h3 text-ink">
                  Clauses this template carries
                </h3>
                <div className="rounded-block border border-rule bg-sheet px-5 py-2 shadow-sheet md:px-6">
                  <ClauseReader clauseIds={preview.clauses} withIndex={false} />
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <section
        className="full-bleed border-t border-rule bg-sheet px-4 py-16 md:px-6"
        aria-labelledby="clauses-heading"
      >
        <div className="mx-auto max-w-shell">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
            <div>
              <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                The fine print, unhidden
              </p>
              <h2 id="clauses-heading" className="font-display text-h2 text-ink">
                Standing clauses
              </h2>
              <p className="mt-3 max-w-doc text-lead text-ink-soft">
                {countOf(CLAUSES.length, 'clause')}, grouped by the question they answer. They are not optional extras
                attached to one template — they are in every PRAYOG contract, whichever template a department starts
                from.
              </p>
            </div>

            {/* The point of the section, said once, on the deep ground so it is
                read before the list rather than after it. */}
            <aside className="slab reveal p-6 md:p-7" data-accent="signal">
              <p className="field-label mb-3 flex items-center gap-2 !text-saffron">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                How to read this
              </p>
              <p className="font-display text-h3 text-deep-ink">
                Same clauses, every contract. The template only changes which of them are printed on the front page.
              </p>
              <p className="mt-3 text-body text-deep-dim">
                Each one carries a plain-language position in the open and the operative wording underneath it. Departing
                from any of them needs a recorded approval, and the level is written against the clause.
              </p>
            </aside>
          </div>

          {/* The clause a founder came for, lifted out of the list. */}
          <section
            aria-labelledby="ip-headline"
            className="reveal mt-8 rounded-block border border-rule border-l-2 border-l-verify bg-verify-wash px-5 py-6 shadow-raise md:px-8 md:py-8"
          >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div>
                <p className="field-label mb-3 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sheet border border-verify bg-sheet text-verify"
                  >
                    <Icon name="shield" size={19} />
                  </span>
                  Start here if you are a founder
                </p>
                <h3 id="ip-headline" className="max-w-doc font-display text-h2 text-ink">
                  You keep your intellectual property. Government takes a licence, not ownership.
                </h3>
                <p className="mt-4 max-w-doc text-body text-ink-soft">
                  This is the default position of the programme, written into the pilot agreement itself. The only way
                  round it is a recorded order from the competent authority — and that clause is marked as a deviation
                  wherever it appears.
                </p>
                <p className="mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setGroup('ip');
                      document.getElementById('clause-panel')?.scrollIntoView({ block: 'start' });
                    }}
                    className="swift inline-flex items-center gap-2 rounded-pill border border-verify bg-sheet px-5 py-2 text-label font-semibold text-verify hover:bg-verify hover:text-white"
                  >
                    Read all three IP positions
                    <Icon name="arrow" size={16} />
                  </button>
                </p>
              </div>

              <ul className="flex flex-col gap-4">
                {IP_DEFAULT.map((c) => (
                  <li key={c.id} className="rounded-sheet border border-rule bg-sheet px-5 py-5 shadow-sheet">
                    <p className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-verify text-verify"
                      >
                        <Icon name="check" size={13} />
                      </span>
                      <span className="type-register text-micro text-saffron-ink tnum">Clause {c.number}</span>
                      <span className="text-label text-ink">{c.title}</span>
                    </p>
                    <p className="mt-2.5 max-w-doc text-body text-ink">{c.position}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="mt-8">
            <SectionRail
              title="Grouped by question"
              note="One group at a time. The clause library runs to nine standing clauses and reading all of them to find one is not reading."
              label="Clause groups"
              value={group}
              onChange={setGroup}
              sections={CLAUSE_SECTIONS.map((g) => ({
                id: g.id,
                label: g.title,
                count: g.clauses.length,
                glyph: <Icon name={g.glyph} size={16} />,
              }))}
            >
              {CLAUSE_SECTIONS.filter((g) => g.id === group).map((g) => (
                <section
                  key={g.id}
                  id="clause-panel"
                  aria-labelledby={`clauses-${g.id}-title`}
                  className="sheet-flat overflow-hidden rounded-block shadow-sheet scroll-mt-24"
                >
                  <header className="flex flex-wrap items-start gap-4 border-b border-rule bg-ledger px-5 py-5 md:px-6">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 items-center justify-center rounded-sheet border border-verify bg-verify-wash text-verify shadow-sheet"
                    >
                      <Icon name={g.glyph} size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 id={`clauses-${g.id}-title`} className="font-display text-h3 text-ink">
                        {g.title}
                      </h3>
                      <p className="mt-1 max-w-doc text-body text-ink-soft">{g.blurb}</p>
                    </div>
                    <span className="rounded-pill border border-rule bg-sheet px-3 py-1 text-micro text-ink-soft">
                      {countOf(g.clauses.length, 'clause')}
                    </span>
                  </header>

                  <ul>
                    {g.clauses.map((c) => (
                      <ClauseEntry key={c.id} clause={c} />
                    ))}
                  </ul>
                </section>
              ))}
            </SectionRail>
          </div>
        </div>
      </section>
    </div>
  );
}
