import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { money } from '@/lib/format';
import { readPassword } from '@/lib/password';

/* ------------------------------------------------------------------ wrapper */

export interface FieldProps {
  label: string;
  /** Rendered as the word "required", never a bare asterisk. */
  required?: boolean;
  hint?: string;
  error?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  /** Small text on the right of the label row: counts, citations, live totals. */
  aside?: ReactNode;
}

/*
 * The name of a field on a printed form, set the way the rest of the product
 * sets one. It used to be plain 13px sentence case, which is why a form read as
 * a different piece of software from the page it was sitting on.
 */
const FIELD_ERROR =
  'flex rounded-control border-l-2 border-l-seal bg-seal-wash px-3 py-1.5 text-micro text-seal';

export function Field({ label, required, hint, error, children, aside }: FieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label text-ink">
          {label}
          {required ? <span className="ml-2 font-normal text-ink-soft">{t('field.required')}</span> : null}
        </label>
        {aside ? (
          <span className="rounded-pill bg-ledger px-2 py-0.5 text-micro text-ink-soft tnum">{aside}</span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-micro text-ink-soft">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className={FIELD_ERROR} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/*
 * One control surface for every input in the product.
 *
 * It borrows `.sheet-flat` rather than restating a border and a background, so
 * a field carries the same translucency as the panel around it and the page
 * wash tints it instead of stopping at its edge. The radius steps down from the
 * sheet's 14px to the control's 10px, because a field is a thing you type into
 * rather than a surface you read.
 */
const CONTROL =
  'sheet-flat swift w-full rounded-control border px-4 py-2.5 text-body text-ink placeholder:text-ink-soft ' +
  'focus:shadow-raise disabled:cursor-not-allowed disabled:bg-ledger disabled:text-ink-soft disabled:shadow-none ' +
  'read-only:bg-ledger';

/*
 * The rule warms to the approving officer's green while you are in the field,
 * and to the refusal red when what you typed will not be accepted — the same
 * two inks those colours mean everywhere else in the product.
 */
function border(invalid?: boolean): string {
  return invalid
    ? 'border-seal bg-seal-wash focus:border-seal'
    : 'border-rule hover:border-ink-soft focus:border-verify';
}

/* ------------------------------------------------------------------- inputs */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[CONTROL, border(invalid), rest.readOnly ? 'bg-ledger' : '', className].join(' ')}
      {...rest}
    />
  );
});

/**
 * A password field.
 *
 * `<Input type="password">` works, but it hides what the person typed with no
 * way to check it, which is the single commonest cause of a failed sign-in on
 * a form they will only ever fill in once. The reveal is a real toggle with a
 * pressed state, not an icon that changes silently.
 *
 * Caps lock is announced rather than left to be discovered on submit. It is a
 * live region, because it turns on and off while the field already has focus.
 */
export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** `new-password` on a sign-up, `current-password` on a sign-in. */
  autoComplete?: 'new-password' | 'current-password';
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { invalid, className = '', autoComplete = 'new-password', ...rest },
  ref,
) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);

  return (
    <div>
      <div className="relative">
        <input
          ref={ref}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
          onBlur={(e) => {
            setCaps(false);
            rest.onBlur?.(e);
          }}
          className={[CONTROL, border(invalid), 'pr-16', className].join(' ')}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          className="press absolute right-2 top-1.5 rounded-control px-2.5 py-1 text-micro text-ink-soft hover:bg-ledger hover:text-ink"
        >
          {shown ? t('field.password.hide') : t('field.password.show')}
        </button>
      </div>
      <p aria-live="polite" className="text-micro text-hold">
        {caps ? t('field.password.capsLock') : ''}
      </p>
    </div>
  );
});

/**
 * How strong what you typed actually is, said in words.
 *
 * The rule it measures against is configuration, not a constant in this file:
 * length and how many character classes are required come from the ledger at
 * /a/config, and readPassword() is the same function the Zod schema and the
 * mock API use — so the meter can never disagree with the refusal.
 *
 * It is never colour alone. Every state carries a filled count of segments and
 * a sentence, so it survives a photocopy and a reader who cannot separate the
 * inks by hue.
 */
