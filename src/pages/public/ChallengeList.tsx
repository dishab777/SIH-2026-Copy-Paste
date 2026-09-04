import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChallenges } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { Skeleton, EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Nav';
import { Field, Input, Select, MultiSelectTags, NumberInput, Checkbox } from '@/components/ui/Field';
import { ChallengeCard } from '@/components/domain/ChallengeCard';
import { SECTORS, STATES, CAPABILITIES } from '@/mocks/fixtures/reference';
import { moneyScaled, num } from '@/lib/format';
import type { Challenge } from '@/types/models';

const SORTS = [
  { value: 'closing', label: 'Closing soonest' },
  { value: 'budget', label: 'Largest pilot budget' },
  { value: 'newest', label: 'Most recently published' },
  { value: 'fewest', label: 'Fewest applicants' },
];

/*
 * Six to a page.
 *
 * The grid is three across on a desk and two on a laptop, so six fills whole
 * rows at both widths rather than leaving a ragged half-row at the bottom, and
 * it is few enough that a reader compares the cards instead of scrolling past
 * forty of them. This is a reading decision, not a statutory one, so it lives
 * here rather than in config.
 */
const PAGE_SIZE = 6;

/* ------------------------------------------------------------------- glyphs
 * Drawn here rather than imported, because a filter list with nothing but words
 * down its left edge reads as a form. One stroke weight, one 16px box, one
 * currentColor, so a group takes its meaning from the ink it is tinted in.
 */
type GlyphName = 'funnel' | 'search' | 'tag' | 'pin' | 'nodes' | 'rupee' | 'clock' | 'shield' | 'inbox';

const GLYPHS: Record<GlyphName, ReactNode> = {
  funnel: <path d="M2.4 2.9h11.2l-4.4 5.2v4.6l-2.4 1.4V8.1z" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.3" />
      <path d="M10.2 10.2 13.6 13.6" />
    </>
  ),
  tag: (
    <>
      <path d="M8.6 2H14v5.4l-6.1 6.1a1.1 1.1 0 0 1-1.6 0L2 9.2a1.1 1.1 0 0 1 0-1.6z" />
      <circle cx="11.1" cy="4.9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  pin: (
    <>
      <path d="M8 14.2c3.1-3 4.7-5.4 4.7-7.4a4.7 4.7 0 0 0-9.4 0c0 2 1.6 4.4 4.7 7.4z" />
      <circle cx="8" cy="6.6" r="1.8" />
    </>
  ),
  nodes: (
    <>
      <circle cx="4" cy="4.2" r="1.6" />
      <circle cx="12" cy="4.2" r="1.6" />
      <circle cx="8" cy="12" r="1.6" />
      <path d="M5.6 4.2h4.8M5.5 5.6 6.9 10.5M10.5 5.6 9.1 10.5" />
    </>
  ),
  rupee: (
    <>
      <path d="M4.4 3.1h7.2" />
      <path d="M4.4 6h7.2" />
      <path d="M4.4 8.9h1.7c2.3 0 3.7-1.1 3.7-2.9" />
      <path d="M6.1 8.9 11.6 13.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 4.5V8l2.6 1.7" />
    </>
  ),
  shield: (
    <>
      <path d="M8 1.9 13 3.9v3.8c0 3-2 5.1-5 6.4-3-1.3-5-3.4-5-6.4V3.9z" />
      <path d="m5.9 7.9 1.5 1.5 2.8-3" />
    </>
  ),
  inbox: (
    <>
      <path d="M4.2 3.2h7.6l2 6.2v3.4H2.2V9.4z" />
      <path d="M2.4 9.4h3.2l1 1.9h2.8l1-1.9h3.2" />
    </>
  ),
};

function Glyph({ name, size = 16 }: { name: GlyphName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className="shrink-0"
    >
      {GLYPHS[name]}
    </svg>
  );
}

/**
 * One filter, with its subject drawn beside it.
 *
 * The icon is tinted in the ink that filter's answer is written in — the
 * closing window in the ink of something running against a limit, startup
 * relief in the ink of something open to you — so the sidebar carries the same
 * meanings as the cards it is narrowing.
 */
