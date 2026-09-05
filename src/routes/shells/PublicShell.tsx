import { Shell } from '@/components/layout/Shell';
import { PUBLIC_LINKS } from '@/config/nav';

/**
 * The public site.
 *
 * It is not a role's dashboard and it is not a department's home screen: it is
 * what anyone sees without signing in. The destinations live in
 * `@/config/nav` because the view switcher under the wordmark offers the same
 * seven from inside every portal.
 */
export function PublicShell() {
  return <Shell links={PUBLIC_LINKS} />;
}
