import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

/**
 * The pager, one implementation.
 *
 * It was written inside `LedgerTable` and belonged to tables only, which is why
 * the startup's match list ran to twenty-odd full-height entries on a single
 * scroll: the one thing on the page that could have paginated it was a table,
 * and a match is not a row. Lifting it out costs nothing and makes "page 2"
 * available to any list that has more entries than a reader wants at once.
 *
 * Numbers rather than only prev/next, because "page 4 of 9" is a position and
 * "next" is not: a reader who wants the last three entries should not have to
 * walk there.
 */
export function Pager({
  page,
  pages,
  onChange,
  summary,
}: {
  /** Zero-based, so it indexes the slice directly. */
  page: number;
  pages: number;
  onChange: (page: number) => void;
  /** Left of the numbers: "Showing 11–20 of 34". */
  summary?: ReactNode;
}) {
  const { t } = useTranslation();
  if (pages <= 1) return null;

  return (
    <nav
      aria-label={t('table.pagination')}
      className="flex flex-wrap items-center justify-between gap-4 border-t border-rule bg-ledger px-4 py-3"
    >
      <p className="text-micro text-ink-soft tnum">{summary}</p>

      <div className="flex items-center gap-1.5">
        <PagerButton onClick={() => onChange(page - 1)} disabled={page === 0} label={t('table.previousPage')}>
          <Chevron d="M15 5 8 12l7 7" />
        </PagerButton>

        {pageWindow(page, pages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 text-micro text-ink-soft">
              &hellip;
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-current={n === page ? 'page' : undefined}
              aria-label={t('table.goToPage', { page: n + 1 })}
              className={[
                'press h-8 min-w-8 rounded-control border px-2 text-label tnum',
                n === page
                  ? 'border-verify bg-verify-wash font-semibold text-verify'
                  : 'border-rule bg-sheet text-ink-soft hover:border-ink hover:text-ink',
              ].join(' ')}
            >
              {n + 1}
            </button>
          ),
        )}

        <PagerButton onClick={() => onChange(page + 1)} disabled={page === pages - 1} label={t('table.nextPage')}>
          <Chevron d="m9 5 7 7-7 7" />
        </PagerButton>
      </div>
    </nav>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg
      width={14}
      height={14}
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

/** One step of the pager. */
export function PagerButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="press flex h-8 w-8 items-center justify-center rounded-control border border-rule bg-sheet text-ink-soft hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:border-rule disabled:text-rule"
    >
      {children}
    </button>
  );
}

/**
 * Which page numbers to draw: always the first and the last, always the three
 * around where you are, and an ellipsis for whatever that skips. Twenty numbered
 * buttons is not navigation, it is a second table.
 */
export function pageWindow(at: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const near = [at - 1, at, at + 1].filter((n) => n > 0 && n < total - 1);
  const keep = new Set<number>([0, total - 1, ...near]);
  const out: (number | null)[] = [];
  let previous = -1;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (previous !== -1 && n - previous > 1) out.push(null);
    out.push(n);
    previous = n;
  }
  return out;
}
