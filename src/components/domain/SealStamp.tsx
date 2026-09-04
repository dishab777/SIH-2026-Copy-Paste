import { day } from '@/lib/format';

export type SealTone = 'cleared' | 'rejected' | 'waived' | 'draft';

/**
 * The seal is a form, not a colour: a double-hairline rectangle set at −1.5°.
 * It takes the colour of the status it records, so a cleared gate does not spend
 * the one red element allowed per viewport.
 *
 * This is the only expressive animation in PRAYOG. Reduced motion removes the
 * transform and keeps the stamp.
 */
const TONE: Record<SealTone, { border: string; text: string; word: string }> = {
  cleared: { border: 'var(--verify)', text: 'text-verify', word: 'Cleared' },
  rejected: { border: 'var(--seal)', text: 'text-seal', word: 'Rejected' },
  waived: { border: 'var(--hold)', text: 'text-ink', word: 'Waived' },
  draft: { border: 'var(--ink-soft)', text: 'text-ink-soft', word: 'Draft' },
};

export interface SealStampProps {
  tone: SealTone;
  gate?: string;
  date?: string;
  by?: string;
  animate?: boolean;
  small?: boolean;
}

export function SealStamp({ tone, gate, date, by, animate, small }: SealStampProps) {
  const t = TONE[tone];
  const parts = [t.word, gate ? `Gate ${gate.replace('G', '')}` : null, date ? day(date) : null, by ?? null].filter(
    Boolean,
  );

  return (
    <span
      role="img"
      aria-label={parts.join(', ')}
      className={[
        // A rubber stamp: a double rule, the word in wide caps on its own line,
        // the particulars small underneath, and the whole impression set very
        // slightly off square because a hand pressed it.
        'inline-flex select-none flex-col items-center gap-0.5 px-3 py-1.5 text-center',
        animate ? 'seal-stamp-in' : '',
        t.text,
      ].join(' ')}
      style={{
        border: `1px solid ${t.border}`,
        boxShadow: `inset 0 0 0 2px var(--sheet), inset 0 0 0 3px ${t.border}`,
        transform: animate ? undefined : 'rotate(-1.5deg)',
      }}
    >
      <span
        className={small ? 'text-micro' : 'text-label'}
        style={{ letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}
      >
        {t.word}
      </span>
      {parts.length > 1 ? (
        <span className="text-micro" style={{ letterSpacing: '0.04em', opacity: 0.85 }}>
          {parts.slice(1).join(' · ')}
        </span>
      ) : null}
    </span>
  );
}

/** Draft watermark for the challenge review screen. */
export function Watermark({ lines }: { lines: string[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
      <p
        className="select-none text-center text-ink-soft opacity-[.12]"
        style={{ fontSize: 88, lineHeight: 1.05, fontWeight: 600, transform: 'rotate(-22deg)' }}
      >
        {lines.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </p>
    </div>
  );
}
