import { HINDI } from '@/content/hindi';

/**
 * Serve the seeded content in the language the reader is reading.
 *
 * The alternative was to make every content field on every model a bilingual
 * pair and teach fifty screens to unwrap it. This does the same job in one
 * place, the way a real deployment would: the client says what language it
 * wants, the API answers in it, and `challenge.title` is still a string.
 *
 * What it walks: every string in the response body. What it changes: only
 * strings the dictionary has an entry for. Everything else passes through
 * untouched, which is the right failure — an untranslated sentence is legible;
 * a blank one is not.
 *
 * Keys are skipped by name, not by inspecting the value, because a case
 * identifier and a challenge title are both strings and only one of them
 * should ever be rewritten. Identifiers, hashes, references and timestamps
 * mean the same thing in every language, and translating them would break
 * search, sort and every join in the store.
 */
const NEVER_TRANSLATE = new Set([
  'id',
  'caseId',
  'slug',
  'hash',
  'checksum',
  'reference',
  'paymentReference',
  'email',
  'ruleId',
  'rubricId',
  'templateId',
  'templateVersion',
  'version',
  'gate',
  'currentGate',
  'pathwayId',
  'citation',
  'fileName',
  'url',
  'href',
  'initials',
  'departmentId',
  'startupId',
  'pilotId',
  'challengeId',
  'applicationId',
  'evaluatorId',
  'ownerId',
  'milestoneId',
  'userId',
  'entityId',
  'panelId',
  'criterionId',
]);

/** A key whose value is an ISO date, a colour or an enum the UI already maps. */
const looksStructural = (value: string): boolean =>
  value.length === 0 ||
  /^\d{4}-\d{2}-\d{2}/.test(value) ||
  /^[A-Z]{2,}-[A-Z0-9-]+$/.test(value) ||
  /^[a-f0-9]{16,}$/i.test(value);

function translate(value: string): string {
  const hit = HINDI[value];
  if (hit) return hit;

  /*
   * Titles are composed: "Smart water leakage detection — western zone". The
   * two halves are separately in the dictionary, so a composed title still
   * translates rather than falling through whole.
   */
  const dash = value.indexOf(' — ');
  if (dash > 0) {
    const head = HINDI[value.slice(0, dash)];
    const tail = HINDI[value.slice(dash + 3)];
    if (head || tail) return `${head ?? value.slice(0, dash)} — ${tail ?? value.slice(dash + 3)}`;
  }

  /* "180 minutes", "34 percent" — a figure and a unit the dictionary knows. */
  const measured = /^(-?[\d,.]+)\s+(.+)$/.exec(value);
  if (measured) {
    const unit = HINDI[measured[2]!];
    if (unit) return `${measured[1]} ${unit}`;
  }

  return value;
}

/**
 * Walk a response body and translate what can be translated.
 *
 * Recursive rather than a deep clone plus mutate: the store holds the objects
 * this receives, and rewriting them in place would translate the seed data
 * itself — permanently, and only for whoever loaded a page in Hindi first.
 */
export function localise<T>(value: T, key?: string): T {
  if (typeof value === 'string') {
    if (key && NEVER_TRANSLATE.has(key)) return value;
    if (looksStructural(value)) return value;
    return translate(value) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((item) => localise(item, key)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = localise(v, k);
    return out as unknown as T;
  }
  return value;
}
