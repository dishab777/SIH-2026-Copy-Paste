/**
 * The PRAYOG mark.
 *
 * Three plates, in the three states a gate entry can be in: cleared and
 * stamped, open and being decided, still ahead and undecided. It is the same
 * three states the case file in the hero writes down its page, so the smallest
 * thing in the product and the largest say the same sentence.
 *
 * Drawn at 24x24 in flat colour so it survives a favicon, a print header and a
 * photocopy — which is where a government record usually ends up.
 */
export function Mark({
  size = 24,
  className = '',
  tone = 'paper',
}: {
  size?: number;
  className?: string;
  /** The ground it is drawn on. The inks change; the shape never does. */
  tone?: 'paper' | 'deep';
}) {
  const cleared = tone === 'deep' ? 'var(--signal)' : 'var(--verify)';
  const open = tone === 'deep' ? 'var(--saffron)' : 'var(--hold)';
  const ahead = tone === 'deep' ? 'var(--deep-dim)' : 'var(--ink-soft)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
      shapeRendering="geometricPrecision"
    >
      {/* Cleared: filled, in the ink an officer clears in. */}
      <path d="M1 16.5 6.5 13.3 12 16.5 6.5 19.7Z" fill={cleared} />
      <path d="M1 16.5 6.5 19.7v2.1L1 18.6Z" fill={cleared} opacity=".55" />
      <path d="M12 16.5 6.5 19.7v2.1L12 18.6Z" fill={cleared} opacity=".3" />

      {/* Being decided now: the open gate, in the amber a query is written in. */}
      <path d="M6.5 10.1 12 6.9l5.5 3.2L12 13.3Z" fill={open} />
      <path d="M6.5 10.1 12 13.3v2.1l-5.5-3.2Z" fill={open} opacity=".55" />
      <path d="M17.5 10.1 12 13.3v2.1l5.5-3.2Z" fill={open} opacity=".3" />

      {/* Still ahead: outlined, because nothing has been decided about it yet. */}
      <path
        d="M12 3.7 17.5.5 23 3.7 17.5 6.9Z"
        fill="none"
        stroke={ahead}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
