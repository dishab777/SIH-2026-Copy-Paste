import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useCatalogue } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { TableSkeleton } from '@/components/ui/Feedback';
import { useReveal } from '@/lib/reveal';
import { day, num } from '@/lib/format';
import { Masthead } from '@/components/layout/Masthead';
import { usePortalLink } from '@/lib/portal';

/* ---------------------------------------------------------------- drawings
 * Every mark on this page is drawn here rather than pulled from an icon set,
 * because the set would arrive with its own line weight and its own idea of a
 * grid, and this page already has both.
 */

function Glyph({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
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

/** A tick set inside a ring: the shape a validator's sign-off takes here. */
function TickInRing({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.3" />
      <path d="m5.2 8.2 1.9 1.9 3.7-4.2" />
    </svg>
  );
}

function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M4 12h13" />
      <path d="m12.4 7 5 5-5 5" />
    </Glyph>
  );
}

/**
 * A sector reads faster as a shape than as a phrase, so the head of every card
 * carries the drawing of the thing the department was actually trying to fix.
 */
function sectorGlyph(sector: string): ReactNode {
  const s = sector.toLowerCase();
  if (s.includes('water') || s.includes('sanitation')) {
    return (
      <>
        <path d="M12 3.2 7.2 9.8a6.3 6.3 0 1 0 9.6 0Z" />
        <path d="M9.3 14.8c1 1 2 1 3 0s2-1 3 0" />
      </>
    );
  }
  if (s.includes('transport')) {
    return (
      <>
        <path d="M5.4 6.2h13.2v8.4H5.4z" />
        <path d="M5.4 10.4h13.2" />
        <path d="M7.4 14.6v1.8M16.6 14.6v1.8" />
        <circle cx="8.4" cy="18.2" r="1.5" />
        <circle cx="15.6" cy="18.2" r="1.5" />
      </>
    );
  }
  if (s.includes('agri')) {
    return (
      <>
        <path d="M12 20.4V10.6" />
        <path d="M12 10.6c0-3.2 2.6-5.8 5.8-5.8 0 3.2-2.6 5.8-5.8 5.8Z" />
        <path d="M12 14c0-2.1-1.7-3.8-3.8-3.8 0 2.1 1.7 3.8 3.8 3.8Z" />
      </>
    );
  }
  if (s.includes('education') || s.includes('school')) {
    return (
      <>
        <path d="M12 7.2S10.1 5.4 4.9 5.4v11.4C10.1 16.8 12 18.6 12 18.6s1.9-1.8 7.1-1.8V5.4C13.9 5.4 12 7.2 12 7.2Z" />
        <path d="M12 7.2v11.4" />
      </>
    );
  }
  if (s.includes('waste')) {
    return (
      <>
        <path d="M5.6 7.6h12.8" />
        <path d="M9.6 7.6V5.4h4.8v2.2" />
        <path d="m7.2 7.6.9 11h7.8l.9-11" />
        <path d="M10.4 10.6v5M13.6 10.6v5" />
      </>
    );
  }
  if (s.includes('revenue') || s.includes('tax')) {
    return (
      <>
        <path d="M7 3.9h10v16.2l-2-1.4-1.7 1.4-1.6-1.4-1.7 1.4-2-1.4z" />
        <path d="M9.8 8.6h4.4M9.8 12.2h4.4" />
      </>
    );
  }
  if (s.includes('health')) {
    return (
      <>
        <path d="M3.8 12h3.3l1.7-4.2 2.8 8.6 2.1-4.4h6.5" />
      </>
    );
  }
  if (s.includes('works') || s.includes('public')) {
    return (
      <>
        <path d="M4.4 17.4h15.2" />
        <path d="M7 17.4v-4.6a5 5 0 0 1 10 0v4.6" />
        <path d="M10.6 8.4V5.6h2.8v2.8" />
      </>
    );
  }
  return (
    <>
      <path d="M12 3.4 5.4 6.2v5.1c0 4 2.8 7.7 6.6 8.9 3.8-1.2 6.6-4.9 6.6-8.9V6.2z" />
      <path d="m9.2 11.8 2 2 3.6-3.9" />
    </>
  );
}

