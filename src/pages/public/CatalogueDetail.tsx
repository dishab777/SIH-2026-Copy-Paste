import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCatalogueSolution, useCreateChallenge, useSession } from '@/services/hooks';
import { can } from '@/config/rbac';
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
      strokeWidth={1.9}
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
 * hairline chips on the page. It is now the same raised green key the product
 * clears things with: lit along its top edge, casting in its own hue, and set
 * in caps because it is a stamp rather than a sentence.
 */
function ClearedMark({ label }: { label: string }) {
  return (
    <span className="btn-primary press inline-flex shrink-0 items-center gap-2.5 rounded-pill px-5 py-2.5 text-label font-bold uppercase tracking-stamp text-white">
      <TickInRing size={19} />
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
 *
 * Each section carries its number, because a record is read in order and the
 * index should say how far through it you are as well as where you are.
 */
function SectionSegments({ value, onChange }: { value: SectionId; onChange: (id: SectionId) => void }) {
  const index = Math.max(
    0,
    SECTIONS.findIndex((s) => s.id === value),
  );
  return (
    <nav
      aria-label="Sections of this record"
      className="glass scroll-quiet sticky top-20 z-20 mb-8 max-w-full overflow-x-auto rounded-pill p-1.5"
    >
      <div
        className="relative grid min-w-max"
        style={{ gridTemplateColumns: `repeat(${SECTIONS.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className="btn-primary settle pointer-events-none absolute bottom-0 left-0 top-0 rounded-pill"
          style={{ width: `${100 / SECTIONS.length}%`, transform: `translateX(${index * 100}%)` }}
        />
        {SECTIONS.map((s, i) => {
          const selected = s.id === value;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(s.id)}
              className={[
                'press relative z-10 flex items-center justify-center gap-2.5 whitespace-nowrap rounded-pill px-5 py-2.5 text-label',
                selected ? 'font-bold text-white' : 'font-medium text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'tnum inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-pill text-micro font-bold',
                  selected ? 'bg-white text-verify' : 'bg-ledger text-ink-soft',
                ].join(' ')}
              >
                {i + 1}
              </span>
              {s.label}
            </button>
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
  /*
   * The permission, not a list of roles. The list said pmu, which cannot create
   * a challenge and cannot enter the department portal either — so the offer
   * ended in a refused mutation and, had it succeeded, a portal guard.
   */
  const canAdopt = can(role, 'create', 'challenge');


  return (
    <QueryState query={query} errorTitle="Unable to load this solution." loading={<PanelSkeleton lines={8} />}>
      {(payload) => {
        const { solution, startup, department, pilot, validation, replicationPackage, challenge } = payload.data;
        const lead = solution.validatedMetrics[0];
        const adopted = solution.adoptedByDepartmentIds.length;

        const figures: {
          label: string;
          value: string;
          note: string;
          icon: ReactNode;
          /* Saffron marks what is still an invitation — somewhere to go next;
             the green marks what has already been cleared and recorded. */
          accent: 'verify' | 'saffron';
        }[] = [
          {
            label: 'Measures re-derived',
            value: num(solution.validatedMetrics.length),
            note: 'Recomputed from the department’s own records',
            accent: 'verify',
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
            accent: 'verify',
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
            accent: 'verify',
            icon: (
              <Glyph>
                <path d="M4.6 6.6h14.8v10.8H4.6z" />
                <circle cx="12" cy="12" r="2.6" />
                <path d="M7.6 12h.1M16.3 12h.1" />
              </Glyph>
            ),
          },
          {
            label: 'Departments adopting',
            value: num(adopted),
            note: adopted > 0 ? 'Taken up after this validation' : 'Open to the first adopter',
            accent: adopted > 0 ? 'verify' : 'saffron',
            icon: (
              <Glyph>
                <path d="M3 20.4h18" />
                <path d="M12 3.6 20.4 8.4H3.6L12 3.6Z" />
                <path d="M6.4 11.2v6.4M10.1 11.2v6.4M13.9 11.2v6.4M17.6 11.2v6.4" />
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
                <Breadcrumb items={[{ label: 'Validated solutions', to: link('/catalogue') }, { label: solution.name }]} />
              }
              aside={
                <>
                  <div className="rounded-sheet border border-deep-rule bg-deep-2 px-5 py-3 text-right shadow-lift">
                    <p className="field-label !text-deep-dim">Independently validated</p>
                    <p className="mt-1 flex items-center justify-end gap-2 font-display text-h3 text-signal">
                      <TickInRing size={18} />
                      {day(solution.validatedOn)}
                    </p>
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
                checked what — and then, without opening anything, the three
                questions a department asks next: what, by whom, against what. */}
            <section className="mb-8 overflow-hidden rounded-block border border-rule bg-verify-wash shadow-raise">
              <span aria-hidden className="block h-1.5 w-full bg-verify" />
              <div className="flex flex-wrap items-center justify-between gap-6 p-6">
                <div className="flex flex-wrap items-center gap-5">
                  <ClearedMark label="Cleared" />
                  <div className="min-w-0">
                    <p className="text-body text-ink">
                      {startup.tradeName} · proved by {department.name}
                    </p>
                    <p className="mt-1 text-micro text-ink-soft">
                      Re-derived by {solution.validatorName} against the target the department set before the pilot
                      began.
                    </p>
                    <ul className="mt-3 flex flex-wrap items-center gap-2">
                      <li className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-sheet px-3 py-1 text-micro text-ink-soft">
                        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-verify" />
                        {department.district}
                      </li>
                      <li className="inline-flex items-center gap-1.5 rounded-pill border border-rule bg-sheet px-3 py-1 text-micro text-ink-soft">
                        <span aria-hidden className="text-verify">
                          <TickInRing size={13} />
                        </span>
                        <span className="tnum">{num(solution.attestations.length)}</span> attestations closed
                      </li>
                      <li className="type-register inline-flex items-center gap-1.5 rounded-pill border border-rule bg-sheet px-3 py-1 text-micro text-ink-soft">
                        {pilot.caseId}
                      </li>
                    </ul>
                  </div>
                </div>
                {validation?.signedAt ? (
                  <SealStamp tone="cleared" gate="G5" date={validation.signedAt} by={solution.validatorName} />
                ) : null}
              </div>

              <dl className="grid grid-cols-1 gap-px border-t border-rule bg-rule sm:grid-cols-3">
                <div className="bg-sheet p-5">
                  <dt className="field-label">What was proved</dt>
                  <dd className="mt-1 text-data text-ink">{lead?.name ?? solution.name}</dd>
                </div>
                <div className="bg-sheet p-5">
                  <dt className="field-label">By whom</dt>
                  <dd className="mt-1 text-data text-ink">{solution.validatorName}</dd>
                </div>
                <div className="bg-sheet p-5">
                  <dt className="field-label">Against which target</dt>
                  <dd className="tnum mt-1 text-data text-ink">{lead?.target ?? '—'}</dd>
                </div>
              </dl>
            </section>

            <ul className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {figures.map((f) => (
                <li key={f.label}>
                  <div className="sheet lift-on-hover flex h-full flex-col overflow-hidden rounded-block">
                    {/* The cut the figure belongs to, carried as a band across
                        the head of the card rather than as a word. */}
                    <span
                      aria-hidden
                      className={['block h-1 w-full', f.accent === 'saffron' ? 'bg-saffron' : 'bg-verify'].join(' ')}
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <span
                        aria-hidden
                        className={[
                          'inline-flex h-11 w-11 items-center justify-center rounded-sheet border border-rule shadow-sheet',
                          f.accent === 'saffron'
                            ? 'bg-gradient-to-br from-saffron-veil to-sheet text-saffron-ink'
                            : 'bg-gradient-to-br from-verify-wash to-sheet text-verify',
                        ].join(' ')}
                      >
                        {f.icon}
                      </span>
                      <p className="field-label mt-4">{f.label}</p>
                      <p className="tnum mt-1 font-display text-figure text-ink">{f.value}</p>
                      <p className="mt-2 text-micro text-ink-soft">{f.note}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <SectionSegments value={section} onChange={setSection} />

            {section === 'measured' ? (
            <section id="measured" className="sheet panel-in mb-8 rounded-block p-6">
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
                      <span className="btn-primary tnum inline-flex items-center gap-2 rounded-pill px-3 py-1 font-bold text-white">
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

            ) : null}

            {section === 'provenance' ? (
            <section id="provenance" className="sheet panel-in mb-8 rounded-block p-6">
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
                    { label: 'Proved in', value: `${department.district}, ${department.state}` },
                    {
                      label: 'Pilot ran',
                      value: (
                        <span className="tnum">
                          {day(pilot.startedOn)} — {day(pilot.endsOn)}
                        </span>
                      ),
                    },
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
                <ul className="sheet-flat overflow-hidden rounded-sheet">
                  {solution.attestations.map((a) => (
                    <li key={a} className="ledger-row flex items-center gap-3 px-5 py-3.5">
                      {/* Filled, not outlined: a closed attestation is a fact,
                          and it should carry the same weight as the verdict. */}
                      <span
                        aria-hidden
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-verify text-white shadow-sheet"
                      >
                        <TickInRing size={16} />
                      </span>
                      <span className="text-body text-ink">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            ) : null}

            {section === 'replication' ? (
            <section id="replication" className="sheet panel-in mb-8 rounded-block p-6">
              <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
                <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                Taking it somewhere else
              </p>
              <h2 className="mb-3 font-display text-h2 text-ink">Replication package</h2>
              <p className="mb-5 max-w-doc text-body text-ink-soft">{solution.adoptionPathway}</p>
              {replicationPackage ? (
                <div className="sheet-flat overflow-hidden rounded-sheet">
                  <p className="flex flex-wrap items-center gap-2 border-b border-ink bg-verify-wash px-5 py-3 text-label text-ink">
                    <span aria-hidden className="text-verify">
                      <TickInRing size={16} />
                    </span>
                    Generated {day(replicationPackage.replicationPackage.generatedOn)} · checksum{' '}
                    <span className="tnum type-register">
                      {shortHash(replicationPackage.replicationPackage.hash)}
                    </span>
                  </p>
                  <ol>
                    {replicationPackage.replicationPackage.contents.map((c, i) => (
                      <li key={c} className="ledger-row flex items-center gap-4 px-5 py-3.5">
                        <span
                          aria-hidden
                          className="tnum inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-verify text-micro font-bold text-white shadow-sheet"
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

            ) : null}

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
