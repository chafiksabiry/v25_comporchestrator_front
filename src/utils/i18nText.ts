export type Locale = 'en' | 'fr';

export type BilingualText = string | { en?: string; fr?: string } | null | undefined;

const toCode = (lang: string | undefined): Locale =>
  (lang || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';

/** Pick the right string from a bilingual value, with legacy + fallback support. */
export function localizeText(value: BilingualText, lang: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const code = toCode(lang);
  return value[code] || value.en || value.fr || '';
}

export function uiLocale(lang: string | undefined): Locale {
  return toCode(lang);
}
