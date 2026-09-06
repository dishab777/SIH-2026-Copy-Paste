import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Pager } from '@/components/ui/Pager';
import type { StatusTone } from '@/components/ui/Badge';
import { platformNowIso } from '@/config/clock';
import { countOf, dayTime } from '@/lib/format';

export interface LedgerColumn<T> {
  key: string;
  header: string;
  /** Unit of the exported figure, appended to the CSV header. The screen shows it already. */
  unit?: string;
  /** Right-align money and counts; they are tabular by default. */
  align?: 'left' | 'right';
  width?: string;
  sortValue?: (row: T) => string | number;
  filterValue?: (row: T) => string;
  render: (row: T) => ReactNode;
  /** Hidden by default but available from the column menu. */
  optional?: boolean;
}

export interface SavedView {
  id: string;
  label: string;
  hiddenColumns: string[];
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, string>;
}

export interface LedgerTableProps<T> {
  caption: string;
  columns: LedgerColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowTone?: (row: T) => StatusTone | undefined;
  onRowOpen?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  savedViews?: SavedView[];
  emptyState?: ReactNode;
  /** Rendered beside the count: a bulk action, a total, a note. */
  toolbar?: ReactNode;
  totalRow?: ReactNode;
  exportName?: string;
  /**
   * What the register is, said above it. Optional, and where it appears the
   * table stops being a loose grid on the page and becomes a named document.
   */
  title?: string;
  /**
   * Rows per page. Omitted, the whole register is on one scroll — right for a
   * table of nine pilots, wrong for four hundred audit entries, where a reader
   * cannot tell how much is left and the scrollbar is the only clue.
   *
   * Sorting, filtering and the CSV export all still act on the WHOLE register,
   * not on the page you happen to be looking at. A page is a way of reading a
   * register, not a subset of one.
   */
  pageSize?: number;
}

/*
 * The wash a row takes from its state.
 *
 * `neutral` is a real colour rather than nothing. It used to be the empty
 * string, and the frozen first column — which inherits its background from the
 * row — resolved to transparent, so on a narrow screen the rest of the table
 * scrolled visibly underneath it. Every row is opaque now.
 */
const TONE_WASH: Record<StatusTone, string> = {
  verify: 'bg-verify-wash',
  hold: 'bg-hold-wash',
  seal: 'bg-seal-wash',
  neutral: 'bg-sheet',
};

const TONE_MARKER: Record<StatusTone, string> = {
  verify: 'border-l-verify',
  hold: 'border-l-hold',
  seal: 'border-l-seal',
  neutral: 'border-l-transparent',
};

/*
 * A right-aligned column is money or a count — the column contract says so — and
 * in a row that already carries a state the figure is the part of the row that
 * state is about: cleared money reads in the ink it was cleared in, a refused or
 * overdue one in the seal. The wash alone was doing this work from four columns
 * away, which is too far to connect on a wide table.
 *
 * It is the default ink for the cell, not the last word: eleven cells across the
 * product put a widget with its own ink inside — an SLA clock, an ageing bar, a
 * badge — and those still win, because they are saying something more specific
 * than the row is.
 */
const TONE_FIGURE: Record<StatusTone, string> = {
  verify: 'text-verify',
  hold: 'text-hold',
  seal: 'text-seal',
  neutral: 'text-ink',
};

/*
 * Above this many rows the body scrolls inside the register rather than running
 * down the page, so the column names stay attached to the figures under them.
 *
 * There is no row windowing. There was, and it assumed every row was 44px —
 * which is true of none of them: fifteen of these tables stack three lines in
 * their first column, and the audit trail (the only table that ever exceeded
 * the threshold, at 400 rows) wraps prose in a 34% column on top of that. The
 * spacer rows under-counted, so the scroll position drifted further the further
 * you scrolled. Windowing this product's rows correctly needs measured heights;
 * rendering four hundred rows costs less than getting that wrong.
 */
const SCROLL_ABOVE = 200;
const SCROLL_HEIGHT = 640;

