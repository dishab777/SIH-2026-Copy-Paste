import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/Field';

export interface RailSection {
  id: string;
  label: string;
  /** Small text under the label in the rail. One line, not a paragraph. */
  detail?: string;
  /** How many things are in this section. Rendered as a figure, not a badge. */
  count?: number;
  glyph?: ReactNode;
}

/**
 * A rail that chooses which section you are reading, rather than telling you
 * where it is.
 *
 * Several screens in this product had grown a sticky index down the left of a
 * page that then rendered every section underneath it anyway: the clause
 * library, the audit pack, the seven gates. As an index it worked — it said
 * where you were — but it made a promise it did not keep. A reader who picks
 * "Intellectual property" out of a list of six means *show me that one*, and
 * what they got was a scroll to a heading with the other five still attached,
 * on a page thirty screens long.
 *
 * So this switches. One section is mounted at a time, the rail is the control
 * that changes it, and the foot of the panel carries the step to the next one
 * so the whole set is still walkable in order. Below `lg` the rail becomes a
 * dropdown, because a two-column layout on a phone is one column with a menu
 * bolted to the top of it.
 *
 * It deliberately does not sync to the URL. These are readings of one document,
 * not separate pages, and half the call sites are inside a tab that already
 * owns the query string.
 */
export function SectionRail({
  title,
  note,
  sections,
  value,
  onChange,
  children,
  label,
}: {
  /** The rail's own heading: "Grouped by question", "The pack, in parts". */
  title: string;
  /** One line under it saying what the choice does. */
  note?: string;
  sections: readonly RailSection[];
  value: string;
  onChange: (id: string) => void;
  /** The chosen section's content. */
  children: ReactNode;
  /** Accessible name for the rail, if `title` is not enough on its own. */
  label?: string;
}) {
  const { t } = useTranslation();
  const at = sections.findIndex((s) => s.id === value);
  const previous = at > 0 ? sections[at - 1] : undefined;
  const next = at >= 0 && at < sections.length - 1 ? sections[at + 1] : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
      {/* Below lg: the same choice, as one control. */}
      <div className="lg:hidden">
        <p className="field-label mb-2">{title}</p>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label ?? title}
          options={sections.map((s) => ({
            value: s.id,
            label: typeof s.count === 'number' ? `${s.label} (${s.count})` : s.label,
            detail: s.detail,
          }))}
        />
      </div>

      <nav aria-label={label ?? title} className="hidden h-max lg:sticky lg:top-20 lg:block">
        <div className="glass rounded-block p-5">
          <p className="field-label">{title}</p>
          {note ? <p className="mt-1.5 text-micro text-ink-soft">{note}</p> : null}
          <ul className="mt-3 flex flex-col gap-1">
            {sections.map((s) => {
              const here = s.id === value;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onChange(s.id)}
                    aria-current={here ? 'true' : undefined}
                    className={[
                      'swift flex w-full items-start justify-between gap-3 rounded-control border-l-2 px-3 py-2 text-left text-body',
                      here
                        ? 'border-l-verify bg-verify-wash font-semibold text-verify'
                        : 'border-l-transparent text-ink-soft hover:bg-verify-wash hover:text-verify',
                    ].join(' ')}
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      {s.glyph ? (
                        <span aria-hidden className="mt-0.5 shrink-0">
                          {s.glyph}
                        </span>
                      ) : null}
                      <span className="min-w-0">
                        <span className="block">{s.label}</span>
                        {s.detail ? (
                          <span className="mt-0.5 block text-micro font-normal text-ink-soft">{s.detail}</span>
                        ) : null}
                      </span>
                    </span>
                    {typeof s.count === 'number' ? <span className="shrink-0 text-micro tnum">{s.count}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="flex min-w-0 flex-col gap-6">
        {children}

        {/* The set is still one document. This is how you read the rest of it. */}
        {previous || next ? (
          <nav
            aria-label={t('rail.step')}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5"
          >
            {previous ? (
              <button
                type="button"
                onClick={() => onChange(previous.id)}
                className="swift group flex max-w-full items-baseline gap-2 text-left text-label text-ink-soft hover:text-verify"
              >
                <span aria-hidden>&larr;</span>
                <span className="min-w-0">
                  <span className="block text-micro">{t('rail.previous')}</span>
                  <span className="block truncate text-ink group-hover:text-verify">{previous.label}</span>
                </span>
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button
                type="button"
                onClick={() => onChange(next.id)}
                className="swift group flex max-w-full items-baseline gap-2 text-right text-label text-ink-soft hover:text-verify"
              >
                <span className="min-w-0">
                  <span className="block text-micro">{t('rail.next')}</span>
                  <span className="block truncate text-ink group-hover:text-verify">{next.label}</span>
                </span>
                <span aria-hidden>&rarr;</span>
              </button>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
