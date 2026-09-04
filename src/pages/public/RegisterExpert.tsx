import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { registerExpertSchema, type RegisterExpertInput } from '@/schemas/auth';
import { useRegister } from '@/services/hooks';
import { PageHeader } from '@/components/layout/Shell';
import { Field, Input, Checkbox, MultiSelectTags } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ErrorState, InlineNote } from '@/components/ui/Feedback';
import { CAPABILITIES, SECTORS } from '@/mocks/fixtures/reference';
import { useUi } from '@/store/ui';

/**
 * A part of the form, named and numbered.
 *
 * An evaluator is being asked to declare things about themselves, so each part
 * says what it is for before it asks. The panel underneath carries the same
 * tint as the page wash so the form reads as one document rather than a stack
 * of boxes.
 */
function FormSection({
  step,
  title,
  hint,
  glyph,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  glyph: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-hold-wash text-verify shadow-sheet"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            focusable="false"
          >
            {glyph}
          </svg>
        </span>
        <div className="min-w-0">
          <p className="field-label mb-1 flex items-center gap-2 !text-saffron-ink">
            <span
              aria-hidden
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-saffron px-1.5 text-micro text-deep tnum"
            >
              {step}
            </span>
            Section {step} of 4
          </p>
          <h2 className="font-display text-h3 text-ink">{title}</h2>
          <p className="mt-1 max-w-doc text-micro text-ink-soft">{hint}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-sheet border border-rule bg-gradient-to-b from-verify-wash to-transparent px-5 py-5 shadow-sheet">
        {children}
      </div>
    </section>
  );
}

export default function RegisterExpert() {
  const navigate = useNavigate();
  const register = useRegister();
  const pushToast = useUi((s) => s.pushToast);

  const form = useForm<RegisterExpertInput>({
    resolver: zodResolver(registerExpertSchema),
    defaultValues: { name: '', email: '', affiliation: '', expertise: [], declaresIndependence: false },
  });
  const { errors } = form.formState;
  const errorList = Object.entries(errors);

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow="Evaluator registration"
        title="Register as an evaluator"
        lead="Evaluators score proposals against a published rubric with a written reason on every criterion. You cannot see an applicant or a proposal until your conflict declaration is recorded."
        aside={
          <span className="inline-flex items-center gap-2 rounded-pill border border-deep-rule bg-deep-2 px-4 py-1.5 text-micro text-deep-dim">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              focusable="false"
            >
              <path d="M4 6.5h4M4 12h4M4 17.5h4" />
              <path d="M12 6.5h8M12 12h8M12 17.5h5" />
            </svg>
            Four short sections
          </span>
        }
      />

      {errorList.length > 0 ? (
        <div className="mb-6">
          <ErrorState
            title="This form is not complete."
            what="Fix the fields listed below. Nothing you typed has been lost."
            details={errorList.map(([, e]) => e?.message ?? '')}
            compact
          />
        </div>
      ) : null}

      {/* The form floats over the page wash rather than sitting flat on it, so
          the thing being filled in reads as a document handed across a counter. */}
      <form
        noValidate
        onSubmit={form.handleSubmit((values) =>
          register.mutate(
            { kind: 'expert', name: values.name, email: values.email },
            {
              onSuccess: (res) => {
                pushToast('verify', res.message ?? 'Registration received.');
                navigate('/login');
              },
            },
          ),
        )}
        className="glass panel-in rounded-block px-5 py-6 md:px-8 md:py-8"
      >
        <div className="flex flex-col gap-8">
          <FormSection
            step={1}
            title="About you"
            hint="Your name is shown to the panel alongside your scores. Notices about assignments and deadlines go to this address."
            glyph={
              <g>
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
              </g>
            }
          >
            <Field label="Your name" required error={errors.name?.message}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('name')} />
              )}
            </Field>

            <Field label="Email address" required error={errors.email?.message}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  {...form.register('email')}
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={2}
            title="Where you work"
            hint="This is what a conflict is tested against, so it is checked before you are ever shown an applicant."
            glyph={
              <g>
                <path d="M3.5 20.5h17" />
                <path d="M5.5 20.5V5.5h9v15" />
                <path d="M14.5 20.5v-9h4v9" />
                <path d="M8 9h3.5M8 13h3.5M8 17h3.5" />
              </g>
            }
          >
            <Field
              label="Institution or organisation"
              required
              hint="Used to check conflicts against applicants, their directors and their investors."
              error={errors.affiliation?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('affiliation')} />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={3}
            title="What you can assess"
            hint="Assignments are drawn from these. Add every sector and capability you would be comfortable defending a score in."
            glyph={
              <g>
                <path d="M4 10.5 11 3.5h6.5V10L10.5 17z" />
                <circle cx="14.5" cy="6.5" r="1.3" />
                <path d="m7.5 20.5 9-9" />
              </g>
            }
          >
            <Field label="Areas of expertise" required error={errors.expertise?.message}>
              {({ id }) => (
                <MultiSelectTags
                  id={id}
                  values={form.watch('expertise')}
                  onChange={(v) => form.setValue('expertise', v, { shouldValidate: true })}
                  options={[...SECTORS, ...CAPABILITIES]}
                  placeholder="Add a sector or capability"
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={4}
            title="Declaration"
            hint="Independence is the whole basis of the score. Scoring stays blocked until this declaration is on record."
            glyph={
              <g>
                <path d="M12 4.5v15M5 8h14" />
                <path d="M4 20.5h16" />
                <path d="m5 8-2.5 5.5h5zM19 8l-2.5 5.5h5z" />
              </g>
            }
          >
            <Checkbox
              checked={form.watch('declaresIndependence')}
              onChange={(v) => form.setValue('declaresIndependence', v, { shouldValidate: true })}
              invalid={Boolean(errors.declaresIndependence)}
              label="I will declare any conflict before opening a proposal."
              detail="A declared conflict recuses you from that application and notifies the programme management unit. Scoring is blocked until a declaration is on record."
            />
            {errors.declaresIndependence ? (
              <p className="text-micro text-seal">{errors.declaresIndependence.message}</p>
            ) : null}
          </FormSection>
        </div>

        <div className="mt-8 border-t border-rule pt-6">
          <InlineNote tone="neutral" title="What you will be asked to do">
            Score each criterion from 0 to 5 against an anchored descriptor, and write at least the configured minimum
            number of characters explaining why. Your own score is visible to you immediately; other evaluators&rsquo;
            scores stay hidden until the panel releases results.
          </InlineNote>
          <div className="mt-5">
            <Button type="submit" tone="primary" loading={register.isPending} loadingLabel="Registering">
              Register as an evaluator
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
