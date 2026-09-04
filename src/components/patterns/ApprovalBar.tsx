import type { ReactNode } from 'react';
import { rolesThatCan, type Action, type Resource } from '@/config/rbac';
import { Button } from '@/components/ui/Button';

export interface ApprovalBarProps {
  /** One sentence: what happens if the primary action is taken. */
  consequence: string;
  /** Who finds out. Named, not "stakeholders". */
  notifies?: readonly string[];
  blocked?: { title: string; reasons: readonly string[] };
  children: ReactNode;
}

/**
 * Sticky decision bar. It never shows a button without saying what the button does
 * and who hears about it.
 */
export function ApprovalBar({ consequence, notifies, blocked, children }: ApprovalBarProps) {
  return (
    <div
      className={[
        // Two rules, not one: the heavy line reads as the foot of the form and
        // stops the bar looking like a page torn across the content behind it.
        'sticky bottom-0 z-20 -mx-4 mt-8 border-t-2 bg-sheet px-4 py-4 shadow-[0_-6px_16px_rgba(26,29,26,0.06)] md:-mx-6 md:px-6',
        blocked ? 'border-t-seal bg-seal-wash' : 'border-t-ink',
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 basis-full lg:basis-auto">
          {blocked ? (
            <>
              <p className="max-w-doc text-body font-medium text-ink">{blocked.title}</p>
              <ul className="mt-1 max-w-doc list-disc pl-5 text-body text-ink">
                {blocked.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="max-w-doc text-body text-ink">{consequence}</p>
          )}
          {notifies?.length ? (
            <p className="mt-2 max-w-doc text-micro text-ink-soft">Notifies: {notifies.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>
      </div>
    </div>
  );
}

export interface PermissionGateProps {
  allowed: boolean;
  action: Action;
  resource: Resource;
  /** What the user can still do, stated positively. */
  viewNote?: string;
  onRequestAccess?: () => void;
  children: ReactNode;
}

/**
 * Controls are never silently removed. A user who cannot act is told what they
 * can do, what the action needs, and who holds it.
 */
export function PermissionGate({ allowed, action, resource, viewNote, onRequestAccess, children }: PermissionGateProps) {
  if (allowed) return <>{children}</>;
  const roles = rolesThatCan(action, resource);
  return (
    <div className="border-l-2 border-l-rule bg-ledger px-4 py-3">
      <p className="text-body text-ink">{viewNote ?? 'You can view this record.'}</p>
      <p className="mt-1 text-body text-ink-soft">
        {action.charAt(0).toUpperCase() + action.slice(1)}ing this {resource} requires{' '}
        {roles.length ? roles.map((r) => r.label).join(' or ') : 'a different role'}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 opacity-60">
        <div aria-hidden className="pointer-events-none">
          {children}
        </div>
      </div>
      {onRequestAccess ? (
        <div className="mt-3">
          <Button size="sm" onClick={onRequestAccess}>
            Request access
          </Button>
        </div>
      ) : null}
    </div>
  );
}
