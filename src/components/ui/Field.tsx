import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { money } from '@/lib/format';

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
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label text-ink">
          {label}
          {required ? <span className="ml-2 font-normal text-ink-soft">required</span> : null}
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

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function Select({ invalid, options, placeholder, className = '', ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={[CONTROL, border(invalid), 'cursor-pointer appearance-none pr-10', className].join(' ')}
      style={{
        /*
         * A data URI is parsed as its own document and cannot read a custom
         * property, so this one chevron has to restate --ink-soft literally.
         * It was drawn in a blue-grey left over from the palette before this
         * one, which is the only reason it is being touched.
         */
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' fill='none' stroke='%235c6259' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
      }}
      {...rest}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
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
            <li className="px-3 py-2 text-body text-ink-soft">No match for “{text}”.</li>
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
}

export function MultiSelectTags({ id, values, onChange, options, placeholder, describedBy }: MultiSelectTagsProps) {
  const [text, setText] = useState('');
  const available = options.filter((o) => !values.includes(o) && o.toLowerCase().includes(text.toLowerCase()));

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-2">
        {values.map((v) => (
          <li key={v}>
            <span className="inline-flex items-center gap-2 rounded-pill border border-verify bg-verify-wash px-3 py-1 text-label text-verify">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="swift text-verify hover:text-seal"
              >
                ×
              </button>
            </span>
          </li>
        ))}
        {values.length === 0 ? <li className="text-micro text-ink-soft">Nothing selected yet.</li> : null}
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
            <li className="px-3 py-2 text-body text-ink-soft">No match.</li>
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
                  {o}
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
  return (
    <fieldset className="border-0 p-0">
      <legend className="field-label mb-3 text-ink">
        {legend}
        {required ? <span className="ml-2 font-normal text-ink-soft">required</span> : null}
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
          Choose files
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
  return (
    <div className="flex flex-wrap items-end gap-4">
      <Field label={labels?.from ?? 'From'}>
        {({ id }) => <DateInput id={id} value={from} onChange={(e) => onChange({ from: e.target.value, to })} />}
      </Field>
      <Field label={labels?.to ?? 'To'}>
        {({ id }) => <DateInput id={id} value={to} onChange={(e) => onChange({ from, to: e.target.value })} />}
      </Field>
    </div>
  );
}
