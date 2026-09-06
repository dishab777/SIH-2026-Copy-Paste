import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULE, registerExpertSchema, type RegisterExpertInput } from '@/schemas/auth';
import { useRegister } from '@/services/hooks';
import { PageHeader } from '@/components/layout/Shell';
import {
  Field,
  Input,
  NumberInput,
  Checkbox,
  MultiSelectTags,
  PasswordInput,
  PasswordStrength,
} from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { InlineNote, ErrorState } from '@/components/ui/Feedback';
import { FormSection, FORM_GLYPH } from '@/components/patterns/FormSection';
import { SECTORS, CAPABILITIES } from '@/mocks/fixtures/reference';
import { policy } from '@/config/policies';
import { useUi } from '@/store/ui';
import { PrayogApiError } from '@/services/api';

const SECTIONS = 4;

export default function RegisterExpert() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useRegister();
  const pushToast = useUi((s) => s.pushToast);

  const minLength = policy<number>('account.password.minLength');
  const minClasses = policy<number>('account.password.minClasses');
  const termsVersion = policy<string>('account.terms.version');

  const form = useForm<RegisterExpertInput>({
    resolver: zodResolver(registerExpertSchema),
    defaultValues: {
      fullName: '',
      designation: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      affiliation: '',
      highestQualification: '',
      yearsExperience: 0,
      expertise: [],
      sectors: [],
      declaresIndependence: false,
      acceptsTerms: false,
      declaresAccuracy: false,
    },
  });

  const { errors } = form.formState;
  const errorList = Object.entries(errors);

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow={t('auth.expert.eyebrow')}
        title={t('auth.expert.title')}
        lead={t('auth.expert.lead')}
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
            {t('auth.form.sections', { count: SECTIONS })}
          </span>
        }
      />

      <div className="mb-6">
        <InlineNote tone="hold" title={t('auth.expert.conflictNoticeTitle')}>
          <p>{t('auth.expert.conflictNoticeBody')}</p>
        </InlineNote>
      </div>

      {errorList.length > 0 ? (
        <div className="mb-6">
          <ErrorState
            title={t('auth.form.incompleteTitle')}
            what={t('auth.form.incompleteWhat')}
            details={errorList.map(([, e]) => e?.message ?? '')}
            compact
          />
        </div>
      ) : null}

      {register.isError ? (
        <div className="mb-6">
          <ErrorState
            title={t('auth.form.failedTitle')}
            what={register.error instanceof PrayogApiError ? register.error.message : t('auth.form.failedWhat')}
            details={register.error instanceof PrayogApiError ? register.error.details : undefined}
            reference={register.error instanceof PrayogApiError ? register.error.reference : undefined}
            onRetry={() => form.handleSubmit(onSubmit)()}
            compact
          />
        </div>
      ) : null}

      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, () => {
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        })}
        className="glass panel-in rounded-block px-5 py-6 md:px-8 md:py-8"
      >
        <div className="flex flex-col gap-8">
          <FormSection
            step={1}
            total={SECTIONS}
            title={t('auth.form.accountSectionTitle')}
            hint={t('auth.expert.accountSectionHint')}
            glyph={FORM_GLYPH.account}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label={t('auth.form.fullNameLabel')} required error={errors.fullName?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="name"
                    {...form.register('fullName')}
                  />
                )}
              </Field>

              <Field label={t('auth.form.designationLabel')} required error={errors.designation?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="organization-title"
                    placeholder={t('auth.expert.designationPlaceholder')}
                    {...form.register('designation')}
                  />
                )}
              </Field>

              <Field
                label={t('auth.expert.emailLabel')}
                required
                hint={t('auth.expert.emailHint')}
                error={errors.email?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="email"
                    inputMode="email"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="email"
                    {...form.register('email')}
                  />
                )}
              </Field>

              <Field
                label={t('auth.form.phoneLabel')}
                required
                hint={t('auth.expert.phoneHint')}
                error={errors.phone?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="tel-national"
                    {...form.register('phone')}
                  />
                )}
              </Field>
            </div>
          </FormSection>

          <FormSection
            step={2}
            total={SECTIONS}
            title={t('auth.form.passwordSectionTitle')}
            hint={PASSWORD_RULE}
            glyph={FORM_GLYPH.key}
          >
            <Field label={t('auth.form.passwordLabel')} required error={errors.password?.message}>
              {({ id, describedBy, invalid }) => (
                <div>
                  <PasswordInput
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="new-password"
                    {...form.register('password')}
                  />
                  <PasswordStrength
                    value={form.watch('password') ?? ''}
                    minLength={minLength}
                    minClasses={minClasses}
                  />
                </div>
              )}
            </Field>

            <Field
              label={t('auth.form.confirmPasswordLabel')}
              required
              hint={t('auth.form.confirmPasswordHint')}
              error={errors.confirmPassword?.message}
            >
              {({ id, describedBy, invalid }) => (
                <PasswordInput
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  autoComplete="new-password"
                  {...form.register('confirmPassword')}
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={3}
            total={SECTIONS}
            title={t('auth.expert.standingSectionTitle')}
            hint={t('auth.expert.standingSectionHint')}
            glyph={FORM_GLYPH.list}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label={t('auth.expert.affiliationLabel')}
                required
                hint={t('auth.expert.affiliationHint')}
                error={errors.affiliation?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    autoComplete="organization"
                    {...form.register('affiliation')}
                  />
                )}
              </Field>

              <Field label={t('auth.expert.qualificationLabel')} required error={errors.highestQualification?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder={t('auth.expert.qualificationPlaceholder')}
                    {...form.register('highestQualification')}
                  />
                )}
              </Field>
            </div>

            <Field
              label={t('auth.expert.experienceLabel')}
              required
              hint={t('auth.expert.experienceHint')}
              error={errors.yearsExperience?.message}
            >
              {({ id, describedBy, invalid }) => (
                <NumberInput
                  id={id}
                  min={0}
                  max={70}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  {...form.register('yearsExperience', { valueAsNumber: true })}
                />
              )}
            </Field>

            <Field
              label={t('auth.expert.expertiseLabel')}
              required
              hint={t('auth.expert.expertiseHint')}
              error={errors.expertise?.message}
            >
              {({ id, describedBy }) => (
                <MultiSelectTags
                  id={id}
                  describedBy={describedBy}
                  values={form.watch('expertise')}
                  onChange={(v) => form.setValue('expertise', v, { shouldValidate: true })}
                  options={[...CAPABILITIES]}
                  placeholder={t('auth.form.chooseManyPlaceholder')}
                />
              )}
            </Field>

            <Field label={t('auth.expert.sectorsLabel')} required error={errors.sectors?.message}>
              {({ id, describedBy }) => (
                <MultiSelectTags
                  id={id}
                  describedBy={describedBy}
                  values={form.watch('sectors')}
                  onChange={(v) => form.setValue('sectors', v, { shouldValidate: true })}
                  options={[...SECTORS]}
                  placeholder={t('auth.form.chooseManyPlaceholder')}
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={4}
            total={SECTIONS}
            title={t('auth.expert.independenceSectionTitle')}
            hint={t('auth.expert.independenceSectionHint')}
            glyph={FORM_GLYPH.scales}
          >
            <div>
              <Checkbox
                checked={form.watch('declaresIndependence')}
                onChange={(v) => form.setValue('declaresIndependence', v, { shouldValidate: true })}
                invalid={Boolean(errors.declaresIndependence)}
                label={t('auth.expert.independenceLabel')}
                detail={t('auth.expert.independenceDetail')}
              />
              {errors.declaresIndependence ? (
                <p className="mt-1 text-micro text-seal">{errors.declaresIndependence.message}</p>
              ) : null}
            </div>

            <div>
              <Checkbox
                checked={form.watch('acceptsTerms')}
                onChange={(v) => form.setValue('acceptsTerms', v, { shouldValidate: true })}
                invalid={Boolean(errors.acceptsTerms)}
                label={t('auth.form.termsLabel', { version: termsVersion })}
                detail={t('auth.form.termsDetail')}
              />
              {errors.acceptsTerms ? <p className="mt-1 text-micro text-seal">{errors.acceptsTerms.message}</p> : null}
            </div>

            <div>
              <Checkbox
                checked={form.watch('declaresAccuracy')}
                onChange={(v) => form.setValue('declaresAccuracy', v, { shouldValidate: true })}
                invalid={Boolean(errors.declaresAccuracy)}
                label={t('auth.form.accuracyLabel')}
                detail={t('auth.expert.accuracyDetail')}
              />
              {errors.declaresAccuracy ? (
                <p className="mt-1 text-micro text-seal">{errors.declaresAccuracy.message}</p>
              ) : null}
            </div>
          </FormSection>
        </div>

        <div className="mt-8 border-t border-rule pt-6">
          <InlineNote tone="neutral" title={t('auth.form.nextTitle')}>
            {t('auth.expert.nextBody')}
          </InlineNote>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" tone="primary" loading={register.isPending} loadingLabel={t('auth.form.submitLoading')}>
              {t('auth.form.submit')}
            </Button>
            <Button type="button" onClick={() => navigate('/how-it-works')}>
              {t('auth.expert.readFirst')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );

  function onSubmit(values: RegisterExpertInput): void {
    register.mutate(
      { ...values, kind: 'expert' },
      {
        onSuccess: (res) => {
          pushToast(
            'verify',
            res.message ?? t('auth.form.receivedToast'),
            t('auth.form.referenceLine', { reference: res.data.reference }),
          );
          navigate('/login');
        },
      },
    );
  }
}