function FilterGroup({ icon, tint = 'text-verify', children }: { icon: GlyphName; tint?: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t border-rule pt-5 first:border-t-0 first:pt-0">
      <span className={['shrink-0', tint].join(' ')}>
        <Glyph name={icon} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

interface Summary {
  budgetPaise: number;
  open: number;
  relief: number;
}

function summarise(rows: Challenge[]): Summary {
  return rows.reduce<Summary>(
    (acc, c) => ({
      budgetPaise: acc.budgetPaise + c.pilot.budgetPaise,
      open: acc.open + (c.status === 'open' || c.status === 'closing_soon' ? 1 : 0),
      relief: acc.relief + (c.eligibility.relaxationsAvailable ? 1 : 0),
    }),
    { budgetPaise: 0, open: 0, relief: 0 },
  );
}

export default function ChallengeList() {
  // Filter state lives in the URL so a filtered view can be shared and returned to.
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      view: 'public',
      q: params.get('q') ?? '',
      sector: params.getAll('sector'),
      state: params.getAll('state'),
      capability: params.getAll('capability'),
      status: params.getAll('status'),
      minBudget: params.get('minBudget') ?? '',
      maxBudget: params.get('maxBudget') ?? '',
      closingWithin: params.get('closingWithin') ?? '',
      relaxation: params.get('relaxation') ?? '',
      sort: params.get('sort') ?? 'closing',
    }),
    [params],
  );

  const challenges = useChallenges(filters);

  /*
   * The page is deliberately not part of `filters`: it is a reading position,
   * not a query, and folding it in would change the query key and refetch the
   * whole list every time someone turned a page.
   */
  const requested = Math.max(1, Math.floor(Number(params.get('page') ?? '1')) || 1);
  const rows = challenges.data?.data ?? [];
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Narrowing the list can strand a reader past the last page, so the position
  // is clamped on read rather than written back during a render.
  const page = Math.min(requested, pageCount);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = summarise(rows);

  // Any change to what is being asked for puts the reader back at the first page.
  function set(key: string, value: string | string[]): void {
    const next = new URLSearchParams(params);
    next.delete(key);
    next.delete('page');
    if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
    else if (value) next.set(key, value);
    setParams(next, { replace: true });
  }

  function clearAll(): void {
    setParams(new URLSearchParams(), { replace: true });
  }

  function drop(key: string, value: string): void {
    const next = new URLSearchParams(params);
    const remaining = next.getAll(key).filter((v) => v !== value);
    next.delete(key);
    next.delete('page');
    remaining.forEach((v) => next.append(key, v));
    setParams(next, { replace: true });
  }

  // Turning a page is navigation, so it pushes: the back button returns you to
  // the page you were reading rather than to the last filter you touched.
  function goToPage(next: number): void {
    const p = new URLSearchParams(params);
    if (next <= 1) p.delete('page');
    else p.set('page', String(next));
    setParams(p);
  }

  const activeFilters = [
    ...filters.sector.map((s) => ({ key: 'sector', value: s, label: `Sector: ${s}` })),
    ...filters.state.map((s) => ({ key: 'state', value: s, label: `State: ${s}` })),
    ...filters.capability.map((s) => ({ key: 'capability', value: s, label: `Capability: ${s}` })),
    ...(filters.minBudget ? [{ key: 'minBudget', value: filters.minBudget, label: `Budget at least ₹${filters.minBudget}` }] : []),
    ...(filters.maxBudget ? [{ key: 'maxBudget', value: filters.maxBudget, label: `Budget at most ₹${filters.maxBudget}` }] : []),
    ...(filters.closingWithin ? [{ key: 'closingWithin', value: filters.closingWithin, label: `Closing within ${filters.closingWithin} days` }] : []),
    ...(filters.relaxation ? [{ key: 'relaxation', value: 'true', label: 'Startup relief available' }] : []),
    ...(filters.q ? [{ key: 'q', value: filters.q, label: `Text: ${filters.q}` }] : []),
  ];

  const cards: { key: string; icon: GlyphName; label: string; value: string; tile: string; figure: string }[] = [
    {
      key: 'budget',
      icon: 'rupee',
      label: 'Pilot budget on offer',
      value: moneyScaled(summary.budgetPaise),
      tile: 'bg-verify text-white',
      figure: 'text-verify',
    },
    {
      key: 'open',
      icon: 'inbox',
      label: 'Accepting applications',
      value: num(summary.open),
      tile: 'bg-saffron text-deep',
      figure: 'text-saffron-ink',
    },
    {
      key: 'relief',
      icon: 'shield',
      label: 'With startup relief',
      value: num(summary.relief),
      tile: 'bg-verify-wash text-verify',
      figure: 'text-verify',
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Public register"
        title="Open challenges"
        lead="Every published challenge, with its budget, its deadline and the rubric it will be scored against."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[288px_1fr]">
        <aside aria-label="Filters">
          {/*
            The filter list floats over the results while they scroll past it, so
            it is the one panel on this screen that earns a real backdrop blur.
          */}
          <div className="glass panel-in rounded-block bg-gradient-to-b from-verify-wash to-transparent p-5 shadow-raise scroll-quiet lg:sticky lg:top-20 lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-rule pb-4">
              <p className="flex items-center gap-2.5 text-label font-medium text-ink">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-verify text-white shadow-sheet">
                  <Glyph name="funnel" />
                </span>
                Filters
              </p>
              {activeFilters.length > 0 ? (
                <span className="rounded-pill border border-verify bg-verify-wash px-2.5 py-0.5 text-micro text-verify tnum">
                  {activeFilters.length}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-5">
              <FilterGroup icon="search" tint="text-ink-soft">
                <Field label="Search the text">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={filters.q}
                      onChange={(e) => set('q', e.target.value)}
                      placeholder="water, fuel, dropout"
                    />
                  )}
                </Field>
              </FilterGroup>

              <FilterGroup icon="tag">
                <Field label="Sector">
                  {({ id }) => (
                    <MultiSelectTags
                      id={id}
                      values={filters.sector}
                      onChange={(v) => set('sector', v)}
                      options={[...SECTORS]}
                      placeholder="Add a sector"
                    />
                  )}
                </Field>
              </FilterGroup>

              <FilterGroup icon="pin">
                <Field label="State">
                  {({ id }) => (
                    <MultiSelectTags
                      id={id}
                      values={filters.state}
                      onChange={(v) => set('state', v)}
                      options={[...STATES]}
                      placeholder="Add a state"
                    />
                  )}
                </Field>
              </FilterGroup>

              <FilterGroup icon="nodes">
                <Field label="Capability">
                  {({ id }) => (
                    <MultiSelectTags
                      id={id}
                      values={filters.capability}
                      onChange={(v) => set('capability', v)}
                      options={[...CAPABILITIES]}
                      placeholder="Add a capability"
                    />
                  )}
                </Field>
              </FilterGroup>

              <FilterGroup icon="rupee">
                <div className="flex flex-col gap-4">
                  <Field label="Budget from (₹)">
                    {({ id }) => (
                      <NumberInput id={id} value={filters.minBudget} onChange={(e) => set('minBudget', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Budget to (₹)">
                    {({ id }) => (
                      <NumberInput id={id} value={filters.maxBudget} onChange={(e) => set('maxBudget', e.target.value)} />
                    )}
                  </Field>
                </div>
              </FilterGroup>

              <FilterGroup icon="clock" tint="text-hold">
                <Field label="Closing window">
                  {({ id }) => (
                    <Select
                      id={id}
                      placeholder="Any time"
                      value={filters.closingWithin}
                      onChange={(e) => set('closingWithin', e.target.value)}
                      options={[
                        { value: '7', label: 'Within 7 days' },
                        { value: '14', label: 'Within 14 days' },
                        { value: '30', label: 'Within 30 days' },
                      ]}
                    />
                  )}
                </Field>
              </FilterGroup>

              <FilterGroup icon="shield" tint="text-saffron-ink">
                <Checkbox
                  checked={filters.relaxation === 'true'}
                  onChange={(on) => set('relaxation', on ? 'true' : '')}
                  label="Startup relief available"
                  detail="Prior turnover and prior experience relaxed for a recognised startup."
                />
              </FilterGroup>
            </div>
          </div>
        </aside>

        <div>
          <QueryState
            query={challenges}
            errorTitle="Unable to load challenges."
            loading={
              <div
                role="status"
                aria-live="polite"
                aria-label="Loading challenges"
                className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"
              >
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div
                    key={i}
                    className="sheet-flat rounded-block bg-gradient-to-b from-verify-wash to-transparent px-5 py-5"
                  >
                    <Skeleton className="mb-3 h-2.5" width="35%" />
                    <Skeleton className="mb-4 h-5" width="85%" />
                    <Skeleton className="mb-2 h-4" width="100%" />
                    <Skeleton className="mb-6 h-4" width="70%" />
                    <Skeleton className="h-8" width="45%" />
                  </div>
                ))}
              </div>
            }
          >
            {(payload) => {
              if (payload.data.length === 0) {
                return (
                  <EmptyState
                    title={
                      activeFilters.length
                        ? 'No challenges match these filters.'
                        : 'No challenges are open right now.'
                    }
                    body={
                      activeFilters.length
                        ? `These filters are narrowing the list: ${activeFilters.map((f) => f.label).join('; ')}.`
                        : 'Departments publish here as soon as gate 1 clears. Until then the published results are the best picture of what this programme buys.'
                    }
                    action={
                      activeFilters.length
                        ? { label: 'Clear filters', onClick: clearAll }
                        : { label: 'See published results', to: '/results' }
                    }
                  />
                );
              }
              return (
                <>
                  {/* What the filtered register adds up to, before the cases
                      themselves: the money on the table, how much of it is still
                      open, and how much of it a recognised startup can reach. */}
                  <dl className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {cards.map((c) => (
                      <div
                        key={c.key}
                        className="sheet-flat lift-on-hover rounded-sheet bg-gradient-to-br from-verify-wash to-transparent px-5 py-5"
                      >
                        <dt className="field-label">
                          <span
                            className={[
                              'mb-3 flex h-9 w-9 items-center justify-center rounded-control shadow-sheet',
                              c.tile,
                            ].join(' ')}
                          >
                            <Glyph name={c.icon} size={20} />
                          </span>
                          {c.label}
                        </dt>
                        <dd className={['mt-1.5 font-display text-figure tnum', c.figure].join(' ')}>{c.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div className="border-l-2 border-l-verify pl-4">
                      <p className="field-label mb-1 flex items-center gap-2 !text-saffron-ink">
                        <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                        Register
                      </p>
                      <p aria-live="polite" className="font-display text-h3 text-ink tnum">
                        {total} {total === 1 ? 'challenge' : 'challenges'}
                        {pageCount > 1 ? (
                          <span className="ml-2 text-label font-normal text-ink-soft">
                            page {page} of {pageCount}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="w-[220px]">
                      <Field label="Sort by">
                        {({ id }) => (
                          <Select
                            id={id}
                            options={SORTS}
                            value={filters.sort}
                            onChange={(e) => set('sort', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>
                  </div>

                  {activeFilters.length > 0 ? (
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      {activeFilters.map((f) => (
                        <button
                          key={`${f.key}-${f.value}`}
                          type="button"
                          onClick={() => drop(f.key, f.value)}
                          className="press inline-flex items-center gap-2 rounded-pill border border-verify bg-verify-wash px-3 py-1 text-micro text-verify hover:bg-verify hover:text-white"
                        >
                          {f.label} <span aria-hidden>×</span>
                          <span className="sr-only">Remove this filter</span>
                        </button>
                      ))}
                      <Button tone="quiet" size="sm" onClick={clearAll}>
                        Clear all
                      </Button>
                    </div>
                  ) : null}

                  {/* Keyed on the page, so turning one settles the new set into
                      place instead of swapping six cards in silence. */}
                  <ul key={page} className="panel-in grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {pageRows.map((c) => (
                      <li key={c.id}>
                        <ChallengeCard challenge={c} detailed headingLevel={2} />
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={goToPage} />
                  </div>
                </>
              );
            }}
          </QueryState>
        </div>
      </div>
    </div>
  );
}
