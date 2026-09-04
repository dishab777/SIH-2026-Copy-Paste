import { useEffect, useMemo, useState } from 'react';
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

const STEPS: { slug: string; title: string; summary: string }[] = [
  {
    slug: 'problem',
    title: 'The problem',
    summary: 'Describe the operational problem as the people affected experience it, in parts rather than one block of text.',
  },
  {
    slug: 'baseline',
    title: 'The baseline',
    summary: 'What the problem costs today, measured. Required to clear gate 0 — without it there is nothing to improve against.',
  },
  {
    slug: 'outcome',
    title: 'Outcome sought',
    summary: 'What you want to be true afterwards, and how you will know. Not how to build it.',
  },
  {
    slug: 'support',
    title: 'What the department provides',
    summary: 'Data, systems, site access and staff time — and, just as importantly, what you will not provide.',
  },
  {
    slug: 'eligibility',
    title: 'Eligibility and relaxations',
    summary: 'Which rules apply. Prior turnover and prior experience may be relaxed for a recognised startup; nothing else is.',
  },
  {
    slug: 'pilot',
    title: 'Pilot and money',
    summary: 'Duration, milestones and the payment attached to each acceptance test. The arithmetic must balance exactly.',
  },
  {
    slug: 'legal',
    title: 'Legal, IP, data and cyber',
    summary: 'The clause set, the IP position, the data tier and the cybersecurity level.',
  },
  {
    slug: 'review',
    title: 'Review and publish',
    summary: 'The exact page an applicant will read, watermarked as a draft, with gate 0 and gate 1 readiness beside it.',
  },
];

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
        title="Challenge studio"
        lead="Eight steps that turn an operational problem into something a startup can be paid to solve — and that will survive an audit."
        aside={
          existing.data && existing.data.data.length > 0 ? (
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
          ) : undefined
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </div>
        ) : null}

        {step === 'baseline' ? (
          <div className="flex flex-col gap-6">
            <InlineNote tone="hold" title="Required to clear gate 0">
              A challenge with no baseline cannot be validated later, because there is nothing to compare the pilot
              against. The measurement method has to be repeatable by someone who was not there.
            </InlineNote>

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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </div>
        ) : null}

        {step === 'outcome' ? (
          <div className="flex flex-col gap-6">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            {/* Solution language checker. Never auto-applies. */}
            <section className="sheet-flat">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-4 py-3">
                <div>
                  <h3 className="text-h3 text-ink">Solution language check</h3>
                  <p className="mt-0.5 text-micro text-ink-soft">
                    Looks for vendor names, prescribed technology and instructions about how to build. Gate 1 requires an
                    outcome, not a specification.
                  </p>
                </div>
                <Button onClick={() => void runLanguageCheck()}>Run the check</Button>
              </div>

              {flags.length === 0 ? (
                <p className="px-4 py-4 text-body text-ink-soft">
                  Nothing checked yet. Run the check before you leave this step — an unresolved flag blocks gate 1.
                </p>
              ) : (
                <ul>
                  {flags.map((f) => (
                    <li key={f.id} className="ledger-row px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 max-w-doc">
                          <div className="flex items-center gap-2">
                            <Badge tone={f.status === 'open' ? 'seal' : 'verify'}>
                              {f.status === 'open' ? 'Potential issue' : f.status === 'accepted' ? 'Rewritten' : 'Edited by hand'}
                            </Badge>
                            <span className="text-micro text-ink-soft">{f.section}</span>
                          </div>
                          <p className="mt-2 text-body text-ink">
                            This challenge uses <span className="font-medium">“{f.matchedText}”</span> in {f.section.toLowerCase()}.
                          </p>
                          <p className="mt-1 text-body text-ink-soft">
                            <span className="text-ink">Why this matters:</span> {f.why}
                          </p>
                          {f.status === 'open' ? (
                            <>
                              <p className="mt-3 text-label text-ink-soft">Suggested rewrite</p>
                              <p className="mt-1 border-l-2 border-l-rule bg-ledger px-3 py-2 font-doc text-doc text-ink">
                                {f.suggestion}
                              </p>
                            </>
                          ) : null}
                        </div>
                        {f.status === 'open' ? (
                          <div className="flex shrink-0 flex-col gap-2">
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
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        {step === 'support' ? (
          <div className="flex flex-col gap-6">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </div>
        ) : null}

        {step === 'eligibility' ? (
          <div className="flex flex-col gap-6">
            <RelaxationNotice />

            <section className="sheet-flat">
              <p className="border-b border-ink px-4 py-2 text-label text-ink">Rules applied to this challenge</p>
              <ul>
                {ELIGIBILITY_RULES.map((r) => {
                  const on = draft.eligibility.ruleIds.includes(r.id);
                  return (
                    <li key={r.id} className="ledger-row px-4 py-3">
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
                        <div className="flex shrink-0 flex-col items-end gap-1">
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
            </section>

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
          </div>
        ) : null}

        {step === 'pilot' ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-h3 text-ink">Milestones</h3>
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
              </div>

              {draft.pilot.milestones.length === 0 ? (
                <InlineNote tone="hold" title="No milestones yet">
                  Every rupee needs an acceptance test attached to it. Add at least one milestone.
                </InlineNote>
              ) : (
                <ol className="flex flex-col gap-4">
                  {draft.pilot.milestones.map((m, i) => (
                    <li key={m.id} className="sheet-flat px-4 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-label text-ink">Milestone {i + 1}</p>
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
                      <div className="flex flex-col gap-4">
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            </section>

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

            <div className="sheet-flat px-4 py-4">
              <Checkbox
                checked={draft.legal.legalPreClearance}
                onChange={(v) => patch((d) => ({ ...d, legal: { ...d.legal, legalPreClearance: v } }))}
                label="Legal pre-clearance recorded"
                detail="The departmental legal cell has seen the IP, data and cyber positions against the attached template. This is a gate 0 precondition."
              />
              <div className="mt-4">
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
              ].map((group) => (
                <section key={group.label} className="sheet-flat">
                  <div className="flex items-baseline justify-between border-b border-ink px-4 py-2">
                    <h3 className="text-label text-ink">{group.label}</h3>
                    <span className="text-micro text-ink-soft tnum">
                      {group.items.filter((i) => i.pass).length} of {group.items.length} met
                    </span>
                  </div>
                  <ul>
                    {group.items.map((p) => (
                      <li key={p.key} className="ledger-row px-4 py-2">
                        <button
                          type="button"
                          onClick={() => goto(p.step)}
                          className="flex w-full items-start gap-3 text-left"
                          disabled={p.pass}
                        >
                          <span aria-hidden className={p.pass ? 'text-verify' : 'text-seal'}>
                            {p.pass ? '✓' : '✗'}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-body text-ink">{p.label}</span>
                            <span className="block text-micro text-ink-soft">{p.detail}</span>
                            {!p.pass ? (
                              <span className="mt-0.5 block text-micro text-seal underline underline-offset-2">
                                Fix this in {p.fixHint}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {budgetDifference !== 0 ? (
              <InlineNote tone="seal" title="The arithmetic does not balance">
                Milestone payments total {money(milestoneTotal)} against a pilot budget of {money(draft.pilot.budgetPaise)}.
                Gate 0 cannot clear until they match exactly.
              </InlineNote>
            ) : null}

            <div className="relative overflow-hidden border border-rule bg-sheet px-6 py-8">
              <Watermark lines={['Draft', 'Not for circulation']} />
              <div className="relative z-0">
                <p className="text-micro text-ink-soft tnum">{caseId ?? 'Not saved yet'}</p>
                <h2 className="mt-1 text-h1 text-ink">{draft.title || 'Untitled challenge'}</h2>
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
