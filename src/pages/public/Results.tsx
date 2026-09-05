import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useResults } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import {
  OutcomePie,
  OutcomeMark,
  OUTCOME_INK,
  OUTCOME_CHIP,
  type OutcomeKey,
} from '@/components/domain/OutcomePie';
import { useReveal } from '@/lib/reveal';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton } from '@/components/ui/Feedback';
import { Badge, StatusBadge, statusTone, statusWords } from '@/components/ui/Badge';
import { day, money, num } from '@/lib/format';
import { PATHWAYS } from '@/config/templates';
import { Masthead } from '@/components/layout/Masthead';
import { usePortalLink } from '@/lib/portal';

/**
 * The three findings a validator can sign, in the order a report can land in.
 *
 * They are declared once and read three times — by the circle, by the key above
 * the table and by the outcome column — because a finding that is worded one
 * way in the drawing and another way in the table is two facts to a reader.
 */
const FINDINGS: readonly { key: OutcomeKey; label: string; detail: string; colour: string }[] = [
  {
    key: 'validated',
    label: 'Reproduced',
    detail: 'A validator re-derived the claim from the department’s own records and got the same answer.',
    colour: 'var(--verify)',
  },
  {
    key: 'validated_with_qualifications',
    label: 'Reproduced with qualifications',
    detail: 'The outcome held, with a caveat recorded on the file — usually a gap in the measurement.',
    colour: 'var(--hold)',
  },
  {
    key: 'not_validated',
    label: 'Not reproduced',
    detail: 'The claim could not be reproduced. It stays here, because the next department is entitled to know.',
    colour: 'var(--seal)',
  },
];

/** The rule-and-label that opens a section, so a reader knows what kind of thing follows. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
      <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
      {children}
    </p>
  );
}

/** A signature written across a ruled line: the act this whole page records. */
function SignedGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className="mt-0.5 block shrink-0"
    >
      <path d="M3.4 15.2c2.6-5.4 4.4-4.8 5.1 0c0.7 4.2 2.6 4.2 3.7 0.3c0.9-2.6 2.2-2.7 3.6-0.5" strokeWidth="1.5" />
      <path d="M3 19.4h18" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * The marks, named, above the table that uses them.
 *
 * The outcome column is a shape as well as a colour, and a shape has to be
 * taught once before it can be read. This is that once.
 */
