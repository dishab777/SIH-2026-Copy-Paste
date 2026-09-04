import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Popover } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
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
  /** Rendered under the header row: a funnel, a total, a filter summary. */
  toolbar?: ReactNode;
  totalRow?: ReactNode;
  exportName?: string;
}

const TONE_WASH: Record<StatusTone, string> = {
  verify: 'bg-verify-wash',
  hold: 'bg-hold-wash',
  seal: 'bg-seal-wash',
  neutral: '',
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
 * It is the single source of colour for the cell. A `text-ink` alongside one of
 * these would be a coin toss decided by stylesheet order rather than by intent.
 */
const TONE_FIGURE: Record<StatusTone, string> = {
  verify: 'text-verify',
  hold: 'text-hold',
  seal: 'text-seal',
  neutral: 'text-ink',
};

const VIRTUALISE_ABOVE = 200;
const ROW_HEIGHT = 44;

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
}: LedgerTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hidden, setHidden] = useState<string[]>(columns.filter((c) => c.optional).map((c) => c.key));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [focusRow, setFocusRow] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleColumns = columns.filter((c) => !hidden.includes(c.key));

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

  const virtualise = sorted.length > VIRTUALISE_ABOVE;
  const viewportHeight = 640;
  const startIndex = virtualise ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 6) : 0;
  const endIndex = virtualise ? Math.min(sorted.length, startIndex + Math.ceil(viewportHeight / ROW_HEIGHT) + 12) : sorted.length;
  const windowRows = sorted.slice(startIndex, endIndex);

  useEffect(() => {
    setFocusRow(0);
  }, [sortKey, sortDirection, filters]);

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
        Object.entries(filters).filter(([, v]) => v.trim()).length > 0
          ? `Filtered by ${Object.entries(filters)
              .filter(([, v]) => v.trim())
              .map(([k, v]) => `${k}="${v.trim()}"`)
              .join('; ')}`
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

  return (
    <div>
      <div className="sheet-flat mb-4 flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <p className="flex items-center gap-2.5 text-label text-ink tnum">
            {/* The count is what the filters and the sort are acting on, so it carries the open mark. */}
            <span aria-hidden className="inline-block h-4 w-0.5 rounded-pill bg-saffron" />
            {sorted.length} {sorted.length === 1 ? 'row' : 'rows'}
            {sorted.length !== rows.length ? ` of ${rows.length}` : ''}
          </p>
          {Object.values(filters).some((v) => v) ? (
            <button
              type="button"
              onClick={() => setFilters({})}
              className="swift text-micro text-saffron-ink underline underline-offset-2 hover:text-ink"
            >
              Clear filters
            </button>
          ) : null}
          {toolbar}
        </div>
        <div className="flex items-center gap-3">
          {savedViews?.length ? (
            <Popover
              label="Saved views"
              align="right"
              trigger={({ onClick, ref, ...aria }) => (
                <button
                  ref={ref}
                  onClick={onClick}
                  {...aria}
                  className="press h-8 rounded-control border border-rule bg-sheet px-3 text-label text-ink hover:border-ink hover:bg-ledger"
                >
                  Saved views
                </button>
              )}
            >
              {(close) => (
                <ul className="flex flex-col">
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
              <button
                ref={ref}
                onClick={onClick}
                {...aria}
                className="press h-8 rounded-control border border-rule bg-sheet px-3 text-label text-ink hover:border-ink hover:bg-ledger"
              >
                Columns
              </button>
            )}
          >
            {() => (
              <fieldset className="border-0 p-0">
                <legend className="field-label mb-3 flex items-center gap-2 !text-saffron-ink">
                  <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                  Show these columns
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
          <Button size="sm" onClick={exportCsv}>
            Export as CSV
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        emptyState ?? (
          <p className="sheet-flat px-5 py-8 text-body text-ink-soft">No rows match these filters.</p>
        )
      ) : (
        /*
         * The sheet is what rounds; the rows inside it stay square. `overflow`
         * is already `auto` here for the sticky header, and that is also what
         * clips the table's own corners to the radius — no wrapper, and no
         * second scroll container to trap the header in.
         */
        <div
          ref={scrollRef}
          onScroll={(e) => virtualise && setScrollTop(e.currentTarget.scrollTop)}
          className="sheet-flat overflow-auto scroll-quiet"
          style={virtualise ? { maxHeight: viewportHeight } : undefined}
        >
          <table className="w-full border-collapse text-data">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 z-10 bg-ledger">
              <tr className="rule-close">
                {selectable ? (
                  <th scope="col" className="w-8 border-b-2 border-b-ink px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={allSelected}
                      onChange={(e) => onSelectedChange?.(e.target.checked ? sorted.map(rowKey) : [])}
                      className="h-4 w-4 accent-[color:var(--verify)]"
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
                      'field-label border-b-2 border-b-ink px-4 py-3 align-bottom',
                      c.align === 'right' ? 'text-right' : 'text-left',
                      sortKey === c.key ? '!text-ink' : '',
                      i === 0 ? 'sticky left-0 bg-ledger md:static' : '',
                    ].join(' ')}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="swift inline-flex items-center gap-1.5 hover:text-ink"
                      >
                        {c.header}
                        {/* The column the table is actually ordered by is the one thing here that is open. */}
                        <span
                          aria-hidden
                          className={['text-micro', sortKey === c.key ? 'text-saffron-ink' : ''].join(' ')}
                        >
                          {sortKey === c.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                    {c.filterValue ? (
                      <input
                        aria-label={`Filter by ${c.header}`}
                        value={filters[c.key] ?? ''}
                        onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                        placeholder="Filter"
                        className="swift mt-2 block w-full rounded-control border border-rule bg-sheet px-2.5 py-1 text-micro font-normal text-ink placeholder:text-ink-soft focus:border-verify"
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {virtualise && startIndex > 0 ? (
                <tr aria-hidden>
                  <td style={{ height: startIndex * ROW_HEIGHT }} colSpan={visibleColumns.length + (selectable ? 1 : 0)} />
                </tr>
              ) : null}
              {windowRows.map((row, i) => {
                const key = rowKey(row);
                const tone = rowTone?.(row) ?? 'neutral';
                const absoluteIndex = startIndex + i;
                return (
                  <tr
                    key={key}
                    tabIndex={absoluteIndex === focusRow ? 0 : -1}
                    onFocus={() => setFocusRow(absoluteIndex)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = Math.min(sorted.length - 1, absoluteIndex + 1);
                        setFocusRow(next);
                        (e.currentTarget.parentElement?.children[next - startIndex] as HTMLElement | undefined)?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = Math.max(0, absoluteIndex - 1);
                        setFocusRow(prev);
                        (e.currentTarget.parentElement?.children[prev - startIndex] as HTMLElement | undefined)?.focus();
                      } else if ((e.key === 'Enter' || e.key === ' ') && onRowOpen) {
                        e.preventDefault();
                        onRowOpen(row);
                      }
                    }}
                    onClick={() => onRowOpen?.(row)}
                    className={[
                      'ledger-row border-l-2',
                      TONE_WASH[tone],
                      TONE_MARKER[tone],
                      onRowOpen ? 'cursor-pointer hover:bg-ledger' : '',
                    ].join(' ')}
                    style={virtualise ? { height: ROW_HEIGHT } : undefined}
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
                          ci === 0 ? 'sticky left-0 bg-inherit md:static' : '',
                        ].join(' ')}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {virtualise && endIndex < sorted.length ? (
                <tr aria-hidden>
                  <td
                    style={{ height: (sorted.length - endIndex) * ROW_HEIGHT }}
                    colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  />
                </tr>
              ) : null}
            </tbody>
            {totalRow ? (
              <tfoot>
                <tr className="rule-total">
                  <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="px-3 py-3">
                    {totalRow}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </div>
  );
}
