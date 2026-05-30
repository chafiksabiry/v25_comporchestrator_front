import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      fr: {
        translation: frTranslation,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    // Collapse region-specific tags ("fr-FR", "fr-CA"…) onto the base language.
    // Without this, the browser detector returns "fr-FR" which would miss our
    // "fr" resource bundle and fall back to English.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    detection: {
      // 1) Honor the user's explicit pick (saved in localStorage by the navbar
      //    language switcher) — never override it once made.
      // 2) Otherwise auto-detect the browser/OS language so a French user gets
      //    French UI on first visit without having to change anything.
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
