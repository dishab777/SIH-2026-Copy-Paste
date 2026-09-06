import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
  disabledReason?: string;
}

export function Tabs({
  items,
  value,
  onChange,
  children,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const base = useId();
  return (
    <div>
      <div role="tablist" aria-label={t('field.nav.sections')} className="flex flex-wrap items-end gap-0 border-b border-rule">
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              role="tab"
              id={`${base}-${item.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${item.id}`}
              disabled={item.disabled}
              title={item.disabled ? item.disabledReason : undefined}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => {
                const idx = items.findIndex((i) => i.id === value);
                if (e.key === 'ArrowRight') onChange(items[(idx + 1) % items.length]!.id);
                if (e.key === 'ArrowLeft') onChange(items[(idx - 1 + items.length) % items.length]!.id);
              }}
              className={[
                'swift relative -mb-px border-b-2 px-4 py-2 text-label',
                selected ? 'border-b-verify text-ink' : 'border-b-transparent text-ink-soft hover:text-ink',
                item.disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              {item.label}
              {typeof item.count === 'number' ? <span className="ml-2 text-micro tnum">{item.count}</span> : null}
            </button>
          );
        })}
      </div>
      {children ? (
        <div role="tabpanel" id={`${base}-panel-${value}`} aria-labelledby={`${base}-${value}`} tabIndex={0} className="pt-6">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Accordion({
  items,
  defaultOpen,
}: {
  items: { id: string; title: ReactNode; aside?: ReactNode; content: ReactNode }[];
  defaultOpen?: string[];
}) {
  const [open, setOpen] = useState<string[]>(defaultOpen ?? []);
  return (
    <div className="border-t border-rule">
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id} className="border-b border-rule">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => (isOpen ? o.filter((x) => x !== item.id) : [...o, item.id]))}
                className="flex w-full items-center justify-between gap-4 py-3 text-left"
              >
                <span className="flex items-center gap-3 text-body text-ink">
                  <span aria-hidden className="text-ink-soft">
                    {isOpen ? '−' : '+'}
                  </span>
                  {item.title}
                </span>
                {item.aside}
              </button>
            </h3>
            {isOpen ? <div className="pb-4 pl-6">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function Breadcrumb({
  items,
  tone = 'paper',
}: {
  items: { label: string; to?: string }[];
  /** The ground it sits on. A crumb trail in a deep masthead takes the deep inks. */
  tone?: 'paper' | 'deep';
}) {
  const { t } = useTranslation();
  const deep = tone === 'deep';
  return (
    <nav aria-label={t('field.nav.breadcrumb')}>
      <ol
        className={['flex flex-wrap items-center gap-2 text-micro', deep ? 'text-deep-dim' : 'text-ink-soft'].join(' ')}
      >
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {item.to ? (
              <Link
                to={item.to}
                className={[
                  'underline underline-offset-2',
                  deep ? 'text-deep-dim hover:text-saffron' : 'hover:text-ink',
                ].join(' ')}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className={deep ? 'text-deep-ink' : 'text-ink'}>
                {item.label}
              </span>
            )}
            {i < items.length - 1 ? <span aria-hidden>/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={t('field.nav.pagination')} className="flex items-center justify-between gap-4 border-t border-rule py-3">
      <p className="text-micro text-ink-soft tnum">
        {t('field.nav.showing', { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-8 rounded-control border border-rule px-3 text-label disabled:opacity-45"
        >
          {t('field.nav.previous')}
        </button>
        <span className="text-micro text-ink-soft tnum">
          {t('field.nav.page', { page, pages })}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="h-8 rounded-control border border-rule px-3 text-label disabled:opacity-45"
        >
          {t('field.nav.next')}
        </button>
      </div>
    </nav>
  );
}
