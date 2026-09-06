import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { portalFor } from '@/config/rbac';
import { useSession } from '@/services/hooks';
import { Button, LinkButton } from '@/components/ui/Button';

/**
 * What a boundary looks like when you walk into it.
 *
 * There are three ways to reach one — the portal is not yours, the record
 * belongs to another department, or you are not signed in at all — and they all
 * end here, because from the reader's side they are the same event: something
 * they asked for is not theirs to see.
 *
 * It refuses in the open. A silent redirect to the sign-in page would hide the
 * fact that a boundary exists, lose the page they were trying to reach, and
 * leave them guessing whether the link was broken. So this says what was
 * refused, whose it is, where they stand, and where they can go instead — and
 * offers no way through, because there is no way through. The only door is the
 * sign-in page, and walking through it means being somebody else.
 */
export function Refused({
  /** Two or three words naming the kind of boundary. */
  eyebrow,
  /** The refusal itself, in one sentence. Already in the reader's language. */
  title,
  /** Why, and where the line falls. One or two sentences each. */
  reasons,
  /** Anything the caller wants under the reasons — a role table, a retry. */
  children,
}: {
  eyebrow: string;
  title: string;
  reasons?: readonly string[];
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useSession();
  const role = session.data?.data.role ?? 'public';
  const signedIn = role !== 'public';

  return (
    <div className="mx-auto max-w-[760px] py-8">
      <article className="sheet-flat overflow-hidden">
        {/* The masthead every working screen opens on. A refusal is a screen
            too, and it should read as a decision rather than a breakage. */}
        <div className="deep deep-field px-6 py-8">
          <p className="field-label flex items-center gap-2 !text-saffron">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            {eyebrow}
          </p>
          <h1 className="mt-2 max-w-[24ch] font-display text-h1 text-deep-ink">{title}</h1>
        </div>

        <div className="px-6 py-6">
          {reasons?.length ? (
            <ul className="flex flex-col gap-3">
              {reasons.map((r) => (
                <li key={r} className="flex gap-3 text-body text-ink">
                  <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-seal" />
                  <span className="max-w-doc">{r}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {children ? <div className="mt-6">{children}</div> : null}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-rule pt-6">
            {signedIn ? (
              <>
                <Button tone="primary" onClick={() => navigate(portalFor(role))}>
                  {t('refused.backToPortal')}
                </Button>
                <LinkButton to="/login">{t('refused.signInAsSomeoneElse')}</LinkButton>
              </>
            ) : (
              <>
                <LinkButton tone="primary" to="/login">
                  {t('refused.signIn')}
                </LinkButton>
                <LinkButton to="/register">{t('refused.createAccount')}</LinkButton>
              </>
            )}
            <LinkButton to="/">{t('refused.demandBoard')}</LinkButton>
          </div>

          <p className="mt-4 max-w-doc text-micro text-ink-soft">{t('refused.note')}</p>
        </div>
      </article>
    </div>
  );
}
