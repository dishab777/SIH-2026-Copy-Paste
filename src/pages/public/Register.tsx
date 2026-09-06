import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/Shell';
import { InlineNote } from '@/components/ui/Feedback';
import { ROLES, type Role } from '@/config/rbac';
import { reachLabel } from '@/config/jurisdiction';
import { useRoleText } from '@/lib/roleText';
import { policy } from '@/config/policies';

/**
 * Every account this platform issues, and how you get each one.
 *
 * The page used to show two cards — startup and expert — and put the other five
 * account types in a footnote at the bottom. That was accurate and unhelpful: a
 * procurement officer arriving here saw two doors, neither of them theirs, and
 * had to read a note to find out the page was not for them.
 *
 * So all seven are on it now, in two lanes that say the true thing about each:
 * two accounts you open yourself, five issued against a verified posting. The
 * second lane is not a list of things you cannot have — each card names the
 * office, what the account may reach, who issues it, and what to send them.
 *
 * Whether officers may self-register is configuration
 * (`account.officersSelfRegister`), not a fact about the world. If a programme
 * turns it on, the second lane becomes doors like the first.
 */

/** A door somebody can walk through unaided. */
interface Door {
  role: Role;
  to: string;
  /* Translation keys, not sentences: this is module scope, where `t` does not
     exist, so each is read at the render site. */
  eyebrow: string;
  title: string;
  lead: string;
  points: readonly string[];
  cta: string;
  glyph: string;
}

const DOORS: readonly Door[] = [
  {
    role: 'startup',
    to: '/register/startup',
    eyebrow: 'auth.choose.startup.eyebrow',
    title: 'auth.choose.startup.title',
    lead: 'auth.choose.startup.lead',
    points: [
      'auth.choose.startup.point1',
      'auth.choose.startup.point2',
      'auth.choose.startup.point3',
      'auth.choose.startup.point4',
    ],
    cta: 'auth.choose.startup.cta',
    glyph: 'M4 20.5h16M6 20.5V6.5l6-3 6 3v14M10 11h4M10 15h4',
  },
  {
    role: 'evaluator',
    to: '/register/expert',
    eyebrow: 'auth.choose.expert.eyebrow',
    title: 'auth.choose.expert.title',
    lead: 'auth.choose.expert.lead',
    points: [
      'auth.choose.expert.point1',
      'auth.choose.expert.point2',
      'auth.choose.expert.point3',
      'auth.choose.expert.point4',
    ],
    cta: 'auth.choose.expert.cta',
    glyph: 'M12 4v16M7 20h10M4 9h16M4 9l-2.5 5h5ZM20 9l2.5 5h-5Z',
  },
];

/**
 * The five accounts nobody opens for themselves, and who issues each.
 *
 * The issuing authority is the real answer to "how do I get one" — a nodal
 * officer account comes from the department, a programme account from the PMU —
 * and it is the thing the old footnote left out.
 */
const PROVISIONED: readonly { role: Role; issuedBy: string; glyph: string }[] = [
  {
    role: 'department_officer',
    issuedBy: 'auth.choose.issuer.department',
    glyph: 'M4 20.5h16M6 20.5V9l6-4.5L18 9v11.5M10 20.5v-5h4v5',
  },
  {
    role: 'department_admin',
    issuedBy: 'auth.choose.issuer.department',
    glyph: 'M4 20.5h16M6 20.5V9l6-4.5L18 9v11.5M9.5 13h5M9.5 16.5h5',
  },
  {
    role: 'procurement_officer',
    issuedBy: 'auth.choose.issuer.department',
    glyph: 'M6 3h12v18l-3-2-3 2-3-2-3 2ZM9.5 8h5M9.5 12h5M9.5 16h3',
  },
  {
    role: 'validator',
    issuedBy: 'auth.choose.issuer.pmu',
    glyph: 'M12 3l7 3v6c0 4.2-3 6.8-7 9-4-2.2-7-4.8-7-9V6ZM9 12l2 2 4-4',
  },
  {
    role: 'pmu',
    issuedBy: 'auth.choose.issuer.pmu',
    glyph: 'M4 7h16M4 12h16M4 17h10M18.5 15.5v5M16 18h5',
  },
];

