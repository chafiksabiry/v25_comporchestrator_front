/**
 * Jeton de connexion pour le service des appels (v25_dash_calls_backend) : jetons Twilio / Telnyx, appel IA sortant,
 * assistant vocal, enregistrements. Le service exige désormais ce jeton (Authorization: Bearer <JWT>).
 */
export function callsAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
