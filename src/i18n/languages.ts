/**
 * The languages this product is read in.
 *
 * There used to be no such list. Every place that cared asked
 * `i18n.language.startsWith('hi')` and branched on the answer, which is a
 * boolean pretending to be a language — it works for exactly two languages and
 * silently answers "English" for every one after that. Nine files asked it, and
 * a third language would have had to be added to all nine by hand, with nothing
 * failing if one was missed.
 *
 * So the axis is declared once, here, and everything derives from it: the
 * switcher in the bar, the formatter's locale, the content dictionaries the
 * mock API serves through, the taxonomy labels and the legal documents. Adding
 * a fourth language means adding a row here and a bundle beside it; nothing
 * branches on a code in a component again.
 *
 * `endonym` is the language's name in itself, because a language picker that
 * names languages in a language you cannot read is no use to the person who
 * needs it. `short` is what fits in the collapsed control in the bar.
 */
export const LANGUAGES = [
  { code: 'en', endonym: 'English', short: 'EN', locale: 'en-IN' },
  { code: 'hi', endonym: 'हिन्दी', short: 'हिं', locale: 'hi-IN' },
  { code: 'mr', endonym: 'मराठी', short: 'मरा', locale: 'mr-IN' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** The default, and what an unrecognised tag falls back to. */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

const CODES: readonly string[] = LANGUAGES.map((l) => l.code);

/**
 * The language a tag asks for.
 *
 * Takes the primary subtag, so `mr-IN`, `mr` and an `Accept-Language` of
 * `mr-IN,mr;q=0.9` all resolve to Marathi, and anything unrecognised resolves
 * to English rather than to a blank screen.
 */
export function readingLanguage(tag: string | null | undefined): LanguageCode {
  const primary = (tag ?? '').trim().toLowerCase().split(/[-,;_]/)[0] ?? '';
  return (CODES.includes(primary) ? primary : DEFAULT_LANGUAGE) as LanguageCode;
}

/** The Intl locale for a language. */
export function localeOf(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.locale ?? 'en-IN';
}
