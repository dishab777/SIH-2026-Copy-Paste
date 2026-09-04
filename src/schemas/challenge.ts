import { z } from 'zod';
import { policyNumber } from '@/config/policies';

/** Challenge studio. One schema per step, composed into a whole-challenge schema. */

export const problemSchema = z.object({
  title: z.string().min(8, 'Give the challenge a title an applicant would recognise.'),
  whoAffected: z.string().min(30, 'Name the people affected and roughly how many. At least 30 characters.'),
  whatHappensToday: z.string().min(40, 'Describe the current process end to end, including where it fails.'),
  frequency: z.string().min(10, 'How often does this happen? A number is better than a word.'),
  costToday: z.string().min(20, 'State the cost in money, time or harm. If it has never been measured, say so.'),
  currentLimitations: z.string().min(20, 'Why has this not been solved already?'),
});

export const baselineSchema = z.object({
  metric: z.string().min(8, 'Name the metric you will measure.'),
  currentValue: z.number({ invalid_type_error: 'A baseline needs a number.' }).positive('The baseline must be greater than zero.'),
  unit: z.string().min(1, 'State the unit, for example minutes or percent.'),
  method: z.string().min(30, 'Describe how the baseline was measured, precisely enough for someone else to repeat it.'),
  sourceOfTruth: z.string().min(6, 'Name the register or system the figure came from.'),
  period: z.string().min(6, 'State the period the baseline covers.'),
});

export const outcomeSchema = z
  .object({
    statement: z.string().min(30, 'State the outcome in a sentence, without naming a technology.'),
    targetMetric: z.string().min(4, 'Name the metric the pilot will move.'),
    direction: z.enum(['decrease', 'increase']),
    magnitude: z.number({ invalid_type_error: 'A target needs a number.' }),
    unit: z.string().min(1, 'State the unit.'),
    method: z.string().min(30, 'Describe how the outcome will be measured. It must match the baseline method.'),
    minimumAcceptable: z.number({ invalid_type_error: 'State the minimum improvement worth paying for.' }),
    failureThreshold: z.number({ invalid_type_error: 'State the point at which the pilot has failed.' }),
    baselineValue: z.number().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.baselineValue === undefined) return;
    if (v.direction === 'decrease' && v.magnitude >= v.baselineValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['magnitude'],
        message: `A decreasing target must be below the baseline of ${v.baselineValue}.`,
      });
    }
    if (v.direction === 'increase' && v.magnitude <= v.baselineValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['magnitude'],
        message: `An increasing target must be above the baseline of ${v.baselineValue}.`,
      });
    }
  });

export const departmentProvidesSchema = z.object({
  data: z.string().min(20, 'Describe the data the department will share.'),
  dataTier: z.enum(['synthetic', 'masked', 'production']),
  fields: z.array(z.string()).min(1, 'List at least one field. Field-level justification is a data-clause requirement.'),
  volume: z.string().min(4, 'State roughly how much data there is.'),
  accessMethod: z.string().min(10, 'State how applicants will reach it.'),
  systems: z.array(z.string()).min(1, 'Name at least one system, described by capability rather than product.'),
  siteAccess: z.string().min(10, 'State what site access is available and on what notice.'),
  users: z.string().min(6, 'State who from the department will be available.'),
  staffTimeHoursPerWeek: z.number().min(0, 'State the staff time in hours a week, even if it is zero.'),
  willNotProvide: z.array(z.string()).min(1, 'State at least one thing the department will not provide.'),
});

export const eligibilitySchema = z.object({
  ruleIds: z.array(z.string()).min(1, 'Select at least one eligibility rule.'),
  relaxationsAvailable: z.boolean(),
  relaxationNote: z.string().min(10, 'Explain what relief is available and what is not.'),
});

export const milestoneSchema = z.object({
  name: z.string().min(6, 'Name the milestone by its result, not its activity.'),
  requirement: z.string().min(20, 'State what must exist for this milestone to be complete.'),
  acceptanceTest: z.string().min(20, 'Write a test a third party could apply. No payment without one.'),
  evidenceRequired: z.array(z.string()).min(1, 'List the evidence needed to pass the test.'),
  paymentPaise: z.number().min(0),
  dueDayOffset: z.number().min(1),
});

export const pilotSchema = z
  .object({
    durationDays: z
      .number()
      .min(14, 'A pilot shorter than two weeks cannot produce a measurable outcome.')
      .max(policyNumber('pilot.maxDurationDays'), `A pilot longer than ${policyNumber('pilot.maxDurationDays')} days needs a fresh gate 3 record.`),
    budgetPaise: z.number().positive('A pilot budget is required to clear gate 0.'),
    budgetHead: z.string().min(6, 'Name the budget head the money comes from.'),
    approvalAuthority: z.string().min(6, 'Name the authority approving the spend.'),
    milestones: z
      .array(milestoneSchema)
      .min(1, 'At least one milestone is required.')
      .max(policyNumber('pilot.milestone.maxCount'), `At most ${policyNumber('pilot.milestone.maxCount')} milestones.`),
  })
  .superRefine((v, ctx) => {
    const total = v.milestones.reduce((s, m) => s + m.paymentPaise, 0);
    if (total !== v.budgetPaise) {
      const diff = Math.abs(total - v.budgetPaise) / 100;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['milestones'],
        message: `Milestone payments must total the pilot budget exactly. They are out by ₹${diff.toLocaleString('en-IN')}.`,
      });
    }
  });

export const legalSchema = z.object({
  templateId: z.string().min(1, 'Attach a pilot agreement template.'),
  ipPosition: z.enum(['startup_retains', 'joint', 'government_assigned']),
  ipClauseIds: z.array(z.string()).min(1, 'Attach the IP clauses.'),
  dataClauseIds: z.array(z.string()).min(1, 'Attach the data clauses.'),
  cyberLevel: z.enum(['basic', 'standard', 'elevated']),
  legalPreClearance: z.boolean(),
  legalPreClearanceNote: z.string().optional(),
});

export type ProblemInput = z.infer<typeof problemSchema>;
export type BaselineInput = z.infer<typeof baselineSchema>;
export type OutcomeInput = z.infer<typeof outcomeSchema>;
export type DepartmentProvidesInput = z.infer<typeof departmentProvidesSchema>;
export type EligibilityInput = z.infer<typeof eligibilitySchema>;
export type PilotInput = z.infer<typeof pilotSchema>;
export type LegalInput = z.infer<typeof legalSchema>;
