import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { SlaClock } from '@/components/domain/SlaClock';
import { day, daysBetween, money, num } from '@/lib/format';
import type { Challenge } from '@/types/models';
import { usePortalLink } from '@/lib/portal';
import { useTaxonomyLabel } from '@/config/taxonomy';

/**
 * One open problem, as a card you can compare against the one beside it.
 *
 * Every card is the same colour on purpose. Colouring them by sector turned a
 * grid into a chart with six categories and invited the eye to look for a
 * pattern that was not there — a sector is a fact about a case, not a rank or a
 * state. Colour in this product is spent on the three things that change what a
 * reader does: cleared, held, refused. A case that is merely open is written in
 * the ink the programme itself is written in.
 */
const isOpen = (status: string): boolean => status === 'open' || status === 'closing_soon';

export function ChallengeCard({
  challenge: c,
  detailed,
  headingLevel = 3,
}: {
  challenge: Challenge;
  detailed?: boolean;
  /** Where the card sits in the page outline. 2 when the grid follows the h1 directly. */
  headingLevel?: 2 | 3;
}) {
  const { t } = useTranslation();
  // Sector, district and capability are reference values, not free text.
  const label = useTaxonomyLabel();
  const link = usePortalLink();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const open = isOpen(c.status);

  return (
    <Link
      to={link(`/challenges/${c.slug}`)}
      className="group lift-on-hover flex h-full flex-col overflow-hidden rounded-block border border-rule bg-sheet no-underline shadow-sheet"
    >
      {/* The rail draws itself across on hover, the way a pen underlines something. */}
      <span aria-hidden className="rail block h-1 w-full bg-rule" />

      {/* The head of the card is washed, so the title has a ground of its own
          and the eye finds the same place on every card in the grid. */}
      <div className="border-b border-rule bg-verify-wash px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="field-label !text-verify">{label(c.sector)}</span>
          <span className="type-register text-micro text-ink-soft">{c.caseId}</span>
        </div>

        <Heading className="swift mt-2 font-display text-h3 text-ink group-hover:text-verify">{c.title}</Heading>

        <p className="mt-1 text-body text-ink-soft">
          {label(c.district)}, {label(c.state)}
        </p>
      </div>

      <div className="flex flex-1 flex-col px-5 py-5">
        <p className="rounded-sheet border-l-2 border-verify bg-ledger px-3 py-2 text-body text-ink">
          {c.outcome.statement}
        </p>

        {detailed ? (
          <p className="mt-3 text-micro text-ink-soft tnum">
            {t('card.baselineToTarget', {
              baseline: num(c.baseline.currentValue, 1),
              baselineUnit: c.baseline.unit,
              target: num(c.outcome.magnitude, 1),
              targetUnit: c.outcome.unit,
            })}
          </p>
        ) : null}

        {detailed ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {c.capabilities.slice(0, 3).map((cap) => (
              <li key={cap} className="rounded-pill border border-rule bg-ledger px-2 py-0.5 text-micro text-ink-soft">
                {label(cap)}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-6">
          <div>
            <p className="field-label">{t('card.pilotBudget')}</p>
            <p className="font-display text-figure text-verify tnum">{money(c.pilot.budgetPaise)}</p>
            <p className="mt-1 text-micro text-ink-soft">{t('card.overDays', { count: c.pilot.durationDays })}</p>
          </div>
          <div className="text-right">
            <p className="field-label">{open ? t('card.closes') : t('card.closed')}</p>
            {c.timeline.closesOn && c.timeline.publishedOn ? (
              open ? (
                <SlaClock
                  startedOn={c.timeline.publishedOn}
                  limitDays={daysBetween(c.timeline.publishedOn, c.timeline.closesOn)}
                />
              ) : (
                <p className="text-data text-ink">{day(c.timeline.closesOn)}</p>
              )
            ) : (
              <p className="text-data text-ink">&mdash;</p>
            )}
            <p className="mt-1 text-micro text-ink-soft tnum">
              {t('card.applicants', { count: c.applicantCount })}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
          <StatusBadge status={c.status} />
          {c.eligibility.relaxationsAvailable ? <Badge tone="verify">{t('card.startupRelief')}</Badge> : null}
        </div>
      </div>
    </Link>
  );
}
