import type { ReactNode } from 'react';

/**
 * A part of a form, named and numbered.
 *
 * A registration form is a short interview, not a wall of boxes: each part says
 * what it is asking for and why, carries its own drawing, and sits on its own
 * tinted panel so a reader can see how much is left before they start.
 *
 * It was written twice, byte for byte, in the two registration pages. It is one
 * component now, and it takes the total rather than assuming four.
 */
export function FormSection({
  step,
  total,
  title,
  hint,
  glyph,
  children,
}: {
  step: number;
  total: number;
  title: string;
  hint: string;
  /** Path data for a 24px box on the product's one stroke weight. */
  glyph: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-hold-wash text-verify shadow-sheet"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            focusable="false"
          >
            {glyph}
          </svg>
        </span>
        <div className="min-w-0">
          <p className="field-label mb-1 flex items-center gap-2 !text-saffron-ink">
            <span
              aria-hidden
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-saffron px-1.5 text-micro text-deep tnum"
            >
              {step}
            </span>
            Section {step} of {total}
          </p>
          <h2 className="font-display text-h3 text-ink">{title}</h2>
          <p className="mt-1 max-w-doc text-micro text-ink-soft">{hint}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-sheet border border-rule bg-gradient-to-b from-verify-wash to-transparent px-5 py-5 shadow-sheet">
        {children}
      </div>
    </section>
  );
}

/** The glyphs the registration forms use, on one stroke weight. */
export const FORM_GLYPH = {
  /** An account: a person in a ring. */
  account: <path d="M12 12.4a3.9 3.9 0 1 0 0-7.8 3.9 3.9 0 0 0 0 7.8ZM4.6 20.5a7.4 7.4 0 0 1 14.8 0" />,
  /** A key, for credentials. */
  key: <path d="M15.5 4.5a4.5 4.5 0 1 0-3.2 7.7c.3 0 .6 0 .9-.1L15 14l2-.4.4-2 2-.4.6-2.6-2.4-2.4A4.5 4.5 0 0 0 15.5 4.5Z" />,
  /** A building, for the entity. */
  building: <path d="M4 20.5h16M6 20.5V5.5h8v15M14 9.5h4v11M8.5 9h1.5M8.5 13h1.5M8.5 17h1.5" />,
  /** A seal, for recognition. */
  seal: <path d="M12 3.5 14.2 6l3.4-.4L17 9l2.5 2.2-2.5 2.3.6 3.4-3.4-.4L12 19l-2.2-2.5-3.4.4.6-3.4L4.5 11.2 7 9l-.6-3.4L9.8 6Z" />,
  /** A ruled list, for what you do. */
  list: <path d="M4 6.5h4M4 12h4M4 17.5h4M11 6.5h9M11 12h9M11 17.5h9" />,
  /** A pen, for a declaration. */
  pen: <path d="M4 20h16M5.5 16.5l9.4-9.4a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8l-9.4 9.4H5.5Z" />,
  /** Scales, for independence. */
  scales: <path d="M12 4v16M7 20h10M4 9h16M4 9l-2.5 5h5ZM20 9l2.5 5h-5Z" />,
} as const;
