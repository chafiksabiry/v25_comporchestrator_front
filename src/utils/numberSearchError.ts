/**
 * Refus du serveur à la recherche / à l'achat de numéros (orchestrateur) : un numéro ne se cherche et ne s'achète que dans le pays de
 * l'entreprise (ou, pour une entreprise européenne, dans l'Europe) → 403 `{ code: 'COUNTRY_NOT_ALLOWED' }` ; si le serveur ne peut pas lire
 * le pays de l'entreprise il refuse (503 « Company country lookup failed ») plutôt que d'autoriser.
 */
export type NumberSearchFailure = 'COUNTRY_NOT_ALLOWED' | 'COUNTRY_CHECK_UNAVAILABLE';

/** Clés i18n (phoneNumberPanel.toasts.*) du message à afficher pour chaque refus. */
export const NUMBER_SEARCH_FAILURE_KEY: Record<NumberSearchFailure, string> = {
  COUNTRY_NOT_ALLOWED: 'phoneNumberPanel.toasts.countryNotAllowed',
  COUNTRY_CHECK_UNAVAILABLE: 'phoneNumberPanel.toasts.countryCheckUnavailable',
};

export function numberSearchFailure(status: number | undefined, data: unknown): NumberSearchFailure | null {
  const d = (data && typeof data === 'object' ? data : {}) as { code?: unknown; error?: unknown; message?: unknown };
  if (status === 403 && d.code === 'COUNTRY_NOT_ALLOWED') return 'COUNTRY_NOT_ALLOWED';
  if (status === 503 && /country lookup/i.test(String(d.error ?? d.message ?? ''))) return 'COUNTRY_CHECK_UNAVAILABLE';
  return null;
}
