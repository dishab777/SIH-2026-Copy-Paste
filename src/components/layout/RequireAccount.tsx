import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/services/hooks';
import { LinkButton } from '@/components/ui/Button';
import { ErrorState, PanelSkeleton } from '@/components/ui/Feedback';

/**
 * The line between the notice board and the document room.
 *
 * A government programme has to publish what it needs — a tender nobody can
 * read is not a tender — and the demand board does exactly that, for anyone,
 * with no account: the problem, the department, the budget band and the closing
 * date. That is the public site.
 *
 * Everything behind this gate is the other half: the challenge document with
 * its rubric, clauses and data annexure, and every page that names an
 * identifiable company and what it was measured at. Those are published to the
 * programme, not to the open web, and reading them takes an account — the same
 * way a real procurement portal lets you browse notices and asks you to
 * register before it hands over the tender documents.
 *
 * Like PortalGuard, this refuses in the open rather than redirecting. A silent
 * bounce to /login hides the fact that a boundary exists and loses the page the
 * reader was trying to reach.
 *
 * It offers registering and signing in, and nothing else. It used to carry a
 * row of buttons that signed a visitor straight in as a seeded officer, which
 * meant the boundary could be stepped over by whoever happened to walk into it.
 * The demonstration accounts are still there, on the sign-in page, behind the
 * act of signing in.
 */
export function RequireAccount({
  /** What is behind the gate, in the reader's terms. One short noun phrase. */
  what,
  /** Why this one is not on the open web. One sentence. */
  why,
  children,
}: {
  what: string;
  why: string;
  children: ReactNode;
}) {
  const session = useSession();

  if (session.isPending) return <PanelSkeleton lines={6} />;

  // A failed session read is not the same as being signed out. Saying "you are
  // not signed in" here would state something the server never said.
  if (session.isError || !session.data) {
    return (
      <div className="mx-auto max-w-[680px] py-8">
        <h1 className="mb-4 text-h1 text-ink">Your sign-in could not be read.</h1>
        <ErrorState
          title="This page cannot tell whether you may open it."
          what="The service did not answer when asked who you are. Nothing has changed on any case, and nothing you had entered has been lost."
          onRetry={() => void session.refetch()}
        />
      </div>
    );
  }

  if ((session.data.data.role ?? 'public') !== 'public') return <>{children}</>;

  return (
    <div className="mx-auto max-w-[760px] py-8">
      <article className="sheet-flat overflow-hidden">
        {/* The masthead every working screen in this product opens on. A refusal
            is a screen too, and it should not look like an error. */}
        <div className="deep deep-field px-6 py-8">
          <p className="field-label !text-deep-dim">Published to the programme</p>
          <h1 className="mt-2 max-w-[22ch] font-display text-h1 text-deep-ink">{what}</h1>
          <p className="mt-3 max-w-doc text-body text-deep-dim">{why}</p>
        </div>

        <div className="px-6 py-6">
          <p className="text-body text-ink">
            Registering is free and takes a few minutes. It is what lets the programme tell you which challenges you
            are eligible for, answer your clarifications on the record, and pay you against a milestone.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton tone="primary" to="/register">
              Create an account
            </LinkButton>
            <LinkButton to="/login">Sign in</LinkButton>
          </div>

          <div className="mt-8 border-t border-rule pt-6">
            <p className="field-label">Open to anyone, without an account</p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <li>
                <Link to="/" className="text-body text-ink underline underline-offset-2 hover:text-verify">
                  The demand board — what departments need right now
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-body text-ink underline underline-offset-2 hover:text-verify">
                  How it works — nine stages, seven gates
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </article>
    </div>
  );
}