function MarkKey() {
  return (
    <div className="sheet px-5 py-4 shadow-raise">
      <p className="field-label mb-3">What the marks mean</p>
      <ul className="flex flex-wrap gap-2">
        {FINDINGS.map((f) => (
          <li
            key={f.key}
            className={['swift flex items-center gap-2 rounded-pill border px-3 py-1.5', OUTCOME_CHIP[f.key]].join(' ')}
          >
            <span className={OUTCOME_INK[f.key]}>
              <OutcomeMark outcome={f.key} size={18} />
            </span>
            <span className="text-micro text-ink">{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Results() {
  const query = useResults();

  useReveal([query.data]);

  const link = usePortalLink();
  const rows = query.data?.data ?? [];
  const count = (key: OutcomeKey): number => rows.filter((r) => r.outcome === key).length;

  const slices = FINDINGS.map((f) => ({ ...f, count: count(f.key) }));

  return (
    <div className="-mx-4 -mt-6 md:-mx-6">
      <Masthead
        eyebrow="Published outcomes"
        title="Every completed pilot, whether or not it worked."
        lead="A pilot that failed is a result. Hiding it would make the successes worth less, and would leave the next department to make the same mistake at its own expense."
        figures={[
          { label: 'Pilots finished', value: num(rows.length) },
          { label: 'Reproduced', value: num(count('validated')), tone: 'proved' },
          /* A published failure is not open work and does not take the saffron;
             nobody is waiting on anybody for it. It is simply the record. */
          { label: 'Not reproduced', value: num(count('not_validated')) },
        ]}
      />

      {/*
        The shape of the programme before the rows. A pie, because the question
        is what share of the whole each finding took, and there are only three
        findings a validator can sign.
      */}
      <section className="full-bleed bg-ledger px-4 py-12 md:px-6 lg:py-16" aria-labelledby="shape-heading">
        <div className="mx-auto max-w-shell">
          <Eyebrow>The whole record</Eyebrow>
          <h2 id="shape-heading" className="font-display text-h2 text-ink">
            What happened to all {rows.length} of them
          </h2>
          <p className="mt-3 max-w-doc text-body text-ink-soft">
            Three findings, and every finished pilot sits in exactly one of them. Each finding carries its own mark, so
            the answer survives a photocopy and a reader who cannot separate the colours.
          </p>

          {/* A feature panel takes the large radius rather than the sheet's, so
              the drawing inside it reads as a plate rather than as a form. */}
          <div className="sheet reveal mt-8 rounded-block p-5 shadow-raise md:p-10">
            <OutcomePie slices={slices} size={288} />

            <p className="mt-8 flex items-start gap-3 rounded-sheet border-l-2 border-l-verify bg-verify-wash px-4 py-3.5 text-micro text-ink">
              <span className="text-verify">
                <SignedGlyph />
              </span>
              <span>
                Every finding was signed by someone who does not work for the department that ran the pilot, and who was
                paid whether the answer was yes or no.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* The register is paper laid on the board, so the band behind it stays
          the board. On sheet the panel's own body had no edge to show. */}
      <section className="full-bleed border-t border-rule bg-ledger px-4 py-12 md:px-6 lg:py-16">
        <div className="mx-auto max-w-shell">
          {/*
            One panel around the whole register: a washed band that says what the
            table is and teaches its marks, and the ledger itself below it.
          */}
          <div className="reveal rounded-block border border-rule bg-sheet shadow-raise">
            {/* The head is washed in the ink a validated finding is signed in,
                so the register announces itself as the cleared record it is. */}
            <div className="rounded-t-block border-b border-rule bg-verify-wash px-5 py-6 md:px-8 md:py-7">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-doc">
                  <Eyebrow>Case by case</Eyebrow>
                  <h2 className="font-display text-h2 text-ink">Every result on the record</h2>
                  <p className="mt-2 text-body text-ink-soft">
                    Sortable and exportable. The validator who signed each finding is named, and the claim they tested is
                    the one the department published before the pilot began.
                  </p>
                </div>
                <MarkKey />
              </div>
            </div>

            <div className="p-5 md:p-6">
              <QueryState
                query={query}
                errorTitle="Unable to load results."
                loading={<TableSkeleton rows={6} columns={6} />}
                isEmpty={(d) => d.data.length === 0}
                empty={{
                  title: 'No pilots have completed yet.',
                  body: 'Results appear here as soon as an independent validator signs a report.',
                  action: { label: 'See open challenges', to: link('/challenges') },
                }}
              >
                {(payload) => (
                  <LedgerTable
                    caption="Completed pilots and their validated outcomes"
                    exportName="prayog-results"
                    rows={payload.data}
                    rowKey={(r) => r.pilot.id}
                    rowTone={(r) =>
                      r.outcome === 'validated'
                        ? 'verify'
                        : r.outcome === 'not_validated'
                          ? 'seal'
                          : r.outcome
                            ? 'hold'
                            : 'neutral'
                    }
                    columns={[
                      {
                        key: 'case',
                        header: 'Case',
                        width: '22%',
                        sortValue: (r) => r.pilot.caseId,
                        filterValue: (r) => `${r.pilot.caseId} ${r.challenge.title}`,
                        render: (r) => (
                          <span>
                            <Link
                              to={link(`/challenges/${r.challenge.slug}`)}
                              className="text-body text-ink underline underline-offset-2"
                            >
                              {r.challenge.title}
                            </Link>
                            <span className="type-register block text-micro text-ink-soft">{r.pilot.caseId}</span>
                            <span className="block text-micro text-ink-soft">{r.department.shortName}</span>
                          </span>
                        ),
                      },
                      {
                        key: 'startup',
                        header: 'Startup',
                        sortValue: (r) => r.startup.tradeName,
                        filterValue: (r) => r.startup.tradeName,
                        render: (r) => (
                          <Link
                            to={`/startups/${r.startup.slug}`}
                            className="text-body text-ink underline underline-offset-2"
                          >
                            {r.startup.tradeName}
                          </Link>
                        ),
                      },
                      {
                        key: 'claimed',
                        header: 'Claimed outcome',
                        width: '18%',
                        filterValue: (r) => r.claimed,
                        render: (r) => <span className="text-body text-ink">{r.claimed}</span>,
                      },
                      {
                        key: 'validated',
                        header: 'Validated outcome',
                        width: '24%',
                        filterValue: (r) => r.validated,
                        render: (r) => (
                          <span>
                            <span className="block text-body text-ink">{r.validated}</span>
                            {r.validator ? <span className="block text-micro text-ink-soft">{r.validator}</span> : null}
                          </span>
                        ),
                      },
                      {
                        key: 'outcome',
                        header: 'Outcome',
                        sortValue: (r) => r.outcome ?? 'zz',
                        /* The finding is a shape first and a colour second: the
                           same seal the circle above is drawn from. */
                        render: (r) =>
                          r.outcome ? (
                            <Badge tone={statusTone(r.outcome)}>
                              <span className="inline-flex items-center gap-1.5">
                                <span className={OUTCOME_INK[r.outcome]}>
                                  <OutcomeMark outcome={r.outcome} size={16} />
                                </span>
                                {statusWords(r.outcome)}
                              </span>
                            </Badge>
                          ) : (
                            <StatusBadge status={r.pilot.status} />
                          ),
                      },
                      {
                        key: 'decision',
                        header: 'Gate 6 decision',
                        width: '18%',
                        filterValue: (r) => r.pathway ?? '',
                        render: (r) => (
                          <span>
                            <span className="block text-body text-ink">
                              {r.pathway ? (PATHWAYS.find((p) => p.id === r.pathway)?.label ?? r.pathway) : 'Not yet decided'}
                            </span>
                            {r.reason ? (
                              <span className="mt-1 block max-w-[46ch] text-micro text-ink-soft">{r.reason}</span>
                            ) : null}
                          </span>
                        ),
                      },
                      {
                        key: 'budget',
                        header: 'Pilot budget',
                        unit: '₹',
                        align: 'right',
                        optional: true,
                        sortValue: (r) => r.pilot.budgetPaise,
                        filterValue: (r) => String(r.pilot.budgetPaise / 100),
                        render: (r) => money(r.pilot.budgetPaise),
                      },
                      {
                        key: 'ended',
                        header: 'Ended',
                        align: 'right',
                        optional: true,
                        sortValue: (r) => r.pilot.endsOn,
                        filterValue: (r) => day(r.pilot.endsOn),
                        render: (r) => day(r.pilot.endsOn),
                      },
                    ]}
                  />
                )}
              </QueryState>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
