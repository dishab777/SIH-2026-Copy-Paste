import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';

/** Traps focus, restores it on close, and closes on Escape. Shared by modal, sheet and palette. */
export function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    returnTo.current = document.activeElement as HTMLElement;
    const node = ref.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      returnTo.current?.focus();
    };
  }, [open, onClose]);

  return ref;
}

/*
 * The ground a dialog is lifted off.
 *
 * It used to be one flat blue-grey rectangle, which belonged to no palette in
 * this product and made the page underneath read as switched off rather than
 * set down. It is now the same deep green the mastheads carry, laid over a real
 * blur of the page, so opening a dialog dims the work into the product's own
 * colour instead of a neutral one. The translucency is an `opacity` step rather
 * than a colour with alpha in it, because the palette is closed and nothing here
 * may invent a value.
 */
const SCRIM = 'fixed inset-0 bg-deep bg-gradient-to-br from-deep-3 via-deep to-deep-2 opacity-60';

/*
 * The lit top edge of a floating object, saffron cooling into signal — the same
 * cut the top bar carries along its own bottom edge, so a dialog reads as part
 * of the same lamp rather than a separate piece of chrome.
 */
const EDGE = 'pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-saffron via-signal to-transparent';

/**
 * The head of a floating panel: the deep band, the lit edge, and two distant
 * lights caught in its corners. It is what a modal and a drawer share, and it
 * is why they now open on colour rather than on a rule and a black heading.
 */
function OverlayHeadDecor() {
  return (
    <>
      <span aria-hidden className={EDGE} />
      <span aria-hidden className="absolute -right-8 -top-10 -z-10 h-20 w-20 rounded-full bg-saffron opacity-20 blur-2xl" />
      <span aria-hidden className="absolute -bottom-10 -left-6 -z-10 h-20 w-20 rounded-full bg-signal opacity-10 blur-2xl" />
    </>
  );
}

const HEAD_GROUND = 'relative isolate overflow-hidden bg-deep bg-gradient-to-br from-deep-3 via-deep-2 to-deep';

/** The close control sits on the deep band, so it takes the deep inks. */
const HEAD_CLOSE = '!text-deep-dim hover:!bg-deep-3 hover:!text-deep-ink';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, description, children, footer, width = 'md' }: ModalProps) {
  const ref = useFocusTrap(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;

  const widths = { sm: 'max-w-[420px]', md: 'max-w-[640px]', lg: 'max-w-[880px]' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto p-4 backdrop-blur-sm md:p-12">
      <div aria-hidden className={SCRIM} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={['sheet panel-in relative w-full rounded-block shadow-float', widths[width]].join(' ')}
      >
        <div className={[HEAD_GROUND, 'flex items-start justify-between gap-5 px-6 py-5'].join(' ')}>
          <OverlayHeadDecor />
          <div>
            <h2 id={titleId} className="font-display text-h3 text-deep-ink">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1.5 text-body text-deep-dim">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose} className={['shrink-0', HEAD_CLOSE].join(' ')}>
            ×
          </IconButton>
        </div>
        <div className="max-h-[60vh] overflow-auto px-6 py-6 scroll-quiet">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-rule bg-ledger px-6 py-5">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'right' | 'bottom';
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ open, onClose, title, side = 'right', children, footer }: SheetProps) {
  const ref = useFocusTrap(open, onClose);
  const titleId = useId();
  if (!open) return null;

  return createPortal(
    <div
      className={[
        'fixed inset-0 z-50 flex backdrop-blur-sm',
        side === 'right' ? 'justify-end' : 'items-end',
      ].join(' ')}
    >
      <div aria-hidden className={SCRIM} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'sheet panel-in relative flex flex-col shadow-float',
          /* A drawer is flush with one edge of the window, so only the edges
             that are actually visible are rounded. */
          side === 'right'
            ? 'h-full w-full max-w-[420px] rounded-l-block rounded-r-none'
            : 'max-h-[80vh] w-full rounded-t-block rounded-b-none',
        ].join(' ')}
      >
        <div className={[HEAD_GROUND, 'flex items-center justify-between gap-4 px-5 py-4'].join(' ')}>
          <OverlayHeadDecor />
          <h2 id={titleId} className="font-display text-h3 text-deep-ink">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose} className={['shrink-0', HEAD_CLOSE].join(' ')}>
            ×
          </IconButton>
        </div>
        <div className="flex-1 overflow-auto px-5 py-5 scroll-quiet">{children}</div>
        {footer ? <div className="border-t border-rule bg-ledger px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export interface PopoverProps {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; ref: (el: HTMLButtonElement | null) => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  label: string;
}

export function Popover({ trigger, children, align = 'left', label }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e: MouseEvent): void {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div ref={wrapRef} className="relative">
      {trigger({
        onClick: () => setOpen((o) => !o),
        'aria-expanded': open,
        ref: (el) => {
          triggerRef.current = el;
        },
      })}
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className={[
            /*
             * A popover is one of the few surfaces in the product that earns a
             * real blur: it is small, it is temporary, and the page has to keep
             * moving behind it. The saffron edge says the same thing saffron
             * says everywhere else — this is the thing currently open.
             */
            'glass panel-in absolute z-40 mt-2 min-w-[260px] border-t-2 border-t-saffron p-5 shadow-lift',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex">
      <span
        aria-describedby={show ? id : undefined}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
        className="inline-flex"
      >
        {children}
      </span>
      {show ? (
        <span
          role="tooltip"
          id={id}
          className="glass absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[280px] -translate-x-1/2 rounded-control px-3 py-1.5 text-micro text-ink shadow-lift"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
