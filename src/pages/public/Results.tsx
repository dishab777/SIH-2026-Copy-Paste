import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { isIdentified, useResults } from '@/services/hooks';
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
const FINDINGS: readonly { key: OutcomeKey; labelKey: string; detailKey: string; colour: string }[] = [
  {
    key: 'validated',
    labelKey: 'pubResults.finding.reproduced.label',
    detailKey: 'pubResults.finding.reproduced.detail',
    colour: 'var(--verify)',
  },
  {
    key: 'validated_with_qualifications',
    labelKey: 'pubResults.finding.qualified.label',
    detailKey: 'pubResults.finding.qualified.detail',
    colour: 'var(--hold)',
  },
  {
    key: 'not_validated',
    labelKey: 'pubResults.finding.notReproduced.label',
    detailKey: 'pubResults.finding.notReproduced.detail',
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
  const { t } = useTranslation();
  return (
    <div className="sheet px-5 py-4 shadow-raise">
      <p className="field-label mb-3">{t('pubResults.results.markKey')}</p>
      <ul className="flex flex-wrap gap-2">
        {FINDINGS.map((f) => (
          <li
            key={f.key}
            className={['swift flex items-center gap-2 rounded-pill border px-3 py-1.5', OUTCOME_CHIP[f.key]].join(' ')}
          >
            <span className={OUTCOME_INK[f.key]}>
              <OutcomeMark outcome={f.key} size={18} />
            </span>
            <span className="text-micro text-ink">{t(f.labelKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Results() {
  const { t } = useTranslation();
  const query = useResults();

  useReveal([query.data]);

  const link = usePortalLink();
  const rows = query.data?.data ?? [];
  const count = (key: OutcomeKey): number => rows.filter((r) => r.outcome === key).length;

  const slices = FINDINGS.map((f) => ({
    key: f.key,
    label: t(f.labelKey),
    detail: t(f.detailKey),
    colour: f.colour,
    count: count(f.key),
  }));

  return (
    <div className="-mx-4 -mt-6 md:-mx-6">
      <Masthead
        eyebrow={t('pubResults.results.eyebrow')}
        title={t('pubResults.results.title')}
        lead={t('pubResults.results.lead')}
        figures={[
          { label: t('pubResults.results.figurePilots'), value: num(rows.length) },
          { label: t('pubResults.finding.reproduced.label'), value: num(count('validated')), tone: 'proved' },
          /* A published failure is not open work and does not take the saffron;
             nobody is waiting on anybody for it. It is simply the record. */
          { label: t('pubResults.finding.notReproduced.label'), value: num(count('not_validated')) },
        ]}
      />

      {/*
        The shape of the programme before the rows. A pie, because the question
        is what share of the whole each finding took, and there are only three
        findings a validator can sign.
      */}
      <section className="full-bleed bg-ledger px-4 py-12 md:px-6 lg:py-16" aria-labelledby="shape-heading">
        <div className="mx-auto max-w-shell">
          <Eyebrow>{t('pubResults.results.shape.eyebrow')}</Eyebrow>
          <h2 id="shape-heading" className="font-display text-h2 text-ink">
            {t('pubResults.results.shape.heading', { count: rows.length })}
          </h2>
          <p className="mt-3 max-w-doc text-body text-ink-soft">
            {t('pubResults.results.shape.lead')}
          </p>

          {/* A feature panel takes the large radius rather than the sheet's, so
              the drawing inside it reads as a plate rather than as a form. */}
          <div className="sheet reveal mt-8 rounded-block p-5 shadow-raise md:p-10">
            <OutcomePie slices={slices} size={288} />

            <p className="mt-8 flex items-start gap-3 rounded-sheet border-l-2 border-l-verify bg-verify-wash px-4 py-3.5 text-micro text-ink">
              <span className="text-verify">
                <SignedGlyph />
              </span>
              <span>{t('pubResults.results.shape.note')}</span>
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
                  <Eyebrow>{t('pubResults.results.register.eyebrow')}</Eyebrow>
                  <h2 className="font-display text-h2 text-ink">{t('pubResults.results.register.heading')}</h2>
                  <p className="mt-2 text-body text-ink-soft">
                    {t('pubResults.results.register.lead')}
                  </p>
                </div>
                <MarkKey />
              </div>
            </div>

            <div className="p-5 md:p-6">
              <QueryState
                query={query}
                errorTitle={t('pubResults.results.register.errorTitle')}
                loading={<TableSkeleton rows={6} columns={6} />}
                isEmpty={(d) => d.data.length === 0}
                empty={{
                  title: t('pubResults.results.register.emptyTitle'),
                  body: t('pubResults.results.register.emptyBody'),
                  action: { label: t('pubResults.results.register.emptyAction'), to: link('/challenges') },
                }}
              >
                {(payload) => (
                  /*
                   * Only the rows that actually carry their parties. This page
                   * sits behind RequireAccount, so in practice that is all of
                   * them — but the server decides the projection, and a table
                   * that assumed would print "undefined" where a company name
                   * belongs the day that changes.
                   */
                  <LedgerTable
                    caption={t('pubResults.results.register.caption')}
                    exportName="prayog-results"
                    rows={payload.data.filter(isIdentified)}
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
                        header: t('pubResults.results.column.case'),
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
                        header: t('pubResults.results.column.startup'),
                        sortValue: (r) => r.startup.tradeName,
                        filterValue: (r) => r.startup.tradeName,
                        render: (r) => (
                          <Link
                            to={link(`/startups/${r.startup.slug}`)}
                            className="text-body text-ink underline underline-offset-2"
                          >
                            {r.startup.tradeName}
                          </Link>
                        ),
                      },
                      {
                        key: 'claimed',
                        header: t('pubResults.results.column.claimed'),
                        width: '18%',
                        filterValue: (r) => r.claimed,
                        render: (r) => <span className="text-body text-ink">{r.claimed}</span>,
                      },
                      {
                        key: 'validated',
                        header: t('pubResults.results.column.validated'),
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
                        header: t('pubResults.results.column.outcome'),
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
                        header: t('pubResults.results.column.decision'),
                        width: '18%',
                        filterValue: (r) => r.pathway ?? '',
                        render: (r) => (
                          <span>
                            <span className="block text-body text-ink">
                              {r.pathway
                                ? (PATHWAYS.find((p) => p.id === r.pathway)?.label ?? r.pathway)
                                : t('pubResults.results.notYetDecided')}
                            </span>
                            {r.reason ? (
                              <span className="mt-1 block max-w-[46ch] text-micro text-ink-soft">{r.reason}</span>
                            ) : null}
                          </span>
                        ),
                      },
                      {
                        key: 'budget',
                        header: t('pubResults.shared.pilotBudget'),
                        unit: '₹',
                        align: 'right',
                        optional: true,
                        sortValue: (r) => r.pilot.budgetPaise,
                        filterValue: (r) => String(r.pilot.budgetPaise / 100),
                        render: (r) => money(r.pilot.budgetPaise),
                      },
                      {
                        key: 'ended',
                        header: t('pubResults.results.column.ended'),
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
