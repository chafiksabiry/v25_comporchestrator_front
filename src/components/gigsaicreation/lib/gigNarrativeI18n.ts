export type UiLang = 'en' | 'fr';

export type I18nList = { en?: string[]; fr?: string[] };

export function uiLangFrom(language?: string): UiLang {
  return language?.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

export function textForLang(
  bundle: { en?: string; fr?: string } | undefined,
  plain: string | undefined,
  lang: UiLang,
): string {
  const side = bundle?.[lang];
  if (typeof side === 'string' && side.trim()) return side.trim();
  return (plain || '').trim();
}

export function listForLang(
  bundle: I18nList | undefined,
  plain: string[] | undefined,
  lang: UiLang,
): string[] {
  const side = (bundle?.[lang] || []).map((item) => String(item).trim()).filter(Boolean);
  if (side.length) return side;
  return (plain || []).map((item) => String(item).trim()).filter(Boolean);
}

type NarrativeKey = 'jobTitles' | 'highlights' | 'deliverables';

function otherLang(lang: UiLang): UiLang {
  return lang === 'en' ? 'fr' : 'en';
}

function applyView<T extends Record<string, any>>(
  suggestions: T,
  key: NarrativeKey,
  lang: UiLang,
  nextView: string[],
  otherList: string[],
): T {
  const bundle = {
    en: lang === 'en' ? nextView : otherList,
    fr: lang === 'fr' ? nextView : otherList,
  };
  const next: T = {
    ...suggestions,
    [key]: nextView,
    [`${key}_i18n`]: bundle,
  };
  if (key === 'jobTitles') {
    (next as any).title = nextView[0] || suggestions.title || '';
    (next as any).title_i18n = {
      en: bundle.en[0] || suggestions.title_i18n?.en || '',
      fr: bundle.fr[0] || suggestions.title_i18n?.fr || '',
    };
    (next as any).selectedJobTitle = nextView.includes(suggestions.selectedJobTitle)
      ? suggestions.selectedJobTitle
      : nextView[0] || suggestions.selectedJobTitle;
  }
  return next;
}

export function addNarrativeItem<T extends Record<string, any>>(
  suggestions: T,
  key: NarrativeKey,
  lang: UiLang,
  value: string,
): T {
  const trimmed = value.trim();
  if (!trimmed) return suggestions;
  const view = listForLang(suggestions[`${key}_i18n`], suggestions[key], lang);
  if (view.includes(trimmed)) return suggestions;
  const bundle = suggestions[`${key}_i18n`] as I18nList | undefined;
  const otherList = Array.isArray(bundle?.[otherLang(lang)]) ? [...bundle![otherLang(lang)]!] : [];
  return applyView(suggestions, key, lang, [...view, trimmed], otherList);
}

export function updateNarrativeItem<T extends Record<string, any>>(
  suggestions: T,
  key: NarrativeKey,
  lang: UiLang,
  index: number,
  value: string,
): T {
  const trimmed = value.trim();
  if (!trimmed) return suggestions;
  const view = [...listForLang(suggestions[`${key}_i18n`], suggestions[key], lang)];
  if (index < 0 || index >= view.length) return suggestions;
  view[index] = trimmed;
  const bundle = suggestions[`${key}_i18n`] as I18nList | undefined;
  const otherList = Array.isArray(bundle?.[otherLang(lang)]) ? [...bundle![otherLang(lang)]!] : [];
  return applyView(suggestions, key, lang, view, otherList);
}

export function removeNarrativeItem<T extends Record<string, any>>(
  suggestions: T,
  key: NarrativeKey,
  lang: UiLang,
  index: number,
): T {
  const view = [...listForLang(suggestions[`${key}_i18n`], suggestions[key], lang)];
  if (index < 0 || index >= view.length) return suggestions;
  view.splice(index, 1);
  const bundle = suggestions[`${key}_i18n`] as I18nList | undefined;
  const otherList = Array.isArray(bundle?.[otherLang(lang)]) ? [...bundle![otherLang(lang)]!] : [];
  if (index < otherList.length) otherList.splice(index, 1);
  return applyView(suggestions, key, lang, view, otherList);
}

export function writeNarrativeText<T extends Record<string, any>>(
  suggestions: T,
  lang: UiLang,
  value: string,
): T {
  const current = suggestions.description_i18n || suggestions.jobDescription_i18n || {};
  const bundle = {
    en: lang === 'en' ? value : String(current.en || ''),
    fr: lang === 'fr' ? value : String(current.fr || ''),
  };
  return {
    ...suggestions,
    description: value,
    jobDescription: value,
    description_i18n: bundle,
    jobDescription_i18n: bundle,
  };
}
