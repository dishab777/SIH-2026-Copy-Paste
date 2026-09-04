import type { ReactNode } from 'react';

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

const STATUS_TONES: Record<string, StatusTone> = {
  // Challenge
  draft: 'neutral',
  in_review: 'hold',
  open: 'verify',
  closing_soon: 'hold',
  closed: 'neutral',
  awarded: 'verify',
  cancelled: 'seal',
  // Application
  submitted: 'neutral',
  screening: 'hold',
  eligible: 'verify',
  ineligible: 'seal',
  needs_review: 'hold',
  shortlisted: 'verify',
  under_evaluation: 'hold',
  not_selected: 'neutral',
  withdrawn: 'neutral',
  // Milestone
  not_started: 'neutral',
  in_progress: 'hold',
  under_review: 'hold',
  approved: 'verify',
  rejected: 'seal',
  revision_required: 'seal',
  paid: 'verify',
  // Pilot
  contracting: 'hold',
  executing: 'verify',
  awaiting_validation: 'hold',
  validated: 'verify',
  not_validated: 'seal',
  closed_after_pilot: 'neutral',
  scaled: 'verify',
  // Claims
  raised: 'neutral',
  in_approval: 'hold',
  on_hold: 'seal',
  // Eligibility
  auto_pass: 'verify',
  auto_fail: 'seal',
  not_run: 'neutral',
  pass: 'verify',
  fail: 'seal',
  review: 'hold',
  // Gates
  cleared: 'verify',
  blocked: 'seal',
  future: 'neutral',
  // Verification / scan
  verified: 'verify',
  pending: 'hold',
  failed: 'seal',
  clean: 'verify',
  // Validation outcomes
  validated_with_qualifications: 'hold',
  met: 'verify',
  partially_met: 'hold',
  not_met: 'seal',
  // Recognition
  recognised: 'verify',
  expired: 'seal',
  unverified: 'hold',
  not_a_startup: 'neutral',
  active: 'verify',
  suspended: 'seal',
  // Integrations
  mock_healthy: 'verify',
  mock_degraded: 'hold',
  mock_down: 'seal',
  not_configured: 'neutral',
  // Risks and incidents
  mitigating: 'hold',
  contained: 'hold',
  resolved: 'verify',
  low: 'neutral',
  medium: 'hold',
  high: 'seal',
};

export function statusTone(status: string): StatusTone {
  return STATUS_TONES[status] ?? 'neutral';
}

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
  return (
    <Badge tone={statusTone(status)} ground={ground}>
      {label ?? statusWords(status)}
    </Badge>
  );
}
