import { detectOutputLanguageFromGigText } from './gigSnapshotForAi';

export const CONTENT_LANGUAGES = [
  { code: 'fr', label: 'Français', english: 'French' },
  { code: 'en', label: 'English', english: 'English' },
  { code: 'es', label: 'Español', english: 'Spanish' },
  { code: 'de', label: 'Deutsch', english: 'German' },
  { code: 'pt', label: 'Português', english: 'Portuguese' },
  { code: 'it', label: 'Italiano', english: 'Italian' },
  { code: 'ar', label: 'العربية', english: 'Arabic' },
] as const;

const storageKey = (gigKey: string) => `harx.training.contentLanguage.${gigKey || 'default'}`;

const isSupported = (code: string) => CONTENT_LANGUAGES.some((l) => l.code === code);

export function getChosenContentLanguage(gigKey?: string | null): string | null {
  try {
    const value = window.localStorage.getItem(storageKey(String(gigKey || '')));
    return value && isSupported(value) ? value : null;
  } catch {
    return null;
  }
}

export function setChosenContentLanguage(gigKey: string | null | undefined, code: string): void {
  try {
    if (isSupported(code)) window.localStorage.setItem(storageKey(String(gigKey || '')), code);
  } catch {
    /* storage unavailable: the choice then only lasts for the current screen */
  }
}

export function contentLanguageLabel(code: string): string {
  return CONTENT_LANGUAGES.find((l) => l.code === code)?.english || 'English';
}

/** Language explicitly chosen for this gig's training, else the interface language, else the gig text. */
export function resolveContentLanguage(
  gigKey: string | null | undefined,
  uiLanguage: string | null | undefined,
  gigTitle?: string | null,
  gigDescription?: string | null
): string {
  const chosen = getChosenContentLanguage(gigKey);
  if (chosen) return chosen;
  const ui = String(uiLanguage || '').toLowerCase().slice(0, 2);
  if (isSupported(ui)) return ui;
  return detectOutputLanguageFromGigText(gigTitle, gigDescription);
}
