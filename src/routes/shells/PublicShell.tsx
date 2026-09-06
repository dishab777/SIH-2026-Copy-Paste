import { useTranslation } from 'react-i18next';
import { Shell } from '@/components/layout/Shell';
import { publicLinksFor } from '@/config/nav';
import { useSession } from '@/services/hooks';

/**
 * The public site.
 *
 * It is not a role's dashboard and not a department's home screen: it is the
 * notice board. Signed out, it carries the two destinations that are open to
 * anyone — what departments need, and how the programme works. Everything else
 * mounted here is behind `RequireAccount`, so offering the link to a visitor who
 * cannot open it would only be a promise the next click breaks.
 */
export function PublicShell() {
  const { t } = useTranslation();
  const session = useSession();
  const signedIn = (session.data?.data.role ?? 'public') !== 'public';
  const links = publicLinksFor(signedIn).map((l) => ({ to: l.to, end: l.end, label: t(l.labelKey) }));
  return <Shell links={links} />;
}
