import { z } from 'zod';
import { policyNumber } from '@/config/policies';

export const paymentApprovalSchema = z
  .object({
    amountPaise: z.number().positive(),
    deductionPaise: z.number().min(0, 'A deduction cannot be negative.'),
    deductionReasonCode: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.deductionPaise > 0 && !v.deductionReasonCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deductionReasonCode'],
        message: 'A deduction needs a reason code from the published list.',
      });
    }
    const max = policyNumber('payment.deduction.max.percent');
    if (v.deductionPaise > (v.amountPaise * max) / 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deductionPaise'],
        message: `The configured maximum deduction is ${max} percent of the claim. A larger deduction needs a separate competent-authority order.`,
      });
    }
  });

export const holdSchema = z.object({
  reason: z.string().min(20, 'The startup is told who holds the claim and what is needed. At least 20 characters.'),
});

export type PaymentApprovalInput = z.infer<typeof paymentApprovalSchema>;