export function PasswordStrength({ value, minLength, minClasses }: { value: string; minLength: number; minClasses: number }) {
  const { t } = useTranslation();
  const v = readPassword(value, minLength, minClasses);
  const tone = v.score === 0 ? 'neutral' : !v.meets ? 'seal' : v.score === 2 ? 'hold' : 'verify';
  const ink =
    tone === 'seal' ? 'text-seal' : tone === 'hold' ? 'text-hold' : tone === 'verify' ? 'text-verify' : 'text-ink-soft';
  const fill =
    tone === 'seal' ? 'bg-seal' : tone === 'hold' ? 'bg-hold' : tone === 'verify' ? 'bg-verify' : 'bg-rule';

  return (
    <div className="mt-2">
      <div aria-hidden className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={['h-1 flex-1 rounded-pill', i <= v.score ? fill : 'bg-rule'].join(' ')}
          />
        ))}
      </div>
      <p aria-live="polite" className={['mt-1.5 text-micro', ink].join(' ')}>
        {v.label}
        {v.detail ? <span className="text-ink-soft"> {v.detail}</span> : null}
      </p>
      {v.missing.length > 0 && value.length > 0 ? (
        <ul className="mt-1 list-disc pl-5 text-micro text-ink-soft">
          {v.missing.map((m) => (
            <li key={m}>{t('field.password.needs', { requirement: m })}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className = '', rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={[CONTROL, border(invalid), 'resize-y', className].join(' ')}
      {...rest}
    />
  );
});

export function NumberInput({ invalid, className = '', ...rest }: InputProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-invalid={invalid || undefined}
      className={[CONTROL, border(invalid), 'tnum', className].join(' ')}
      {...rest}
    />
  );
}

export interface MoneyInputProps {
  id?: string;
  /** Value in paise. Money never travels as a float rupee amount. */
  valuePaise: number;
  onChangePaise: (paise: number) => void;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  describedBy?: string;
}

export function MoneyInput({ id, valuePaise, onChangePaise, invalid, disabled, readOnly, describedBy }: MoneyInputProps) {
  const [text, setText] = useState(() => (valuePaise ? String(Math.round(valuePaise / 100)) : ''));
  useEffect(() => {
    setText(valuePaise ? String(Math.round(valuePaise / 100)) : '');
  }, [valuePaise]);

  return (
    <div className="group flex items-stretch">
      {/* The affix is one control with the field, so it takes the focus rule with it. */}
      <span
        aria-hidden
        className="swift inline-flex items-center rounded-l-control border border-r-0 border-rule bg-ledger px-4 text-body text-verify group-focus-within:border-verify"
      >
        ₹
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        readOnly={readOnly}
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          setText(digits);
          onChangePaise(digits ? Number(digits) * 100 : 0);
        }}
        className={[CONTROL, border(invalid), 'rounded-l-none tnum'].join(' ')}
      />
      <span className="ml-3 self-center whitespace-nowrap rounded-pill bg-ledger px-3 py-0.5 text-micro text-ink-soft tnum">
        {money(valuePaise)}
      </span>
    </div>
  );
}

export interface SelectProps {
  id?: string;
  value?: string;
  /**
   * Shaped like a change event so every call site still reads `e.target.value`,
   * exactly as it did when this was a native `<select>`. The control underneath
   * is no longer one; the twenty-two places that use it did not need to know.
   */
  onChange?: (event: { target: { value: string } }) => void;
  options: readonly { value: string; label: string; detail?: string; disabled?: boolean }[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

/**
 * The product's dropdown.
 *
 * It used to be a native `<select>` with `appearance-none` and a chevron painted
 * on as a background image. The closed control could be styled; the list could
 * not. Opening it dropped a Windows menu — system font, system blue, square
 * corners, its own row height — over a page set in Bricolage and Anek on paper.
 * Every filter, report picker and rubric chooser in the product broke character
 * at the exact moment somebody used it.
 *
 * So the list is ours: the glass panel the combobox already opens, options set
 * as ledger rows, the chosen one marked with a tick rather than a highlight
 * colour the operating system picked. What that costs is everything the
 * platform gave for free — keyboard, typeahead, click-away — so all of it is
 * written out below.
 */
export function Select({
  id,
  value = '',
  onChange,
  options,
  placeholder,
  invalid,
  disabled,
  className = '',
  'aria-describedby': describedBy,
  'aria-label': ariaLabel,
}: SelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /* Typeahead holds the letters typed in the last second, not the last letter. */
  const typed = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  /* Where the list fits, measured when it opens. */
  const [drop, setDrop] = useState<{ up: boolean; max: number }>({ up: false, max: 256 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) return undefined;
    function onDocDown(e: MouseEvent): void {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  /*
   * Which way it opens, and how tall it may be.
   *
   * A list that always drops downwards is clipped the moment the control sits
   * near the foot of anything that scrolls — a modal body, the evidence dock, a
   * table wrapper. The window is not what clips first, so the nearest scrolling
   * ancestor is measured too.
   */
  useEffect(() => {
    if (!open) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let below = window.innerHeight - r.bottom - 16;
    let above = r.top - 16;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const flow = getComputedStyle(node).overflowY;
      if (flow === 'auto' || flow === 'scroll' || flow === 'hidden') {
        const box = node.getBoundingClientRect();
        below = Math.min(below, box.bottom - r.bottom - 8);
        above = Math.min(above, r.top - box.top - 8);
        break;
      }
    }
    const up = below < 176 && above > below;
    setDrop({ up, max: Math.max(120, Math.min(256, Math.floor(up ? above : below))) });
  }, [open]);

  /* The row you are on has to stay visible, or arrowing past the eighth option
     walks the selection off the bottom of a panel that never moves. */
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function commit(index: number): void {
    const pick = options[index];
    if (!pick || pick.disabled) return;
    onChange?.({ target: { value: pick.value } });
    setOpen(false);
  }

  /** The nearest option in that direction that can actually be chosen. */
  function step(from: number, direction: 1 | -1): number {
    for (let i = from; i >= 0 && i < options.length; i += direction) {
      if (!options[i]?.disabled) return i;
    }
    return from;
  }

  function openAt(index: number): void {
    setOpen(true);
    setActive(step(Math.max(0, index), 1));
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        openAt(selectedIndex >= 0 ? selectedIndex : 0);
        return;
      }
      setActive((a) => step(Math.min(options.length - 1, Math.max(0, a + direction)), direction));
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (!open) openAt(e.key === 'Home' ? 0 : options.length - 1);
      else setActive(e.key === 'Home' ? step(0, 1) : step(options.length - 1, -1));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) commit(active);
      else openAt(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    /* Typeahead. "de" finds "Department report", not every option with a d. */
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      const text = (now - typed.current.at < 1000 ? typed.current.text : '') + e.key.toLowerCase();
      typed.current = { text, at: now };
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(text));
      if (hit >= 0) {
        if (open) setActive(hit);
        else commit(hit);
      }
    }
  }

