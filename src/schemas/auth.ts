import { z } from 'zod';

/** Zod is the single source of truth for validation, client and mock API alike. */

export const registerStartupSchema = z.object({
  legalName: z.string().min(3, 'Legal name is required, exactly as on the certificate of incorporation.'),
  tradeName: z.string().min(2, 'Trading name is required.'),
  cin: z
    .string()
    .min(21, 'A corporate identification number is 21 characters.')
    .max(21, 'A corporate identification number is 21 characters.'),
  email: z.string().email('A valid work email address is required.'),
  state: z.string().min(1, 'Choose the state where the entity is registered.'),
  dpiitRecognitionNumber: z
    .string()
    .regex(/^(DIPP\d{4,8})?$/, 'A recognition number looks like DIPP123456. Leave it blank if you do not have one yet.')
    .optional()
    .or(z.literal('')),
  acceptsTerms: z
    .boolean()
    .refine((v) => v, { message: 'Confirm the details are accurate before registering.' }),
});

export type RegisterStartupInput = z.infer<typeof registerStartupSchema>;

export const registerExpertSchema = z.object({
  name: z.string().min(3, 'Your name is required.'),
  email: z.string().email('A valid email address is required.'),
  affiliation: z.string().min(3, 'Name the institution or organisation you are affiliated with.'),
  expertise: z.array(z.string()).min(1, 'Choose at least one area of expertise.'),
  declaresIndependence: z.boolean().refine((v) => v, {
    message: 'Confirm you will declare conflicts before opening any proposal. Scoring is blocked until you do.',
  }),
});

export type RegisterExpertInput = z.infer<typeof registerExpertSchema>;
