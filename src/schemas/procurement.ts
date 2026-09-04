import { z } from 'zod';
import { policyNumber } from '@/config/policies';

export const validationSignSchema = z
  .object({
    outcome: z.enum(['validated', 'validated_with_qualifications', 'not_validated']),
    qualifications: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.outcome === 'validated_with_qualifications' && (v.qualifications ?? '').trim().length < 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['qualifications'],
        message: 'State exactly what qualifies the validation, so a reader knows what was and was not proved.',
      });
    }
  });

export const pathwaySchema = z.object({
  pathwayId: z.string().min(1, 'Choose a pathway.'),
  justification: z
    .string()
    .min(80, 'Write the case for this pathway against the rule that permits it. At least 80 characters.'),
  reasonsAgainst: z
    .string()
    .min(30, 'Record the case against it too. That is what makes the decision defensible later.'),
});

const REASON_MIN = policyNumber('gate.decision.reason.minChars');

export const gateDecisionSchema = z.object({
  decision: z.enum(['clear', 'return', 'reject', 'defer']),
  reason: z.string().min(REASON_MIN, `A gate decision carries a written reason of at least ${REASON_MIN} characters.`),
});

export const waiverSchema = z.object({
  reason: z.string().min(80, 'A waiver is an exception on the record, not a shortcut. At least 80 characters.'),
});

export type PathwayInput = z.infer<typeof pathwaySchema>;
export type GateDecisionInput = z.infer<typeof gateDecisionSchema>;
export type ValidationSignInput = z.infer<typeof validationSignSchema>;
