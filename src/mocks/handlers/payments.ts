import { http } from 'msw';
import { policyNumber } from '@/config/policies';
import { digest } from '@/lib/ids';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { emptyIfScenario, fail, gate, notFound, ok, readBody, requirePermission } from './util';

const DEDUCTION_REASONS = [
  { code: 'LD', label: 'Liquidated damages for delay', citation: 'PRAYOG-SOP-9' },
  { code: 'PART', label: 'Partial acceptance — scope not fully met', citation: 'PRAYOG-SOP-9' },
  { code: 'REC', label: 'Recovery of an earlier overpayment', citation: 'PRAYOG-SOP-9' },
  { code: 'TAX', label: 'Statutory deduction at source', citation: 'PRAYOG-SOP-9' },
] as const;

export const paymentHandlers = [
  http.get('/api/payments', async ({ request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const url = new URL(request.url);
    let items = db.claims.slice();
    if (user?.role === 'startup') items = items.filter((c) => c.startupId === user.startupId);
    else if (user?.departmentId) items = items.filter((c) => c.departmentId === user.departmentId);
    const status = url.searchParams.getAll('status');
    if (status.length) items = items.filter((c) => status.includes(c.status));

    const limitDays = policyNumber('payment.milestone.limit.days');
    const now = db.now();
    const enriched = items
      .map((c) => {
        const elapsed = Math.floor((now.getTime() - new Date(c.acceptedOn).getTime()) / 86_400_000);
        return {
          claim: c,
          milestone: db.milestones.find((m) => m.id === c.milestoneId)!,
          pilot: db.pilots.find((p) => p.id === c.pilotId)!,
          startup: db.startups.find((s) => s.id === c.startupId)!,
          department: db.departments.find((d) => d.id === c.departmentId)!,
          daysElapsed: elapsed,
          daysRemaining: limitDays - elapsed,
          limitDays,
        };
      })
      .sort((a, b) => b.daysElapsed - a.daysElapsed);

    return ok({
      items: emptyIfScenario(enriched),
      limitDays,
      deductionReasons: DEDUCTION_REASONS,
      maxDeductionPercent: policyNumber('payment.deduction.max.percent'),
      bulkMax: policyNumber('payment.bulkApprove.max'),
      totals: {
        outstandingPaise: enriched
          .filter((e) => e.claim.status !== 'paid')
          .reduce((s, e) => s + e.claim.netPaise, 0),
        overdueCount: enriched.filter((e) => e.daysRemaining < 0 && e.claim.status !== 'paid').length,
        oldestDays: enriched.filter((e) => e.claim.status !== 'paid')[0]?.daysElapsed ?? 0,
      },
    });
  }),

  http.post('/api/payments/:id/approve', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'payment');
    if (denied) return denied;
    const db = getDb();
    const claim = db.claims.find((c) => c.id === params.id || c.caseId === params.id);
    if (!claim) return notFound('That claim');
    if (claim.status === 'paid') return fail(409, 'ALREADY_PAID', 'This claim has already been paid.');

    const body = await readBody<{ deductionPaise?: number; deductionReasonCode?: string }>(request);
    if (body.deductionPaise && body.deductionPaise > 0) {
      if (!body.deductionReasonCode) {
        return fail(422, 'REASON_CODE_REQUIRED', 'A deduction needs a reason code.', [
          `Choose one of: ${DEDUCTION_REASONS.map((d) => d.label).join('; ')}.`,
        ]);
      }
      const maxPercent = policyNumber('payment.deduction.max.percent');
      if (body.deductionPaise > (claim.amountPaise * maxPercent) / 100) {
        return fail(409, 'DEDUCTION_TOO_LARGE', 'That deduction exceeds the permissible maximum.', [
          `The configured maximum is ${maxPercent} percent of the claim. A larger deduction needs a separate competent-authority order.`,
        ]);
      }
      claim.deductionPaise = body.deductionPaise;
      claim.deductionReason = DEDUCTION_REASONS.find((d) => d.code === body.deductionReasonCode)?.label;
      claim.netPaise = claim.amountPaise - body.deductionPaise;
    }

    claim.status = 'approved';
    claim.approvalStep = 'With the procurement officer for release';
    return ok(claim, 'Claim approved. The ageing clock keeps running until it is paid.');
  }),

  http.post('/api/payments/:id/pay', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('pay', 'payment');
    if (denied) return denied;
    const db = getDb();
    const claim = db.claims.find((c) => c.id === params.id || c.caseId === params.id);
    if (!claim) return notFound('That claim');
    if (claim.status === 'on_hold') {
      return fail(409, 'CLAIM_ON_HOLD', 'This claim is on hold and cannot be paid.', [
        claim.holdReason ?? 'Clear the hold first.',
      ]);
    }
    const now = db.now();
    claim.status = 'paid';
    claim.paidOn = now.toISOString();
    // A payment is never shown as paid without a date and a reference.
    claim.paymentReference = `PFMS/${claim.departmentId}/2026/${digest(claim.id).slice(0, 6).toUpperCase()}`;
    claim.approvalStep = 'Paid';
    const milestone = db.milestones.find((m) => m.id === claim.milestoneId);
    if (milestone) milestone.status = 'paid';
    return ok(claim, `Paid. Reference ${claim.paymentReference}.`);
  }),

  http.post('/api/payments/bulk-approve', async ({ request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const denied = requirePermission('approve', 'payment');
    if (denied) return denied;
    const db = getDb();
    const body = await readBody<{ ids: string[] }>(request);
    const claims = db.claims.filter((c) => body.ids.includes(c.id));
    const withExceptions = claims.filter((c) => c.exception);
    // Bulk approval only where there is nothing to look at individually.
    if (withExceptions.length > 0) {
      return fail(409, 'EXCEPTIONS_PRESENT', 'These claims cannot be approved in bulk.', [
        ...withExceptions.map((c) => `${c.caseId}: ${c.exception}`),
        'Open each of these individually.',
      ]);
    }
    const max = policyNumber('payment.bulkApprove.max');
    if (claims.length > max) {
      return fail(409, 'BATCH_TOO_LARGE', 'That batch is larger than the configured limit.', [
        `The configured maximum is ${max} claims in one approval.`,
      ]);
    }
    claims.forEach((c) => {
      c.status = 'approved';
      c.approvalStep = 'With the procurement officer for release';
    });
    return ok({ approved: claims.length }, `${claims.length} claims approved.`);
  }),

  http.post('/api/payments/:id/hold', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const claim = db.claims.find((c) => c.id === params.id);
    if (!claim) return notFound('That claim');
    const body = await readBody<{ reason: string }>(request);
    if (!body.reason || body.reason.length < 20) {
      return fail(422, 'VALIDATION_FAILED', 'A hold needs a written reason.', [
        'The startup is told who is holding the claim and what is needed. Write at least 20 characters.',
      ]);
    }
    claim.status = 'on_hold';
    claim.holdReason = body.reason;
    claim.heldBy = currentUser()?.name;
    claim.exception = 'Held pending action';
    return ok(claim, 'Claim held. The startup can see who holds it and what is needed.');
  }),
];
