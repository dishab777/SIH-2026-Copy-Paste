import { useNavigate } from 'react-router-dom';
import { GATES, gateSlaDays, type GateId } from '@/config/gates';
import { durationWords } from '@/lib/format';
import type { GateRecord } from '@/types/models';

/**
 * The dwell rail.
 *
 * The gap between two nodes is proportional to how long the case actually sat at
 * that gate, so a case stuck 34 days at G2 is physically long on screen. Beyond
 * the cap the rail carries a break mark and the true figure is still printed.
 * This is the one place where the navigation is also an argument.
 */
const MIN_GAP = 28;
const PER_DAY = 1.4;
const MAX_GAP = 168;

function gapFor(days: number): { height: number; broken: boolean } {
  const raw = MIN_GAP + days * PER_DAY;
  return { height: Math.min(MAX_GAP, raw), broken: raw > MAX_GAP };
}

export interface GateLadderProps {
  records: GateRecord[];
  currentGate: GateId;
  ownerNames?: Record<string, string>;
  /** Horizontal strip below 1024px; the parent decides. */
  orientation?: 'vertical' | 'horizontal';
  onSelect?: (record: GateRecord) => void;
}

function statusMark(status: GateRecord['status']): string {
  switch (status) {
    case 'cleared':
      return '●';
    case 'open':
      return '◐';
    case 'blocked':
      return '◑';
    case 'rejected':
      return '✕';
    default:
      return '○';
  }
}

function statusWord(status: GateRecord['status']): string {
  switch (status) {
    case 'cleared':
      return 'Cleared';
    case 'open':
      return 'Open';
    case 'blocked':
      return 'Blocked';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Not reached';
  }
}

export function GateLadder({ records, currentGate, ownerNames = {}, orientation = 'vertical', onSelect }: GateLadderProps) {
  const navigate = useNavigate();
  const ordered = GATES.map((g) => records.find((r) => r.gate === g.id)).filter((r): r is GateRecord => Boolean(r));

  function open(record: GateRecord): void {
    if (record.status === 'future') return;
    if (onSelect) onSelect(record);
    else navigate(`/d/gates/${record.id}`);
  }

  if (orientation === 'horizontal') {
    return (
      <nav aria-label="Gate ladder" className="relative overflow-x-auto scroll-quiet">
        <ol className="flex min-w-max items-stretch border-y border-rule">
          {ordered.map((r) => {
            const def = GATES.find((g) => g.id === r.gate)!;
            const isCurrent = r.gate === currentGate;
            return (
              <li key={r.id} className="border-r border-rule last:border-r-0">
                <button
                  type="button"
                  disabled={r.status === 'future'}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => open(r)}
                  className={[
                    'flex h-full min-w-[128px] flex-col items-start gap-0.5 px-3 py-2 text-left',
                    r.status === 'blocked' ? 'bg-seal-wash' : r.status === 'open' ? 'bg-hold-wash' : '',
                    r.status === 'future' ? 'cursor-not-allowed opacity-55' : 'hover:bg-ledger',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2 text-data text-ink">
                    <span
                      aria-hidden
                      className={r.status === 'cleared' ? 'text-verify' : r.status === 'blocked' ? 'text-seal' : 'text-ink-soft'}
                    >
                      {statusMark(r.status)}
                    </span>
                    {r.gate}
                  </span>
                  <span className="text-micro text-ink-soft">{statusWord(r.status)}</span>
                  {r.dwellDays > 0 ? (
                    <span className="text-micro text-ink-soft tnum">Held {durationWords(r.dwellDays)}</span>
                  ) : null}
                  <span className="sr-only">{def.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Gate ladder" className="sheet-flat">
      <div className="border-b border-ink px-4 py-2">
        <h2 className="text-label text-ink">Gate ladder</h2>
        <p className="mt-0.5 text-micro text-ink-soft">Spacing shows how long each gate actually held the case.</p>
      </div>
      <ol className="px-4 py-4">
        {ordered.map((r, i) => {
          const def = GATES.find((g) => g.id === r.gate)!;
          const isCurrent = r.gate === currentGate;
          const owner = ownerNames[r.ownerId] ?? '';
          const initials = owner
            .replace(/^(Dr|Prof)\.\s*/, '')
            .split(/[\s.]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('');
          const next = ordered[i + 1];
          const gap = next ? gapFor(r.dwellDays) : { height: 0, broken: false };
          const sla = gateSlaDays(r.gate);
          const overSla = r.dwellDays > sla;

          return (
            <li key={r.id}>
              <button
                type="button"
                disabled={r.status === 'future'}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => open(r)}
                className={[
                  'group flex w-full items-start gap-3 rounded-control px-2 py-1 text-left',
                  r.status === 'future' ? 'cursor-not-allowed opacity-55' : 'hover:bg-ledger',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className={[
                    'mt-0.5 text-body leading-none',
                    r.status === 'cleared'
                      ? 'text-verify'
                      : r.status === 'blocked' || r.status === 'rejected'
                        ? 'text-seal'
                        : r.status === 'open'
                          ? 'text-ink'
                          : 'text-ink-soft',
                  ].join(' ')}
                >
                  {statusMark(r.status)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-data text-ink">
                      {r.gate} {isCurrent ? <span className="text-micro text-ink-soft">· current</span> : null}
                    </span>
                    {initials ? (
                      <span
                        title={owner}
                        className="shrink-0 border border-rule px-1 text-micro text-ink-soft"
                      >
                        {initials}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-micro text-ink-soft">{def.name}</span>
                  <span
                    className={[
                      'mt-0.5 block text-micro',
                      r.status === 'blocked' || r.status === 'rejected' ? 'text-seal' : 'text-ink-soft',
                    ].join(' ')}
                  >
                    {statusWord(r.status)}
                    {r.dwellDays > 0 ? ` · held ${durationWords(r.dwellDays)}` : ''}
                    {overSla && r.status !== 'future' ? ` · past its ${sla}-day window` : ''}
                  </span>
                </span>
              </button>

              {next ? (
                <div
                  aria-hidden
                  className="relative ml-[7px] w-px bg-rule"
                  style={{ height: gap.height }}
                  title={`${durationWords(r.dwellDays)} at ${r.gate}`}
                >
                  {/* Tick every seven days, so the reader can count the wait. */}
                  {Array.from({ length: Math.min(20, Math.floor(r.dwellDays / 7)) }).map((_, t) => (
                    <span
                      key={t}
                      className="absolute -left-1 block h-px w-2 bg-rule"
                      style={{ top: MIN_GAP / 2 + t * 7 * PER_DAY }}
                    />
                  ))}
                  {gap.broken ? (
                    <span className="absolute -left-[5px] top-1/2 block -translate-y-1/2 bg-sheet px-0.5 text-micro text-ink-soft">
                      ⋮
                    </span>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Below 768px the ladder collapses to a single line that opens the gate sheet. */
export function GateSummary({ records, currentGate, onOpen }: { records: GateRecord[]; currentGate: GateId; onOpen: () => void }) {
  const current = records.find((r) => r.gate === currentGate);
  const index = GATES.findIndex((g) => g.id === currentGate) + 1;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-4 border-y border-rule bg-sheet px-4 py-3 text-left"
    >
      <span className="text-data text-ink">
        Gate {index} of 7 · {current ? statusWord(current.status) : 'Not reached'}
      </span>
      <span className="text-micro text-ink-soft">
        {current && current.dwellDays > 0 ? `Held ${durationWords(current.dwellDays)}` : 'Open the ladder'}
      </span>
    </button>
  );
}
