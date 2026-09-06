import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GATES } from '@/config/gates';
import { ELIGIBILITY_RULES } from '@/config/rules';
import { RUBRICS } from '@/config/rubrics';
import { TEMPLATES, DATA_TIERS } from '@/config/templates';
import { citationShort } from '@/config/policies';
import { CAPABILITIES, SECTORS } from '@/mocks/fixtures/reference';
import { api } from '@/services/api';
import { PrayogApiError } from '@/services/api';
import { useChallenges, useCreateChallenge, useResolveLanguageFlag, useSession, usePublishChallenge } from '@/services/hooks';
import { WizardShell, type WizardStep } from '@/components/patterns/WizardShell';
import { PageHeader } from '@/components/layout/Shell';
import { Field, Input, Textarea, NumberInput, MoneyInput, Select, MultiSelectTags, Checkbox, RadioGroup } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InlineNote, PanelSkeleton } from '@/components/ui/Feedback';
import { StatLedger, KeyValueSheet } from '@/components/ledger/Ledger';
import { DataTierSelector } from '@/components/domain/Legal';
import { RelaxationNotice } from '@/components/domain/Eligibility';
import { ChallengeDocument } from '@/components/domain/ChallengeDocument';
import { Watermark } from '@/components/domain/SealStamp';
import { money, num } from '@/lib/format';
import { track } from '@/lib/analytics';
import { useUi } from '@/store/ui';
import type { Challenge, SolutionLanguageFlag } from '@/types/models';
import { platformNowIso } from '@/config/clock';

/* ------------------------------------------------------------------ marks
 * Drawn here rather than imported, because the whole product runs on one line
 * weight and an icon set brings its own.
 */
type GlyphName =
  | 'form'
  | 'people'
  | 'gauge'
  | 'target'
  | 'database'
  | 'scale'
  | 'money'
  | 'shield'
  | 'document'
  | 'warning'
  | 'flag'
  | 'lock'
  | 'quote'
  | 'steps';

