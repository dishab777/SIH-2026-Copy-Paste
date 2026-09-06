import { useTranslation } from 'react-i18next';
import { ROLES } from '@/config/rbac';
import { REACHES, reachOf } from '@/config/jurisdiction';
import { useRoleText } from '@/lib/roleText';
import { Refused } from '@/components/layout/Refused';

/**
 * The bare 403, for a request that reached this route rather than a screen.
 *
 * It used to offer "Sign in with another role" as its first action, which read
 * as an instruction: if you are refused, become somebody who is not. Signing in
 * as a different account is still possible and still on the sign-in page — this
 * just no longer suggests it as the fix.
 *
 * What it does instead is show how far each role's writ runs, because "you
 * cannot do that" is a much less useful thing to be told than "here is who can,
 * and here is the boundary you are standing on".
 */
export default function Forbidden() {
  const { t } = useTranslation();
  const roleText = useRoleText();

  return (
    <main className="mx-auto max-w-[820px] px-4 py-12">
      <Refused eyebrow="403" title={t('refused.recordTitle')} reasons={[t('refused.note')]}>
        <div className="sheet-flat overflow-hidden">
          <p className="border-b border-ink px-4 py-2 text-label text-ink">{t('refused.howFarEachRoleGoes')}</p>
          <ul>
            {ROLES.filter((r) => r.id !== 'public').map((r) => {
              const reach = REACHES.find((x) => x.id === reachOf(r.id));
              return (
                <li key={r.id} className="ledger-row px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-body text-ink">{roleText(r.id).label}</span>
                    <span className="rounded-pill border border-rule bg-ledger px-3 py-0.5 text-micro text-ink-soft">
                      {reach?.label}
                    </span>
                  </div>
                  <p className="mt-1 max-w-doc text-micro text-ink-soft">{reach?.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </Refused>
    </main>
  );
}
