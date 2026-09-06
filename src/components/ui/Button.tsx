import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type ButtonTone = 'primary' | 'secondary' | 'quiet' | 'destructive';
export type ButtonSize = 'sm' | 'md';

/*
 * An action in this product is an act of record, so the primary control is set
 * in the ink that act is written in: green when something is cleared, red when
 * it is refused.
 *
 * The label stays in sentence case. Caps are already doing two jobs here — the
 * field names on a form and the word inside a seal — and a third use on every
 * button turns the whole interface into shouting.
 */
/*
 * The primary control is filled with the noting green and shaped as a pill,
 * because it is the one thing on a screen a reader is meant to reach for. It
 * carries a lit top edge and a shadow in its own hue, so it reads as a raised
 * object rather than a coloured rectangle — the complaint about this product
 * was that everything was a rectangle, and the button is where a reader
 * notices that first.
 */
const TONE: Record<ButtonTone, string> = {
  primary: 'btn-primary text-white',
  secondary: 'bg-sheet text-ink border border-rule shadow-sheet hover:border-verify hover:text-verify',
  quiet: 'bg-transparent text-ink-soft border border-transparent hover:bg-verify-wash hover:text-verify',
  destructive: 'bg-sheet text-seal border border-seal shadow-sheet hover:bg-seal hover:text-white',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-4 text-label',
  md: 'h-10 px-5 text-body',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
  /** Shown next to the label while loading, so the user knows what is happening. */
  loadingLabel?: string;
  block?: boolean;
  /**
   * Why the action cannot be taken yet. The button stays in the tab order and
   * reads as unavailable with this reason, rather than disappearing from the
   * keyboard path the way a plain disabled button does. Clicking it does
   * nothing; `onUnavailable` can send the person to whatever needs finishing.
   */
  unavailableReason?: string;
  onUnavailable?: () => void;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    tone = 'secondary',
    size = 'md',
    loading = false,
    loadingLabel,
    block,
    className = '',
    children,
    disabled,
    unavailableReason,
    onUnavailable,
    onClick,
    ...rest
  },
  ref,
) {
  const unavailable = Boolean(unavailableReason);
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={(disabled && !unavailable) || loading}
      aria-disabled={unavailable || undefined}
      title={unavailable ? unavailableReason : rest.title}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (unavailable) {
          e.preventDefault();
          onUnavailable?.();
          return;
        }
        onClick?.(e);
      }}
      className={[
        'press inline-flex items-center justify-center gap-2 rounded-pill font-semibold',
        'disabled:cursor-not-allowed disabled:opacity-45',
        /*
         * An unavailable control keeps its contrast. Fading the tone to 45%
         * made the one thing a reader was looking for the least legible object
         * on the screen — a pale green pill on a white bar — which is the
         * opposite of what "you cannot do this yet" should look like. It reads
         * as an inert control instead: muted fill, dashed edge, full-strength
         * label, and the reason on hover and on click.
         */
        unavailable
          ? 'cursor-not-allowed border border-dashed border-rule bg-ledger text-ink-soft shadow-none'
          : TONE[tone],
        SIZE[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && <Spinner small inverted={tone === 'primary'} />}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
});

export interface LinkButtonProps {
  to: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
  block?: boolean;
}

export function LinkButton({ to, tone = 'secondary', size = 'md', children, className = '', block }: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={[
        'press inline-flex items-center justify-center gap-2 rounded-pill font-semibold no-underline',
        TONE[tone],
        SIZE[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-control border border-transparent',
        'text-ink-soft hover:bg-ledger hover:text-ink disabled:opacity-45 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ small, inverted }: { small?: boolean; inverted?: boolean }) {
  const size = small ? 14 : 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      role="img"
      aria-label="Working"
      className="shrink-0"
      style={{ animation: 'spin 900ms linear infinite' }}
    >
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        strokeWidth="2"
        stroke={inverted ? 'rgba(255,255,255,.35)' : 'var(--rule)'}
      />
      <path
        d="M10 3a7 7 0 0 1 7 7"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        stroke={inverted ? '#fff' : 'var(--verify)'}
      />
    </svg>
  );
}
