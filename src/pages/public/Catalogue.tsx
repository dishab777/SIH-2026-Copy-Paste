import { useState, type ReactNode } from 'react';
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
 * The mark that says a validator signed this off. It is filled rather than
 * outlined, because on a page where everything is green-tinted an outline is
 * the one thing a reader's eye slides past.
 */
function ClearedMark({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-verify px-3 py-1.5 text-label font-bold uppercase tracking-stamp text-white shadow-raise">
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        aria-hidden
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="6.3" />
        <path d="m5.2 8.2 1.9 1.9 3.7-4.2" />
      </svg>
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
 * changes length.
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
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === value),
  );
  return (
    <div className="sheet scroll-quiet max-w-full overflow-x-auto rounded-pill p-1 shadow-raise">
      <div
        role="tablist"
        aria-label="Filter the catalogue by sector"
        className="relative grid min-w-max"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className="settle pointer-events-none absolute bottom-0 left-0 top-0 rounded-pill bg-verify shadow-raise"
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
                'press relative z-10 flex items-center justify-center gap-2 whitespace-nowrap rounded-pill px-5 py-2 text-label',
                selected ? 'font-bold text-white' : 'font-medium text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {item.label}
              <span className="tnum text-micro">{num(item.count)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
              action: { label: 'See published results', to: '/results' },
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

              const figures: { label: string; value: string; note: string; icon: ReactNode }[] = [
                {
                  label: 'Measures re-derived',
                  value: num(measures),
                  note: 'Each recomputed from source records',
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
                        <div className="sheet lift-on-hover flex h-full flex-col rounded-block p-5">
                          <span
                            aria-hidden
                            className="inline-flex h-11 w-11 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-sheet text-verify shadow-sheet"
                          >
                            {f.icon}
                          </span>
                          <p className="field-label mt-4">{f.label}</p>
                          <p className="tnum mt-1 font-display text-figure text-ink">{f.value}</p>
                          <p className="mt-2 text-micro text-ink-soft">{f.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <SegmentedFilter items={tabs} value={active} onChange={setSector} controls={PANEL} />
                    <p className="tnum text-micro text-ink-soft">
                      Showing {num(shown.length)} of {num(entries.length)}
                    </p>
                  </div>

                  <div id={PANEL} role="tabpanel" aria-labelledby={`${PANEL}-tab-${activeIndex}`} tabIndex={0}>
                    <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {shown.map(({ solution, startup, department }, i) => {
                        const lead = solution.validatedMetrics[0];
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
                                          <Glyph size={16}>
                                            <path d="M4 12h13" />
                                            <path d="m12.4 7 5 5-5 5" />
                                          </Glyph>
                                        </span>
                                        <span className="tnum font-display text-h2 text-ink">{m.result}</span>
                                      </p>
                                      <p className="tnum mt-2 inline-flex rounded-pill bg-ledger px-2 py-0.5 text-micro text-ink-soft">
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
                                    <Glyph size={16}>
                                      <path d="M4 12h13" />
                                      <path d="m12.4 7 5 5-5 5" />
                                    </Glyph>
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
