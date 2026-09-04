import type { Config } from 'tailwindcss';

/**
 * PRAYOG design system.
 *
 * The spacing scale is a closed 4px set: 2/4/6/8/12/16/20/24/28/32/40/48/64/80.
 *
 * It has to cover the vocabulary the product actually writes, because Tailwind
 * does not warn about a step that is missing — it emits nothing, and the
 * element simply has no padding. Truncating it harder did not stop anyone
 * typing `px-5`; it only stopped `px-5` doing anything, and forty-nine such
 * classes were silently dead before this was measured. If you need a step that
 * is not here, add it here rather than reaching for an arbitrary value.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Replaced, not extended.
    spacing: {
      0: '0px',
      px: '1px',
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '10px',
      3: '12px',
      3.5: '14px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
      9: '36px',
      11: '44px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
      40: '160px',
      64: '256px',
    },
    borderRadius: {
      // Read from the tokens, so softening the product is one edit in one file.
      none: '0',
      control: 'var(--radius-control)',
      sheet: 'var(--radius-sheet)',
      block: 'var(--radius-block)',
      pill: 'var(--radius-pill)',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      rule: '0 1px 0 var(--rule)',
      sheet: 'var(--elev-sheet)',
      raise: 'var(--elev-raise)',
      lift: 'var(--elev-lift)',
      float: 'var(--elev-float)',
      saffron: 'var(--glow-saffron)',
      signal: 'var(--glow-signal)',
    },
    screens: { sm: '360px', md: '768px', lg: '1024px', xl: '1440px' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ink: 'var(--ink)',
      'ink-soft': 'var(--ink-soft)',
      ledger: 'var(--ledger)',
      sheet: 'var(--sheet)',
      rule: 'var(--rule)',
      verify: 'var(--verify)',
      hold: 'var(--hold)',
      seal: 'var(--seal)',
      'verify-wash': 'var(--verify-wash)',
      'hold-wash': 'var(--hold-wash)',
      'seal-wash': 'var(--seal-wash)',
      white: '#FFFFFF',

      /*
       * The deep ground. One hue family with the paper above, because it is
       * literally the same green: --verify taken down to near-black. Used
       * identically on every route, so navigating never changes the palette.
       */
      deep: 'var(--deep)',
      'deep-2': 'var(--deep-2)',
      'deep-3': 'var(--deep-3)',
      'deep-ink': 'var(--deep-ink)',
      'deep-dim': 'var(--deep-dim)',
      'deep-rule': 'var(--deep-rule)',

      /* The only two accents in the product.
         Saffron: open, waiting, yours. Signal: cleared, measured, paid. */
      saffron: 'var(--saffron)',
      signal: 'var(--signal)',
      /* Refused, raised until it reads on the deep ground. */
      'seal-lit': 'var(--seal-lit)',
      /* Chip grounds for the deep surfaces. An opacity modifier cannot be used
         on a var()-backed colour — it silently emits nothing — so the tints are
         tokens. */
      'signal-veil': 'var(--signal-veil)',
      'saffron-veil': 'var(--saffron-veil)',
      'seal-veil': 'var(--seal-veil)',
      /* Saffron again, dark enough to be read as a label on a sheet. */
      'saffron-ink': 'var(--saffron-ink)',
      /* The wash behind a modal. */
      scrim: 'var(--scrim)',
    },
    fontFamily: {
      // Bricolage carries the display voice; Anek does the reading.
      display: ['Bricolage Grotesque', 'Anek Latin', 'Segoe UI', 'system-ui', 'sans-serif'],
      sans: ['Anek Latin', 'Anek Devanagari', 'Segoe UI', 'system-ui', 'sans-serif'],
      doc: ['Tiro Devanagari Hindi', 'Georgia', 'Times New Roman', 'serif'],
      // Identifiers only: case numbers, references, checksums. Never money.
      register: [
        'ui-monospace',
        'Cascadia Mono',
        'Segoe UI Mono',
        'SF Mono',
        'Menlo',
        'Roboto Mono',
        'Liberation Mono',
        'monospace',
      ],
    },
    /*
     * Every size carries its own leading, and nothing in the product sets
     * line-height by hand. Leading tightens as type grows — a 96px headline set
     * at the same ratio as body copy falls apart, and body copy set at a
     * headline's ratio stops being a paragraph.
     *
     * The display sizes sit just above 1.0 rather than below it: Bricolage has
     * deep descenders, and at 0.92 the tail of a "p" collided with the line
     * beneath it.
     */
    fontSize: {
      mega: ['clamp(40px, 7.2vw, 92px)', { lineHeight: '1.08', fontWeight: '800' }],
      hero: ['clamp(30px, 4.4vw, 52px)', { lineHeight: '1.1', fontWeight: '700' }],
      display: ['44px', { lineHeight: '1.08', fontWeight: '700' }],
      h1: ['31px', { lineHeight: '1.18', fontWeight: '700' }],
      h2: ['23px', { lineHeight: '1.26', fontWeight: '650' }],
      h3: ['18px', { lineHeight: '1.34', fontWeight: '650' }],
      lead: ['17px', { lineHeight: '1.62', fontWeight: '400' }],
      body: ['15px', { lineHeight: '1.6', fontWeight: '400' }],
      doc: ['17px', { lineHeight: '1.74', fontWeight: '400' }],
      data: ['14px', { lineHeight: '1.42', fontWeight: '500' }],
      label: ['13px', { lineHeight: '1.38', fontWeight: '500' }],
      micro: ['11px', { lineHeight: '1.45', fontWeight: '500' }],
      /* Figures that are read as a quantity, not a sentence. */
      figure: ['clamp(24px, 2.4vw, 30px)', { lineHeight: '1.1', fontWeight: '700' }],
      /* The wordmark and the portal chip beneath it. Two sizes that exist only
         in the top bar, but they are sizes, so they live in the scale. */
      mark: ['19px', { lineHeight: '1', fontWeight: '700' }],
      chip: ['10px', { lineHeight: '1.3', fontWeight: '600' }],
    },
    extend: {
      maxWidth: { doc: '68ch', shell: '1440px', dock: '340px', hero: '18ch' },
      gridTemplateColumns: { shell: '12, minmax(0, 1fr)' },
      transitionDuration: { seal: '220ms' },
      letterSpacing: { stamp: '0.08em', mega: '-0.035em' },
    },
  },
  plugins: [],
};
export default config;
