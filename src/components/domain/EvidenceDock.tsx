import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sheet } from '@/components/ui/Overlay';
import { StatusBadge } from '@/components/ui/Badge';
import { dayTime, fileSize, shortHash } from '@/lib/format';
import { AuditTrail } from './RiskIncident';
import type { AuditEvent, Evidence, WaitingItem } from '@/types/models';

export interface DockTabId {
  id: 'attachments' | 'audit' | 'next' | 'linked';
  label: string;
}

const TABS: DockTabId[] = [
  { id: 'attachments', label: 'Attachments' },
  { id: 'audit', label: 'Audit trail' },
  { id: 'next', label: "Who's next" },
  { id: 'linked', label: 'Linked cases' },
];

export interface EvidenceDockProps {
  evidence: Evidence[];
  audit: AuditEvent[];
  next: WaitingItem[];
  linked: { caseId: string; label: string; to: string; detail?: string }[];
  onOpenEvidence?: (item: Evidence) => void;
}

function Attachments({ items, onOpen }: { items: Evidence[]; onOpen?: (item: Evidence) => void }) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-body text-ink-soft">No files attached to this case yet.</p>;
  }
  return (
    <ul>
      {items.map((e) => (
        <li key={e.id} className="ledger-row px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpen?.(e)}
                className="type-register block w-full truncate text-left text-body text-ink underline underline-offset-2 hover:text-verify"
              >
                {e.fileName}
              </button>
              <p className="mt-0.5 text-micro text-ink-soft">
                {e.type} · {fileSize(e.sizeBytes)} · v{e.version}
              </p>
              <p className="mt-0.5 text-micro text-ink-soft">
                {e.uploadedBy} · {dayTime(e.uploadedAt)}
              </p>
              <p className="mt-0.5 text-micro text-ink-soft">
                Checksum <span className="type-register">{shortHash(e.hash)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={e.scan} label={e.scan === 'clean' ? 'Scan clean' : e.scan === 'pending' ? 'Scan pending' : 'Scan failed'} />
              <StatusBadge status={e.verification} />
            </div>
          </div>
          {e.verifiedBy ? (
            <p className="mt-1 text-micro text-ink-soft">
              Verified by {e.verifiedBy} on {dayTime(e.verifiedAt)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * The dock's trail is the same noting sheet the gate screen and the reports use.
 * It used to be a second, slightly different rendering of the same events, which
 * meant a reader had to learn the device twice.
 */
function Trail({ items }: { items: AuditEvent[] }) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-body text-ink-soft">Nothing recorded against this case yet.</p>;
  }
  return (
    <div className="px-2 py-2">
      <AuditTrail items={items} dense />
    </div>
  );
}

function Next({ items }: { items: WaitingItem[] }) {
  if (items.length === 0) return <p className="px-4 py-6 text-body text-ink-soft">No one is waiting on an action here.</p>;
  return (
    <ul>
      {items.map((w) => (
        <li key={w.id} className="ledger-row px-4 py-3">
          <p className="text-body text-ink">{w.requiredAction}</p>
          <p className="mt-0.5 text-micro text-ink-soft">
            {w.ownerName} · waiting {w.waitingSinceDays} of {w.slaDays} days
          </p>
          <Link to={w.href} className="mt-1 inline-block text-micro text-verify underline underline-offset-2">
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Linked({ items }: { items: { caseId: string; label: string; to: string; detail?: string }[] }) {
  if (items.length === 0) return <p className="px-4 py-6 text-body text-ink-soft">No linked cases.</p>;
  return (
    <ul>
      {items.map((l) => (
        <li key={l.caseId} className="ledger-row px-4 py-3">
          <Link to={l.to} className="text-body text-ink underline underline-offset-2 hover:text-verify">
            {l.label}
          </Link>
          <p className="mt-0.5 text-micro text-ink-soft tnum">{l.caseId}</p>
          {l.detail ? <p className="text-micro text-ink-soft">{l.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function DockBody({ evidence, audit, next, linked, onOpenEvidence }: EvidenceDockProps) {
  const [tab, setTab] = useState<DockTabId['id']>('attachments');
  return (
    <>
      <div role="tablist" aria-label="Evidence dock" className="flex border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              '-mb-px flex-1 border-b-2 px-2 py-2 text-micro',
              tab === t.id ? 'border-b-verify text-ink' : 'border-b-transparent text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-[70vh] overflow-auto scroll-quiet">
        {tab === 'attachments' ? <Attachments items={evidence} onOpen={onOpenEvidence} /> : null}
        {tab === 'audit' ? <Trail items={audit} /> : null}
        {tab === 'next' ? <Next items={next} /> : null}
        {tab === 'linked' ? <Linked items={linked} /> : null}
      </div>
    </>
  );
}

/** Desktop: a 340px docked column. Mobile: the same content in a bottom sheet. */
export function EvidenceDock(props: EvidenceDockProps & { collapsed?: boolean; onToggle?: () => void }) {
  const { collapsed, onToggle, ...rest } = props;
  if (collapsed) {
    const held = rest.evidence.length;
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        className="hidden w-8 shrink-0 border-l border-rule bg-sheet text-micro text-ink-soft hover:text-ink lg:block"
      >
        {/* The closed edge still says what is inside, the way a file tab does. */}
        <span className="block rotate-180 py-4 [writing-mode:vertical-rl]">
          Evidence dock{held > 0 ? ` · ${held}` : ''}
        </span>
      </button>
    );
  }
  return (
    <aside
      aria-label="Evidence dock"
      className="hidden w-[340px] shrink-0 border-l border-rule bg-sheet lg:block"
      style={{ width: 'var(--dock-width)' }}
    >
      <div className="flex items-center justify-between border-b border-ink px-4 py-2">
        <h2 className="field-label !text-ink">Evidence dock</h2>
        {onToggle ? (
          <button type="button" onClick={onToggle} className="text-micro text-ink-soft underline underline-offset-2">
            Collapse
          </button>
        ) : null}
      </div>
      <DockBody {...rest} />
    </aside>
  );
}

export function EvidenceDockSheet({
  open,
  onClose,
  ...rest
}: EvidenceDockProps & { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Evidence dock" side="bottom">
      <DockBody {...rest} />
    </Sheet>
  );
}

export function DockButton({ onClick, count }: { onClick: () => void; count: number }): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-y border-rule bg-sheet px-4 py-3 text-left lg:hidden"
    >
      <span className="text-data text-ink">Evidence dock</span>
      <span className="text-micro text-ink-soft tnum">{count} attachments</span>
    </button>
  );
}
