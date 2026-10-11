/**
 * Map a gig destination (ISO cca2) to the phone-number provider.
 * France → Twilio only; other markets → Telnyx by default.
 * Brand names are intentionally not exposed in the UI.
 */
export type PhoneLineProvider = 'twilio' | 'telnyx';

export function providerForDestinationCountry(
  countryCode?: string | null
): PhoneLineProvider {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase();
  if (code === 'FR') return 'twilio';
  return 'telnyx';
}
