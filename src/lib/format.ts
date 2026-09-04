import { platformNow } from '@/config/clock';
/**
 * Formatting for the interface. Deliberately built on the platform's own Intl
 * rather than a date library: the app shell ships on every public route, and a
 * formatting dependency there would cost more than it is worth. The mock API
 * still uses date-fns for arithmetic, and it lives in a separate chunk.
 */

/** Indian digit grouping. ₹18,00,000 — never 1,800,000. */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plain = new Intl.NumberFormat('en-IN');

/** 12 Aug 2026 — never 12/08/2026. */
const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

function toDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Money is held in paise everywhere so no float ever touches a rupee. */
export function money(paise: number): string {
  return inr.format(Math.round(paise / 100));
}

export function moneyPrecise(paise: number): string {
  return inrPrecise.format(paise / 100);
}

/** For headline sentences: ₹14.2 crore, ₹18 lakh. */
export function moneyScaled(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10000000) {
    const cr = rupees / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} crore`;
  }
  if (rupees >= 100000) {
    const lakh = rupees / 100000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} lakh`;
  }
  return inr.format(rupees);
}

export function num(value: number, fractionDigits = 0): string {
  return plain.format(Number(value.toFixed(fractionDigits)));
}

export function percent(value: number, fractionDigits = 1): string {
  return `${plain.format(Number(value.toFixed(fractionDigits)))}%`;
}

export function day(iso: string | Date | undefined): string {
  const d = toDate(iso);
  return d ? dayFormat.format(d) : '—';
}

export function dayTime(iso: string | Date | undefined): string {
  const d = toDate(iso);
  return d ? `${dayFormat.format(d)}, ${timeFormat.format(d)}` : '—';
}

export function clockTime(iso: string | Date | undefined): string {
  const d = toDate(iso);
  return d ? timeFormat.format(d) : '—';
}

const MS_PER_DAY = 86_400_000;

/** Whole calendar days between two instants, ignoring the time of day. */
export function daysBetween(from: string | Date, to: string | Date = platformNow()): number {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return 0;
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUtc - aUtc) / MS_PER_DAY);
}

/** Words, always. "Due in 4 days", never "4d". */
export function durationWords(days: number): string {
  const n = Math.abs(days);
  if (n === 0) return 'today';
  if (n === 1) return '1 day';
  if (n < 14) return `${n} days`;
  if (n < 60) {
    const weeks = Math.round(n / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  const months = Math.round(n / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Short display checksum. The full value stays available for the audit trail. */
export function shortHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
}

export function sentence(list: string[], conjunction = 'and'): string {
  if (list.length === 0) return '';
  if (list.length === 1) return list[0]!;
  return `${list.slice(0, -1).join(', ')} ${conjunction} ${list[list.length - 1]}`;
}

/**
 * Count plus a noun that agrees with it. "1 payment is", "3 payments are".
 * Interface counts are written inline rather than through i18next, so this is
 * the one place the agreement rule lives.
 */
export function countOf(count: number, singular: string, plural?: string): string {
  return `${plain.format(count)} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
