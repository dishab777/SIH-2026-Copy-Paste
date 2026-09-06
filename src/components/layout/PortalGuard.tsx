import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { portalFor, type Role, type RoleDefinition } from '@/config/rbac';
import { reachLabel } from '@/config/jurisdiction';
import { useRoleText } from '@/lib/roleText';
import { useSession } from '@/services/hooks';
import { ErrorState, PanelSkeleton } from '@/components/ui/Feedback';
import { Refused } from './Refused';

/**
 * What each portal is called, in ordinary words.
 *
 * Held as a table rather than assembled from the route, so `npm run check` can
 * see the keys. A key built from a value at run time is invisible to the bundle
 * check, and would go missing in one language with nothing to say so.
 */
const PORTAL_NAME: Readonly<Record<RoleDefinition['portal'], { titleKey: string }>> = {
  '/': { titleKey: 'portal.public' },
  '/s': { titleKey: 'portal.s' },
  '/d': { titleKey: 'portal.d' },
  '/e': { titleKey: 'portal.e' },
  '/v': { titleKey: 'portal.v' },
  '/a': { titleKey: 'portal.a' },
};

/**
 * A portal is for one set of roles, and this is the door.
 *
 * It used to offer a row of buttons that signed you straight in as whichever
 * role the portal wanted, which made the boundary decorative: anyone who
 * arrived at a department screen from a notification, an alert or a pasted link
 * was one click from being a department officer. A refusal that hands you the
 * way around itself is not a refusal.
 *
 * So it refuses, and the only way past is the sign-in page — where signing in
 * means becoming somebody else, on the record, rather than changing a view.
 *
 * This is not the protection either way. The API refuses these requests for
 * the reader's actual account, in front of every endpoint, whatever the client
 * believes about itself. This is what that refusal looks like early, so a
 * reader gets a sentence instead of a screen of failed panels.
 */
export function PortalGuard({ allow, children }: { allow: readonly Role[]; children: ReactNode }) {
  const { t } = useTranslation();
  const session = useSession();
  const roleText = useRoleText();

  if (session.isPending) return <PanelSkeleton lines={6} />;

  // A failed session read is not the same as being signed out. Saying "you are
  // signed in as public" here would state something the server never said.
  if (session.isError || !session.data) {
    return (
      <div className="mx-auto max-w-[680px] py-8">
        <h1 className="mb-4 text-h1 text-ink">{t('refused.sessionUnreadable')}</h1>
        <ErrorState
          title={t('refused.sessionUnreadableTitle')}
          what={t('refused.sessionUnreadableWhat')}
          onRetry={() => void session.refetch()}
        />
      </div>
    );
  }

  const role: Role = session.data.data.role ?? 'public';
  if (allow.includes(role)) return <>{children}</>;

  const department = session.data.data.department;
  // The portal's own name, translated. '/d' is not an answer to 'where am I'.
  const portal = t(PORTAL_NAME[portalFor(allow[0] ?? 'public')].titleKey);

  return (
    <Refused
      eyebrow={t('refused.portalEyebrow')}
      title={
        role === 'public'
          ? t('refused.portalSignedOut', { portal })
          : t('refused.portalWrongRole', { portal })
      }
      reasons={[
        role === 'public'
          ? t('refused.portalSignedOutWhy')
          : t('refused.portalWrongRoleWhy', { role: roleText(role).label }),
        department
          ? t('refused.postedTo', {
              department: department.shortName,
              district: department.district,
              state: department.state,
              reach: reachLabel(role).toLowerCase(),
            })
          : t('refused.reachIs', { reach: reachLabel(role).toLowerCase() }),
      ]}
    >
      <div className="sheet-flat">
        <p className="border-b border-ink px-4 py-2 text-label text-ink">{t('refused.whoWorksHere')}</p>
        <ul>
          {allow.map((r) => (
            <li key={r} className="ledger-row px-4 py-2">
              <span className="block text-body text-ink">{roleText(r).label}</span>
              <span className="block text-micro text-ink-soft">{roleText(r).description}</span>
            </li>
          ))}
        </ul>
      </div>
    </Refused>
  );
}
