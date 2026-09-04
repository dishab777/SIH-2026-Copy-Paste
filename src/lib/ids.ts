/** Deterministic identifiers so a demo reload produces the same case numbers. */

let counters: Record<string, number> = {};

export function resetCounters(seed: Record<string, number> = {}): void {
  counters = { ...seed };
}

export function nextCaseId(prefix: 'CH' | 'PL' | 'APP' | 'PC' | 'SC' | 'CLM' | 'VR' | 'GT', year = 2026): string {
  counters[prefix] = (counters[prefix] ?? 0) + 1;
  return `${prefix}-${year}-${String(counters[prefix]).padStart(4, '0')}`;
}

export function peekCounter(prefix: string): number {
  return counters[prefix] ?? 0;
}

/**
 * Stable non-cryptographic digest, used to give every evidence file, contract and
 * validation report a checksum the audit trail can show. Never used for security.
 */
export function digest(input: string): string {
  let h1 = 0x9e3779b9;
  let h2 = 0x85ebca6b;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761) >>> 0;
    h2 = Math.imul(h2 ^ c, 1597334677) >>> 0;
  }
  const a = (h1 ^ (h2 >>> 13)) >>> 0;
  const b = (h2 ^ (h1 >>> 7)) >>> 0;
  const c = Math.imul(a ^ b, 2246822519) >>> 0;
  const d = Math.imul(a + b, 3266489917) >>> 0;
  return [a, b, c, d].map((n) => n.toString(16).padStart(8, '0')).join('');
}

export function errorReference(): string {
  const n = Math.floor(1000 + Math.random() * 8999);
  return `ERR-2026-${n}`;
}

/** Seeded pseudo-random, so fixtures are identical on every load. */
export function makeRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]!;
}

export function pickMany<T>(rand: () => number, list: readonly T[], count: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  }
  return out;
}

export function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(min + rand() * (max - min + 1));
}
