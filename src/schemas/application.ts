import { z } from 'zod';

/** Startup application wizard. One schema per step; the whole is checked before submission. */

export const eligibilityStepSchema = z.object({
  confirmedProfileCurrent: z.literal(true, {
    errorMap: () => ({
      message: 'Confirm your profile details are current. Screening uses them, not a fresh declaration.',
    }),
  }),
});

export const solutionStepSchema = z.object({
  problemUnderstanding: z
    .string()
    .min(80, 'Show you understand the problem as the department experiences it. At least 80 characters.'),
  approach: z.string().min(80, 'Describe your approach. At least 80 characters.'),
  existingSolution: z.string().min(20, 'State what already exists and works today.'),
  proposedDevelopment: z.string().min(20, 'State what you will build during the pilot.'),
  trl: z.number().min(1, 'Technology readiness runs from 1 to 9.').max(9, 'Technology readiness runs from 1 to 9.'),
});

export const pilotPlanStepSchema = z.object({
  durationDays: z.number().min(14, 'A pilot shorter than two weeks cannot produce a measurable outcome.'),
  milestones: z
    .array(
      z.object({
        name: z.string().min(6, 'Name each milestone by its result.'),
        deliverable: z.string().min(20, 'State what will exist at the end of it.'),
        acceptanceTest: z.string().min(20, 'State how the department will test it.'),
        dayOffset: z.number().min(1),
      }),
    )
    .min(1, 'At least one milestone is required.'),
  dependencies: z.array(z.string()).min(1, 'List what you need from the department, with lead times.'),
});

export const commercialsStepSchema = z.object({
  milestoneCostsPaise: z.array(z.number().min(0)).min(1),
  costBasis: z.string().min(30, 'Explain how the price is built up. At least 30 characters.'),
  overBudgetJustification: z.string().optional(),
});

export const dataStepSchema = z.object({
  dataRequested: z.array(z.string()).min(1, 'List the fields you actually need. Asking for less scores better.'),
  tier: z.enum(['synthetic', 'masked', 'production']),
  processingLocation: z.string().min(6, 'State where the data will be processed.'),
  subProcessors: z.array(z.string()),
  certifications: z.array(z.string()),
});

export const declarationsStepSchema = z.object({
  conflict: z.boolean(),
  conflictDetail: z.string().optional(),
  debarred: z.boolean(),
  blacklisted: z.boolean(),
  startupDeclaration: z.boolean(),
  signatureName: z.string().min(3, 'The authorised signatory must be named.'),
});

export type SolutionStepInput = z.infer<typeof solutionStepSchema>;
export type CommercialsStepInput = z.infer<typeof commercialsStepSchema>;
export type DataStepInput = z.infer<typeof dataStepSchema>;
export type DeclarationsStepInput = z.infer<typeof declarationsStepSchema>;
