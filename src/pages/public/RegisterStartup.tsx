import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULE, registerStartupSchema, type RegisterStartupInput } from '@/schemas/auth';
import { useRegister } from '@/services/hooks';
import { PageHeader } from '@/components/layout/Shell';
import {
  Field,
  Input,
  Checkbox,
  Select,
  DateInput,
  MultiSelectTags,
  PasswordInput,
  PasswordStrength,
} from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { InlineNote, ErrorState } from '@/components/ui/Feedback';
import { FormSection, FORM_GLYPH } from '@/components/patterns/FormSection';
import { RelaxationNotice } from '@/components/domain/Eligibility';
import { ENTITY_TYPES, SECTORS, CAPABILITIES, STATES } from '@/mocks/fixtures/reference';
import { policy } from '@/config/policies';
import { useUi } from '@/store/ui';
import { PrayogApiError } from '@/services/api';

const SECTIONS = 5;

export default function RegisterStartup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useRegister();
  const pushToast = useUi((s) => s.pushToast);

  // The rule and the consent version are configuration, so this page states
  // whatever /a/config currently says rather than a number typed here.
  const minLength = policy<number>('account.password.minLength');
  const minClasses = policy<number>('account.password.minClasses');
  const termsVersion = policy<string>('account.terms.version');

  const form = useForm<RegisterStartupInput>({
    resolver: zodResolver(registerStartupSchema),
    defaultValues: {
      fullName: '',
      designation: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      legalName: '',
      tradeName: '',
      entityType: 'private_limited',
      cin: '',
      incorporatedOn: '',
      state: '',
      city: '',
      website: '',
      dpiitRecognitionNumber: '',
      gstin: '',
      sectors: [],
      capabilities: [],
      acceptsTerms: false,
      acceptsDataProcessing: false,
      declaresAccuracy: false,
    },
  });

  const { errors } = form.formState;
  const errorList = Object.entries(errors);

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow={t('auth.startup.eyebrow')}
        title={t('auth.startup.title')}
        lead={t('auth.startup.lead')}
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
        <RelaxationNotice headingLevel={2} />
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

      {/* The form floats over the page wash rather than sitting flat on it, so
          the thing being filled in reads as a document handed across a counter. */}
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
            hint={t('auth.startup.accountSectionHint')}
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
                    placeholder={t('auth.startup.designationPlaceholder')}
                    {...form.register('designation')}
                  />
                )}
              </Field>

              <Field
                label={t('auth.startup.emailLabel')}
                required
                hint={t('auth.startup.emailHint')}
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
                hint={t('auth.startup.phoneHint')}
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
            title={t('auth.startup.entitySectionTitle')}
            hint={t('auth.startup.entitySectionHint')}
            glyph={FORM_GLYPH.building}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label={t('auth.startup.legalNameLabel')} required error={errors.legalName?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('legalName')} />
                )}
              </Field>

              <Field
                label={t('auth.startup.tradeNameLabel')}
                required
                hint={t('auth.startup.tradeNameHint')}
                error={errors.tradeName?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('tradeName')} />
                )}
              </Field>

              <Field label={t('auth.startup.entityTypeLabel')} required error={errors.entityType?.message}>
                {({ id, describedBy, invalid }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    options={ENTITY_TYPES.map((e) => ({ value: e.value, label: e.label }))}
                    {...form.register('entityType')}
                  />
                )}
              </Field>

              <Field
                label={t('auth.startup.incorporatedOnLabel')}
                required
                hint={t('auth.startup.incorporatedOnHint')}
                error={errors.incorporatedOn?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <DateInput
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    {...form.register('incorporatedOn')}
                  />
                )}
              </Field>
            </div>

            <Field
              label={t('auth.startup.cinLabel')}
              required
              hint={t('auth.startup.cinHint')}
              error={errors.cin?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  className="type-register"
                  {...form.register('cin')}
                />
              )}
            </Field>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label={t('auth.startup.stateLabel')} required error={errors.state?.message}>
                {({ id, describedBy, invalid }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder={t('auth.startup.statePlaceholder')}
                    options={STATES.map((x) => ({ value: x, label: x }))}
                    {...form.register('state')}
                  />
                )}
              </Field>

              <Field label={t('auth.startup.cityLabel')} required error={errors.city?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} aria-describedby={describedBy} invalid={invalid} {...form.register('city')} />
                )}
              </Field>
            </div>

            <Field label={t('auth.startup.websiteLabel')} hint={t('auth.startup.websiteHint')} error={errors.website?.message}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  {...form.register('website')}
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={4}
            total={SECTIONS}
            title={t('auth.startup.recognitionSectionTitle')}
            hint={t('auth.startup.recognitionSectionHint')}
            glyph={FORM_GLYPH.seal}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field
                label={t('auth.startup.dpiitLabel')}
                hint={t('auth.startup.dpiitHint')}
                error={errors.dpiitRecognitionNumber?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    placeholder="DIPP123456"
                    aria-describedby={describedBy}
                    invalid={invalid}
                    className="type-register"
                    {...form.register('dpiitRecognitionNumber')}
                  />
                )}
              </Field>

              <Field label={t('auth.startup.gstinLabel')} hint={t('auth.startup.gstinHint')} error={errors.gstin?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    className="type-register"
                    {...form.register('gstin')}
                  />
                )}
              </Field>
            </div>

            <Field label={t('auth.startup.sectorsLabel')} required error={errors.sectors?.message}>
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

            <Field
              label={t('auth.startup.capabilitiesLabel')}
              required
              hint={t('auth.startup.capabilitiesHint')}
              error={errors.capabilities?.message}
            >
              {({ id, describedBy }) => (
                <MultiSelectTags
                  id={id}
                  describedBy={describedBy}
                  values={form.watch('capabilities')}
                  onChange={(v) => form.setValue('capabilities', v, { shouldValidate: true })}
                  options={[...CAPABILITIES]}
                  placeholder={t('auth.form.chooseManyPlaceholder')}
                />
              )}
            </Field>
          </FormSection>

          <FormSection
            step={5}
            total={SECTIONS}
            title={t('auth.startup.declarationsSectionTitle')}
            hint={t('auth.startup.declarationsSectionHint')}
            glyph={FORM_GLYPH.pen}
          >
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
                checked={form.watch('acceptsDataProcessing')}
                onChange={(v) => form.setValue('acceptsDataProcessing', v, { shouldValidate: true })}
                invalid={Boolean(errors.acceptsDataProcessing)}
                label={t('auth.startup.registersLabel')}
                detail={t('auth.startup.registersDetail')}
              />
              {errors.acceptsDataProcessing ? (
                <p className="mt-1 text-micro text-seal">{errors.acceptsDataProcessing.message}</p>
              ) : null}
            </div>

            <div>
              <Checkbox
                checked={form.watch('declaresAccuracy')}
                onChange={(v) => form.setValue('declaresAccuracy', v, { shouldValidate: true })}
                invalid={Boolean(errors.declaresAccuracy)}
                label={t('auth.form.accuracyLabel')}
                detail={t('auth.startup.accuracyDetail')}
              />
              {errors.declaresAccuracy ? (
                <p className="mt-1 text-micro text-seal">{errors.declaresAccuracy.message}</p>
              ) : null}
            </div>
          </FormSection>
        </div>

        <div className="mt-8 border-t border-rule pt-6">
          <InlineNote tone="neutral" title={t('auth.form.nextTitle')}>
            {t('auth.startup.nextBody')}
          </InlineNote>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" tone="primary" loading={register.isPending} loadingLabel={t('auth.form.submitLoading')}>
              {t('auth.form.submit')}
            </Button>
            <Button type="button" onClick={() => navigate('/challenges')}>
              {t('auth.startup.browseFirst')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );

  function onSubmit(values: RegisterStartupInput): void {
    register.mutate(
      { ...values, kind: 'startup' },
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
