import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, portalFor, type Role } from '@/config/rbac';
import { useSession, useSignIn } from '@/services/hooks';
import { Button, LinkButton } from '@/components/ui/Button';
import { ErrorState, PanelSkeleton } from '@/components/ui/Feedback';

/**
 * A portal is for one set of roles. Rather than silently redirecting — which
 * would hide the fact that a boundary exists — this says who the portal is for,
 * who you currently are, and offers an explicit sign-in.
 *
 * The switch is a real sign-in through the API, so the server changes its mind
 * about you too. It is not a client-side bypass.
 */
export function PortalGuard({ allow, children }: { allow: readonly Role[]; children: ReactNode }) {
  const session = useSession();
  const signIn = useSignIn();
  const navigate = useNavigate();

  if (session.isPending) return <PanelSkeleton lines={6} />;

  // A failed session read is not the same as being signed out. Saying "you are
  // signed in as public" here would state something the server never said.
  if (session.isError || !session.data) {
    return (
      <div className="mx-auto max-w-[680px] py-8">
        <h1 className="mb-4 text-h1 text-ink">Your sign-in could not be read.</h1>
        <ErrorState
          title="This portal cannot tell whether you may open it."
          what="The service did not answer when asked who you are. Nothing has changed on any case, and nothing you had entered has been lost."
          onRetry={() => void session.refetch()}
        />
      </div>
    );
  }

  const role: Role = session.data.data.role ?? 'public';
  if (allow.includes(role)) return <>{children}</>;

  const intended = ROLES.find((r) => r.id === allow[0]);
  const current = ROLES.find((r) => r.id === role);

  return (
    <div className="mx-auto max-w-[680px] py-8">
      <div className="sheet-flat border-l-2 border-l-hold">
        <div className="px-6 py-6">
          <p className="text-label text-ink-soft">This portal is for {intended?.label.toLowerCase()}</p>
          <h1 className="mt-1 text-h1 text-ink">
            You are signed in as {current?.label.toLowerCase() ?? 'a member of the public'}.
          </h1>
          <p className="mt-3 max-w-doc text-body text-ink-soft">
            {intended?.description} Nothing has been hidden from you — the API refuses these requests for your current
            role, and switching is a real sign-in rather than a change of view.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {allow.map((r) => {
              const def = ROLES.find((x) => x.id === r);
              return (
                <Button
                  key={r}
                  tone={r === allow[0] ? 'primary' : 'secondary'}
                  loading={signIn.isPending && signIn.variables?.role === r}
                  loadingLabel="Signing in"
                  onClick={() => signIn.mutate({ role: r })}
                >
                  Sign in as {def?.label.toLowerCase()}
                </Button>
              );
            })}
            <Button onClick={() => navigate(portalFor(role))}>Back to your own portal</Button>
            <LinkButton to="/login">See every demonstration account</LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
