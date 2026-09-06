import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, LinkButton } from './Button';

/** Skeletons are shaped like the content that replaces them, never a centred spinner. */
export function Skeleton({ className = '', width }: { className?: string; width?: string }) {
  return (
    <span
      aria-hidden
      className={[
        'skeleton-block block rounded-control bg-gradient-to-r from-verify-wash to-ledger',
        className,
      ].join(' ')}
      style={{ width }}
    />
  );
}

/**
 * The bar that runs across the head of a panel: saffron at the mark, cooling
 * into the green a decision is written in, fading out before the far edge. It
 * is the top bar's own rule at panel scale, and it is what stops a plain card
 * from reading as a rectangle with nothing to say.
 */
function HeadRail() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saffron via-verify to-transparent"
    />
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('states.loadingRows')}
      className="sheet-flat bg-gradient-to-b from-verify-wash to-transparent"
    >
      {/* A ledger loads head first, so the placeholder carries the head rule the
          table itself will draw once the rows arrive. */}
      <div className="flex items-center gap-6 border-b border-ink px-5 py-3">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className="h-2.5" width={c === 0 ? '18%' : c === 1 ? '30%' : '12%'} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-6 border-b border-rule px-5 py-3.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className="h-4" width={c === 0 ? '18%' : c === 1 ? '30%' : '12%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ lines = 4, title = true }: { lines?: number; title?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('states.loading')}
      className="sheet relative rounded-block bg-gradient-to-br from-verify-wash to-transparent px-6 py-6 md:px-7"
    >
      <HeadRail />
      {title ? <Skeleton className="mb-5 mt-1 h-5" width="40%" /> : null}
      <div className="flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4" width={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </div>
    </div>
  );
}

export function StatSkeleton({ rows = 5 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('states.loadingFigures')}
      className="sheet-flat bg-gradient-to-b from-hold-wash to-transparent"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-rule px-5 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-4" width="45%" />
          <Skeleton className="h-4" width="18%" />
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  label,
  size = 44,
}: {
  value: number;
  max?: number;
  label: string;
  size?: number;
}) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-3">
      <svg width={size} height={size} role="img" aria-label={t('states.percentOf', { label, percent: Math.round(pct * 100) })}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--verify-wash)" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--verify)"
          strokeWidth="3"
          /* A round cap at zero would draw a dot where nothing has been done yet. */
          strokeLinecap={pct > 0.02 ? 'round' : 'butt'}
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="text-data text-ink tnum">{Math.round(pct * 100)}%</span>
    </span>
  );
}

/**
 * The drawing on an empty state.
 *
 * An empty region is not a failure, so what is drawn is the thing that is
 * missing rather than a warning: the same stack of plates the case file is
 * built from, seen in isometric, with the top one still blank and a saffron
 * marker planted in it — saffron meaning here what it means everywhere else in
 * the product, the thing that is open and yours to act on.
 */
function EmptyMark() {
  return (
    <svg viewBox="0 0 132 112" width="132" height="112" aria-hidden focusable="false" className="text-ink-soft">
      {/* The set casts, so it reads as resting on the page rather than floating over it. */}
      <ellipse cx="66" cy="103" rx="52" ry="7" fill="currentColor" opacity="0.13" />

      <g stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" strokeLinejoin="round">
        <polygon points="18,74 66,96 66,105 18,83" fill="currentColor" fillOpacity="0.2" />
        <polygon points="66,96 114,74 114,83 66,105" fill="currentColor" fillOpacity="0.12" />
        <polygon points="18,74 66,52 114,74 66,96" fill="var(--ledger)" />

        <polygon points="25,54 66,73 66,81 25,62" fill="currentColor" fillOpacity="0.2" />
        <polygon points="66,73 107,54 107,62 66,81" fill="currentColor" fillOpacity="0.12" />
        <polygon points="25,54 66,35 107,54 66,73" fill="var(--verify-wash)" />
      </g>

      {/* The top plate is the empty one, so it is edged in the ink a decision is written in. */}
      <g stroke="var(--verify)" strokeWidth="1.25" strokeLinejoin="round">
        <polygon points="32,34 66,50 66,57 32,41" fill="var(--verify)" fillOpacity="0.22" />
        <polygon points="66,50 100,34 100,41 66,57" fill="var(--verify)" fillOpacity="0.14" />
        <polygon points="32,34 66,18 100,34 66,50" fill="var(--sheet)" />
      </g>

      <line x1="66" y1="35" x2="66" y2="6" stroke="var(--verify)" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="66,6 95,14 66,22" fill="var(--saffron)" />
      <circle cx="66" cy="34" r="3" fill="var(--verify)" />
    </svg>
  );
}