function Glyph({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

function Tick() {
  return (
    <span aria-hidden className="mt-1.5 shrink-0 text-verify">
      <Glyph d="M4 12.5 9.5 18 20 6.5" size={12} />
    </span>
  );
}

export default function Register() {
  const { t } = useTranslation();
  const roleText = useRoleText();
  const officersSelfRegister = policy<boolean>('account.officersSelfRegister');

  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader
        eyebrow={t('auth.choose.eyebrow')}
        title={t('auth.choose.title')}
        lead={t('auth.choose.lead')}
        aside={
          <Link
            to="/login"
            className="press inline-flex h-9 items-center rounded-pill border border-deep-rule px-4 text-label text-deep-ink no-underline hover:border-saffron hover:text-saffron"
          >
            {t('auth.choose.haveAccount')}
          </Link>
        }
      />

      {/* ------------------------------------------------- open registration */}
      <section aria-labelledby="open-heading">
        <div className="mb-5">
          <p className="field-label flex items-center gap-2 !text-saffron-ink">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            {t('auth.choose.openEyebrow')}
          </p>
          <h2 id="open-heading" className="mt-1 font-display text-h2 text-ink">
            {t('auth.choose.openTitle')}
          </h2>
          <p className="mt-2 max-w-doc text-body text-ink-soft">{t('auth.choose.openLead')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {DOORS.map((d) => (
            <article key={d.to} className="sheet-flat lift-on-hover flex flex-col overflow-hidden rounded-block">
              <div className="deep deep-field px-6 py-6">
                <span
                  aria-hidden
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-sheet border border-deep-rule bg-deep-2 text-saffron"
                >
                  <Glyph d={d.glyph} />
                </span>
                <p className="field-label !text-deep-dim">{t(d.eyebrow)}</p>
                <h3 className="mt-1 font-display text-h2 text-deep-ink">{t(d.title)}</h3>
                <p className="mt-3 max-w-doc text-body text-deep-dim">{t(d.lead)}</p>
              </div>

              <div className="flex flex-1 flex-col px-6 py-6">
                <ul className="flex flex-col gap-3">
                  {d.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-body text-ink">
                      <Tick />
                      {t(p)}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
                  <span className="field-label">{t('auth.choose.reach')}</span>
                  <span className="rounded-pill border border-rule bg-ledger px-3 py-0.5 text-micro text-ink-soft">
                    {reachLabel(d.role)}
                  </span>
                </p>

                <div className="mt-5">
                  <Link
                    to={d.to}
                    className="btn-primary press inline-flex h-11 items-center rounded-pill px-6 text-body font-semibold text-white no-underline"
                  >
                    {t(d.cta)}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------- issued accounts */}
      <section aria-labelledby="posted-heading" className="mt-12">
        <div className="mb-5">
          <p className="field-label flex items-center gap-2 !text-saffron-ink">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            {t('auth.choose.postedEyebrow')}
          </p>
          <h2 id="posted-heading" className="mt-1 font-display text-h2 text-ink">
            {t('auth.choose.postedTitle')}
          </h2>
          <p className="mt-2 max-w-doc text-body text-ink-soft">
            {officersSelfRegister ? t('auth.choose.postedLeadOpen') : t('auth.choose.postedLead')}
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROVISIONED.map((a) => {
            const text = roleText(a.role);
            const portal = ROLES.find((r) => r.id === a.role)?.portal ?? '/';
            return (
              <li key={a.role} className="sheet-flat lift-on-hover flex flex-col rounded-block px-5 py-5">
                <span
                  aria-hidden
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-sheet border border-rule bg-ledger text-ink-soft"
                >
                  <Glyph d={a.glyph} size={20} />
                </span>
                <h3 className="font-display text-h3 text-ink">{text.label}</h3>
                <p className="mt-1.5 flex-1 text-body text-ink-soft">{text.description}</p>

                <dl className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="field-label">{t('auth.choose.reach')}</dt>
                    <dd className="text-micro text-ink">{reachLabel(a.role)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="field-label">{t('auth.choose.portal')}</dt>
                    <dd className="type-register text-micro text-ink tnum">{portal}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="field-label">{t('auth.choose.issuedBy')}</dt>
                    <dd className="text-right text-micro text-ink">{t(a.issuedBy)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <InlineNote tone="neutral" title={t('auth.choose.officersTitle')}>
            <p className="max-w-doc">{t('auth.choose.officersHow')}</p>
            <p className="mt-2 max-w-doc">{t('auth.choose.officersAsk')}</p>
            <p className="mt-4">
              <Link
                to="/login"
                className="press inline-flex h-9 items-center rounded-pill border border-rule bg-sheet px-4 text-label text-ink no-underline hover:border-verify hover:text-verify"
              >
                {t('auth.choose.alreadyIssued')}
              </Link>
            </p>
          </InlineNote>
        </div>
      </section>
    </div>
  );
}