/**
 * The mark that says a validator signed this off.
 *
 * It is the raised green key the rest of the product presses — filled, lit
 * along its top edge and casting in its own hue — rather than an outlined chip,
 * because on a page where everything carries a green tint an outline is the one
 * thing a reader's eye slides straight past.
 */
function ClearedMark({ label }: { label: string }) {
  return (
    <span className="btn-primary press inline-flex shrink-0 items-center gap-2 rounded-pill px-4 py-2 text-label font-bold uppercase tracking-stamp text-white">
      <TickInRing size={17} />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------- the control */

interface Segment {
  id: string;
  label: string;
  count: number;
}

/**
 * A segmented control, not a row of underlined words.
 *
 * The columns are equal, which is the whole trick: the lit pill is exactly one
 * column wide and moves by whole columns, so its travel is a single transform
 * and nothing has to be measured in JavaScript after a font loads or a label
 * changes length. The track is a sunk ledger well so the pill has something to
 * run in, and the pill is the same raised green key as the primary action.
 */
function SegmentedFilter({
  items,
  value,
  onChange,
  controls,
}: {
  items: readonly Segment[];
  value: string;
  onChange: (id: string) => void;
  controls: string;
}) {
  const { t } = useTranslation();
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === value),
  );
  return (
    <div className="scroll-quiet max-w-full overflow-x-auto rounded-pill border border-rule bg-ledger p-1.5 shadow-sheet">
      <div
        role="tablist"
        aria-label={t('pubResults.catalogue.filterAria')}
        className="relative grid min-w-max"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className="btn-primary settle pointer-events-none absolute bottom-0 left-0 top-0 rounded-pill"
          style={{ width: `${100 / items.length}%`, transform: `translateX(${index * 100}%)` }}
        />
        {items.map((item, i) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${controls}-tab-${i}`}
              aria-selected={selected}
              aria-controls={controls}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') onChange(items[(index + 1) % items.length]!.id);
                if (e.key === 'ArrowLeft') onChange(items[(index - 1 + items.length) % items.length]!.id);
              }}
              className={[
                'press relative z-10 flex items-center justify-center gap-2.5 whitespace-nowrap rounded-pill px-5 py-2.5 text-label',
                selected ? 'font-bold text-white' : 'font-medium text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'inline-block h-2 w-2 shrink-0 rounded-full',
                  selected ? 'bg-white' : 'bg-rule',
                ].join(' ')}
              />
              {item.label}
              <span
                className={[
                  'tnum rounded-pill px-2 py-0.5 text-micro font-semibold',
                  selected ? 'bg-white text-verify' : 'bg-sheet text-ink-soft',
                ].join(' ')}
              >
                {num(item.count)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * How much of the catalogue is currently in view, drawn rather than stated.
 *
 * Two rings, because there are two questions a filter answers at once: how many
 * entries you are looking at, and how much of the subject matter that covers.
 * The arcs move with the segmented control, so the filter has a visible effect
 * beyond the grid re-flowing below the fold.
 */
function CoverageDial({
  shown,
  total,
  sectorsInView,
  sectorsTotal,
}: {
  shown: number;
  total: number;
  sectorsInView: number;
  sectorsTotal: number;
}) {
  const { t } = useTranslation();
  const size = 152;
  const mid = size / 2;
  const rOuter = 58;
  const rInner = 41;
  const cOuter = 2 * Math.PI * rOuter;
  const cInner = 2 * Math.PI * rInner;
  const entryShare = total > 0 ? shown / total : 0;
  const sectorShare = sectorsTotal > 0 ? sectorsInView / sectorsTotal : 0;

  // The caption wraps beneath the rings rather than being squeezed beside them,
  // because the shell clips horizontal overflow and a squeezed legend would
  // simply disappear off the edge of a phone.
  return (
    <figure className="flex flex-wrap items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        focusable="false"
        className="block shrink-0"
      >
        <circle cx={mid} cy={mid} r={rOuter} fill="none" stroke="var(--ledger)" strokeWidth="13" />
        <circle
          cx={mid}
          cy={mid}
          r={rOuter}
          fill="none"
          stroke="var(--verify)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${cOuter * entryShare} ${cOuter}`}
          transform={`rotate(-90 ${mid} ${mid})`}
        />
        <circle cx={mid} cy={mid} r={rInner} fill="none" stroke="var(--sheet)" strokeWidth="7" />
        <circle
          cx={mid}
          cy={mid}
          r={rInner}
          fill="none"
          stroke="var(--saffron)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${cInner * sectorShare} ${cInner}`}
          transform={`rotate(-90 ${mid} ${mid})`}
        />
        <text
          x={mid}
          y={mid + 4}
          textAnchor="middle"
          className="tnum"
          style={{ fontSize: 34, fontWeight: 800, fill: 'var(--ink)', letterSpacing: '-0.035em' }}
        >
          {num(shown)}
        </text>
        <text
          x={mid}
          y={mid + 26}
          textAnchor="middle"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.075em', fill: 'var(--ink-soft)' }}
        >
          {t('pubResults.catalogue.dial.inView')}
        </text>
      </svg>

      <figcaption className="min-w-0 max-w-[186px]">
        <ul className="flex flex-col gap-3">
          <li className="flex items-start gap-2.5">
            <span aria-hidden className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-verify" />
            <span className="text-micro text-ink-soft">
              <span className="tnum block font-semibold text-ink">
                {t('pubResults.catalogue.dial.ratio', { shown: num(shown), total: num(total) })}
              </span>
              {t('pubResults.catalogue.dial.entries')}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span aria-hidden className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-saffron" />
            <span className="text-micro text-ink-soft">
              <span className="tnum block font-semibold text-ink">
                {t('pubResults.catalogue.dial.ratio', { shown: num(sectorsInView), total: num(sectorsTotal) })}
              </span>
              {t('pubResults.catalogue.dial.sectors')}
            </span>
          </li>
        </ul>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------- how an entry lands */

const CHAIN: readonly { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Proved in a real pilot',
    body: 'The solution ran in a live department against a measured baseline, on a paid milestone contract, and the measurements were kept.',
    icon: (
      <Glyph size={20}>
        <path d="M4.4 17.4h15.2" />
        <path d="M7.6 17.4V9.8M12 17.4V5.6M16.4 17.4v-4.8" />
      </Glyph>
    ),
  },
  {
    title: 'Re-derived independently',
    body: 'A validator who does not work for the supplier recomputes every measure from the department’s own records, and says which records were used.',
    icon: (
      <Glyph size={20}>
        <circle cx="10.6" cy="10.6" r="6.2" />
        <path d="m15.2 15.2 4.4 4.4" />
        <path d="m8 10.8 1.9 1.9 3.5-3.9" />
      </Glyph>
    ),
  },
  {
    title: 'Published with its working',
    body: 'The signed report, its checksum and the replication package are published together, so another department can check the claim before adopting it.',
    icon: (
      <Glyph size={20}>
        <path d="M5.4 4.6h13.2v14.8H5.4z" />
        <path d="M8.6 8.8h6.8M8.6 12h6.8M8.6 15.2h4" />
      </Glyph>
    ),
  },
];

const PANEL = 'catalogue-entries';

/**
 * The catalogue is the answer to "has anyone actually made this work".
 *
 * So the thing each card leads with is the measurement — what the number was,
 * what it became, and who checked. The name of the product is secondary; a
 * department shopping here is buying a proven change in a number, and the
 * change is what it should be able to compare at a glance.
 */
export default function Catalogue() {
  const query = useCatalogue();
  const [sector, setSector] = useState('all');
  // The reveal observer only ever sees what is mounted, so filtering the grid
  // has to re-run it or the incoming cards stay at zero opacity for good.
  useReveal([query.data, sector]);

  const link = usePortalLink();
  const rows = query.data?.data ?? [];
  const districts = new Set(rows.map((r) => r.department.shortName)).size;

  return (
    <div className="-mx-4 -mt-6 md:-mx-6">
      <Masthead
        eyebrow="Proved, not promised"
        title="Solutions someone has already made work."
        lead="Nothing reaches this page on a supplier's word. Every entry was re-derived from the department's own records by a validator who does not work for them, against the target the department set before the pilot began."
        figures={[
          { label: 'In the catalogue', value: num(rows.length), tone: 'proved' },
          { label: 'Departments proving', value: num(districts) },
          { label: 'Independently checked', value: 'Every one', tone: 'open' },
        ]}
      />

      <section className="full-bleed bg-ledger px-4 py-12 md:px-6">
        <div className="mx-auto max-w-shell">
          <QueryState
            query={query}
            errorTitle="Unable to load the catalogue."
            loading={<TableSkeleton rows={4} columns={4} />}
            isEmpty={(d) => d.data.length === 0}
            empty={{
              title: 'Nothing has cleared validation yet.',
              body: 'A solution enters the catalogue only after an independent validator signs a report against every success criterion.',
              action: { label: 'See published results', to: link('/results') },
            }}
          >
            {(payload) => {
              const entries = payload.data;
              const sectors = [...new Set(entries.map((e) => e.solution.sector))].sort();
              const tabs: Segment[] = [
                { id: 'all', label: 'Every solution', count: entries.length },
                ...sectors.map((s) => ({
                  id: s,
                  label: s,
                  count: entries.filter((e) => e.solution.sector === s).length,
                })),
              ];
              // A sector can disappear between renders; the filter falls back
              // to everything rather than to an empty grid with no explanation.
              const active = tabs.some((t) => t.id === sector) ? sector : 'all';
              const activeIndex = Math.max(
                0,
                tabs.findIndex((t) => t.id === active),
              );
              const shown = active === 'all' ? entries : entries.filter((e) => e.solution.sector === active);

              const measures = entries.reduce((n, e) => n + e.solution.validatedMetrics.length, 0);
              const validators = new Set(entries.map((e) => e.solution.validatorName)).size;
              const latest = entries.reduce(
                (max, e) => (e.solution.validatedOn > max ? e.solution.validatedOn : max),
                '',
              );

              const figures: {
                label: string;
                value: string;
                note: string;
                icon: ReactNode;
                /* Saffron marks the figure that is an invitation to act; the
                   rest are things already cleared, so they take the green. */
                accent: 'verify' | 'saffron';
              }[] = [
                {
                  label: 'Measures re-derived',
                  value: num(measures),
                  note: 'Each recomputed from source records',
                  accent: 'verify',
                  icon: (
                    <Glyph>
                      <path d="M3.8 16.4a8.2 8.2 0 0 1 16.4 0" />
                      <path d="M3.8 16.4h16.4" />
                      <path d="m12 16.4 4.2-5.4" />
                    </Glyph>
                  ),
                },
                {
                  label: 'Independent validators',
                  value: num(validators),
                  note: 'None of them work for the supplier',
                  accent: 'verify',
                  icon: (
                    <Glyph>
                      <path d="M4.6 19.4 8 18.5l9.1-9.1a2.4 2.4 0 1 0-3.4-3.4L4.6 15.1z" />
                      <path d="m13.4 6.6 3.4 3.4" />
                    </Glyph>
                  ),
                },
                {
                  label: 'Sectors covered',
                  value: num(sectors.length),
                  note: 'Filter the grid below by any of them',
                  accent: 'saffron',
                  icon: (
                    <Glyph>
                      <path d="M12 3.6 3.8 8 12 12.4 20.2 8z" />
                      <path d="M3.8 12 12 16.4 20.2 12" />
                      <path d="M3.8 16 12 20.4 20.2 16" />
                    </Glyph>
                  ),
                },
                {
                  label: 'Most recent signature',
                  value: day(latest),
                  note: 'The last report a validator signed',
                  accent: 'verify',
                  icon: (
                    <Glyph>
                      <path d="M4.8 6.6h14.4v13.2H4.8z" />
                      <path d="M4.8 10.4h14.4" />
                      <path d="M9 4.4v3.4M15 4.4v3.4" />
                      <path d="m9.6 15 1.6 1.6 3.2-3.4" />
                    </Glyph>
                  ),
                },
              ];

              return (
                <>
                  <ul className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {figures.map((f, i) => (
                      <li key={f.label} className="reveal" data-delay={String((i % 4) + 1)}>
                        <div className="sheet lift-on-hover flex h-full flex-col overflow-hidden rounded-block">
                          {/* The cut the figure belongs to, carried as a band
                              across the head of the card rather than as a word. */}
                          <span
                            aria-hidden
                            className={['block h-1 w-full', f.accent === 'saffron' ? 'bg-saffron' : 'bg-verify'].join(
                              ' ',
                            )}
                          />
                          <div className="flex flex-1 flex-col p-5">
                            <span
                              aria-hidden
                              className={[
                                'inline-flex h-11 w-11 items-center justify-center rounded-sheet border border-rule shadow-sheet',
                                f.accent === 'saffron'
                                  ? 'bg-gradient-to-br from-saffron-veil to-sheet text-saffron-ink'
                                  : 'bg-gradient-to-br from-verify-wash to-sheet text-verify',
                              ].join(' ')}
                            >
                              {f.icon}
                            </span>
                            <p className="field-label mt-4">{f.label}</p>
                            <p className="tnum mt-1 font-display text-figure text-ink">{f.value}</p>
                            <p className="mt-2 text-micro text-ink-soft">{f.note}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* The chain of custody behind the grid. It sits on the deep
                      ground because it is the product speaking about its own
                      procedure, not a record — the same voice as the masthead. */}
                  <section className="deep deep-field mb-10 rounded-block px-5 py-8 shadow-lift md:px-8 md:py-10">
                    <p className="field-label mb-3 flex items-center gap-2 !text-saffron">
                      <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                      How an entry gets here
                    </p>
                    <p className="max-w-doc text-lead text-deep-dim">
                      Three things have to happen before a solution appears on this page, and every one of them leaves a
                      record you can open.
                    </p>
                    <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                      {CHAIN.map((step, i) => (
                        <li key={step.title} className="reveal" data-delay={String(i + 1)}>
                          <div
                            className="slab slab-hover flex h-full flex-col rounded-block p-5"
                            data-accent={i === CHAIN.length - 1 ? 'signal' : 'saffron'}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                aria-hidden
                                className="inline-flex h-10 w-10 items-center justify-center rounded-sheet border border-deep-rule bg-deep-3 text-saffron"
                              >
                                {step.icon}
                              </span>
                              <span className="type-register tnum text-micro text-deep-dim">{`0${i + 1}`}</span>
                            </div>
                            <p className="mt-4 font-display text-h3 text-deep-ink">{step.title}</p>
                            <p className="mt-2 text-body text-deep-dim">{step.body}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* The filter and what it is currently showing, read together
                      in one panel — the segmented control on the left, the same
                      answer drawn as two arcs on the right. */}
                  <div className="sheet mb-8 flex flex-wrap items-center justify-between gap-6 rounded-block p-5 shadow-raise md:p-6">
                    <div className="min-w-0 flex-1">
                      <p className="field-label mb-3 flex items-center gap-2 !text-saffron-ink">
                        <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                        Filter by sector
                      </p>
                      <SegmentedFilter items={tabs} value={active} onChange={setSector} controls={PANEL} />
                      <p className="tnum mt-3 text-micro text-ink-soft">
                        Showing {num(shown.length)} of {num(entries.length)} · every one independently validated
                      </p>
                    </div>
                    <CoverageDial
                      shown={shown.length}
                      total={entries.length}
                      sectorsInView={active === 'all' ? sectors.length : 1}
                      sectorsTotal={sectors.length}
                    />
                  </div>

                  <div id={PANEL} role="tabpanel" aria-labelledby={`${PANEL}-tab-${activeIndex}`} tabIndex={0}>
                    <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {shown.map(({ solution, startup, department }, i) => {
                        const lead = solution.validatedMetrics[0];
                        const adopted = solution.adoptedByDepartmentIds.length;
                        return (
                          <li key={solution.id} className="reveal flex" data-delay={String((i % 4) + 1)}>
                            <Link
                              to={link(`/catalogue/${solution.slug}`)}
                              className="group sheet lift-on-hover flex w-full flex-col overflow-hidden rounded-block no-underline"
                            >
                              <span aria-hidden className="rail block h-1 w-full bg-rule" />

                              <div className="flex flex-1 flex-col p-6">
                                <div className="flex items-start justify-between gap-4">
                                  <span
                                    aria-hidden
                                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-sheet text-verify shadow-sheet"
                                  >
                                    <Glyph>{sectorGlyph(solution.sector)}</Glyph>
                                  </span>
                                  <ClearedMark label="Validated" />
                                </div>

                                <p className="field-label mt-5 flex items-center gap-2 !text-saffron-ink">
                                  <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                                  {solution.sector}
                                </p>

                                <h2 className="swift mt-2 font-display text-h2 text-ink group-hover:text-verify">
                                  {solution.name}
                                </h2>
                                <p className="mt-1 text-body text-ink-soft">
                                  {startup.tradeName} · proved by {department.shortName}
                                </p>
                                <p className="mt-3 text-body text-ink">{solution.summary}</p>

                                {/* The three facts a department checks before it
                                    reads any further, as chips rather than as a
                                    paragraph it has to parse. */}
                                <ul className="mt-4 flex flex-wrap items-center gap-2">
                                  <li className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft">
                                    <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-verify" />
                                    {department.district}
                                  </li>
                                  <li className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft">
                                    <span aria-hidden className="text-verify">
                                      <TickInRing size={13} />
                                    </span>
                                    <span className="tnum">{num(solution.attestations.length)}</span> attestations
                                    closed
                                  </li>
                                  {adopted > 0 ? (
                                    <li className="inline-flex items-center gap-1.5 rounded-pill border border-verify bg-verify-wash px-3 py-1 text-micro font-semibold text-verify">
                                      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-verify" />
                                      Adopted by <span className="tnum">{num(adopted)}</span> more
                                    </li>
                                  ) : (
                                    <li className="inline-flex items-center gap-1.5 rounded-pill border border-saffron bg-saffron-veil px-3 py-1 text-micro font-semibold text-saffron-ink">
                                      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-saffron" />
                                      Open to the first adopter
                                    </li>
                                  )}
                                </ul>

                                {/* The measurement leads, because it is what is being bought. */}
                                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {solution.validatedMetrics.slice(0, 4).map((m) => (
                                    <li
                                      key={m.name}
                                      className="rounded-sheet border border-l-2 border-rule border-l-verify bg-verify-wash p-4"
                                    >
                                      <p className="field-label">{m.name}</p>
                                      {/* The measured values carry their unit in the
                                          string, so they are set at reading size and
                                          allowed to wrap rather than run out of the
                                          cell at display size. */}
                                      <p className="mt-2 flex flex-wrap items-baseline gap-2">
                                        <span className="tnum font-display text-h3 text-ink-soft">{m.baseline}</span>
                                        <span aria-hidden className="text-verify">
                                          <ArrowRight />
                                        </span>
                                        <span className="tnum font-display text-h2 text-ink">{m.result}</span>
                                      </p>
                                      <p className="tnum mt-2 inline-flex rounded-pill bg-sheet px-2 py-0.5 text-micro text-ink-soft">
                                        Target {m.target}
                                      </p>
                                    </li>
                                  ))}
                                </ul>

                                {/* What was proved, by whom, against what. The three
                                    questions a department asks before it reads any
                                    further, answered without opening the record. */}
                                <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-sheet border border-rule bg-rule sm:grid-cols-3">
                                  <div className="bg-sheet p-4">
                                    <dt className="field-label">What was proved</dt>
                                    <dd className="mt-1 text-data text-ink">{lead?.name ?? solution.name}</dd>
                                  </div>
                                  <div className="bg-sheet p-4">
                                    <dt className="field-label">By whom</dt>
                                    <dd className="mt-1 text-data text-ink">{solution.validatorName}</dd>
                                  </div>
                                  <div className="bg-sheet p-4">
                                    <dt className="field-label">Against which target</dt>
                                    <dd className="tnum mt-1 text-data text-ink">{lead?.target ?? '—'}</dd>
                                  </div>
                                </dl>

                                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                                  <p className="text-micro text-ink-soft">
                                    Signed {day(solution.validatedOn)} by {solution.validatorName}
                                  </p>
                                  <span className="swift inline-flex items-center gap-2 rounded-pill border border-verify px-4 py-1.5 text-label font-semibold text-verify group-hover:bg-verify group-hover:text-white">
                                    Open the record
                                    <ArrowRight />
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              );
            }}
          </QueryState>
        </div>
      </section>
    </div>
  );
}
