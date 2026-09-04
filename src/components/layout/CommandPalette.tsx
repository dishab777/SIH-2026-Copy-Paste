import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@/services/hooks';
import { useFocusTrap } from '@/components/ui/Overlay';
import { useUi } from '@/store/ui';
import { countOf } from '@/lib/format';

interface Hit {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  to: string;
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useFocusTrap(open, () => setOpen(false));
  const { data, isFetching } = useSearch(q);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
    else setQ('');
  }, [open]);

  const hits: Hit[] = useMemo(() => {
    const d = data?.data;
    if (!d) return [];
    return [
      ...d.challenges.map((c) => ({
        id: `c-${c.id}`,
        group: 'Challenges',
        title: c.title,
        subtitle: `${c.caseId ?? ''} · ${c.subtitle}${c.gate ? ` · ${c.gate}` : ''}`,
        to: `/d/challenges/${c.id}`,
      })),
      ...d.pilots.map((p) => ({
        id: `p-${p.id}`,
        group: 'Pilots',
        title: p.title,
        subtitle: `${p.caseId ?? ''} · ${p.subtitle}${p.gate ? ` · ${p.gate}` : ''}`,
        to: `/d/pilots/${p.id}`,
      })),
      ...d.startups.map((s) => ({
        id: `s-${s.id}`,
        group: 'Startups',
        title: s.title,
        subtitle: s.subtitle,
        to: `/startups/${s.slug ?? s.id}`,
      })),
      ...d.applications.map((a) => ({
        id: `a-${a.id}`,
        group: 'Applications',
        title: a.title,
        subtitle: a.subtitle,
        to: `/s/applications/${a.id}`,
      })),
    ];
  }, [data]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-scrim p-4 pt-[12vh]">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Search cases, challenges and startups"
        className="w-full max-w-[640px] rounded-sheet border border-rule bg-sheet shadow-lift"
      >
        <div className="border-b border-rule px-4 py-3">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls="palette-results"
            aria-activedescendant={hits[active] ? `palette-${hits[active]!.id}` : undefined}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                const hit = hits[active];
                if (hit) {
                  navigate(hit.to);
                  setOpen(false);
                }
              }
            }}
            placeholder="Search a case id, a challenge, a startup or a pilot"
            className="w-full border-0 bg-transparent p-0 text-h3 text-ink outline-none placeholder:text-ink-soft"
          />
        </div>
        <div id="palette-results" role="listbox" aria-label="Results" className="max-h-[52vh] overflow-auto scroll-quiet">
          {q.trim().length < 2 ? (
            <p className="px-4 py-6 text-body text-ink-soft">
              Type at least two characters. Try a case id such as CH-2026-0143, or a word such as water.
            </p>
          ) : isFetching ? (
            <p className="px-4 py-6 text-body text-ink-soft">Searching</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-6 text-body text-ink-soft">Nothing matches “{q}”.</p>
          ) : (
            hits.map((hit, i) => (
              <button
                key={hit.id}
                id={`palette-${hit.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  navigate(hit.to);
                  setOpen(false);
                }}
                className={[
                  'flex w-full items-baseline justify-between gap-4 border-b border-rule px-4 py-3 text-left last:border-b-0',
                  i === active ? 'bg-verify-wash' : '',
                ].join(' ')}
              >
                <span className="min-w-0">
                  <span className="block truncate text-body text-ink">{hit.title}</span>
                  <span className="block truncate text-micro text-ink-soft tnum">{hit.subtitle}</span>
                </span>
                <span className="shrink-0 text-micro text-ink-soft">{hit.group}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-rule px-4 py-2 text-micro text-ink-soft">
          <span>Up and down to move · Enter to open · Escape to close</span>
          <span>{countOf(hits.length, 'result')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
