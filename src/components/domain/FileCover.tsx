import type { ReactNode } from 'react';
import { money } from '@/lib/format';
import { SlaClock } from './SlaClock';

export interface FileCoverProps {
  caseId: string;
  title: string;
  department: string;
  owner: string;
  ownerInitials?: string;
  gate: string;
  gateName?: string;
  amountPaise?: number;
  sla?: { startedOn: string; limitDays: number; label?: string };
  status?: ReactNode;
  actions?: ReactNode;
  extra?: { label: string; value: ReactNode }[];
  /** The cover carries the page title on a case screen. Demote it where it is a specimen. */
  headingLevel?: 1 | 2;
  className?: string;
}

/**
 * The board a case is clipped to.
 *
 * A physical file has a printed cover: a punched tag strip down the left edge,
 * the file number stamped in a ruled box, the subject line written across the
 * top, and a grid of particulars underneath. This is that cover. It is
 * deliberately not a card with a title and a subtitle.
 */
export function FileCover({
  caseId,
  title,
  department,
  owner,
  ownerInitials,
  gate,
  gateName,
  amountPaise,
  sla,
  status,
  actions,
  extra = [],
  headingLevel = 1,
  className = '',
}: FileCoverProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const cells: { label: string; value: ReactNode }[] = [
    { label: 'Department', value: department },
    {
      label: 'Owner',
      value: (
        <span className="inline-flex items-center gap-2">
          {ownerInitials ? (
            <span aria-hidden className="monogram text-ink-soft">
              {ownerInitials}
            </span>
          ) : null}
          {owner}
        </span>
      ),
    },
    { label: 'Current gate', value: gateName ? `${gate} · ${gateName}` : gate },
    ...(amountPaise !== undefined ? [{ label: 'Money at stake', value: <span className="tnum">{money(amountPaise)}</span> }] : []),
    ...(sla ? [{ label: 'SLA', value: <SlaClock startedOn={sla.startedOn} limitDays={sla.limitDays} /> }] : []),
    ...extra,
  ];

  return (
    <section aria-label={`File cover for ${caseId}`} className={['sheet-flat relative overflow-hidden', className].join(' ')}>
      {/* The punched tag strip down the binding edge. Decorative; the case id below is the real one. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-6 border-r border-rule bg-ledger"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12px 22px, var(--rule) 0 2.5px, transparent 2.5px), radial-gradient(circle at 12px 46px, var(--rule) 0 2.5px, transparent 2.5px)',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink py-4 pl-12 pr-4">
        <div className="min-w-0">
          <p className="inline-block border border-ink px-2 py-0.5 text-micro text-ink type-register">{caseId}</p>
          <Heading className="mt-2 max-w-doc text-h1 text-ink">{title}</Heading>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {status}
          {actions}
        </div>
      </div>

      {/* Three across at most. The cover sits in the working column of a
          three-column case screen, so the space it has is nothing like the
          width of the window the breakpoint is measuring. */}
      <dl className="grid grid-cols-2 pl-8 md:grid-cols-3">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={[
              'border-b border-rule px-4 py-3 last:border-b-0',
              i % 2 === 0 ? 'border-r' : '',
              'md:border-r',
              i % 3 === 2 ? 'md:border-r-0' : '',
            ].join(' ')}
          >
            <dt className="field-label">{c.label}</dt>
            <dd className="mt-1 text-data text-ink">{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
