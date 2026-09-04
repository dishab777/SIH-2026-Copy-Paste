import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { registerStartupSchema, type RegisterStartupInput } from '@/schemas/auth';
import { useRegister } from '@/services/hooks';
import { PageHeader } from '@/components/layout/Shell';
import { Field, Input, Checkbox, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { InlineNote, ErrorState } from '@/components/ui/Feedback';
import { RelaxationNotice } from '@/components/domain/Eligibility';
import { STATES } from '@/mocks/fixtures/reference';
import { useUi } from '@/store/ui';
import { PrayogApiError } from '@/services/api';

/**
 * A part of the form, named and numbered.
 *
 * A registration form is a short interview, not a wall of boxes: each part says
 * what it is asking for and why, carries its own drawing, and sits on its own
 * tinted panel so a reader can see how much is left before they start.
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

export default function RegisterStartup() {
  const navigate = useNavigate();
  const register = useRegister();
  const pushToast = useUi((s) => s.pushToast);

  const form = useForm<RegisterStartupInput>({
    resolver: zodResolver(registerStartupSchema),
    defaultValues: {
      legalName: '',
      tradeName: '',
      cin: '',
      email: '',
      state: '',
      dpiitRecognitionNumber: '',
      acceptsTerms: false,
    },
  });

  const { errors } = form.formState;
  const errorList = Object.entries(errors);

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow="Startup registration"
        title="Register a startup"
        lead="Register once, then apply to any challenge. Your verified entity details are reused so you never retype them, and eligibility is checked against them rather than against a self-declaration."
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

      <div className="mb-6">
        <RelaxationNotice headingLevel={2} />
      </div>

      {errorList.length > 0 ? (
        <div className="mb-6">
          <ErrorState
            title="This form is not complete."
            what="Fix the fields listed below and try again. Nothing you typed has been lost."
            details={errorList.map(([, e]) => e?.message ?? '')}
            compact
          />
        </div>
      ) : null}

      {register.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Unable to register."
            what={register.error instanceof PrayogApiError ? register.error.message : 'The service did not respond.'}
            details={register.error instanceof PrayogApiError ? register.error.details : undefined}
            reference={register.error instanceof PrayogApiError ? register.error.reference : undefined}
            onRetry={() => form.handleSubmit(onSubmit)()}
            compact
          />
        </div>
      ) : null}

      {/* The form floats over the page wash rather than sitting flat on it, so
          the thing being filled in reads as a document handed across a counter. */}
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, () => {
          const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
          first?.focus();
        })}
        className="glass panel-in rounded-block px-5 py-6 md:px-8 md:py-8"
      >
        <div className="flex flex-col gap-8">
          <FormSection
            step={1}
            title="The entity"
            hint="As it is written on the certificate of incorporation. These are checked against the registers, not taken on trust."
            glyph={
              <g>
                <path d="M4.5 20.5h15" />
                <path d="M6.5 20.5V7.5l5.5-4 5.5 4v13" />
                <path d="M10 12h4M10 16h4" />
              </g>
            }
          >
            <Field label="Legal name of the entity" required error={errors.legalName?.message}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('legalName')} />
              )}
            </Field>

            <Field label="Trading name" required error={errors.tradeName?.message}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('tradeName')} />
              )}
            </Field>

            <Field
              label="Corporate identification number"
              required
              hint="Twenty-one characters, as printed on the certificate of incorporation."
              error={errors.cin?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('cin')} />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={2}
            title="Where to reach you"
            hint="Every notice, query and gate decision on your applications goes to this address and is filed against this state."
            glyph={
              <g>
                <path d="M3.5 6.5h17v11h-17z" />
                <path d="m3.5 7.5 8.5 6 8.5-6" />
              </g>
            }
          >
            <Field label="Work email address" required error={errors.email?.message}>
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

            <Field label="State of registration" required error={errors.state?.message}>
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  placeholder="Choose a state"
                  options={STATES.map((s) => ({ value: s, label: s }))}
                  {...form.register('state')}
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={3}
            title="Recognition"
            hint="Optional. It is what unlocks the relief set out above, and it can be added later from your profile."
            glyph={
              <g>
                <circle cx="12" cy="9.5" r="6" />
                <path d="m9.2 9.6 2 2 3.6-4" />
                <path d="m8.5 15 -1 5.5L12 18l4.5 2.5-1-5.5" />
              </g>
            }
          >
            <Field
              label="DPIIT recognition number"
              hint="Optional now. Without it, prior turnover and prior experience relief cannot be applied to your applications."
              error={errors.dpiitRecognitionNumber?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  placeholder="DIPP123456"
                  {...form.register('dpiitRecognitionNumber')}
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={4}
            title="Declaration"
            hint="What you confirm here is what the screening runs against, and any change between now and screening is shown to you."
            glyph={
              <g>
                <path d="M4 19.5h16" />
                <path d="M6.5 15.5 15 7l2.5 2.5-8.5 8.5-3.5 1z" />
                <path d="M13.5 8.5 16 11" />
              </g>
            }
          >
            <Checkbox
              checked={form.watch('acceptsTerms')}
              onChange={(v) => form.setValue('acceptsTerms', v, { shouldValidate: true })}
              invalid={Boolean(errors.acceptsTerms)}
              label="I confirm these details are accurate and may be verified against the registers."
              detail="Recognition and GST status are checked when you save your profile and again at screening. A change between the two is shown to you, not used to reject you silently."
            />
            {errors.acceptsTerms ? <p className="text-micro text-seal">{errors.acceptsTerms.message}</p> : null}
          </FormSection>
        </div>

        <div className="mt-8 border-t border-rule pt-6">
          <InlineNote tone="neutral" title="What happens next">
            You complete your company profile, and PRAYOG shows which open challenges you are eligible for and which
            rules you would fail — before you write anything.
          </InlineNote>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" tone="primary" loading={register.isPending} loadingLabel="Registering">
              Register this startup
            </Button>
            <Button type="button" onClick={() => navigate('/challenges')}>
              Look at the challenges first
            </Button>
          </div>
        </div>
      </form>
    </div>
  );

  function onSubmit(values: RegisterStartupInput): void {
    register.mutate(
      { kind: 'startup', legalName: values.legalName, email: values.email },
      {
        onSuccess: (res) => {
          pushToast('verify', res.message ?? 'Registration received.');
          navigate('/login');
        },
      },
    );
  }
}
