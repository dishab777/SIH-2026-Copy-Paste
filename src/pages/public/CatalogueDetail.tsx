import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCatalogueSolution, useCreateChallenge, useSession } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { KeyValueSheet, ComparisonMatrix } from '@/components/ledger/Ledger';
import { Breadcrumb } from '@/components/ui/Nav';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { SealStamp } from '@/components/domain/SealStamp';
import { PageHeader } from '@/components/layout/Shell';
import { day, money, num, shortHash } from '@/lib/format';
import { useUi } from '@/store/ui';
import { usePortalLink } from '@/lib/portal';

/* ---------------------------------------------------------------- drawings */

function Glyph({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** A tick set inside a ring: the shape a validator's sign-off takes here. */
function TickInRing({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.3" />
      <path d="m5.2 8.2 1.9 1.9 3.7-4.2" />
    </svg>
  );
}

/**
 * The verdict, filled rather than outlined.
 *
 * This is the one thing a reader is looking for when they open a catalogue
 * entry, and it used to be a hairline chip indistinguishable from the six other
 * hairline chips on the page.
 */
function ClearedMark({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-verify px-4 py-2 text-label font-bold uppercase tracking-stamp text-white shadow-raise">
      <TickInRing size={18} />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------- the control */

const SECTIONS = [
  { id: 'measured', label: 'What was measured' },
  { id: 'provenance', label: 'Attestations' },
  { id: 'replication', label: 'Replication package' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

/**
 * The record index, as a segmented control rather than a row of underlined
 * words. The columns are equal, so the lit pill is exactly one column wide and
 * travels by whole columns — one transform, nothing measured after layout.
 */
function SectionSegments({ value, onChange }: { value: SectionId; onChange: (id: SectionId) => void }) {
  const index = Math.max(
    0,
    SECTIONS.findIndex((s) => s.id === value),
  );
  return (
    <nav
      aria-label="Sections of this record"
      className="glass scroll-quiet sticky top-20 z-20 mb-8 max-w-full overflow-x-auto rounded-pill p-1"
    >
      <div
        className="relative grid min-w-max"
        style={{ gridTemplateColumns: `repeat(${SECTIONS.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className="settle pointer-events-none absolute bottom-0 left-0 top-0 rounded-pill bg-verify shadow-raise"
          style={{ width: `${100 / SECTIONS.length}%`, transform: `translateX(${index * 100}%)` }}
        />
        {SECTIONS.map((s) => {
          const selected = s.id === value;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={selected ? 'location' : undefined}
              onClick={() => onChange(s.id)}
              className={[
                'press relative z-10 flex items-center justify-center gap-2 whitespace-nowrap rounded-pill px-5 py-2 text-label no-underline',
                selected ? 'font-bold text-white' : 'font-medium text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {s.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export default function CatalogueDetail() {
  const link = usePortalLink();
  const { solutionId } = useParams();
  const navigate = useNavigate();
  const query = useCatalogueSolution(solutionId);
  const session = useSession();
  const create = useCreateChallenge();
  const pushToast = useUi((s) => s.pushToast);
  const [adopting, setAdopting] = useState(false);
  const [section, setSection] = useState<SectionId>('measured');

  const role = session.data?.data.role ?? 'public';
  const canAdopt = role === 'department_officer' || role === 'department_admin' || role === 'pmu';

  /*
   * The index follows the reading rather than the last click, so it still says
   * where you are after you have scrolled past three panels with the keyboard.
   */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const topmost = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topmost) setSection(topmost.target.id as SectionId);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [query.data]);

  return (
    <QueryState query={query} errorTitle="Unable to load this solution." loading={<PanelSkeleton lines={8} />}>
      {(payload) => {
        const { solution, startup, department, pilot, validation, replicationPackage, challenge } = payload.data;

        const figures: { label: string; value: string; note: string; icon: ReactNode }[] = [
          {
            label: 'Measures re-derived',
            value: num(solution.validatedMetrics.length),
            note: 'Recomputed from the department’s own records',
            icon: (
              <Glyph>
                <path d="M3.8 16.4a8.2 8.2 0 0 1 16.4 0" />
                <path d="M3.8 16.4h16.4" />
                <path d="m12 16.4 4.2-5.4" />
              </Glyph>
            ),
          },
          {
            label: 'Attestations closed',
            value: num(solution.attestations.length),
            note: 'Security, data handling and erasure',
            icon: (
              <Glyph>
                <path d="M12 3.4 5.4 6.2v5.1c0 4 2.8 7.7 6.6 8.9 3.8-1.2 6.6-4.9 6.6-8.9V6.2z" />
                <path d="m9.2 11.8 2 2 3.6-3.9" />
              </Glyph>
            ),
          },
          {
            label: 'Pilot budget',
            value: money(pilot.budgetPaise),
            note: 'What the proof itself cost the department',
            icon: (
              <Glyph>
                <path d="M4.6 6.6h14.8v10.8H4.6z" />
                <circle cx="12" cy="12" r="2.6" />
                <path d="M7.6 12h.1M16.3 12h.1" />
              </Glyph>
            ),
          },
          {
            label: 'Report signed',
            value: day(solution.validatedOn),
            note: solution.validatorName,
            icon: (
              <Glyph>
                <path d="M4.6 19.4 8 18.5l9.1-9.1a2.4 2.4 0 1 0-3.4-3.4L4.6 15.1z" />
                <path d="m13.4 6.6 3.4 3.4" />
              </Glyph>
            ),
          },
        ];

        return (
          <div>
            <PageHeader
              eyebrow="Validated solution"
              title={solution.name}
              lead={solution.summary}
              breadcrumb={
                <Breadcrumb items={[{ label: 'Validated solutions', to: '/catalogue' }, { label: solution.name }]} />
              }
              aside={
                <>
                  <div className="rounded-sheet border border-deep-rule bg-deep-2 px-5 py-3 text-right shadow-lift">
                    <p className="field-label !text-deep-dim">Independently validated</p>
                    <p className="mt-1 font-display text-h3 text-signal">{day(solution.validatedOn)}</p>
                  </div>
                  {canAdopt ? (
                    <Button tone="primary" onClick={() => setAdopting(true)}>
                      Adopt this in my department
                    </Button>
                  ) : null}
                </>
              }
            />

            {/* The verdict band. One panel, one colour, one sentence saying who
                checked what — before any of the working detail. */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-6 rounded-block border border-l-2 border-rule border-l-verify bg-verify-wash p-6 shadow-sheet">
              <div className="flex flex-wrap items-center gap-5">
                <ClearedMark label="Cleared" />
                <div>
                  <p className="text-body text-ink">
                    {startup.tradeName} · proved by {department.name}
                  </p>
                  <p className="mt-1 text-micro text-ink-soft">
                    Re-derived by {solution.validatorName} against the target the department set before the pilot began.
                  </p>
                </div>
              </div>
              {validation?.signedAt ? (
                <SealStamp tone="cleared" gate="G5" date={validation.signedAt} by={solution.validatorName} />
              ) : null}
            </div>

            <ul className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {figures.map((f) => (
                <li key={f.label}>
                  <div className="sheet lift-on-hover flex h-full flex-col rounded-block p-5">
                    <span
                      aria-hidden
                      className="inline-flex h-11 w-11 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-sheet text-verify shadow-sheet"
                    >
                      {f.icon}
                    </span>
                    <p className="field-label mt-4">{f.label}</p>
                    <p className="tnum mt-1 font-display text-figure text-ink">{f.value}</p>
                    <p className="mt-2 text-micro text-ink-soft">{f.note}</p>
                  </div>
                </li>
              ))}
            </ul>

            <SectionSegments value={section} onChange={setSection} />

            <section id="measured" className="sheet mb-8 scroll-mt-24 rounded-block p-6">
              <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                The measurement
              </p>
              <h2 className="mb-5 font-display text-h2 text-ink">What was measured</h2>
              <ComparisonMatrix
                rowHeader="Measure"
                columns={[
                  { key: 'baseline', label: 'Baseline' },
                  { key: 'target', label: 'Target' },
                  { key: 'result', label: 'Validated result' },
                ]}
                rows={solution.validatedMetrics.map((m) => ({
                  key: m.name,
                  label: m.name,
                  cells: {
                    baseline: <span className="tnum">{m.baseline}</span>,
                    target: <span className="tnum">{m.target}</span>,
                    result: (
                      <span className="tnum inline-flex items-center gap-2 rounded-pill bg-verify px-3 py-0.5 font-semibold text-white">
                        <TickInRing size={14} />
                        {m.result}
                      </span>
                    ),
                  },
                }))}
              />
              {validation ? (
                <div className="mt-5">
                  <InlineNote tone="verify" title="How the validator checked it">
                    <p>{validation.rederivation.note}</p>
                    <p className="mt-1 text-micro text-ink-soft">Records used: {validation.rederivation.records}</p>
                    {validation.qualifications ? (
                      <p className="mt-2 text-body text-ink">Qualifications: {validation.qualifications}</p>
                    ) : null}
                  </InlineNote>
                </div>
              ) : null}
            </section>

            <section id="provenance" className="sheet mb-8 scroll-mt-24 rounded-block p-6">
              <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                Where it came from
              </p>
              <h2 className="mb-5 font-display text-h2 text-ink">Attestations and provenance</h2>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <KeyValueSheet
                  items={[
                    { label: 'Validated by', value: solution.validatorName },
                    { label: 'Validated on', value: day(solution.validatedOn) },
                    { label: 'Pilot case', value: <span className="tnum">{pilot.caseId}</span> },
                    { label: 'Pilot budget', value: <span className="tnum">{money(pilot.budgetPaise)}</span> },
                    {
                      label: 'Original challenge',
                      value: challenge ? (
                        <Link to={link(`/challenges/${challenge.slug}`)} className="underline underline-offset-2">
                          {challenge.caseId} — {challenge.title}
                        </Link>
                      ) : (
                        '—'
                      ),
                    },
                    ...(validation?.hash
                      ? [{ label: 'Report checksum', value: <span className="tnum">{shortHash(validation.hash)}</span> }]
                      : []),
                  ]}
                />
                <ul className="sheet-flat rounded-sheet">
                  {solution.attestations.map((a) => (
                    <li key={a} className="ledger-row flex items-center gap-3 px-5 py-3">
                      <span aria-hidden className="shrink-0 text-verify">
                        <TickInRing size={20} />
                      </span>
                      <span className="text-body text-ink">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="replication" className="sheet mb-8 scroll-mt-24 rounded-block p-6">
              <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                Taking it somewhere else
              </p>
              <h2 className="mb-3 font-display text-h2 text-ink">Replication package</h2>
              <p className="mb-5 max-w-doc text-body text-ink-soft">{solution.adoptionPathway}</p>
              {replicationPackage ? (
                <div className="sheet-flat rounded-sheet">
                  <p className="border-b border-ink px-5 py-3 text-label text-ink">
                    Generated {day(replicationPackage.replicationPackage.generatedOn)} · checksum{' '}
                    <span className="tnum">{shortHash(replicationPackage.replicationPackage.hash)}</span>
                  </p>
                  <ol>
                    {replicationPackage.replicationPackage.contents.map((c, i) => (
                      <li key={c} className="ledger-row flex items-center gap-4 px-5 py-3">
                        <span
                          aria-hidden
                          className="tnum inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-rule bg-verify-wash text-micro font-semibold text-verify"
                        >
                          {i + 1}
                        </span>
                        <span className="text-body text-ink">{c}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="text-body text-ink-soft">
                  No replication package has been generated for this solution yet.
                </p>
              )}
            </section>

            <Modal
              open={adopting}
              onClose={() => setAdopting(false)}
              title="Adopt this in your department"
              description="This starts a new challenge draft pre-filled from the replication package. You still frame the problem in your own words and clear gate 0 yourself."
              footer={
                <>
                  <Button onClick={() => setAdopting(false)}>Cancel</Button>
                  <Button
                    tone="primary"
                    loading={create.isPending}
                    loadingLabel="Creating draft"
                    onClick={() =>
                      create.mutate(
                        {
                          title: `${solution.name} — adapted for my district`,
                        },
                        {
                          onSuccess: (res) => {
                            pushToast('verify', `Draft ${res.data.caseId} created from the replication package.`);
                            setAdopting(false);
                            navigate('/d/challenges/new/problem');
                          },
                          onError: () => pushToast('seal', 'Could not create the draft. Nothing was changed.'),
                        },
                      )
                    }
                  >
                    Create a challenge draft
                  </Button>
                </>
              }
            >
              <p className="text-body text-ink">
                The package carries the challenge as published, the rule set and rubric versions in force at award, the
                agreement with its recorded deviations, the measurement plan and the validation report.
              </p>
              <p className="mt-3 text-body text-ink-soft">
                What it cannot carry is your baseline. You will need to measure that yourself before gate 0 can clear.
              </p>
            </Modal>
          </div>
        );
      }}
    </QueryState>
  );
}
