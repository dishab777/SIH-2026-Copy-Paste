import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type StatusTone = 'verify' | 'hold' | 'seal' | 'neutral';

/**
 * A status is never a colour alone and never a mark alone.
 * It is a wash, a dot in the ink of the act and the words, together — so it
 * still reads on a photocopy, which is where a government record usually ends
 * up, and for a reader who cannot separate the three inks by hue.
 */
const TONE: Record<StatusTone, { chip: string; dot: string }> = {
  verify: { chip: 'border border-verify bg-verify-wash text-verify', dot: 'bg-verify' },
  hold: { chip: 'border border-hold bg-hold-wash text-hold', dot: 'bg-hold' },
  seal: { chip: 'border border-seal bg-seal-wash text-seal', dot: 'bg-seal' },
  neutral: { chip: 'border border-rule bg-ledger text-ink-soft', dot: 'bg-rule' },
};

/*
 * The same four states, mixed for the deep ground. A badge sits in the
 * page-head aside on a working screen, where the paper inks measure under 2:1
 * and the wash disappears entirely.
 */
const TONE_DEEP: Record<StatusTone, { chip: string; dot: string }> = {
  verify: { chip: 'border border-signal bg-signal-veil text-signal', dot: 'bg-signal' },
  hold: { chip: 'border border-saffron bg-saffron-veil text-saffron', dot: 'bg-saffron' },
  seal: { chip: 'border border-seal-lit bg-seal-veil text-seal-lit', dot: 'bg-seal-lit' },
  neutral: { chip: 'border border-deep-rule bg-deep-2 text-deep-dim', dot: 'bg-deep-dim' },
};

export interface BadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  title?: string;
  /** The ground it sits on. A badge in a deep masthead takes the deep inks. */
  ground?: 'paper' | 'deep';
}

export function Badge({ tone = 'neutral', children, title, ground = 'paper' }: BadgeProps) {
  const t = (ground === 'deep' ? TONE_DEEP : TONE)[tone];
  return (
    <span
      title={title}
      className={['inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-label font-semibold', t.chip].join(
        ' ',
      )}
    >
      <span aria-hidden className={['h-1.5 w-1.5 shrink-0 rounded-full', t.dot].join(' ')} />
      {children}
    </span>
  );
}

/*
 * Every status the product shows, with the ink it is read in and the key its
 * words are held under. The words themselves are not here. A badge is drawn by
 * a component, which is the only place the bundle can be reached, so the map
 * carries the key and `StatusBadge` resolves it at the render site.
 */
