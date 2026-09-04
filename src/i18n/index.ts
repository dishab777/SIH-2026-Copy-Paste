import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import hi from './hi';

/**
 * Strings are never concatenated; every message is a whole sentence with named
 * interpolation, and counts use ICU-style plural keys.
 *
 * Legal text is deliberately absent from these bundles. Clause text is
 * authoritative and lives in config/templates.ts in its original language, with
 * a labelled plain-language reading aid beside it — it is never machine-translated.
 */
void i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;
