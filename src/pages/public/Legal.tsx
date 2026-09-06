import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LEGAL_DOCUMENTS, legalDocument, legalPath, type Bilingual } from '@/config/legal';
import { useActiveAnchor } from '@/lib/inview';
import { usePortalLink } from '@/lib/portal';
import { day } from '@/lib/format';

/**
 * A published policy, read as a document rather than as a page.
 *
 * These are the pages nobody visits until they need them, and then they need a
 * specific paragraph — which is why this is set as a ruled document with a
 * standing index rather than as a wall: numbered sections, an anchor on each,
 * and a rail on the left that says which one you are in. Every section is
 * linkable, so somebody can send a colleague the clause rather than the page.
 *
 * The text itself is in src/config/legal.ts, in both languages together, for
 * the same reason every other rule in this product is in config: a policy is a
 * document the programme revises, and it should be revised in one place.
 */
export default function Legal() {
  const { document: id } = useParams();
  const { i18n, t } = useTranslation();
  const link = usePortalLink();

  const doc = legalDocument(id);
  const hindi = i18n.language.startsWith('hi');
  const say = (b: Bilingual): string => (hindi ? b.hi : b.en);

  // The rail has to be built before the early return, so the hook count is
  // stable whether or not the route names a document that exists.
  const anchors = (doc?.sections ?? []).map((s) => s.id);
  const active = useActiveAnchor(anchors, 0.28);

  if (!doc) return <Navigate to={legalPath('privacy')} replace />;

  return (
    <div className="mx-auto max-w-[1080px]">
      <header className="page-head deep mb-8 px-5 py-7 md:px-8 md:py-9">
        <p className="field-label mb-2 flex items-center gap-2 !text-saffron">
          <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
          {t('legal.eyebrow')}
        </p>
        <h1 className="font-display text-h1 tracking-mega text-deep-ink">{say(doc.title)}</h1>
        <p className="mt-3 max-w-doc text-lead text-deep-dim">{say(doc.summary)}</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-pill border border-deep-rule bg-deep-2 px-4 py-1.5 text-micro text-deep-dim">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-saffron" />
          {t('legal.revised', { date: day(doc.updated) })}
        </p>
      </header>

      {/*
        Said once, at the top of every policy, in the plainest words available.
        A demonstration that publishes a privacy policy without saying it is a
        demonstration has published something misleading.
      */}
      <div className="mb-8 border-l-2 border-l-hold bg-hold-wash px-5 py-4">
        <p className="text-label text-ink">{t('legal.demoTitle')}</p>
        <p className="mt-1 max-w-doc text-body text-ink-soft">{t('legal.demoBody')}</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        {/* --------------------------------------------------------- index */}
        <nav aria-label={t('legal.contents')} className="lg:sticky lg:top-20 lg:h-fit lg:w-[228px] lg:shrink-0">
          <div className="sheet-flat">
            <p className="border-b border-ink px-4 py-2 text-label text-ink">{t('legal.contents')}</p>
            <ol>
              {doc.sections.map((s, i) => (
                <li key={s.id} className="border-b border-rule last:border-b-0">
                  <a
                    href={`#${s.id}`}
                    aria-current={active === s.id ? 'true' : undefined}
                    className={[
                      'flex gap-2.5 px-4 py-2 text-body no-underline',
                      active === s.id
                        ? 'border-l-2 border-l-verify bg-verify-wash text-ink'
                        : 'border-l-2 border-l-transparent text-ink-soft hover:text-ink',
                    ].join(' ')}
                  >
                    <span aria-hidden className="type-register shrink-0 text-micro text-ink-soft tnum">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{say(s.heading)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        {/* ------------------------------------------------------ document */}
        <article className="min-w-0 flex-1">
          {doc.sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 border-t border-rule py-8 first:border-t-0 first:pt-0"
            >
              <h2 className="flex items-baseline gap-3 font-display text-h2 text-ink">
                <span aria-hidden className="type-register text-label text-saffron-ink tnum">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {say(s.heading)}
              </h2>

              {s.body.map((paragraph) => (
                <p key={paragraph.en} className="mt-4 max-w-doc text-body text-ink">
                  {say(paragraph)}
                </p>
              ))}

              {s.list?.length ? (
                <dl className="mt-5 sheet-flat overflow-hidden">
                  {s.list.map((item) => (
                    <div key={item.term.en} className="ledger-row px-5 py-4">
                      <dt className="text-body font-medium text-ink">{say(item.term)}</dt>
                      <dd className="mt-1 max-w-doc text-body text-ink-soft">{say(item.detail)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          ))}

          {/* The other four, because whoever opened this one is usually
              looking for the boundary between two of them. */}
          <div className="mt-8 border-t border-rule pt-8">
            <p className="field-label">{t('legal.alsoPublished')}</p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LEGAL_DOCUMENTS.filter((d) => d.id !== doc.id).map((d) => (
                <li key={d.id}>
                  <Link
                    to={link(legalPath(d.id))}
                    className="sheet-flat lift-on-hover block rounded-sheet px-5 py-4 no-underline"
                  >
                    <span className="block text-body font-medium text-ink">{say(d.title)}</span>
                    <span className="mt-1 block text-micro text-ink-soft">{say(d.summary)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
}