  return (
    <div ref={wrapRef} className={['relative', className].join(' ')}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={onKeyDown}
        className={[
          CONTROL,
          border(invalid),
          'flex cursor-pointer items-center justify-between gap-3 text-left',
          open ? 'border-verify shadow-raise' : '',
        ].join(' ')}
      >
        <span className={['min-w-0 flex-1 truncate', selected ? 'text-ink' : 'text-ink-soft'].join(' ')}>
          {selected?.label ?? placeholder ?? t('field.select.choose')}
        </span>
        <span aria-hidden className={['swift shrink-0 text-ink-soft', open ? 'rotate-180 text-verify' : ''].join(' ')}>
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 1l5 5 5-5" />
          </svg>
        </span>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-activedescendant={`${listId}-${active}`}
          style={{ maxHeight: drop.max }}
          className={[
            'glass absolute z-30 w-full space-y-0.5 overflow-auto p-1.5 shadow-lift scroll-quiet',
            drop.up ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-body text-ink-soft">{t('field.select.empty')}</li>
          ) : (
            options.map((o, i) => {
              const chosen = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={chosen}
                  aria-disabled={o.disabled || undefined}
                  data-active={String(i === active)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(i);
                  }}
                  onMouseEnter={() => {
                    if (!o.disabled) setActive(i);
                  }}
                  className={[
                    'swift flex items-start gap-3 rounded-control px-3 py-2 text-body',
                    o.disabled ? 'cursor-not-allowed text-ink-soft' : 'cursor-pointer',
                    i === active && !o.disabled ? 'bg-verify-wash' : '',
                  ].join(' ')}
                >
                  <span aria-hidden className={['mt-1 shrink-0', chosen ? 'text-verify' : 'text-transparent'].join(' ')}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 13 4 4 10-10" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={['block', chosen ? 'font-medium text-ink' : 'text-ink'].join(' ')}>{o.label}</span>
                    {o.detail ? <span className="mt-0.5 block text-micro text-ink-soft">{o.detail}</span> : null}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- combobox */

export interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; detail?: string }[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}

export function Combobox({ id, value, onChange, options, placeholder, invalid, describedBy }: ComboboxProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(text.toLowerCase())),
    [options, text],
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        value={open ? text : (selected?.label ?? '')}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setText('');
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            const pick = filtered[active];
            if (pick) {
              onChange(pick.value);
              setOpen(false);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={[CONTROL, border(invalid)].join(' ')}
      />
      {open ? (
        /*
         * The list floats over the page rather than sitting in it, which is the
         * one case the design language spends a real backdrop blur on. The
         * height is a bracket value on purpose: the spacing scale stops at 80px
         * and a list that tall shows two options.
         */
        <ul
          id={listId}
          role="listbox"
          className="glass absolute z-30 mt-2 max-h-[256px] w-full space-y-0.5 overflow-auto p-1.5 shadow-lift scroll-quiet"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-body text-ink-soft">{t('field.combobox.noMatchFor', { query: text })}</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setActive(i)}
                className={[
                  'swift cursor-pointer rounded-control px-3 py-2 text-body',
                  i === active ? 'bg-verify-wash' : '',
                ].join(' ')}
              >
                <span className="block text-ink">{o.label}</span>
                {o.detail ? <span className="block text-micro text-ink-soft">{o.detail}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- multiselect */

export interface MultiSelectTagsProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  describedBy?: string;
  /**
   * How an option should be written on screen.
   *
   * The values here are identifiers as well as words — a sector is what the
   * filter matches on and what the API stores — so the English value stays
   * canonical and only the rendering changes. Defaults to writing the value.
   */
  label?: (value: string) => string;
}

export function MultiSelectTags({
  id,
  values,
  onChange,
  options,
  placeholder,
  describedBy,
  label = (v) => v,
}: MultiSelectTagsProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  // Match what the reader can see, so typing the Hindi word finds the option.
  const available = options.filter(
    (o) => !values.includes(o) && label(o).toLowerCase().includes(text.toLowerCase()),
  );

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-2">
        {values.map((v) => (
          <li key={v}>
            <span className="inline-flex items-center gap-2 rounded-pill border border-verify bg-verify-wash px-3 py-1 text-label text-verify">
              {label(v)}
              <button
                type="button"
                aria-label={t('field.multiSelect.remove', { value: label(v) })}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="swift text-verify hover:text-seal"
              >
                ×
              </button>
            </span>
          </li>
        ))}
        {values.length === 0 ? <li className="text-micro text-ink-soft">{t('field.multiSelect.empty')}</li> : null}
      </ul>
      <input
        id={id}
        value={text}
        aria-describedby={describedBy}
        // The field label is the name where one is wired up. The placeholder is
        // the fallback so the control is never announced as an unnamed box.
        aria-label={id ? undefined : placeholder}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        className={[CONTROL, border(false)].join(' ')}
      />
      {text ? (
        <ul className="sheet-flat mt-2 max-h-[176px] space-y-0.5 overflow-auto p-1.5 scroll-quiet">
          {available.length === 0 ? (
            <li className="px-3 py-2 text-body text-ink-soft">{t('field.multiSelect.noMatch')}</li>
          ) : (
            available.slice(0, 20).map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...values, o]);
                    setText('');
                  }}
                  className="swift w-full rounded-control px-3 py-2 text-left text-body hover:bg-verify-wash"
                >
                  {label(o)}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- choice sets */

export interface RadioGroupProps {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; detail?: string; disabled?: boolean; disabledReason?: string }[];
  required?: boolean;
  error?: string;
}

export function RadioGroup({ legend, name, value, onChange, options, required, error }: RadioGroupProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="border-0 p-0">
      <legend className="field-label mb-3 text-ink">
        {legend}
        {required ? <span className="ml-2 font-normal text-ink-soft">{t('field.required')}</span> : null}
      </legend>
      {/*
       * Each choice is a card rather than a ruled row. A row divided off by a
       * hairline reads as a line in a table you cannot act on; the thing being
       * offered here is a thing you pick up, so it has an edge of its own and
       * takes the cleared green once it is the one chosen.
       */}
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const chosen = value === o.value;
          return (
            <label
              key={o.value}
              className={[
                'sheet-flat swift flex items-start gap-3 rounded-control p-4',
                chosen ? 'border-verify bg-verify-wash shadow-raise' : 'hover:border-ink-soft',
                o.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              ].join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
                className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--verify)]"
              />
              <span>
                <span className="block text-body text-ink">{o.label}</span>
                {o.detail ? <span className="block text-micro text-ink-soft">{o.detail}</span> : null}
                {o.disabled && o.disabledReason ? (
                  <span className="block text-micro text-seal">{o.disabledReason}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className={['mt-3', FIELD_ERROR].join(' ')} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  detail?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function Checkbox({ checked, onChange, label, detail, disabled, invalid }: CheckboxProps) {
  return (
    /*
     * The padding is cancelled by an equal negative margin, so the row gains a
     * rounded surface to light up under the pointer without moving a single
     * pixel of the form it sits in.
     */
    <label
      className={[
        '-m-1.5 swift flex items-start gap-3 rounded-control p-1.5',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-verify-wash',
        invalid ? 'bg-seal-wash' : '',
      ].join(' ')}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--verify)]"
      />
      <span>
        <span className="block text-body text-ink">{label}</span>
        {detail ? <span className="block text-micro text-ink-soft">{detail}</span> : null}
      </span>
    </label>
  );
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  detail?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, detail, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        '-mx-2 swift flex w-full items-center justify-between gap-4 rounded-control px-2 py-2 text-left',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-verify-wash',
      ].join(' ')}
    >
      <span>
        <span className="block text-body text-ink">{label}</span>
        {detail ? <span className="block text-micro text-ink-soft">{detail}</span> : null}
      </span>
      {/*
       * The track is drawn with an inset ring rather than a border so its inner
       * box is the full 48px, which is what lets the knob travel an exact step
       * of the spacing scale instead of a hand-measured offset.
       */}
      <span
        aria-hidden
        className={[
          'swift relative h-6 w-12 shrink-0 rounded-full ring-1 ring-inset',
          checked ? 'bg-verify ring-verify' : 'bg-ledger ring-rule',
        ].join(' ')}
      >
        <span
          className={[
            'settle absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-sheet shadow-sheet',
            checked ? 'translate-x-6' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
    </button>
  );
}

export interface SliderProps {
  id?: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  format?: (v: number) => string;
  describedBy?: string;
}

export function Slider({ id, label, min, max, step = 1, value, onChange, format, describedBy }: SliderProps) {
  return (
    <div className="flex items-center gap-4">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={format ? format(value) : String(value)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[color:var(--verify)]"
      />
      {/* A minimum rather than a fixed width: the old `w-24` was not a step on
          the scale, so the readout had no reserved room at all. */}
      <output className="min-w-20 shrink-0 whitespace-nowrap rounded-control bg-ledger px-3 py-1 text-right text-data text-ink tnum">
        {format ? format(value) : value}
      </output>
    </div>
  );
}

/* ---------------------------------------------------------------- file drop */

export interface FileDropProps {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  onFiles: (files: { fileName: string; type: string; sizeBytes: number }[]) => void;
  disabled?: boolean;
}

export function FileDrop({ label, hint, accept, multiple = true, onFiles, disabled }: FileDropProps) {
  const { t } = useTranslation();
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  function handle(list: FileList | null): void {
    if (!list) return;
    onFiles(
      Array.from(list).map((f) => ({
        fileName: f.name,
        type: f.type || 'application/octet-stream',
        sizeBytes: f.size,
      })),
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) handle(e.dataTransfer.files);
        }}
        className={[
          'sheet-flat settle rounded-block border-dashed p-8 text-center',
          over ? 'border-verify bg-verify-wash shadow-raise' : '',
          disabled ? 'opacity-60' : '',
        ].join(' ')}
      >
        {/* An empty drop target with nothing in it but a sentence does not look
            like somewhere a document goes, so it is given the tray it is. */}
        <span
          aria-hidden
          className={[
            'swift mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border',
            over ? 'border-verify bg-sheet text-verify' : 'border-rule bg-ledger text-ink-soft',
          ].join(' ')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13.5V3.5" />
            <path d="M6 7.5l4-4 4 4" />
            <path d="M3.5 12.5v3.5h13v-3.5" />
          </svg>
        </span>
        <p className="text-body text-ink">{label}</p>
        {hint ? <p className="mt-2 text-micro text-ink-soft">{hint}</p> : null}
        <label
          htmlFor={id}
          className={[
            'press mt-5 inline-flex h-10 cursor-pointer items-center rounded-pill border border-rule bg-sheet px-5 text-label text-ink',
            disabled ? 'pointer-events-none' : 'hover:border-verify hover:bg-verify-wash hover:text-verify',
          ].join(' ')}
        >
          {t('field.file.choose')}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => handle(e.target.files)}
        />
      </div>
    </div>
  );
}

export function DateInput({ invalid, className = '', ...rest }: InputProps) {
  return (
    <input
      type="date"
      aria-invalid={invalid || undefined}
      className={[CONTROL, border(invalid), 'tnum', className].join(' ')}
      {...rest}
    />
  );
}

export interface DateRangeProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  labels?: { from: string; to: string };
}

export function DateRangePicker({ from, to, onChange, labels }: DateRangeProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end gap-4">
      <Field label={labels?.from ?? t('field.dateRange.from')}>
        {({ id }) => <DateInput id={id} value={from} onChange={(e) => onChange({ from: e.target.value, to })} />}
      </Field>
      <Field label={labels?.to ?? t('field.dateRange.to')}>
        {({ id }) => <DateInput id={id} value={to} onChange={(e) => onChange({ from, to: e.target.value })} />}
      </Field>
    </div>
  );
}
