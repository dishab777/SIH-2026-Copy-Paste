import { z } from 'zod';
import { policy } from '@/config/policies';
import { countClasses, PASSWORD_CLASSES } from '@/lib/password';

/** Zod is the single source of truth for validation, client and mock API alike. */

/*
 * The password rule is configuration, not a constant. It is read once here, and
 * the same three keys drive the strength meter under the field and the check
 * the mock API repeats server-side — because a rule enforced only in a form is
 * not enforced at all.
 */
const MIN_LENGTH = policy<number>('account.password.minLength');
const MAX_LENGTH = policy<number>('account.password.maxLength');
const MIN_CLASSES = policy<number>('account.password.minClasses');

export const PASSWORD_RULE = `At least ${MIN_LENGTH} characters, including ${MIN_CLASSES} of: ${PASSWORD_CLASSES.map(
  (c) => c.label,
).join(', ')}.`;

const password = z
  .string()
  .min(MIN_LENGTH, `A password must be at least ${MIN_LENGTH} characters. Length matters more than symbols.`)
  .max(MAX_LENGTH, `A password cannot be longer than ${MAX_LENGTH} characters.`)
  .refine((v) => countClasses(v) >= MIN_CLASSES, {
    message: `Use ${MIN_CLASSES} of: ${PASSWORD_CLASSES.map((c) => c.label).join(', ')}.`,
  });

/*
 * What every account carries, whichever side of the programme you are on. The
 * two registration forms extend this rather than restating it, so the account
 * half of a sign-up cannot drift between them.
 */
const account = {
  fullName: z.string().min(3, 'Your full name is required, as it should appear on the record.'),
  email: z
    .string()
    .min(1, 'A work email address is required.')
    .email('That does not look like an email address. Check for a missing @ or a typo in the domain.'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'A ten-digit Indian mobile number, without the country code or spaces.'),
  designation: z.string().min(2, 'Your designation is required — it appears beside anything you sign.'),
  password,
  confirmPassword: z.string().min(1, 'Type the password a second time so a typo cannot lock you out.'),
};

/**
 * The two passwords must match, and the message has to land on the second box.
 * `path` is what puts it there — without it the error attaches to the object
 * and Field, which reads `errors.confirmPassword`, would never show it.
 */
const passwordsMatch = (v: { password: string; confirmPassword: string }): boolean =>
  v.password === v.confirmPassword;

const MATCH_ERROR = {
  message: 'The two passwords are different. Reveal them with Show to compare.',
  path: ['confirmPassword'],
};

/* ------------------------------------------------------------------ sign in */

/**
 * Signing in is not signing up.
 *
 * It checks that something was typed, and nothing more: applying the current
 * password policy here would lock out an account created before the policy was
 * tightened, which is precisely the account that most needs to get in and
 * change its password. Whether the credential is right is the server's answer.
 */
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Enter the email address you registered with.')
    .email('That does not look like an email address. Check for a missing @ or a typo in the domain.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type SignInInput = z.infer<typeof signInSchema>;

/* ------------------------------------------------------------------ startup */

export const registerStartupSchema = z
  .object({
    ...account,

    legalName: z.string().min(3, 'Legal name is required, exactly as on the certificate of incorporation.'),
    tradeName: z.string().min(2, 'Trading name is required. It is the name that appears on a published result.'),
    entityType: z.enum(['private_limited', 'llp', 'partnership', 'proprietorship'], {
      errorMap: () => ({ message: 'Choose the form the entity is registered under.' }),
    }),
    cin: z
      .string()
      .length(21, 'A corporate identification number is exactly 21 characters.')
      .regex(/^[A-Za-z0-9]{21}$/, 'A corporate identification number is 21 letters and digits, with no spaces.'),
    incorporatedOn: z.string().min(1, 'The date of incorporation is required. It decides which relaxations apply.'),
    state: z.string().min(1, 'Choose the state where the entity is registered.'),
    city: z.string().min(2, 'The city or district of the registered office is required.'),
    website: z
      .string()
      .url('A website must start with http:// or https://.')
      .optional()
      .or(z.literal('')),

    dpiitRecognitionNumber: z
      .string()
      .regex(
        /^(DIPP\d{4,8})?$/,
        'A recognition number looks like DIPP123456. Leave it blank if you do not have one yet.',
      )
      .optional()
      .or(z.literal('')),
    gstin: z
      .string()
      .regex(/^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3})?$/, 'A GSTIN is 15 characters. Leave it blank if you have none.')
      .optional()
      .or(z.literal('')),

    sectors: z.array(z.string()).min(1, 'Choose at least one sector. This is what your matches are drawn from.'),
    capabilities: z.array(z.string()).min(1, 'Choose at least one capability you can evidence.'),

    acceptsTerms: z.boolean().refine((v) => v, {
      message: 'Accept the terms of participation before registering.',
    }),
    acceptsDataProcessing: z.boolean().refine((v) => v, {
      message: 'Confirm you understand how these details are checked against the public registers.',
    }),
    declaresAccuracy: z.boolean().refine((v) => v, {
      message: 'Confirm the details are accurate. A false declaration is grounds for removal from the programme.',
    }),
  })
  .refine(passwordsMatch, MATCH_ERROR);

export type RegisterStartupInput = z.infer<typeof registerStartupSchema>;

/* ------------------------------------------------------------------- expert */

export const registerExpertSchema = z
  .object({
    ...account,

    affiliation: z.string().min(3, 'Name the institution or organisation you are affiliated with.'),
    highestQualification: z.string().min(2, 'Your highest relevant qualification is required.'),
    yearsExperience: z
      .number({ invalid_type_error: 'Enter a number of years.' })
      .int('Enter whole years.')
      .min(3, 'Panels are drawn from experts with at least three years in the field.')
      .max(70, 'Enter the years of relevant experience, not a date.'),
    expertise: z.array(z.string()).min(1, 'Choose at least one area of expertise.'),
    sectors: z.array(z.string()).min(1, 'Choose at least one sector you can be assigned in.'),

    declaresIndependence: z.boolean().refine((v) => v, {
      message: 'Confirm you will declare conflicts before opening any proposal. Scoring is blocked until you do.',
    }),
    acceptsTerms: z.boolean().refine((v) => v, {
      message: 'Accept the terms of participation before registering.',
    }),
    declaresAccuracy: z.boolean().refine((v) => v, {
      message: 'Confirm the details are accurate. They are checked before you are assigned to a panel.',
    }),
  })
  .refine(passwordsMatch, MATCH_ERROR);

export type RegisterExpertInput = z.infer<typeof registerExpertSchema>;
