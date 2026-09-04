import { z } from 'zod';
import { policyNumber } from '@/config/policies';

const MIN = policyNumber('evaluation.rationale.minChars');

export const criterionScoreSchema = z.object({
  criterionId: z.string().min(1),
  score: z.number().min(0, 'Scores run from 0 to 5.').max(5, 'Scores run from 0 to 5.'),
  rationale: z
    .string()
    .min(MIN, `Write at least ${MIN} characters explaining this score. A score without a reason is not defensible.`),
  evidenceReference: z.string().min(3, 'Point to the part of the proposal you relied on.'),
});

export const coiSchema = z
  .object({
    hasConflict: z.boolean(),
    natureOfConflict: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.hasConflict && (v.natureOfConflict ?? '').trim().length < 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['natureOfConflict'],
        message: 'Describe the relationship in at least 15 characters. The programme management unit reads this.',
      });
    }
  });

export const minutesSchema = z.object({
  minutes: z.string().min(80, 'Minutes are a gate 3 precondition. Write at least 80 characters.'),
});

export type CriterionScoreInput = z.infer<typeof criterionScoreSchema>;
export type CoiInput = z.infer<typeof coiSchema>;
