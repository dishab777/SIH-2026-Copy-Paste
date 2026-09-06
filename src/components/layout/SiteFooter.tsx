import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LEGAL_DOCUMENTS, legalPath, type Bilingual } from '@/config/legal';
import { publicLinksFor } from '@/config/nav';
import { platformNow } from '@/config/clock';
import { usePortalLink } from '@/lib/portal';
import { useSession } from '@/services/hooks';
import { Mark } from './Mark';
import { GovernmentOfIndia } from './Emblems';

/**
 * The page closes on the same ground it opens on.
 *
 * The bar is deep on every route and so is this, which means every screen in
 * the product — a public landing page or a payments ledger — is bookended the
 * same way and the work sits on paper in between.
 *
 * It carries three columns and a rule beneath them, which is the shape a
 * government portal's footer has for a reason: where the site goes, what you
 * can do about your account, and the policies the programme is bound by. The
 * last of those used to be missing entirely — the footer offered a site map and
 * a style guide, and there was nowhere on the whole platform that said what is
 * held about a reader, what they may reproduce, or that this is a demonstration.
 */
export function SiteFooter() {
  const { t, i18n } = useTranslation();
  const hindi = i18n.language.startsWith('hi');
  const say = (b: Bilingual): string => (hindi ? b.hi : b.en);

  // Shared pages follow you into your portal rather than throwing you onto the
  // public site; the policies are the same document from anywhere.
  const link = usePortalLink();

  /*
   * The site map offers only what the reader can actually open. Listing a gated
   * page to a signed-out visitor is a promise the next click breaks, and the
   * same list drives the top bar, so the two can never disagree.
   */
  const session = useSession();
  const signedIn = (session.data?.data.role ?? 'public') !== 'public';
  const destinations = publicLinksFor(signedIn);

  return (
    <footer className="deep mt-16 border-t-2 border-t-saffron">
      <div className="mx-auto max-w-shell px-4 py-10 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-10">
{/* ------------------------------------------------------- brand
              The product's own mark. It used to open the page in the top bar;
              the government identity does that now, and this closes it. */}
          <div className="max-w-doc">
            <p className="flex items-center gap-3">
              <span aria-hidden className="mark-well shrink-0">
                <Mark size={30} tone="deep" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-display text-h2 tracking-mega text-deep-ink">{t('app.name')}</span>
                <span className="mt-1.5 text-label text-saffron">{t('app.tagline')}</span>
              </span>
            </p>

            {/* Whose programme it is, said again where a reader looks for it. */}
            <span className="mt-5 inline-flex rounded-sheet border border-deep-rule bg-deep-2 px-3.5 py-2.5">
              <GovernmentOfIndia size={28} />
            </span>

            <p className="mt-5 text-micro text-deep-dim">{t('chrome.footerNote')}</p>
          </div>

          <FooterColumn title={t('chrome.footer.siteMap')}>
            {destinations.map((d) => (
              <FooterLink key={d.to} to={link(d.to)} label={t(d.labelKey)} />
            ))}
          </FooterColumn>

          <FooterColumn title={t('chrome.footer.account')}>
            {signedIn ? (
              <>
                <FooterLink to="/login" label={t('chrome.switchAccount')} />
                <FooterLink to={link('/how-it-works')} label={t('chrome.footer.theSevenGates')} />
              </>
            ) : (
              <>
                <FooterLink to="/register" label={t('chrome.createAccount')} />
                <FooterLink to="/login" label={t('app.signIn')} />
              </>
            )}
            <FooterLink to="/dev/styleguide" label={t('chrome.styleGuide')} />
          </FooterColumn>

          <FooterColumn title={t('chrome.footer.policies')}>
            {LEGAL_DOCUMENTS.map((d) => (
              <FooterLink key={d.id} to={link(legalPath(d.id))} label={say(d.title)} />
            ))}
          </FooterColumn>
        </div>

        {/* ----------------------------------------------------- the rule */}
        <div className="mt-10 flex flex-col gap-3 border-t border-t-deep-rule pt-6 md:flex-row md:items-baseline md:justify-between">
          <p className="text-micro text-deep-dim">
            {t('chrome.footer.copyright', { year: platformNow().getFullYear() })}
          </p>
          <p className="text-micro text-deep-dim">{t('chrome.footer.reuse')}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="field-label !text-saffron">{title}</p>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </nav>
  );
}

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <NavLink to={to} className="text-micro text-deep-dim underline underline-offset-2 hover:text-saffron">
        {label}
      </NavLink>
    </li>
  );
}
