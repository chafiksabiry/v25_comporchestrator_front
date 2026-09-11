/**
 * Map a gig destination (ISO cca2) to the phone-number provider.
 * France → Twilio; USA (and other markets) → Telnyx.
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

export function providerDisplayName(provider?: string | null): string {
  return provider === 'twilio' ? 'Twilio' : 'Telnyx';
}
