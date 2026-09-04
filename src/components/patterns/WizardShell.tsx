import { useEffect, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { InlineNote } from '@/components/ui/Feedback';
import { dayTime } from '@/lib/format';

export interface WizardStep {
  index: number;
  slug: string;
  title: string;
  summary: string;
  /** Fields still missing on this step. Empty means complete. */
  missing: string[];
  /** A step can be blocked by something outside itself. Say what. */
  blockedBy?: string;
}

export interface WizardShellProps {
  title: string;
  caseId?: string;
  steps: WizardStep[];
  currentSlug: string;
  onNavigate: (slug: string) => void;
  onSaveDraft: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'failed';
  savedAt?: string;
  onExit: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Shown above the step when a save has failed, so nothing is lost silently. */
  saveError?: string;
  onRetrySave?: () => void;
}

export function WizardShell({
  title,
  caseId,
  steps,
  currentSlug,
  onNavigate,
  onSaveDraft,
  saveState,
  savedAt,
  onExit,
  children,
  footer,
  saveError,
  onRetrySave,
}: WizardShellProps) {
  const [confirmExit, setConfirmExit] = useState(false);
  const current = steps.find((s) => s.slug === currentSlug) ?? steps[0]!;
  const dirty = saveState === 'saving' || saveState === 'failed';

  // Leaving a wizard with unsaved work asks first.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === 'blocked') setConfirmExit(true);
  }, [blocker.state]);

  const previous = steps[current.index - 2];
  const next = steps[current.index];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Steps" className="lg:sticky lg:top-4 lg:self-start">
        <div className="sheet-flat">
          <div className="border-b border-ink px-4 py-2">
            <h2 className="text-label text-ink">{title}</h2>
            {caseId ? <p className="mt-0.5 text-micro text-ink-soft tnum">{caseId}</p> : null}
          </div>
          <ol>
            {steps.map((s) => {
              const isCurrent = s.slug === currentSlug;
              const complete = s.missing.length === 0;
              return (
                <li key={s.slug} className="border-b border-rule last:border-b-0">
                  <button
                    type="button"
                    aria-current={isCurrent ? 'step' : undefined}
                    disabled={Boolean(s.blockedBy)}
                    onClick={() => onNavigate(s.slug)}
                    className={[
                      'flex w-full items-start gap-3 px-4 py-3 text-left',
                      isCurrent ? 'bg-verify-wash' : 'hover:bg-ledger',
                      s.blockedBy ? 'cursor-not-allowed opacity-60' : '',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className={[
                        'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center border text-micro tnum',
                        complete ? 'border-verify text-verify' : 'border-rule text-ink-soft',
                      ].join(' ')}
                    >
                      {s.index}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-body text-ink">{s.title}</span>
                      {s.blockedBy ? (
                        <span className="block text-micro text-seal">{s.blockedBy}</span>
                      ) : complete ? (
                        <span className="block text-micro text-ink-soft">Complete</span>
                      ) : (
                        <span className="block text-micro text-ink-soft">
                          {s.missing.length} field{s.missing.length === 1 ? '' : 's'} left
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="border-t border-rule px-4 py-3">
            <Button size="sm" block onClick={onSaveDraft} loading={saveState === 'saving'} loadingLabel="Saving">
              Save draft
            </Button>
            <p aria-live="polite" className="mt-2 text-micro text-ink-soft">
              {saveState === 'saved' && savedAt
                ? `Saved ${dayTime(savedAt)}`
                : saveState === 'saving'
                  ? 'Saving'
                  : saveState === 'failed'
                    ? 'Not saved'
                    : savedAt
                      ? `Last saved ${dayTime(savedAt)}`
                      : 'Not saved yet'}
            </p>
          </div>
        </div>
      </nav>

      <div className="min-w-0">
        {saveError ? (
          <div className="mb-6">
            <InlineNote tone="seal" title="Unable to save. Your changes are preserved.">
              <p>{saveError}</p>
              {onRetrySave ? (
                <div className="mt-3">
                  <Button size="sm" onClick={onRetrySave}>
                    Retry
                  </Button>
                </div>
              ) : null}
            </InlineNote>
          </div>
        ) : null}

        <header className="mb-6">
          <p className="text-micro text-ink-soft tnum">
            Step {current.index} of {steps.length}
          </p>
          <h2 className="mt-1 text-h2 text-ink">{current.title}</h2>
          <p className="mt-1 max-w-doc text-body text-ink-soft">{current.summary}</p>
        </header>

        {current.missing.length > 0 ? (
          <div className="mb-6">
            <InlineNote tone="hold" title="Still needed on this step">
              <ul className="list-disc pl-5">
                {current.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </InlineNote>
          </div>
        ) : null}

        {children}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
          <Button onClick={() => setConfirmExit(true)}>Leave the wizard</Button>
          <div className="flex items-center gap-3">
            {previous ? <Button onClick={() => onNavigate(previous.slug)}>Back to {previous.title.toLowerCase()}</Button> : null}
            {next ? (
              <Button tone="primary" onClick={() => onNavigate(next.slug)}>
                Continue to {next.title.toLowerCase()}
              </Button>
            ) : null}
            {footer}
          </div>
        </div>
      </div>

      <Modal
        open={confirmExit}
        onClose={() => {
          setConfirmExit(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
        title="Leave without saving?"
        description="Your draft is kept, but anything typed since the last save is not."
        footer={
          <>
            <Button
              onClick={() => {
                setConfirmExit(false);
                if (blocker.state === 'blocked') blocker.reset();
              }}
            >
              Stay on this step
            </Button>
            <Button
              tone="primary"
              onClick={() => {
                onSaveDraft();
                setConfirmExit(false);
                if (blocker.state === 'blocked') blocker.proceed();
              }}
            >
              Save draft and leave
            </Button>
            <Button
              tone="destructive"
              onClick={() => {
                setConfirmExit(false);
                if (blocker.state === 'blocked') blocker.proceed();
                else onExit();
              }}
            >
              Leave without saving
            </Button>
          </>
        }
      >
        <p className="text-body text-ink">
          {steps.filter((s) => s.missing.length > 0).length} step
          {steps.filter((s) => s.missing.length > 0).length === 1 ? '' : 's'} still have fields to complete. You can come
          back to this draft at any time.
        </p>
      </Modal>
    </div>
  );
}