const GLYPH: Record<GlyphName, string[]> = {
  form: ['M9 4h6v3H9z', 'M15 5h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2', 'M9 12h6', 'M9 16h4'],
  people: [
    'M9 11.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
    'M3.5 20v-1.4A4.6 4.6 0 0 1 8.1 14h1.8a4.6 4.6 0 0 1 4.6 4.6V20',
    'M16.2 5.6a3.2 3.2 0 0 1 0 5.8',
    'M17.4 14.4A4.6 4.6 0 0 1 20.5 18.7V20',
  ],
  gauge: ['M4 18.5a8 8 0 1 1 16 0', 'M12 18.5l4.4-5.6', 'M4 18.5h2.5', 'M17.5 18.5H20'],
  target: [
    'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z',
    'M12 16.6a4.6 4.6 0 1 1 0-9.2 4.6 4.6 0 0 1 0 9.2Z',
    'M12 13.3a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z',
  ],
  database: [
    'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z',
    'M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7',
    'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  ],
  scale: ['M12 4v16', 'M5 8h14', 'M5 8 2.6 14a2.7 2.7 0 0 0 4.8 0L5 8Z', 'M19 8l-2.4 6a2.7 2.7 0 0 0 4.8 0L19 8Z', 'M8 20h8'],
  money: ['M3.5 6.5h17v11h-17z', 'M12 14.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z', 'M7 6.5v11', 'M17 6.5v11'],
  shield: ['M12 3l7 3v6c0 4.2-3 6.8-7 9-4-2.2-7-4.8-7-9V6z', 'M9.4 11.8 11.4 13.8 15 10.2'],
  document: ['M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z', 'M14 3v4h4', 'M9 12h6', 'M9 16h4'],
  warning: ['M12 3.6 2.6 19.8h18.8L12 3.6Z', 'M12 9.6v4.4', 'M12 17.1h.01'],
  flag: ['M6 21V4', 'M6 5h11.5l-2.4 3.5L17.5 12H6'],
  lock: ['M7 10.5V8.2a5 5 0 0 1 10 0v2.3', 'M5.5 10.5h13v9.5h-13z', 'M12 14.2v2.6'],
  quote: ['M9.5 6.5C6.9 6.5 5 8.6 5 11.2V17.5h6.2v-6.3H8.1c0-1.4 .7-2.3 1.4-2.3Z', 'M19 6.5c-2.6 0-4.5 2.1-4.5 4.7V17.5h6.2v-6.3h-3.1c0-1.4 .7-2.3 1.4-2.3Z'],
  steps: ['M4 19.5h4.5V15H4z', 'M9.75 19.5h4.5V10.5h-4.5z', 'M15.5 19.5H20V6h-4.5z'],
};

function Icon({ name, size = 20 }: { name: GlyphName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className="shrink-0"
    >
      {GLYPH[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** The seal an officer draws when a thing is done. A stroke, not a character. */
function TickMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="m4 9.4 3.4 3.4L14 5.6" />
    </svg>
  );
}

function CrossMark({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <path d="M5.4 5.4 12.6 12.6" />
      <path d="M12.6 5.4 5.4 12.6" />
    </svg>
  );
}

/*
 * `summary` is the sentence the wizard prints above the step. `blurb` is the
 * half-line that fits under a name on the progress rail, where eight of them
 * have to be read at a glance rather than in turn.
 */
const STEPS: { slug: string; title: string; summary: string; blurb: string }[] = [
  {
    slug: 'problem',
    title: 'The problem',
    summary: 'Describe the operational problem as the people affected experience it, in parts rather than one block of text.',
    blurb: 'Who it hurts, and how often.',
  },
  {
    slug: 'baseline',
    title: 'The baseline',
    summary: 'What the problem costs today, measured. Required to clear gate 0 — without it there is nothing to improve against.',
    blurb: 'The measured cost of today.',
  },
  {
    slug: 'outcome',
    title: 'Outcome sought',
    summary: 'What you want to be true afterwards, and how you will know. Not how to build it.',
    blurb: 'What must be true afterwards.',
  },
  {
    slug: 'support',
    title: 'What the department provides',
    summary: 'Data, systems, site access and staff time — and, just as importantly, what you will not provide.',
    blurb: 'Data, systems, people and limits.',
  },
  {
    slug: 'eligibility',
    title: 'Eligibility and relaxations',
    summary: 'Which rules apply. Prior turnover and prior experience may be relaxed for a recognised startup; nothing else is.',
    blurb: 'Which rules apply, and what relaxes.',
  },
  {
    slug: 'pilot',
    title: 'Pilot and money',
    summary: 'Duration, milestones and the payment attached to each acceptance test. The arithmetic must balance exactly.',
    blurb: 'Duration, milestones and the money.',
  },
  {
    slug: 'legal',
    title: 'Legal, IP, data and cyber',
    summary: 'The clause set, the IP position, the data tier and the cybersecurity level.',
    blurb: 'Template, IP, data tier and cyber.',
  },
  {
    slug: 'review',
    title: 'Review and publish',
    summary: 'The exact page an applicant will read, watermarked as a draft, with gate 0 and gate 1 readiness beside it.',
    blurb: 'Read it as an applicant would.',
  },
];

/* ------------------------------------------------------------ the rail
 * Three states, and each one is drawn rather than only tinted: a cleared step
 * carries a stamped tick, the current step carries the saffron that means
 * "yours to act on" everywhere else in the product, and a step still to do is
 * a hairline outline. Colour alone would not survive a photocopy.
 */
type RailState = 'cleared' | 'current' | 'ahead';

const RAIL_TONE: Record<RailState, { card: string; node: string; state: string; track: string }> = {
  cleared: {
    card: 'border-l-verify from-verify-wash',
    node: 'bg-verify text-white shadow-sheet',
    state: 'text-verify',
    track: 'bg-verify',
  },
  current: {
    card: 'border-l-saffron from-hold-wash',
    node: 'bg-saffron text-ink shadow-raise',
    state: 'text-saffron-ink',
    track: 'bg-saffron',
  },
  ahead: {
    card: 'border-l-rule from-ledger',
    node: 'border border-rule bg-sheet text-ink-soft',
    state: 'text-ink-soft',
    track: 'bg-ledger',
  },
};

interface RailStep {
  slug: string;
  index: number;
  title: string;
  blurb: string;
  state: RailState;
  missingCount: number;
  blockedBy?: string;
}

function StepRail({ steps, onNavigate }: { steps: RailStep[]; onNavigate: (slug: string) => void }) {
  const cleared = steps.filter((s) => s.state === 'cleared').length;

  return (
    <nav aria-label="Challenge progress">
      <div className="sheet panel-in relative rounded-block bg-gradient-to-br from-verify-wash to-transparent px-5 py-5 shadow-raise">
        <div className="mb-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-hold-wash text-verify shadow-sheet"
            >
              <Icon name="steps" />
            </span>
            <div className="min-w-0">
              <p className="field-label flex items-center gap-2 !text-saffron-ink">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                Where you are
              </p>
              <p className="mt-1 font-display text-figure text-ink tnum">
                {cleared}
                <span className="text-body font-normal text-ink-soft"> of {steps.length} cleared</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-micro text-ink-soft">
            Eight steps, in order. You may move between them at any time — nothing is lost.
          </p>
        </div>

        {/* The rail itself: one segment per step, in the ink of that step's state. */}
        <div aria-hidden className="mb-6 flex gap-1">
          {steps.map((s) => (
            <span key={s.slug} className={['h-1.5 flex-1 rounded-pill', RAIL_TONE[s.state].track].join(' ')} />
          ))}
        </div>

        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
          {steps.map((s) => {
            const t = RAIL_TONE[s.state];
            return (
              <li key={s.slug}>
                <button
                  type="button"
                  aria-current={s.state === 'current' ? 'step' : undefined}
                  disabled={Boolean(s.blockedBy)}
                  title={s.blockedBy}
                  onClick={() => onNavigate(s.slug)}
                  className={[
                    'press flex h-full w-full items-start gap-3 rounded-sheet border border-rule border-l-2 bg-gradient-to-br to-transparent px-4 py-4 text-left shadow-sheet',
                    'disabled:cursor-not-allowed disabled:opacity-45',
                    t.card,
                  ].join(' ')}
                >
                  <span
                    aria-hidden
                    className={[
                      'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label font-semibold tnum',
                      t.node,
                    ].join(' ')}
                  >
                    {s.state === 'cleared' ? <TickMark /> : s.index}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-ink">{s.title}</span>
                    <span className="mt-0.5 block text-micro text-ink-soft">{s.blurb}</span>
                    <span className={['mt-2 block text-micro font-semibold', t.state].join(' ')}>
                      {s.blockedBy
                        ? 'Blocked'
                        : s.state === 'cleared'
                          ? 'Cleared'
                          : s.state === 'current'
                            ? s.missingCount === 0
                              ? 'You are here'
                              : `You are here — ${s.missingCount} left`
                            : `${s.missingCount} field${s.missingCount === 1 ? '' : 's'} left`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/* --------------------------------------------------------- form sections
 * A long form read as one undifferentiated column of inputs. Each part of it
 * is now a panel of its own, lit by the wash that carries its meaning, so the
 * step reads as three or four decisions rather than fourteen boxes.
 */
type SectionTone = 'plain' | 'verify' | 'hold' | 'seal';

const SECTION_TONE: Record<SectionTone, { panel: string; disc: string }> = {
  plain: { panel: 'border-l-rule from-ledger', disc: 'from-verify-wash to-hold-wash text-verify' },
  verify: { panel: 'border-l-verify from-verify-wash', disc: 'from-verify-wash to-hold-wash text-verify' },
  hold: { panel: 'border-l-hold from-hold-wash', disc: 'from-hold-wash to-verify-wash text-hold' },
  seal: { panel: 'border-l-seal from-seal-wash', disc: 'from-seal-wash to-hold-wash text-seal' },
};

function FormSection({
  glyph,
  label,
  heading,
  hint,
  tone = 'plain',
  aside,
  id,
  children,
}: {
  glyph: GlyphName;
  label: string;
  /** An existing heading element, passed through so the page outline is unchanged. */
  heading?: ReactNode;
  hint?: ReactNode;
  tone?: SectionTone;
  aside?: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  const t = SECTION_TONE[tone];
  return (
    <section
      id={id}
      className={[
        'sheet relative rounded-block border-l-2 bg-gradient-to-br to-transparent px-5 py-5 shadow-sheet md:px-6 md:py-6',
        t.panel,
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden
            className={['flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br shadow-sheet', t.disc].join(' ')}
          >
            <Icon name={glyph} />
          </span>
          <div className="min-w-0">
            <p className="field-label flex items-center gap-2 !text-saffron-ink">
              <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
              {label}
            </p>
            {heading}
            {hint ? <p className="mt-1.5 max-w-doc text-body text-ink-soft">{hint}</p> : null}
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}

/** What the detector found, said in words rather than left as a code. */
const FLAG_KIND_LABEL: Record<SolutionLanguageFlag['kind'], string> = {
  vendor_name: 'A supplier is named',
  technology_prescription: 'A technology is prescribed',
  solution_specific: 'A solution is specified',
};

type Draft = Pick<
  Challenge,
  'title' | 'sector' | 'capabilities' | 'problem' | 'baseline' | 'outcome' | 'departmentProvides' | 'eligibility' | 'pilot' | 'legal' | 'rubricId' | 'kpis'
>;

function emptyDraft(): Draft {
  return {
    title: '',
    sector: '',
    capabilities: [],
    problem: { whoAffected: '', whatHappensToday: '', frequency: '', costToday: '', currentLimitations: '' },
    baseline: { metric: '', currentValue: 0, unit: '', method: '', sourceOfTruth: '', period: '' },
    outcome: {
      statement: '',
      targetMetric: '',
      direction: 'decrease',
      magnitude: 0,
      unit: '',
      method: '',
      minimumAcceptable: 0,
      failureThreshold: 0,
    },
    departmentProvides: {
      data: '',
      dataTier: 'synthetic',
      fields: [],
      volume: '',
      accessMethod: '',
      systems: [],
      siteAccess: '',
      users: '',
      staffTimeHoursPerWeek: 4,
      willNotProvide: [],
    },
    eligibility: {
      ruleIds: ELIGIBILITY_RULES.filter((r) => r.status === 'active').map((r) => r.id),
      relaxationsAvailable: true,
      relaxationNote:
        'Prior turnover and prior experience are relaxed for recognised startups. Technical, quality, security, safety and performance requirements are not relaxed.',
    },
    pilot: {
      durationDays: 90,
      budgetPaise: 0,
      budgetHead: '',
      approvalAuthority: '',
      milestones: [],
    },
    legal: {
      templateId: 'TPL-AGR-01',
      ipPosition: 'startup_retains',
      ipClauseIds: ['CL-IP-01', 'CL-IP-02'],
      dataClauseIds: ['CL-DATA-01', 'CL-DATA-02'],
      cyberLevel: 'standard',
      legalPreClearance: false,
      legalPreClearanceNote: '',
    },
    rubricId: RUBRICS[0]!.id,
    kpis: [],
  };
}

export default function ChallengeStudio() {
  const { step: stepParam = 'problem' } = useParams();
  const known = STEPS.some((s) => s.slug === stepParam);
  const step = known ? stepParam : 'problem';
  const navigate = useNavigate();
  const session = useSession();
  const create = useCreateChallenge();
  const publish = usePublishChallenge();
  const pushToast = useUi((s) => s.pushToast);
  const existing = useChallenges({ scope: 'department', status: ['draft'] });

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [flags, setFlags] = useState<SolutionLanguageFlag[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (challengeId) return;
    track({ name: 'challenge_draft_started', challengeId: 'pending' });
  }, [challengeId]);

  // A step that is not one of the eight would otherwise render the first step
  // under an address that does not describe it. Correct the address instead.
  useEffect(() => {
    if (!known) navigate('/d/challenges/new/problem', { replace: true });
  }, [known, navigate]);

  const patch = (fn: (d: Draft) => Draft): void => setDraft((d) => fn(structuredClone(d)));

  const milestoneTotal = draft.pilot.milestones.reduce((s, m) => s + m.paymentPaise, 0);
  const budgetDifference = draft.pilot.budgetPaise - milestoneTotal;

  const missing = useMemo<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    m.problem = [
      !draft.title && 'A title an applicant would recognise',
      !draft.sector && 'The sector this sits in',
      draft.problem.whoAffected.length < 30 && 'Who is affected, and roughly how many',
      draft.problem.whatHappensToday.length < 40 && 'What happens today, end to end',
      !draft.problem.frequency && 'How often it happens',
      draft.problem.costToday.length < 20 && 'What it costs today',
      draft.problem.currentLimitations.length < 20 && 'Why it has not been solved',
    ].filter((x): x is string => Boolean(x));

    m.baseline = [
      !draft.baseline.metric && 'The metric you will measure',
      draft.baseline.currentValue <= 0 && 'The current value',
      !draft.baseline.unit && 'The unit',
      draft.baseline.method.length < 30 && 'How it was measured',
      !draft.baseline.sourceOfTruth && 'The source of truth',
      !draft.baseline.period && 'The measurement period',
    ].filter((x): x is string => Boolean(x));

    m.outcome = [
      draft.outcome.statement.length < 30 && 'The outcome, in a sentence',
      !draft.outcome.targetMetric && 'The target metric',
      draft.outcome.magnitude === 0 && 'The target value',
      draft.outcome.method.length < 30 && 'How the outcome will be measured',
      draft.outcome.minimumAcceptable === 0 && 'The minimum acceptable improvement',
      draft.outcome.failureThreshold === 0 && 'The failure threshold',
      flags.some((f) => f.status === 'open') && 'Resolve the solution language flags',
    ].filter((x): x is string => Boolean(x));

    m.support = [
      draft.departmentProvides.data.length < 20 && 'What data is shared',
      draft.departmentProvides.fields.length === 0 && 'The field list',
      !draft.departmentProvides.volume && 'Roughly how much data',
      !draft.departmentProvides.accessMethod && 'How applicants reach it',
      draft.departmentProvides.systems.length === 0 && 'The systems involved',
      !draft.departmentProvides.siteAccess && 'What site access is available',
      !draft.departmentProvides.users && 'Who from the department is available',
      draft.departmentProvides.willNotProvide.length === 0 && 'At least one thing you will not provide',
    ].filter((x): x is string => Boolean(x));

    m.eligibility = [draft.eligibility.ruleIds.length === 0 && 'At least one eligibility rule'].filter(
      (x): x is string => Boolean(x),
    );

    m.pilot = [
      draft.pilot.budgetPaise <= 0 && 'The pilot budget',
      !draft.pilot.budgetHead && 'The budget head',
      !draft.pilot.approvalAuthority && 'The approving authority',
      draft.pilot.milestones.length === 0 && 'At least one milestone',
      draft.pilot.milestones.some((x) => x.acceptanceTest.length < 20) && 'An acceptance test on every milestone',
      budgetDifference !== 0 && `Milestone payments are out by ${money(Math.abs(budgetDifference))}`,
    ].filter((x): x is string => Boolean(x));

    m.legal = [
      !draft.legal.templateId && 'A pilot agreement template',
      !draft.legal.legalPreClearance && 'Legal pre-clearance — required to clear gate 0',
    ].filter((x): x is string => Boolean(x));

    m.review = [];
    return m;
  }, [draft, flags, budgetDifference]);

  const steps: WizardStep[] = STEPS.map((s, i) => ({
    index: i + 1,
    slug: s.slug,
    title: s.title,
    summary: s.summary,
    missing: missing[s.slug] ?? [],
    blockedBy:
      s.slug === 'review' && (missing.problem?.length ?? 0) > 0
        ? 'Complete the problem step first — the review renders the public page.'
        : undefined,
  }));

  // The rail carries the same eight steps, said as states rather than as counts.
  const railSteps: RailStep[] = steps.map((s, i) => ({
    slug: s.slug,
    index: s.index,
    title: s.title,
    blurb: STEPS[i]!.blurb,
    missingCount: s.missing.length,
    blockedBy: s.blockedBy,
    state: s.slug === step ? 'current' : s.missing.length === 0 ? 'cleared' : 'ahead',
  }));
  const clearedCount = steps.filter((s) => s.missing.length === 0).length;

  const openFlags = flags.filter((f) => f.status === 'open');

  const g0 = GATES[0]!.preconditions.map((p) => ({
    ...p,
    pass:
      p.key === 'baseline'
        ? draft.baseline.currentValue > 0 && draft.baseline.method.length >= 30
        : p.key === 'budget'
          ? draft.pilot.budgetPaise > 0 && Boolean(draft.pilot.budgetHead)
          : p.key === 'outcomeKpi'
            ? draft.outcome.magnitude !== 0 && draft.outcome.failureThreshold !== 0
            : draft.legal.legalPreClearance,
    step:
      p.key === 'baseline' ? 'baseline' : p.key === 'budget' ? 'pilot' : p.key === 'outcomeKpi' ? 'outcome' : 'legal',
  }));

  const g1 = GATES[1]!.preconditions.map((p) => ({
    ...p,
    pass:
      p.key === 'noVendorNaming'
        ? !flags.some((f) => f.status === 'open')
        : p.key === 'ipWithinDefault'
          ? draft.legal.ipPosition === 'startup_retains'
          : Boolean(draft.legal.templateId),
    step: p.key === 'noVendorNaming' ? 'outcome' : 'legal',
  }));

  const readyToPublish = g0.every((p) => p.pass) && g1.every((p) => p.pass) && budgetDifference === 0;

  async function ensureSaved(): Promise<string | null> {
    setSaveState('saving');
    setSaveError(undefined);
    try {
      if (!challengeId) {
        const res = await create.mutateAsync(draft as Partial<Challenge>);
        setChallengeId(res.data.id);
        setCaseId(res.data.caseId);
        setSaveState('saved');
        setSavedAt(res.servedAt);
        track({ name: 'challenge_draft_started', challengeId: res.data.id });
        return res.data.id;
      }
      const res = await api.patch<Challenge>(`/api/challenges/${challengeId}`, draft);
      setFlags(res.data.languageFlags);
      setSaveState('saved');
      setSavedAt(res.servedAt);
      return challengeId;
    } catch (err) {
      setSaveState('failed');
      setSaveError(
        err instanceof PrayogApiError
          ? `${err.message}${err.details.length ? ` ${err.details.join(' ')}` : ''}`
          : 'The service did not respond.',
      );
      return null;
    }
  }

  async function runLanguageCheck(): Promise<void> {
    const id = await ensureSaved();
    if (!id) return;
    const res = await api.post<SolutionLanguageFlag[]>(`/api/challenges/${id}/language-check`);
    setFlags(res.data);
    res.data
      .filter((f) => f.status === 'open')
      .forEach((f) => track({ name: 'solution_language_flag_shown', challengeId: id, flagId: f.id, kind: f.kind }));
  }

  const resolveFlag = useResolveLanguageFlag(challengeId ?? undefined);

  function goto(slug: string): void {
    const previous = STEPS.findIndex((s) => s.slug === step);
    if (previous >= 0) {
      track({ name: 'challenge_step_completed', challengeId: challengeId ?? 'draft', step: previous + 1, stepName: step });
    }
    void ensureSaved();
    navigate(`/d/challenges/new/${slug}`);
  }

  if (session.isPending) return <PanelSkeleton lines={8} />;

  return (
    <div>
      <PageHeader
        eyebrow="Create a challenge"
        title="Challenge studio"
        lead="Eight steps that turn an operational problem into something a startup can be paid to solve — and that will survive an audit."
        aside={
          <>
            <span className="inline-flex items-center gap-2 rounded-pill border border-deep-rule bg-deep-2 px-4 py-1.5 text-micro text-deep-dim">
              <Icon name="steps" size={14} />
              {clearedCount} of {STEPS.length} steps cleared
            </span>
            {existing.data && existing.data.data.length > 0 ? (
              <Button
                size="sm"
                onClick={() => {
                  const clone = existing.data!.data[0]!;
                  setDraft({
                    title: `${clone.title} — adapted`,
                    sector: clone.sector,
                    capabilities: clone.capabilities,
                    problem: clone.problem,
                    baseline: clone.baseline,
                    outcome: clone.outcome,
                    departmentProvides: clone.departmentProvides,
                    eligibility: clone.eligibility,
                    pilot: clone.pilot,
                    legal: clone.legal,
                    rubricId: clone.rubricId,
                    kpis: clone.kpis,
                  });
                  pushToast('verify', `Started from ${clone.caseId}. The baseline still has to be your own.`);
                }}
              >
                Start from an existing draft
              </Button>
            ) : null}
          </>
        }
      />


      <WizardShell
        title="New challenge"
        caseId={caseId ?? undefined}
        steps={steps}
        currentSlug={step}
        onNavigate={goto}
        onSaveDraft={() => void ensureSaved()}
        saveState={saveState}
        savedAt={savedAt}
        saveError={saveError}
        onRetrySave={() => void ensureSaved()}
        onExit={() => navigate('/d/challenges')}
        rail={<StepRail steps={railSteps} onNavigate={goto} />}
        footer={
          step === 'review' ? (
            <Button
              tone="primary"
              unavailableReason={
                readyToPublish ? undefined : 'Some steps are still incomplete. The review step lists what is missing.'
              }
              loading={publish.isPending}
              loadingLabel="Publishing"
              onClick={async () => {
                const id = await ensureSaved();
                if (!id) return;
                publish.mutate(id, {
                  onSuccess: (res) => {
                    track({
                      name: 'challenge_published',
                      challengeId: id,
                      caseId: res.data.caseId,
                      budgetPaise: res.data.pilot.budgetPaise,
                    });
                    pushToast('verify', res.message ?? 'Challenge published.');
                    navigate(`/d/challenges/${id}`);
                  },
                  onError: (err) => {
                    const api2 = err instanceof PrayogApiError ? err : null;
                    pushToast('seal', api2?.message ?? 'Could not publish.', api2?.details.join(' '));
                  },
                });
              }}
            >
              Publish challenge
            </Button>
          ) : undefined
        }
      >
        {step === 'problem' ? (
          <div className="flex flex-col gap-6">
            <FormSection
              glyph="form"
              label="Name and sector"
              hint="An applicant searches for the problem, not for your solution to it. Name the problem."
              tone="verify"
            >
              <Field label="Challenge title" required hint="Name the problem, not the solution.">
                {({ id }) => (
                  <Input
                    id={id}
                    value={draft.title}
                    onChange={(e) => patch((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Smart water leakage detection"
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Sector" required>
                  {({ id }) => (
                    <Select
                      id={id}
                      placeholder="Choose a sector"
                      value={draft.sector}
                      onChange={(e) => patch((d) => ({ ...d, sector: e.target.value }))}
                      options={SECTORS.map((s) => ({ value: s, label: s }))}
                    />
                  )}
                </Field>
                <Field
                  label="Capabilities this is likely to need"
                  hint="Used for matching. It does not restrict who may apply."
                >
                  {({ id }) => (
                    <MultiSelectTags
                      id={id}
                      values={draft.capabilities}
                      onChange={(v) => patch((d) => ({ ...d, capabilities: v }))}
                      options={[...CAPABILITIES]}
                      placeholder="Add a capability"
                    />
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection
              glyph="people"
              label="Who it happens to"
              hint="The people affected, then the process end to end — including the point at which it fails."
            >
              <Field label="Who is affected" required hint="Name the people, and roughly how many. Avoid the phrase the department.">
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    value={draft.problem.whoAffected}
                    onChange={(e) => patch((d) => ({ ...d, problem: { ...d.problem, whoAffected: e.target.value } }))}
                  />
                )}
              </Field>

              <Field label="What happens today" required hint="The current process end to end, including the point at which it fails.">
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={4}
                    value={draft.problem.whatHappensToday}
                    onChange={(e) => patch((d) => ({ ...d, problem: { ...d.problem, whatHappensToday: e.target.value } }))}
                  />
                )}
              </Field>
            </FormSection>

            <FormSection
              glyph="gauge"
              label="How often, and what it costs"
              hint="A number here is what makes the baseline step possible later."
              tone="hold"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="How often" required hint="A number beats a word.">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.problem.frequency}
                      onChange={(e) => patch((d) => ({ ...d, problem: { ...d.problem, frequency: e.target.value } }))}
                      placeholder="About 190 reported leaks a month"
                    />
                  )}
                </Field>
                <Field label="What it costs today" required hint="Money, time or harm. If it has never been measured, say so.">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.problem.costToday}
                      onChange={(e) => patch((d) => ({ ...d, problem: { ...d.problem, costToday: e.target.value } }))}
                    />
                  )}
                </Field>
              </div>

              <Field label="Why it has not been solved" required>
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    value={draft.problem.currentLimitations}
                    onChange={(e) =>
                      patch((d) => ({ ...d, problem: { ...d.problem, currentLimitations: e.target.value } }))
                    }
                  />
                )}
              </Field>
            </FormSection>
          </div>
        ) : null}

        {step === 'baseline' ? (
          <div className="flex flex-col gap-6">
            <InlineNote tone="hold" title="Required to clear gate 0">
              A challenge with no baseline cannot be validated later, because there is nothing to compare the pilot
              against. The measurement method has to be repeatable by someone who was not there.
            </InlineNote>

            <FormSection
              glyph="gauge"
              label="The figure you will be judged against"
              hint="One metric, one number, one unit. Everything downstream compares against this."
              tone="verify"
            >
              <Field label="Metric" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={draft.baseline.metric}
                    onChange={(e) => patch((d) => ({ ...d, baseline: { ...d.baseline, metric: e.target.value } }))}
                    placeholder="Average time from leak occurrence to field crew locating it"
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Current value" required>
                  {({ id }) => (
                    <NumberInput
                      id={id}
                      value={draft.baseline.currentValue || ''}
                      onChange={(e) =>
                        patch((d) => ({ ...d, baseline: { ...d.baseline, currentValue: Number(e.target.value) } }))
                      }
                    />
                  )}
                </Field>
                <Field label="Unit" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.baseline.unit}
                      onChange={(e) =>
                        patch((d) => ({
                          ...d,
                          baseline: { ...d.baseline, unit: e.target.value },
                          outcome: { ...d.outcome, unit: e.target.value },
                        }))
                      }
                      placeholder="minutes"
                    />
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection
              glyph="document"
              label="How the figure was arrived at"
              hint="A validator who was not in the room has to be able to repeat this, from the same register, for the same period."
            >
              <Field label="How it was measured" required hint="Precise enough for a validator to repeat it.">
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    value={draft.baseline.method}
                    onChange={(e) =>
                      patch((d) => ({
                        ...d,
                        baseline: { ...d.baseline, method: e.target.value },
                        outcome: { ...d.outcome, method: e.target.value },
                      }))
                    }
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Source of truth" required hint="The register or system the figure came from.">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.baseline.sourceOfTruth}
                      onChange={(e) =>
                        patch((d) => ({ ...d, baseline: { ...d.baseline, sourceOfTruth: e.target.value } }))
                      }
                    />
                  )}
                </Field>
                <Field label="Measurement period" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.baseline.period}
                      onChange={(e) => patch((d) => ({ ...d, baseline: { ...d.baseline, period: e.target.value } }))}
                      placeholder="12 weeks ending 31 January 2026"
                    />
                  )}
                </Field>
              </div>
            </FormSection>
          </div>
        ) : null}

        {step === 'outcome' ? (
          <div className="flex flex-col gap-6">
            {/*
              The detector's finding used to sit at the foot of a long step where
              nobody scrolled to it. It now announces itself at the head of the
              step and points at itself.
            */}
            {openFlags.length > 0 ? (
              <div className="relative rounded-block border border-seal border-l-2 border-l-seal bg-gradient-to-br from-seal-wash to-transparent px-5 py-4 shadow-raise">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span
                    aria-hidden
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seal text-white shadow-sheet"
                  >
                    <Icon name="warning" size={17} />
                  </span>
                  <p className="min-w-0 text-body text-ink">
                    <span className="font-semibold text-seal">
                      {openFlags.length} phrase{openFlags.length === 1 ? '' : 's'} flagged before publication.
                    </span>{' '}
                    An unresolved flag blocks gate 1.
                  </p>
                  <a
                    href="#solution-language-check"
                    className="ml-auto shrink-0 text-label font-semibold text-ink underline underline-offset-4"
                  >
                    Go to the flagged phrases
                  </a>
                </div>
              </div>
            ) : null}

            <FormSection
              glyph="target"
              label="The outcome"
              hint="What should be true afterwards. This is the sentence the language check reads hardest."
              tone="verify"
            >
              <Field
                label="The outcome, in a sentence"
                required
                hint="What should be true afterwards. Do not name a technology or a supplier."
              >
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    value={draft.outcome.statement}
                    onChange={(e) => patch((d) => ({ ...d, outcome: { ...d.outcome, statement: e.target.value } }))}
                  />
                )}
              </Field>
            </FormSection>

            <FormSection
              glyph="gauge"
              label="The numbers behind it"
              hint="A target, a floor worth paying for, and the point at which the pilot has failed."
              tone="hold"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Target metric" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.outcome.targetMetric}
                      onChange={(e) => patch((d) => ({ ...d, outcome: { ...d.outcome, targetMetric: e.target.value } }))}
                    />
                  )}
                </Field>
                <Field label="Direction" required>
                  {({ id }) => (
                    <Select
                      id={id}
                      value={draft.outcome.direction}
                      onChange={(e) =>
                        patch((d) => ({
                          ...d,
                          outcome: { ...d.outcome, direction: e.target.value as 'decrease' | 'increase' },
                        }))
                      }
                      options={[
                        { value: 'decrease', label: 'Reduce it' },
                        { value: 'increase', label: 'Raise it' },
                      ]}
                    />
                  )}
                </Field>
                <Field
                  label="Target value"
                  required
                  aside={draft.baseline.currentValue ? `baseline ${num(draft.baseline.currentValue, 1)}` : undefined}
                >
                  {({ id }) => (
                    <NumberInput
                      id={id}
                      value={draft.outcome.magnitude || ''}
                      onChange={(e) => patch((d) => ({ ...d, outcome: { ...d.outcome, magnitude: Number(e.target.value) } }))}
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="Minimum acceptable improvement"
                  required
                  hint="Below the target, but still worth paying for."
                >
                  {({ id }) => (
                    <NumberInput
                      id={id}
                      value={draft.outcome.minimumAcceptable || ''}
                      onChange={(e) =>
                        patch((d) => ({ ...d, outcome: { ...d.outcome, minimumAcceptable: Number(e.target.value) } }))
                      }
                    />
                  )}
                </Field>
                <Field label="Failure threshold" required hint="At or beyond this, the pilot has not achieved its outcome.">
                  {({ id }) => (
                    <NumberInput
                      id={id}
                      value={draft.outcome.failureThreshold || ''}
                      onChange={(e) =>
                        patch((d) => ({ ...d, outcome: { ...d.outcome, failureThreshold: Number(e.target.value) } }))
                      }
                    />
                  )}
                </Field>
              </div>

              <Field label="How the outcome will be measured" required hint="It must match the baseline method exactly.">
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    value={draft.outcome.method}
                    onChange={(e) => patch((d) => ({ ...d, outcome: { ...d.outcome, method: e.target.value } }))}
                  />
                )}
              </Field>
            </FormSection>

            {/* Solution language checker. Never auto-applies. */}
            <FormSection
              id="solution-language-check"
              glyph="warning"
              label="Before publication"
              heading={<h3 className="mt-1 font-display text-h3 text-ink">Solution language check</h3>}
              hint="Looks for vendor names, prescribed technology and instructions about how to build. Gate 1 requires an outcome, not a specification."
              tone={openFlags.length > 0 ? 'seal' : flags.length > 0 ? 'verify' : 'plain'}
              aside={
                <Button tone={openFlags.length > 0 ? 'secondary' : 'primary'} onClick={() => void runLanguageCheck()}>
                  Run the check
                </Button>
              }
            >
              {flags.length === 0 ? (
                <p className="rounded-sheet border border-rule border-l-2 border-l-rule bg-gradient-to-r from-ledger to-transparent px-5 py-4 text-body text-ink-soft">
                  Nothing checked yet. Run the check before you leave this step — an unresolved flag blocks gate 1.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {flags.map((f) => {
                    const open = f.status === 'open';
                    return (
                      <li key={f.id}>
                        <div
                          className={[
                            'relative rounded-block border border-l-2 bg-gradient-to-br to-transparent px-5 py-5 shadow-sheet',
                            open ? 'border-seal border-l-seal from-seal-wash' : 'border-rule border-l-verify from-verify-wash',
                          ].join(' ')}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <span
                                aria-hidden
                                className={[
                                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sheet shadow-sheet',
                                  open ? 'bg-seal text-white' : 'bg-verify text-white',
                                ].join(' ')}
                              >
                                {open ? <Icon name="warning" size={19} /> : <TickMark size={17} />}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge tone={open ? 'seal' : 'verify'}>
                                    {open ? 'Potential issue' : f.status === 'accepted' ? 'Rewritten' : 'Edited by hand'}
                                  </Badge>
                                  {open ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-seal px-2.5 py-0.5 text-micro font-semibold text-seal">
                                      {FLAG_KIND_LABEL[f.kind]}
                                    </span>
                                  ) : null}
                                  <span className="text-micro text-ink-soft">{f.section}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* The phrase itself, set as a quotation, because that is the
                              one thing the writer has to look at again. */}
                          <figure className="mt-5">
                            <p className="field-label mb-2">The phrase that was flagged</p>
                            <blockquote
                              className={[
                                'flex items-start gap-3 rounded-sheet border-l-2 px-4 py-3.5',
                                open ? 'border-l-seal bg-seal-wash' : 'border-l-verify bg-verify-wash',
                              ].join(' ')}
                            >
                              <span aria-hidden className={open ? 'text-seal' : 'text-verify'}>
                                <Icon name="quote" size={18} />
                              </span>
                              <span className="min-w-0 font-doc text-doc text-ink">{f.matchedText}</span>
                            </blockquote>
                            <figcaption className="mt-2 max-w-doc text-body text-ink">
                              This challenge uses <span className="font-medium">“{f.matchedText}”</span> in{' '}
                              {f.section.toLowerCase()}.
                            </figcaption>
                          </figure>

                          <p className="mt-3 max-w-doc text-body text-ink-soft">
                            <span className="text-ink">Why this matters:</span> {f.why}
                          </p>

                          {open ? (
                            <div className="mt-5 rounded-sheet border border-rule border-l-2 border-l-verify bg-gradient-to-r from-verify-wash to-transparent px-4 py-4">
                              <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                                What to do about it
                              </p>
                              <p className="mt-3 text-label text-ink-soft">Suggested rewrite</p>
                              <p className="mt-1 rounded-control border-l-2 border-l-verify bg-ledger px-3 py-2 font-doc text-doc text-ink">
                                {f.suggestion}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <Button
                                  size="sm"
                                  tone="primary"
                                  onClick={() => {
                                    if (f.fieldPath === 'outcome.statement') {
                                      patch((d) => ({ ...d, outcome: { ...d.outcome, statement: f.suggestion } }));
                                    }
                                    resolveFlag.mutate(
                                      { flagId: f.id, status: 'accepted', replacementText: f.suggestion },
                                      {
                                        onSuccess: (res) => {
                                          setFlags(res.data);
                                          track({
                                            name: 'solution_language_flag_accepted',
                                            challengeId: challengeId ?? 'draft',
                                            flagId: f.id,
                                          });
                                        },
                                      },
                                    );
                                  }}
                                >
                                  Accept the rewrite
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    resolveFlag.mutate(
                                      { flagId: f.id, status: 'edited' },
                                      {
                                        onSuccess: (res) => {
                                          setFlags(res.data);
                                          track({
                                            name: 'solution_language_flag_edited',
                                            challengeId: challengeId ?? 'draft',
                                            flagId: f.id,
                                          });
                                        },
                                      },
                                    );
                                  }}
                                >
                                  I will edit it myself
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </FormSection>
          </div>
        ) : null}

        {step === 'support' ? (
          <div className="flex flex-col gap-6">
            <FormSection
              glyph="database"
              label="What you hand over"
              hint="The records an applicant may touch, at which tier, and field by field."
              tone="verify"
            >
              <Field label="What data the department will share" required>
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    value={draft.departmentProvides.data}
                    onChange={(e) =>
                      patch((d) => ({ ...d, departmentProvides: { ...d.departmentProvides, data: e.target.value } }))
                    }
                  />
                )}
              </Field>

              <DataTierSelector
                value={draft.departmentProvides.dataTier}
                onChange={(tier) =>
                  patch((d) => ({ ...d, departmentProvides: { ...d.departmentProvides, dataTier: tier } }))
                }
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Fields shared" required hint="Field-level detail is a data-clause requirement.">
                  {({ id }) => (
                    <MultiSelectTags
                      id={id}
                      values={draft.departmentProvides.fields}
                      onChange={(v) =>
                        patch((d) => ({ ...d, departmentProvides: { ...d.departmentProvides, fields: v } }))
                      }
                      options={['Timestamp', 'Location identifier', 'Reading value', 'Operator identifier', 'Status code', 'Ward code', 'Asset identifier']}
                      placeholder="Add a field"
                    />
                  )}
                </Field>
                <Field label="Systems involved" required hint="Describe by capability, not by product name.">
                  {({ id }) => (
                    <MultiSelectTags
                      id={id}
                      values={draft.departmentProvides.systems}
                      onChange={(v) =>
                        patch((d) => ({ ...d, departmentProvides: { ...d.departmentProvides, systems: v } }))
                      }
                      options={[
                        'Supervisory control system historian',
                        'Complaint register',
                        'Geographic information system',
                        'Finance and accounts system',
                        'Field workforce application',
                      ]}
                      placeholder="Add a system"
                    />
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection
              glyph="people"
              label="Access, sites and people"
              hint="How much there is, how an applicant reaches it, and whose time they may have."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Volume" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.departmentProvides.volume}
                      onChange={(e) =>
                        patch((d) => ({ ...d, departmentProvides: { ...d.departmentProvides, volume: e.target.value } }))
                      }
                      placeholder="About 12 lakh rows for the year"
                    />
                  )}
                </Field>
                <Field label="Access method" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.departmentProvides.accessMethod}
                      onChange={(e) =>
                        patch((d) => ({
                          ...d,
                          departmentProvides: { ...d.departmentProvides, accessMethod: e.target.value },
                        }))
                      }
                      placeholder="Read-only inside the sandbox, no export"
                    />
                  )}
                </Field>
                <Field label="Staff time available" required aside="hours a week">
                  {({ id }) => (
                    <NumberInput
                      id={id}
                      value={draft.departmentProvides.staffTimeHoursPerWeek}
                      onChange={(e) =>
                        patch((d) => ({
                          ...d,
                          departmentProvides: {
                            ...d.departmentProvides,
                            staffTimeHoursPerWeek: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Site access" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.departmentProvides.siteAccess}
                      onChange={(e) =>
                        patch((d) => ({
                          ...d,
                          departmentProvides: { ...d.departmentProvides, siteAccess: e.target.value },
                        }))
                      }
                    />
                  )}
                </Field>
                <Field label="Who from the department is available" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.departmentProvides.users}
                      onChange={(e) =>
                        patch((d) => ({ ...d, departmentProvides: { ...d.departmentProvides, users: e.target.value } }))
                      }
                    />
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection
              glyph="lock"
              label="The limits, stated up front"
              hint="Stating this plainly is what stops a pilot stalling in week three."
              tone="hold"
            >
              <Field
                label="What the department will not provide"
                required
                hint="Stating this plainly is what stops a pilot stalling in week three."
              >
                {({ id }) => (
                  <MultiSelectTags
                    id={id}
                    values={draft.departmentProvides.willNotProvide}
                    onChange={(v) =>
                      patch((d) => ({ ...d, departmentProvides: { ...d.departmentProvides, willNotProvide: v } }))
                    }
                    options={[
                      'Personal data of citizens beyond the fields listed',
                      'Network credentials outside the sandbox',
                      'Hardware, power or connectivity at pilot sites',
                      'Staff to operate the solution during the pilot',
                      'Storage or workspace at site',
                    ]}
                    placeholder="Add something you will not provide"
                  />
                )}
              </Field>
            </FormSection>
          </div>
        ) : null}

        {step === 'eligibility' ? (
          <div className="flex flex-col gap-6">
            <RelaxationNotice />

            <FormSection
              glyph="scale"
              label="Rules applied to this challenge"
              hint="Every rule you keep is published with the challenge and screened against automatically."
              tone="verify"
            >
              <ul className="sheet-flat rounded-sheet">
                {ELIGIBILITY_RULES.map((r) => {
                  const on = draft.eligibility.ruleIds.includes(r.id);
                  return (
                    <li key={r.id} className={['ledger-row px-5 py-4', on ? 'bg-verify-wash' : ''].join(' ')}>
                      <div className="flex items-start justify-between gap-4">
                        <Checkbox
                          checked={on}
                          disabled={r.status === 'deprecated'}
                          onChange={(v) =>
                            patch((d) => ({
                              ...d,
                              eligibility: {
                                ...d.eligibility,
                                ruleIds: v
                                  ? [...d.eligibility.ruleIds, r.id]
                                  : d.eligibility.ruleIds.filter((x) => x !== r.id),
                              },
                            }))
                          }
                          label={r.label}
                          detail={`${r.explanation} — ${citationShort(r.citation)}, rule ${r.id} v${r.version}`}
                        />
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <Badge tone={r.relief === 'relaxable' ? 'verify' : 'neutral'}>
                            {r.relief === 'relaxable' ? 'May be relaxed' : 'Not relaxed'}
                          </Badge>
                          {r.status === 'deprecated' ? <Badge tone="seal">Deprecated</Badge> : null}
                        </div>
                      </div>
                      {r.status === 'deprecated' && r.deprecatedNote ? (
                        <p className="mt-2 text-micro text-ink-soft">{r.deprecatedNote}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </FormSection>

            <FormSection
              glyph="document"
              label="Published with the challenge"
              hint="Both of these are read by every applicant, and the rubric is used unchanged after the window closes."
            >
              <Field label="Relaxation note published with the challenge" required>
                {({ id }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    value={draft.eligibility.relaxationNote}
                    onChange={(e) =>
                      patch((d) => ({ ...d, eligibility: { ...d.eligibility, relaxationNote: e.target.value } }))
                    }
                  />
                )}
              </Field>

              <Field label="Evaluation rubric" required hint="Published with the challenge and used unchanged afterwards.">
                {({ id }) => (
                  <Select
                    id={id}
                    value={draft.rubricId}
                    onChange={(e) => patch((d) => ({ ...d, rubricId: e.target.value }))}
                    options={RUBRICS.map((r) => ({ value: r.id, label: `${r.label} ${r.version} — ${r.appliesTo}` }))}
                  />
                )}
              </Field>
            </FormSection>
          </div>
        ) : null}

        {step === 'pilot' ? (
          <div className="flex flex-col gap-6">
            <FormSection
              glyph="money"
              label="Budget and authority"
              hint="The head the money comes from, and the officer whose delegated power covers it."
              tone="verify"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Pilot duration" required aside="days">
                  {({ id }) => (
                    <NumberInput
                      id={id}
                      value={draft.pilot.durationDays}
                      onChange={(e) => patch((d) => ({ ...d, pilot: { ...d.pilot, durationDays: Number(e.target.value) } }))}
                    />
                  )}
                </Field>
                <Field label="Pilot budget" required>
                  {({ id, describedBy }) => (
                    <MoneyInput
                      id={id}
                      describedBy={describedBy}
                      valuePaise={draft.pilot.budgetPaise}
                      onChangePaise={(p) => patch((d) => ({ ...d, pilot: { ...d.pilot, budgetPaise: p } }))}
                    />
                  )}
                </Field>
                <Field label="Budget head" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.pilot.budgetHead}
                      onChange={(e) => patch((d) => ({ ...d, pilot: { ...d.pilot, budgetHead: e.target.value } }))}
                    />
                  )}
                </Field>
              </div>

              <Field label="Approving authority" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={draft.pilot.approvalAuthority}
                    onChange={(e) => patch((d) => ({ ...d, pilot: { ...d.pilot, approvalAuthority: e.target.value } }))}
                    placeholder="Commissioner, within delegated financial powers"
                  />
                )}
              </Field>
            </FormSection>

            <FormSection
              glyph="flag"
              label="Payment schedule"
              heading={<h3 className="mt-1 font-display text-h3 text-ink">Milestones</h3>}
              hint="Every rupee needs an acceptance test attached to it, and the total has to match the budget exactly."
              tone="hold"
              aside={
                <Button
                  size="sm"
                  onClick={() =>
                    patch((d) => ({
                      ...d,
                      pilot: {
                        ...d.pilot,
                        milestones: [
                          ...d.pilot.milestones,
                          {
                            id: `M${d.pilot.milestones.length + 1}`,
                            index: d.pilot.milestones.length + 1,
                            name: '',
                            requirement: '',
                            acceptanceTest: '',
                            evidenceRequired: [],
                            paymentPaise: 0,
                            dueDayOffset: Math.round(
                              (d.pilot.durationDays / (d.pilot.milestones.length + 1)) * (d.pilot.milestones.length + 1),
                            ),
                          },
                        ],
                      },
                    }))
                  }
                >
                  Add a milestone
                </Button>
              }
            >
              {draft.pilot.milestones.length === 0 ? (
                <InlineNote tone="hold" title="No milestones yet">
                  Every rupee needs an acceptance test attached to it. Add at least one milestone.
                </InlineNote>
              ) : (
                <ol className="flex flex-col gap-4">
                  {draft.pilot.milestones.map((m, i) => (
                    <li
                      key={m.id}
                      className="sheet relative rounded-block border-l-2 border-l-verify bg-gradient-to-br from-verify-wash to-transparent px-5 py-5 shadow-sheet"
                    >
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-3 text-label text-ink">
                          <span
                            aria-hidden
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-verify text-label font-semibold text-white shadow-sheet tnum"
                          >
                            {i + 1}
                          </span>
                          Milestone {i + 1}
                        </p>
                        <Button
                          size="sm"
                          tone="destructive"
                          onClick={() =>
                            patch((d) => ({
                              ...d,
                              pilot: { ...d.pilot, milestones: d.pilot.milestones.filter((_, j) => j !== i) },
                            }))
                          }
                        >
                          Remove this milestone
                        </Button>
                      </div>
                      <div className="flex flex-col gap-5">
                        <Field label="Name" required hint="Name it by its result, not its activity.">
                          {({ id }) => (
                            <Input
                              id={id}
                              value={m.name}
                              onChange={(e) =>
                                patch((d) => {
                                  d.pilot.milestones[i]!.name = e.target.value;
                                  return d;
                                })
                              }
                            />
                          )}
                        </Field>
                        <Field label="Acceptance test" required hint="A test a third party could apply.">
                          {({ id }) => (
                            <Textarea
                              id={id}
                              rows={2}
                              value={m.acceptanceTest}
                              onChange={(e) =>
                                patch((d) => {
                                  d.pilot.milestones[i]!.acceptanceTest = e.target.value;
                                  return d;
                                })
                              }
                            />
                          )}
                        </Field>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                          <Field label="Evidence required" required>
                            {({ id }) => (
                              <MultiSelectTags
                                id={id}
                                values={m.evidenceRequired}
                                onChange={(v) =>
                                  patch((d) => {
                                    d.pilot.milestones[i]!.evidenceRequired = v;
                                    return d;
                                  })
                                }
                                options={[
                                  'Installation report',
                                  'Calibration record',
                                  'Integration test log',
                                  'Measurement dataset',
                                  'Data quality note',
                                  'Field test report',
                                  'Handover note',
                                  'Training attendance record',
                                ]}
                                placeholder="Add evidence"
                              />
                            )}
                          </Field>
                          <Field label="Due on day" required>
                            {({ id }) => (
                              <NumberInput
                                id={id}
                                value={m.dueDayOffset}
                                onChange={(e) =>
                                  patch((d) => {
                                    d.pilot.milestones[i]!.dueDayOffset = Number(e.target.value);
                                    return d;
                                  })
                                }
                              />
                            )}
                          </Field>
                          <Field label="Payment" required>
                            {({ id }) => (
                              <MoneyInput
                                id={id}
                                valuePaise={m.paymentPaise}
                                onChangePaise={(p) =>
                                  patch((d) => {
                                    d.pilot.milestones[i]!.paymentPaise = p;
                                    return d;
                                  })
                                }
                              />
                            )}
                          </Field>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </FormSection>

            {/* Live arithmetic. Gate readiness is blocked while it does not balance. */}
            <StatLedger
              title="Arithmetic"
              rows={[
                ...draft.pilot.milestones.map((m, i) => ({
                  label: `Milestone ${i + 1}${m.name ? ` — ${m.name}` : ''}`,
                  value: money(m.paymentPaise),
                })),
                { label: 'Total across milestones', value: money(milestoneTotal) },
                { label: 'Pilot budget', value: money(draft.pilot.budgetPaise) },
              ]}
              total={{
                label: budgetDifference === 0 ? 'Difference' : 'Difference — this blocks gate readiness',
                value: (
                  <span className={budgetDifference === 0 ? 'text-verify' : 'text-seal'}>
                    {budgetDifference === 0 ? money(0) : `${budgetDifference > 0 ? '' : '−'}${money(Math.abs(budgetDifference))}`}
                  </span>
                ),
              }}
            />
          </div>
        ) : null}

        {step === 'legal' ? (
          <div className="flex flex-col gap-6">
            <FormSection
              glyph="shield"
              label="The agreement and who owns what"
              hint="The default IP position clears gate 1 on its own. Anything else needs a recorded approval before publication."
              tone="verify"
            >
              <Field label="Pilot agreement template" required>
                {({ id }) => (
                  <Select
                    id={id}
                    value={draft.legal.templateId}
                    onChange={(e) => patch((d) => ({ ...d, legal: { ...d.legal, templateId: e.target.value } }))}
                    options={TEMPLATES.filter((t) => t.kind === 'pilot_agreement').map((t) => ({
                      value: t.id,
                      label: `${t.label} ${t.version} — effective ${t.effectiveFrom.slice(0, 10)}`,
                    }))}
                  />
                )}
              </Field>

              <RadioGroup
                legend="Intellectual property position"
                name="ip"
                required
                value={draft.legal.ipPosition}
                onChange={(v) =>
                  patch((d) => ({ ...d, legal: { ...d.legal, ipPosition: v as Challenge['legal']['ipPosition'] } }))
                }
                options={[
                  {
                    value: 'startup_retains',
                    label: 'Startup retains its IP, government takes a purpose licence',
                    detail: 'The default. Clears gate 1 without further approval.',
                  },
                  {
                    value: 'joint',
                    label: 'Joint ownership',
                    detail: 'A deviation. Slower for the startup, more expensive for you, and it needs a recorded approval.',
                  },
                  {
                    value: 'government_assigned',
                    label: 'Assigned to government',
                    detail: 'A material deviation requiring Secretary approval with written reasons. It raises the price.',
                  },
                ]}
              />

              {draft.legal.ipPosition !== 'startup_retains' ? (
                <InlineNote tone="seal" title="This will not clear gate 1 on its own">
                  A non-default IP position needs the approval level recorded against the clause before publication. The
                  gate 1 precondition will show as needing review until that is on file.
                </InlineNote>
              ) : null}
            </FormSection>

            <FormSection
              glyph="lock"
              label="Security and clearance"
              hint="The cyber level follows the data tier, and the legal cell has to have seen both."
              tone={draft.legal.legalPreClearance ? 'verify' : 'hold'}
            >
              <Field label="Cybersecurity level" required>
                {({ id }) => (
                  <Select
                    id={id}
                    value={draft.legal.cyberLevel}
                    onChange={(e) =>
                      patch((d) => ({ ...d, legal: { ...d.legal, cyberLevel: e.target.value as 'basic' } }))
                    }
                    options={[
                      { value: 'basic', label: 'Basic — no personal data, synthetic tier only' },
                      { value: 'standard', label: 'Standard — masked tier, certification or equivalent audit' },
                      { value: 'elevated', label: 'Elevated — production tier, independent audit required' },
                    ]}
                  />
                )}
              </Field>

              <div
                className={[
                  'rounded-sheet border border-rule border-l-2 bg-gradient-to-r to-transparent px-5 py-5 shadow-sheet',
                  draft.legal.legalPreClearance ? 'border-l-verify from-verify-wash' : 'border-l-hold from-hold-wash',
                ].join(' ')}
              >
                <Checkbox
                  checked={draft.legal.legalPreClearance}
                  onChange={(v) => patch((d) => ({ ...d, legal: { ...d.legal, legalPreClearance: v } }))}
                  label="Legal pre-clearance recorded"
                  detail="The departmental legal cell has seen the IP, data and cyber positions against the attached template. This is a gate 0 precondition."
                />
                <div className="mt-5">
                  <Field label="Pre-clearance note" hint="Who cleared it, on what date, against which template version.">
                    {({ id }) => (
                      <Input
                        id={id}
                        value={draft.legal.legalPreClearanceNote ?? ''}
                        onChange={(e) =>
                          patch((d) => ({ ...d, legal: { ...d.legal, legalPreClearanceNote: e.target.value } }))
                        }
                      />
                    )}
                  </Field>
                </div>
              </div>
            </FormSection>

            <KeyValueSheet
              title="Data position carried into the agreement"
              items={[
                {
                  label: 'Data tier',
                  value: DATA_TIERS.find((t) => t.id === draft.departmentProvides.dataTier)?.label ?? '—',
                  hint: DATA_TIERS.find((t) => t.id === draft.departmentProvides.dataTier)?.approval,
                },
                { label: 'Data clauses', value: draft.legal.dataClauseIds.join(', ') },
                { label: 'IP clauses', value: draft.legal.ipClauseIds.join(', ') },
              ]}
            />
          </div>
        ) : null}

        {step === 'review' ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: 'Gate 0 readiness', items: g0 },
                { label: 'Gate 1 readiness', items: g1 },
              ].map((group) => {
                const met = group.items.filter((i) => i.pass).length;
                const allMet = met === group.items.length;
                return (
                  <section
                    key={group.label}
                    className={[
                      'sheet relative rounded-block border-l-2 bg-gradient-to-br to-transparent shadow-sheet',
                      allMet ? 'border-l-verify from-verify-wash' : 'border-l-hold from-hold-wash',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline justify-between gap-4 border-b border-rule px-5 py-4">
                      <h3 className={['field-label', allMet ? '!text-verify' : '!text-hold'].join(' ')}>{group.label}</h3>
                      <span className="font-display text-h3 text-ink tnum">
                        {met}
                        <span className="text-micro font-normal text-ink-soft"> of {group.items.length} met</span>
                      </span>
                    </div>
                    <ul>
                      {group.items.map((p) => (
                        <li key={p.key} className="ledger-row px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => goto(p.step)}
                            className="flex w-full items-start gap-3 text-left"
                            disabled={p.pass}
                          >
                            <span
                              aria-hidden
                              className={[
                                'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                                p.pass ? 'bg-verify text-white' : 'border border-seal bg-seal-wash text-seal',
                              ].join(' ')}
                            >
                              {p.pass ? <TickMark size={13} /> : <CrossMark />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-body text-ink">{p.label}</span>
                              <span className="block text-micro text-ink-soft">{p.detail}</span>
                              {!p.pass ? (
                                <span className="mt-1 block text-micro font-semibold text-seal underline underline-offset-2">
                                  Fix this in {p.fixHint}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            {budgetDifference !== 0 ? (
              <InlineNote tone="seal" title="The arithmetic does not balance">
                Milestone payments total {money(milestoneTotal)} against a pilot budget of {money(draft.pilot.budgetPaise)}.
                Gate 0 cannot clear until they match exactly.
              </InlineNote>
            ) : null}

            <div className="sheet relative overflow-hidden rounded-block px-6 py-8 md:px-8">
              {/* The bar every panel in this product is picked up by: open at the
                  mark, cleared at the far end. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saffron via-verify to-transparent"
              />
              <Watermark lines={['Draft', 'Not for circulation']} />
              <div className="relative z-0">
                <p className="text-micro text-ink-soft tnum">{caseId ?? 'Not saved yet'}</p>
                <h2 className="mt-1 font-display text-h1 text-ink">{draft.title || 'Untitled challenge'}</h2>
                <div className="mt-6">
                  <ChallengeDocument
                    challenge={
                      {
                        ...draft,
                        id: challengeId ?? 'draft',
                        caseId: caseId ?? 'CH-2026-XXXX',
                        slug: 'draft',
                        departmentId: session.data?.data.department?.id ?? '',
                        ownerId: session.data?.data.user?.id ?? '',
                        status: 'draft',
                        currentGate: 'G0',
                        state: session.data?.data.department?.state ?? '',
                        district: session.data?.data.department?.district ?? '',
                        timeline: { createdOn: platformNowIso() },
                        applicantCount: 0,
                        gateEnteredOn: platformNowIso(),
                        languageFlags: flags,
                        coAuthors: [],
                        changeLog: [],
                      } as Challenge
                    }
                    department={session.data?.data.department ?? undefined}
                    clarifications={[]}
                    draft
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </WizardShell>
    </div>
  );
}
