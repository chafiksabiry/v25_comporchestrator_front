export type Locale = 'en' | 'fr';

export type BilingualText = string | { en?: string; fr?: string } | null | undefined;

const toCode = (lang: string | undefined): Locale =>
  (lang || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';

/**
 * Pick the right string from a bilingual value for the active UI language.
 * Prefer the requested locale; only fall back to the other language if empty
 * (legacy records may have a single side filled).
 */
export function localizeText(value: BilingualText, lang: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const code = toCode(lang);
  const other: Locale = code === 'fr' ? 'en' : 'fr';
  const preferred = String(value[code] || '').trim();
  if (preferred) return preferred;
  return String(value[other] || '').trim();
}

export function uiLocale(lang: string | undefined): Locale {
  return toCode(lang);
}