export interface EmptyStateProps {
  title: string;
  body: string;
  action?: { label: string; to?: string; onClick?: () => void };
  secondary?: ReactNode;
  /** Where the state sits in the page outline. Defaults to 2, the level of the region it replaces. */
  headingLevel?: 2 | 3;
}

export function EmptyState({ title, body, action, secondary, headingLevel = 2 }: EmptyStateProps) {
  // An empty state names the region it stands in for, so it belongs in the
  // outline at the level that region would have occupied.
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <div className="sheet panel-in relative overflow-hidden rounded-block px-6 py-10 text-center md:px-10 md:py-12">
      {/* The page wash at panel scale — green off the top left, warm off the
          bottom right — so an empty region is lit the same way as the ground
          it sits on instead of being the one grey rectangle on the screen. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-verify-wash to-hold-wash opacity-60"
      />
      <HeadRail />
      <div className="relative mx-auto flex max-w-doc flex-col items-center">
        <EmptyMark />
        <Heading className="mt-5 font-display text-h3 text-ink">{title}</Heading>
        <p className="mt-2 max-w-[52ch] text-body text-ink-soft">{body}</p>
        {action ? (
          <div className="mt-6">
            {action.to ? (
              <LinkButton tone="primary" to={action.to} className="press shadow-raise">
                {action.label}
              </LinkButton>
            ) : (
              <Button tone="primary" onClick={action.onClick} className="press shadow-raise">
                {action.label}
              </Button>
            )}
          </div>
        ) : null}
        {secondary ? <div className="mt-5 text-micro text-ink-soft">{secondary}</div> : null}
      </div>
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  what?: string;
  reference?: string;
  details?: string[];
  onRetry?: () => void;
  compact?: boolean;
}

/** Every error says what failed, what to do about it, and carries a reference. */
export function ErrorState({ title, what, reference, details, onRetry, compact }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'relative border-l-2 border-l-seal bg-gradient-to-br from-seal-wash to-transparent',
        compact ? 'rounded-sheet border border-rule px-5 py-4' : 'sheet rounded-block px-6 py-6 md:px-7',
      ].join(' ')}
    >
      <p className="flex items-start gap-2.5 text-body font-medium text-ink">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false" className="mt-0.5 shrink-0">
          <circle cx="9" cy="9" r="8" fill="var(--seal-wash)" stroke="var(--seal)" strokeWidth="1.5" />
          <path d="M9 5v5" stroke="var(--seal)" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="9" cy="12.8" r="1" fill="var(--seal)" />
        </svg>
        <span>{title}</span>
      </p>
      {what ? <p className="mt-2 max-w-[62ch] text-body text-ink">{what}</p> : null}
      {details?.length ? (
        <ul className="mt-2 list-disc pl-5 text-body text-ink">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {onRetry ? (
          <Button size="sm" onClick={onRetry} className="press">
            {t('states.tryAgain')}
          </Button>
        ) : null}
        {reference ? (
          <span className="text-micro text-ink-soft">{t('states.reference', { reference })}</span>
        ) : null}
      </div>
    </div>
  );
}

/*
 * A note hangs off a coloured margin, the way an observation on a noting sheet
 * is written against the ruled edge in the ink of the act. The wash carries the
 * same tone across the panel and lets go before the far edge, so the page
 * gradient runs through the note rather than being blocked by it.
 */
const NOTE_TONE: Record<'verify' | 'hold' | 'seal' | 'neutral', { panel: string; mark: string }> = {
  verify: { panel: 'border-l-verify from-verify-wash', mark: 'bg-verify' },
  hold: { panel: 'border-l-hold from-hold-wash', mark: 'bg-hold' },
  seal: { panel: 'border-l-seal from-seal-wash', mark: 'bg-seal' },
  neutral: { panel: 'border-l-rule from-ledger', mark: 'bg-rule' },
};

export function InlineNote({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: 'verify' | 'hold' | 'seal' | 'neutral';
  title?: string;
  children: ReactNode;
}) {
  const t = NOTE_TONE[tone];
  return (
    <div
      className={[
        'rounded-sheet border border-rule border-l-2 bg-gradient-to-r to-transparent px-5 py-4 shadow-sheet',
        t.panel,
      ].join(' ')}
    >
      {title ? (
        <p className="flex items-center gap-2 text-label text-ink">
          <span aria-hidden className={['inline-block h-2 w-2 shrink-0 rounded-full', t.mark].join(' ')} />
          {title}
        </p>
      ) : null}
      <div className={['text-body text-ink', title ? 'mt-1.5' : ''].join(' ')}>{children}</div>
    </div>
  );
}