/* ------------------------------------------------------------------ marks
 * Drawn here rather than imported, so the table carries no icon set and every
 * glyph sits on the one stroke weight the product uses.
 */
function Glyph({ d, size = 13 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

const MARK = {
  register: 'M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5',
  funnel: 'M3.5 5h17l-6.5 7.5V20l-4-2.5v-5z',
  columns: 'M4 5h16v14H4zM10 5v14M16 5v14',
  download: 'M12 4v10M8 10.5l4 4 4-4M4.5 19.5h15',
  bookmark: 'M7 4h10v16l-5-3.5L7 20z',
  empty: 'M5 5h14v14H5zM9 9l6 6M15 9l-6 6',
} as const;

/** The one control shape used across the register's masthead. */
function BarButton({
  onClick,
  children,
  active,
  innerRef,
  ...aria
}: {
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  innerRef?: (el: HTMLButtonElement | null) => void;
} & Record<string, unknown>) {
  return (
    <button
      ref={innerRef}
      type="button"
      onClick={onClick}
      {...aria}
      className={[
        'press inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-label',
        active
          ? 'border-saffron bg-saffron-veil text-saffron'
          : 'border-deep-rule text-deep-dim hover:border-deep-dim hover:text-deep-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function LedgerTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  rowTone,
  onRowOpen,
  selectable,
  selected = [],
  onSelectedChange,
  savedViews,
  emptyState,
  toolbar,
  totalRow,
  exportName = 'prayog-export',
  title,
  pageSize,
}: LedgerTableProps<T>) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hidden, setHidden] = useState<string[]>(columns.filter((c) => c.optional).map((c) => c.key));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [focusRow, setFocusRow] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleColumns = columns.filter((c) => !hidden.includes(c.key));
  const filterable = columns.filter((c) => c.filterValue).length;

  /*
   * Which columns this table is currently made of, as a stable string.
   *
   * The reports page swaps `columns` and `rows` wholesale while React keeps the
   * same instance, so a filter keyed to the previous report's column survived
   * the switch — and since that key no longer matched any column, every row was
   * excluded and the table read as empty until somebody found "Clear filters".
   * Keying off the signature rather than the array fixes it without the effect
   * looping, which it would on all twenty call sites: every one of them builds
   * `columns` inline, so the array identity is new on every render.
   */
  const signature = columns.map((c) => c.key).join('|');
  useEffect(() => {
    setFilters({});
    setSortKey(undefined);
  }, [signature]);

  const filtered = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => v.trim().length > 0);
    if (active.length === 0) return rows;
    return rows.filter((row) =>
      active.every(([key, needle]) => {
        const col = columns.find((c) => c.key === key);
        const value = col?.filterValue?.(row) ?? '';
        return value.toLowerCase().includes(needle.toLowerCase());
      }),
    );
  }, [rows, filters, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDirection, columns]);

  /*
   * The page being read. Everything above this line — filtering, sorting, the
   * export, the total — works on the whole register; only what is drawn is cut.
   */
  const pages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const atPage = Math.min(page, pages - 1);
  const from = pageSize ? atPage * pageSize : 0;
  const visible = pageSize ? sorted.slice(from, from + pageSize) : sorted;
  const capped = !pageSize && sorted.length > SCROLL_ABOVE;

  useEffect(() => {
    setFocusRow(0);
    // A filter that leaves four rows has no page seven to be on.
    setPage(0);
  }, [sortKey, sortDirection, filters]);

  const activeFilters = Object.entries(filters).filter(([, v]) => v.trim().length > 0);

  function toggleSort(key: string): void {
    if (sortKey === key) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  function exportCsv(): void {
    const cell = (raw: string): string => `"${raw.replace(/"/g, '""')}"`;
    const header = visibleColumns.map((c) => cell(c.unit ? `${c.header} (${c.unit})` : c.header));
    const body = sorted.map((row) =>
      visibleColumns.map((c) => cell(c.filterValue?.(row) ?? String(c.sortValue?.(row) ?? ''))),
    );
    // An export that cannot say where it came from is not evidence. The first
    // line records what was exported, when, and how much of the table it is.
    const provenance = [
      cell('PRAYOG export'),
      cell(caption),
      cell(`Generated ${dayTime(platformNowIso())}`),
      cell(`${sorted.length} of ${countOf(rows.length, 'row')}`),
      cell(
        activeFilters.length > 0
          ? `Filtered by ${activeFilters.map(([k, v]) => `${k}="${v.trim()}"`).join('; ')}`
          : 'Unfiltered',
      ),
    ].join(',');
    const csv = [provenance, '', header.join(','), ...body.map((r) => r.join(','))].join(String.fromCharCode(10));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.includes(rowKey(r)));
  const colSpan = visibleColumns.length + (selectable ? 1 : 0);

  return (
    /*
     * One object, not three stacked panels.
     *
     * A register is a bound thing: a printed masthead, a ruled body, a
     * double-ruled total. The controls used to sit on their own sheet with a
     * gap under it, which read as a toolbar that happened to be near a table.
     */
    <div className="sheet-flat overflow-hidden">
      {/*
        The masthead. It is the same deep ground every page in this product
        opens on, so a table reads as part of the same document rather than as
        a data grid dropped into it.
      */}
      <div className="deep border-b border-b-deep-rule px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <p className="flex items-center gap-2 text-label text-deep-ink">
              <span aria-hidden className="text-saffron">
                <Glyph d={MARK.register} size={15} />
              </span>
              {title ? <span className="font-semibold">{title}</span> : null}
              <span className="tnum text-deep-dim">
                {t('table.rows', { count: sorted.length })}
                {sorted.length !== rows.length ? ` · ${t('table.rowsOf', { shown: sorted.length, total: rows.length })}` : ''}
              </span>
            </p>

            {activeFilters.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilters({})}
                className="swift inline-flex items-center gap-1.5 rounded-pill border border-saffron bg-saffron-veil px-2.5 py-1 text-micro text-saffron hover:text-deep-ink"
              >
                {t('table.filtersOn', { count: activeFilters.length })}
              </button>
            ) : null}

            {toolbar}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterable > 0 ? (
              <BarButton
                onClick={() => setFiltersOpen((v) => !v)}
                active={filtersOpen || activeFilters.length > 0}
                aria-expanded={filtersOpen}
              >
                <Glyph d={MARK.funnel} />
                {t('table.filter')}
              </BarButton>
            ) : null}

            {savedViews?.length ? (
              <Popover
                label="Saved views"
                align="right"
                trigger={({ onClick, ref, ...aria }) => (
                  <BarButton onClick={onClick} innerRef={ref} {...aria}>
                    <Glyph d={MARK.bookmark} />
                    {t('table.views')}
                  </BarButton>
                )}
              >
                {(close) => (
                  <ul className="flex w-[240px] flex-col">
                    {savedViews.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setHidden(v.hiddenColumns);
                            setSortKey(v.sortKey);
                            setSortDirection(v.sortDirection ?? 'asc');
                            setFilters(v.filters ?? {});
                            close();
                          }}
                          className="swift w-full rounded-control border-b border-rule px-2 py-2.5 text-left text-body last:border-b-0 hover:bg-verify-wash hover:text-verify"
                        >
                          {v.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Popover>
            ) : null}

            <Popover
              label="Columns"
              align="right"
              trigger={({ onClick, ref, ...aria }) => (
                <BarButton onClick={onClick} innerRef={ref} {...aria}>
                  <Glyph d={MARK.columns} />
                  {t('table.columns')}
                </BarButton>
              )}
            >
              {() => (
                <fieldset className="w-[240px] border-0 p-0">
                  <legend className="field-label mb-3 flex items-center gap-2 !text-saffron-ink">
                    <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                    {t('table.showColumns')}
                  </legend>
                  {columns.map((c) => (
                    <label
                      key={c.key}
                      className="swift flex items-center gap-2.5 rounded-control px-2 py-1.5 text-body hover:bg-ledger"
                    >
                      <input
                        type="checkbox"
                        checked={!hidden.includes(c.key)}
                        onChange={(e) =>
                          setHidden((h) => (e.target.checked ? h.filter((x) => x !== c.key) : [...h, c.key]))
                        }
                        className="h-4 w-4 accent-[color:var(--verify)]"
                      />
                      {c.header}
                    </label>
                  ))}
                </fieldset>
              )}
            </Popover>

            <BarButton onClick={exportCsv}>
              <Glyph d={MARK.download} />
              {t('table.export')}
            </BarButton>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        emptyState ?? (
          /*
            The state a reader actually reaches — not "no data yet", which every
            page answers upstream, but "your filters excluded everything". So it
            says which filters, and offers the way back.
          */
          <div className="px-5 py-12 text-center">
            <span
              aria-hidden
              className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-sheet border border-rule bg-ledger text-ink-soft"
            >
              <Glyph d={MARK.empty} size={20} />
            </span>
            <p className="text-body text-ink">
              {activeFilters.length > 0 ? t('table.noMatch') : t('table.nothing')}
            </p>
            {activeFilters.length > 0 ? (
              <>
                <p className="mx-auto mt-1 max-w-doc text-micro text-ink-soft">
                  {countOf(rows.length, 'row')} in the register, and{' '}
                  {activeFilters.map(([k, v]) => `${k} contains “${v.trim()}”`).join(', ')}.
                </p>
                <div className="mt-4">
                  <Button size="sm" onClick={() => setFilters({})}>
                    {t('table.clearFilters')}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )
      ) : (
        /*
         * `overflow` is what clips the table's own corners to the parent radius
         * and what the sticky header sticks to — no wrapper, and no second
         * scroll container to trap the header in.
         */
        <div
          ref={scrollRef}
          className="overflow-auto scroll-quiet"
          style={capped ? { maxHeight: SCROLL_HEIGHT } : undefined}
        >
          <table className="w-full border-collapse text-data">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 z-10">
              {/* The column names continue the masthead, so the header of a
                  long table stays the header when it sticks. */}
              <tr className="deep">
                {selectable ? (
                  <th scope="col" className="deep w-8 border-b border-b-saffron px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      aria-label={t('table.selectAll')}
                      checked={allSelected}
                      onChange={(e) => onSelectedChange?.(e.target.checked ? sorted.map(rowKey) : [])}
                      className="h-4 w-4 accent-[color:var(--signal)]"
                    />
                  </th>
                ) : null}
                {visibleColumns.map((c, i) => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={sortKey === c.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    style={{ width: c.width }}
                    className={[
                      'field-label deep border-b border-b-saffron px-4 py-3 align-bottom !text-deep-dim',
                      c.align === 'right' ? 'text-right' : 'text-left',
                      sortKey === c.key ? '!text-deep-ink' : '',
                      i === 0 ? 'sticky left-0 md:static' : '',
                    ].join(' ')}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="swift inline-flex items-center gap-1.5 hover:text-deep-ink"
                      >
                        {c.header}
                        {/* The column the table is actually ordered by is the one
                            thing in this bar that is open. */}
                        <span
                          aria-hidden
                          className={sortKey === c.key ? 'text-saffron' : 'text-deep-rule'}
                        >
                          <Glyph
                            d={
                              sortKey === c.key
                                ? sortDirection === 'asc'
                                  ? 'M12 19V6M6.5 11.5 12 6l5.5 5.5'
                                  : 'M12 5v13M6.5 12.5 12 18l5.5-5.5'
                                : 'M8 10.5 12 6.5l4 4M8 13.5l4 4 4-4'
                            }
                            size={11}
                          />
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>

              {/*
                Filters, in a row of their own.
                They used to sit inside every header cell, which made the header
                twice as tall on every table in the product whether or not
                anybody was filtering. They are one click away now.
              */}
              {filtersOpen && filterable > 0 ? (
                <tr className="bg-ledger">
                  {selectable ? <td className="border-b border-b-rule bg-ledger px-3 py-2" /> : null}
                  {visibleColumns.map((c, i) => (
                    <td
                      key={c.key}
                      className={[
                        'border-b border-b-rule bg-ledger px-3 py-2 align-middle',
                        i === 0 ? 'sticky left-0 md:static' : '',
                      ].join(' ')}
                    >
                      {c.filterValue ? (
                        <input
                          aria-label={t('table.filterBy', { column: c.header })}
                          value={filters[c.key] ?? ''}
                          onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                          placeholder={c.header}
                          className="swift w-full rounded-control border border-rule bg-sheet px-2.5 py-1 text-micro font-normal text-ink placeholder:text-ink-soft focus:border-verify"
                        />
                      ) : null}
                    </td>
                  ))}
                </tr>
              ) : null}
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const absoluteIndex = from + i;
                const key = rowKey(row);
                const tone = rowTone?.(row) ?? 'neutral';
                return (
                  <tr
                    key={key}
                    tabIndex={absoluteIndex === focusRow ? 0 : -1}
                    onFocus={() => setFocusRow(absoluteIndex)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = Math.min(from + visible.length - 1, absoluteIndex + 1);
                        setFocusRow(next);
                        (e.currentTarget.parentElement?.children[next - from] as HTMLElement | undefined)?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = Math.max(from, absoluteIndex - 1);
                        setFocusRow(prev);
                        (e.currentTarget.parentElement?.children[prev - from] as HTMLElement | undefined)?.focus();
                      } else if ((e.key === 'Enter' || e.key === ' ') && onRowOpen) {
                        e.preventDefault();
                        onRowOpen(row);
                      }
                    }}
                    onClick={(e) => {
                      /*
                       * A link or a control inside a cell means what it says.
                       * Without this, clicking the pilot link in a payment row
                       * navigated AND opened the approval dialog behind it.
                       */
                      if ((e.target as HTMLElement).closest('a,button,input,select,label')) return;
                      onRowOpen?.(row);
                    }}
                    className={[
                      'ledger-row border-l-2',
                      TONE_WASH[tone],
                      TONE_MARKER[tone],
                      onRowOpen ? 'cursor-pointer' : '',
                    ].join(' ')}
                  >
                    {selectable ? (
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${key}`}
                          checked={selected.includes(key)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onSelectedChange?.(
                              e.target.checked ? [...selected, key] : selected.filter((x) => x !== key),
                            )
                          }
                          className="h-4 w-4 accent-[color:var(--verify)]"
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((c, ci) => (
                      <td
                        key={c.key}
                        className={[
                          'px-3 py-2 align-top',
                          /* A right-aligned column is a quantity, and a quantity in
                             a row with a state is the thing that state is about —
                             the amount overdue, the amount cleared. It takes the
                             row's ink; everything else stays carbon. */
                          c.align === 'right' ? `text-right tnum ${TONE_FIGURE[tone]}` : 'text-ink',
                          /* The frozen cell carries the row's own wash rather than
                             inheriting it, so the table cannot scroll under it. */
                          ci === 0 ? `sticky left-0 md:static ${TONE_WASH[tone]}` : '',
                        ].join(' ')}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            {totalRow ? (
              <tfoot className="bg-ledger">
                {/* The footing of a register, not one more row. It carries the
                    figure the whole table adds up to, so it gets the room. */}
                <tr className="rule-total">
                  <td colSpan={colSpan} className="px-4 py-5">
                    {totalRow}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}

      {pageSize ? (
        <Pager
          page={atPage}
          pages={pages}
          onChange={setPage}
          summary={t('table.showing', {
            from: from + 1,
            to: Math.min(from + pageSize, sorted.length),
            total: sorted.length,
          })}
        />
      ) : null}
    </div>
  );
}
