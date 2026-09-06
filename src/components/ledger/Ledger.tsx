import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { StatusTone } from '@/components/ui/Badge';

/** A stacked row. Tables become these below 768px. */
export function DataRow({
  primary,
  secondary,
  meta,
  aside,
  tone = 'neutral',
  to,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: { label: string; value: ReactNode }[];
  aside?: ReactNode;
  tone?: StatusTone;
  to?: string;
}) {
  const marker = {
    verify: 'border-l-verify',
    hold: 'border-l-hold',
    seal: 'border-l-seal',
    neutral: 'border-l-transparent',
  }[tone];
  const wash = {
    verify: 'bg-verify-wash',
    hold: 'bg-hold-wash',
    seal: 'bg-seal-wash',
    neutral: '',
  }[tone];

  const body = (
    <div className={['flex items-start justify-between gap-4 border-l-2 px-5 py-4', marker, wash].join(' ')}>
      <div className="min-w-0">
        <div className="text-body text-ink">{primary}</div>
        {secondary ? <div className="mt-1 text-micro text-ink-soft">{secondary}</div> : null}
        {/*
          The facts under a row are the reason someone opens it. Setting them as
          label-over-figure rather than label-beside-figure lets the figure take
          the display face and be scanned down a column.
        */}
        {meta?.length ? (
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="field-label">{m.label}</dt>
                <dd className="mt-0.5 font-display text-h3 text-ink tnum">{m.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {aside ? <div className="shrink-0 text-right">{aside}</div> : null}
    </div>
  );

  return (
    <li className="ledger-row">
      {to ? (
        <Link to={to} className="block no-underline hover:bg-ledger">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

/** Two-column ruled key/value sheet. Used wherever verified facts are shown. */
export function KeyValueSheet({
  title,
  items,
  dense,
  footnote,
  headingLevel = 3,
}: {
  title?: string;
  items: { label: string; value: ReactNode; citation?: string; hint?: string }[];
  dense?: boolean;
  footnote?: ReactNode;
  /** Where this panel sits in the page outline. Pass 2 when it follows the h1 directly. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="sheet-flat">
      {title ? (
        <Heading className="field-label !text-verify border-b border-rule bg-verify-wash px-5 py-3">{title}</Heading>
      ) : null}
      <dl>
        {items.map((item) => (
          <div
            key={item.label}
            className={[
              'grid grid-cols-1 gap-1 border-b border-rule px-5 last:border-b-0 md:grid-cols-[minmax(140px,34%)_1fr] md:gap-4',
              dense ? 'py-2.5' : 'py-3.5',
            ].join(' ')}
          >
            <dt className="field-label">
              {item.label}
              {item.citation ? <span className="mt-0.5 block text-micro text-ink-soft">{item.citation}</span> : null}
            </dt>
            <dd className="text-body text-ink">
              {item.value}
              {item.hint ? <span className="mt-0.5 block text-micro text-ink-soft">{item.hint}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      {footnote ? (
        <div className="border-t border-rule bg-ledger px-5 py-3 text-micro text-ink-soft">{footnote}</div>
      ) : null}
    </section>
  );
}

/** A ruled ledger of figures with a double-ruled total. Never a grid of KPI cards. */
export function StatLedger({
  title,
  rows,
  total,
  freshness,
  headingLevel = 3,
}: {
  title?: string;
  rows: { label: string; value: ReactNode; detail?: string }[];
  total?: { label: string; value: ReactNode };
  freshness?: ReactNode;
  /** Where this panel sits in the page outline. Pass 2 when it follows the h1 directly. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="sheet-flat">
      {title ? (
        <div className="flex items-baseline justify-between gap-4 border-b border-rule bg-verify-wash px-5 py-3">
          <Heading className="field-label !text-verify">{title}</Heading>
          {freshness}
        </div>
      ) : null}
      <dl>
        {rows.map((r) => (
          <div
            key={r.label}
            className="swift flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule px-5 py-3.5 last:border-b-0 hover:bg-verify-wash"
          >
            <dt className="min-w-0 text-body text-ink">
              {r.label}
              {r.detail ? <span className="mt-0.5 block text-micro text-ink-soft">{r.detail}</span> : null}
            </dt>
            {/*
              A figure is read as a quantity, not as a sentence, so it takes the
              display face and tabular figures — which is also what lets a
              column of them be compared down rather than read across.
            */}
            <dd className="min-w-0 max-w-full text-left font-display text-h3 text-ink tnum sm:text-right">{r.value}</dd>
          </div>
        ))}
      </dl>
      {total ? (
        <div className="flex items-baseline justify-between gap-6 rounded-b-sheet border-t-2 border-t-verify bg-verify-wash px-5 py-4">
          <span className="text-body font-semibold text-ink">{total.label}</span>
          <span className="font-display text-figure text-verify tnum">{total.value}</span>
        </div>
      ) : null}
    </section>
  );
}

/** Side-by-side comparison. Used for scores, milestones and pathway options. */
export function ComparisonMatrix({
  rowHeader,
  columns,
  rows,
  caption,
}: {
  rowHeader: string;
  columns: { key: string; label: string; sublabel?: string }[];
  rows: { key: string; label: string; detail?: string; cells: Record<string, ReactNode> }[];
  /** What the table compares. Read before the data by anyone using a screen reader. */
  caption?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-auto scroll-quiet">
      <table className="w-full border-collapse text-data">
        <caption className="sr-only">
          {caption ?? t('taxonomy.matrix.caption', { rowHeader, columns: columns.map((c) => c.label).join(', ') })}
        </caption>
        <thead>
          <tr className="rule-close">
            <th
              scope="col"
              className="field-label sticky left-0 border-b-2 border-b-verify bg-verify-wash px-3 py-2.5 text-left !text-verify"
            >
              {rowHeader}
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="field-label border-b-2 border-b-verify bg-verify-wash px-3 py-2.5 text-left !text-verify"
              >
                {c.label}
                {c.sublabel ? <span className="block text-micro font-normal">{c.sublabel}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="ledger-row">
              <th scope="row" className="sticky left-0 bg-sheet px-3 py-2 text-left align-top text-body font-normal text-ink">
                {r.label}
                {r.detail ? <span className="block text-micro text-ink-soft">{r.detail}</span> : null}
              </th>
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 align-top text-ink">
                  {r.cells[c.key] ?? <span className="text-ink-soft">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
