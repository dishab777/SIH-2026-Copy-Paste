import type { ReactNode } from 'react';
import { rolesThatCan, type Action, type Resource } from '@/config/rbac';
import { Button } from '@/components/ui/Button';

export interface ApprovalBarProps {
  /** One sentence: what happens if the primary action is taken. */
  consequence: string;
  /** Who finds out. Named, not "stakeholders". */
  notifies?: readonly string[];
  blocked?: { title: string; reasons: readonly string[] };
  /**
   * What is being decided, in two or three words: "Gate 4 — continue or stop
   * the pilot", "Milestone 2 — acceptance finding". Without it the bar is a
   * sentence and a button with nothing naming the act.
   */
  eyebrow?: string;
  children: ReactNode;
}

/**
 * The sticky decision bar.
 *
 * It never shows a button without saying what the button does and who hears
 * about it. That was true before; what was not true is that it looked like the
 * most important thing on the screen. It was a white strip with a soft shadow
 * carrying the consequence, the notify list and the primary control at roughly
 * equal weight, which on a gate decision — the moment an officer puts a finding
 * on the permanent record — read as a footnote.
 *
 * So it takes the treatment the validator's sign bar took: a saffron hairline
 * along the top edge, a real lift, an eyebrow naming the act, and the blocking
 * reasons set as a hold-toned block rather than red body text. The primary
 * control keeps its own contrast when it is unavailable; a control faded to
 * nothing does not explain itself.
 */
export function ApprovalBar({ consequence, notifies, blocked, eyebrow, children }: ApprovalBarProps) {
  return (
    <div
      className={[
        // Two rules, not one: the heavy line reads as the foot of the form and
        // stops the bar looking like a page torn across the content behind it.
        'relative sticky bottom-0 z-20 -mx-4 mt-8 border-t-2 border-t-ink px-4 py-5 shadow-lift md:-mx-6 md:px-6',
        blocked ? 'bg-seal-wash' : 'bg-sheet',
      ].join(' ')}
    >
      {/* The lit edge. The same one the primary control carries, so the bar and
          the button it holds read as one object. */}
      <span aria-hidden className="absolute inset-x-0 top-0 block h-0.5 bg-saffron" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 basis-full lg:basis-auto">
          {eyebrow ? (
            <p className="field-label mb-2 flex items-center gap-2 !text-saffron-ink">
              <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
              {eyebrow}
            </p>
          ) : null}

          {blocked ? (
            <div className="rounded-control border border-rule border-l-2 border-l-seal bg-sheet px-4 py-3">
              <p className="max-w-doc text-body font-semibold text-ink">{blocked.title}</p>
              <ul className="mt-1.5 max-w-doc list-disc pl-5 text-body text-ink">
                {blocked.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="max-w-doc text-lead text-ink">{consequence}</p>
          )}

          {notifies?.length ? (
            <p className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="field-label">Notifies</span>
              {notifies.map((n) => (
                <span
                  key={n}
                  className="rounded-pill border border-rule bg-ledger px-2.5 py-0.5 text-micro text-ink-soft"
                >
                  {n}
                </span>
              ))}
            </p>
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
    <div className="rounded-control border border-rule border-l-2 border-l-rule bg-ledger px-4 py-3">
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
