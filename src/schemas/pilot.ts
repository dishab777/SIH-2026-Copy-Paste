import { z } from 'zod';

export const milestoneDecisionSchema = z.object({
  finding: z.enum(['met', 'partially_met', 'not_met']),
  note: z.string().min(20, 'State how the acceptance test was or was not met. At least 20 characters.'),
});

export const attributionSchema = z.object({
  explanation: z
    .string()
    .min(
      60,
      'Explain why the change is attributable to the pilot rather than to something else. At least 60 characters.',
    ),
});

export const riskSchema = z.object({
  title: z.string().min(10, 'Describe the risk in a sentence.'),
  category: z.enum(['delivery', 'data', 'security', 'adoption', 'legal', 'financial']),
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  mitigation: z.string().min(20, 'State what is being done about it.'),
});

export const incidentResolutionSchema = z.object({
  resolution: z.string().min(20, 'Describe what was done. At least 20 characters.'),
});

export const changeRequestSchema = z.object({
  title: z.string().min(10, 'Name the change.'),
  reason: z.string().min(40, 'Explain why it is necessary rather than convenient.'),
  moneyPaise: z.number(),
  days: z.number(),
  scope: z.string().min(10, 'State the change to scope.'),
});

export type MilestoneDecisionInput = z.infer<typeof milestoneDecisionSchema>;
export type AttributionInput = z.infer<typeof attributionSchema>;
export type RiskInput = z.infer<typeof riskSchema>;
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;
