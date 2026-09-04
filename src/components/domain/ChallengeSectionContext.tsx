import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { CHALLENGE_SECTIONS } from './ChallengeDocument';

type SectionId = (typeof CHALLENGE_SECTIONS)[number]['id'];

interface Ctx {
  active: SectionId;
  setActive: (id: SectionId) => void;
  /** Increments on every change, so a panel can restart its arrival. */
  seq: number;
}

const ChallengeSection = createContext<Ctx | null>(null);

/**
 * Which part of the challenge is being read.
 *
 * The document used to be one long scroll with an anchor list beside it, and a
 * reader who wanted the data annexure got the whole file and a jump. A
 * challenge is not read front to back — a founder checks the outcome, then the
 * budget, then the eligibility, and compares them against another challenge. So
 * it is a set of panels, one at a time, and the index is a control rather than
 * a table of contents.
 */
export function ChallengeSectionProvider({ children }: { children: ReactNode }) {
  const [active, setActiveId] = useState<SectionId>(CHALLENGE_SECTIONS[0].id);
  const [seq, setSeq] = useState(0);

  const value = useMemo<Ctx>(
    () => ({
      active,
      seq,
      setActive: (id) => {
        setActiveId((current) => {
          if (current === id) return current;
          setSeq((n) => n + 1);
          return id;
        });
      },
    }),
    [active, seq],
  );

  return <ChallengeSection.Provider value={value}>{children}</ChallengeSection.Provider>;
}

export function useChallengeSection(): Ctx {
  const ctx = useContext(ChallengeSection);
  if (!ctx) {
    throw new Error('useChallengeSection must be used inside a ChallengeSectionProvider');
  }
  return ctx;
}
