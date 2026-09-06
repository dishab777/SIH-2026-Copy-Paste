import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shell } from '@/components/layout/Shell';

/*
 * The top bar carries the three places this portal goes; the eight settings
 * sections live in an index on the left, where they read as a list of settings
 * rather than a crowded strip.
 */
const LINKS = [
  { to: '/a/config', labelKey: 'bar.configuration', end: true },
  { to: '/a/transparency', labelKey: 'bar.publicTransparency' },
  { to: '/a/catalogue', labelKey: 'bar.validatedCatalogue' },
];

/**
 * The settings index — and only the settings.
 *
 * It is the table of contents for one thing: the eight registers that decide
 * how the programme behaves. Every threshold, rule, rubric, clause and posting
 * is in one of them, which is what makes "nothing statutory is hardcoded" a
 * claim a reader can check rather than a sentence in a document.
 *
 * It used to render on every route under /a, including the two that are not
 * settings at all: public transparency and the validated catalogue are wide,
 * read-only reports shared with the whole programme, and an index of editable
 * registers beside them meant nothing, cost the report 232 pixels of the width
 * its four-column figures were laid out for, and stayed stuck to the side of
 * the screen while the reader scrolled a document it had no relationship to.
 */
const SETTINGS = [
  { to: '/a/config', labelKey: 'nav.config', hintKey: 'nav.hint.config' },
  { to: '/a/rules', labelKey: 'nav.rules' },
  { to: '/a/rubrics', labelKey: 'nav.rubrics' },
  { to: '/a/templates', labelKey: 'nav.templatesAndClauses' },
  { to: '/a/taxonomy', labelKey: 'nav.taxonomy' },
  { to: '/a/users', labelKey: 'nav.users' },
  { to: '/a/integrations', labelKey: 'nav.integrationHealth' },
  { to: '/a/audit', labelKey: 'nav.auditTrail' },
];

const SETTINGS_ROUTES = new Set(SETTINGS.map((s) => s.to));

export function AdminShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const onSettings = SETTINGS_ROUTES.has(pathname.replace(/\/$/, '')) || pathname === '/a';

  return (
    <Shell
      allow={['pmu']}
      links={LINKS.map((l) => ({ to: l.to, end: l.end, label: t(l.labelKey) }))}
      sidebar={
        onSettings
          ? SETTINGS.map((s) => ({ to: s.to, label: t(s.labelKey), hint: s.hintKey ? t(s.hintKey) : undefined }))
          : undefined
      }
      sidebarTitle={t('nav.programmeSettings')}
      sidebarNote={onSettings ? t('nav.programmeSettingsNote') : undefined}
    />
  );
}