const STATUS: Record<string, { tone: StatusTone; labelKey: string }> = {
  // Challenge
  draft: { tone: 'neutral', labelKey: 'status.value.draft' },
  in_review: { tone: 'hold', labelKey: 'status.value.in_review' },
  open: { tone: 'verify', labelKey: 'status.value.open' },
  closing_soon: { tone: 'hold', labelKey: 'status.value.closing_soon' },
  closed: { tone: 'neutral', labelKey: 'status.value.closed' },
  awarded: { tone: 'verify', labelKey: 'status.value.awarded' },
  cancelled: { tone: 'seal', labelKey: 'status.value.cancelled' },
  // Application
  submitted: { tone: 'neutral', labelKey: 'status.value.submitted' },
  screening: { tone: 'hold', labelKey: 'status.value.screening' },
  eligible: { tone: 'verify', labelKey: 'status.value.eligible' },
  ineligible: { tone: 'seal', labelKey: 'status.value.ineligible' },
  needs_review: { tone: 'hold', labelKey: 'status.value.needs_review' },
  shortlisted: { tone: 'verify', labelKey: 'status.value.shortlisted' },
  under_evaluation: { tone: 'hold', labelKey: 'status.value.under_evaluation' },
  not_selected: { tone: 'neutral', labelKey: 'status.value.not_selected' },
  withdrawn: { tone: 'neutral', labelKey: 'status.value.withdrawn' },
  // Milestone
  not_started: { tone: 'neutral', labelKey: 'status.value.not_started' },
  in_progress: { tone: 'hold', labelKey: 'status.value.in_progress' },
  under_review: { tone: 'hold', labelKey: 'status.value.under_review' },
  approved: { tone: 'verify', labelKey: 'status.value.approved' },
  rejected: { tone: 'seal', labelKey: 'status.value.rejected' },
  revision_required: { tone: 'seal', labelKey: 'status.value.revision_required' },
  paid: { tone: 'verify', labelKey: 'status.value.paid' },
  // Pilot
  contracting: { tone: 'hold', labelKey: 'status.value.contracting' },
  executing: { tone: 'verify', labelKey: 'status.value.executing' },
  awaiting_validation: { tone: 'hold', labelKey: 'status.value.awaiting_validation' },
  validated: { tone: 'verify', labelKey: 'status.value.validated' },
  not_validated: { tone: 'seal', labelKey: 'status.value.not_validated' },
  closed_after_pilot: { tone: 'neutral', labelKey: 'status.value.closed_after_pilot' },
  scaled: { tone: 'verify', labelKey: 'status.value.scaled' },
  // Claims
  raised: { tone: 'neutral', labelKey: 'status.value.raised' },
  in_approval: { tone: 'hold', labelKey: 'status.value.in_approval' },
  on_hold: { tone: 'seal', labelKey: 'status.value.on_hold' },
  // Eligibility
  auto_pass: { tone: 'verify', labelKey: 'status.value.auto_pass' },
  auto_fail: { tone: 'seal', labelKey: 'status.value.auto_fail' },
  not_run: { tone: 'neutral', labelKey: 'status.value.not_run' },
  pass: { tone: 'verify', labelKey: 'status.value.pass' },
  fail: { tone: 'seal', labelKey: 'status.value.fail' },
  review: { tone: 'hold', labelKey: 'status.value.review' },
  // Gates
  cleared: { tone: 'verify', labelKey: 'status.value.cleared' },
  blocked: { tone: 'seal', labelKey: 'status.value.blocked' },
  future: { tone: 'neutral', labelKey: 'status.value.future' },
  // Verification / scan
  verified: { tone: 'verify', labelKey: 'status.value.verified' },
  pending: { tone: 'hold', labelKey: 'status.value.pending' },
  failed: { tone: 'seal', labelKey: 'status.value.failed' },
  clean: { tone: 'verify', labelKey: 'status.value.clean' },
  // Validation outcomes
  validated_with_qualifications: { tone: 'hold', labelKey: 'status.value.validated_with_qualifications' },
  met: { tone: 'verify', labelKey: 'status.value.met' },
  partially_met: { tone: 'hold', labelKey: 'status.value.partially_met' },
  not_met: { tone: 'seal', labelKey: 'status.value.not_met' },
  // Recognition
  recognised: { tone: 'verify', labelKey: 'status.value.recognised' },
  expired: { tone: 'seal', labelKey: 'status.value.expired' },
  unverified: { tone: 'hold', labelKey: 'status.value.unverified' },
  not_a_startup: { tone: 'neutral', labelKey: 'status.value.not_a_startup' },
  active: { tone: 'verify', labelKey: 'status.value.active' },
  suspended: { tone: 'seal', labelKey: 'status.value.suspended' },
  // Integrations
  mock_healthy: { tone: 'verify', labelKey: 'status.value.mock_healthy' },
  mock_degraded: { tone: 'hold', labelKey: 'status.value.mock_degraded' },
  mock_down: { tone: 'seal', labelKey: 'status.value.mock_down' },
  not_configured: { tone: 'neutral', labelKey: 'status.value.not_configured' },
  // Risks and incidents
  mitigating: { tone: 'hold', labelKey: 'status.value.mitigating' },
  contained: { tone: 'hold', labelKey: 'status.value.contained' },
  resolved: { tone: 'verify', labelKey: 'status.value.resolved' },
  low: { tone: 'neutral', labelKey: 'status.value.low' },
  medium: { tone: 'hold', labelKey: 'status.value.medium' },
  high: { tone: 'seal', labelKey: 'status.value.high' },
};

export function statusTone(status: string): StatusTone {
  return STATUS[status]?.tone ?? 'neutral';
}

/**
 * The bundle key a status is read by, or nothing for a value the interface
 * does not name. This is not a component and cannot reach a hook, so it hands
 * the key back for the caller to resolve.
 */
export function statusLabelKey(status: string): string | undefined {
  return STATUS[status]?.labelKey;
}

/** The last resort for a status the map does not carry: its own words, tidied. */
export function statusWords(status: string): string {
  const words = status.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function StatusBadge({
  status,
  label,
  ground = 'paper',
}: {
  status: string;
  label?: string;
  ground?: 'paper' | 'deep';
}) {
  const { t } = useTranslation();
  const key = statusLabelKey(status);
  return (
    <Badge tone={statusTone(status)} ground={ground}>
      {label ?? (key ? t(key) : statusWords(status))}
    </Badge>
  );
}
