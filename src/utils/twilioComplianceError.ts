/**
 * Échecs du dossier réglementaire Twilio (/phone-numbers/twilio/*) : le serveur répond 403 quand l'appelant n'a pas d'entreprise
 * (ou n'est qu'un agent) et 404 quand le dossier / la pièce n'appartient pas à son entreprise. Ces réponses doivent arrêter le
 * parcours et s'afficher clairement : jamais de dossier « complet » sur une réponse refusée.
 */

/** Clés i18n (telephonySetup.errors.*) du message à afficher. */
export const TWILIO_COMPLIANCE_ERROR_KEY = {
  forbidden: 'telephonySetup.errors.twilioForbidden',
  notFound: 'telephonySetup.errors.twilioNotFound',
  incomplete: 'telephonySetup.errors.twilioIncomplete',
  requirements: 'telephonySetup.errors.twilioRequirements',
  contactEmailRequired: 'telephonySetup.errors.twilioContactEmailRequired',
  customerNameRequired: 'telephonySetup.errors.twilioCustomerNameRequired',
} as const;

/** Statut HTTP d'une erreur levée par phoneNumberService (PhoneNumberServiceError.status) ou d'une erreur axios. */
export function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof e.status === 'number') return e.status;
  if (typeof e.response?.status === 'number') return e.response.status;
  return undefined;
}

/** Code d'erreur stable renvoyé par le serveur (PhoneNumberServiceError.code ou corps axios `code`). */
export function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { code?: unknown; response?: { data?: { code?: unknown } } };
  if (typeof e.code === 'string') return e.code;
  if (typeof e.response?.data?.code === 'string') return e.response.data.code;
  return undefined;
}

/** Clé i18n propre à un refus connu (403 / 404, contact de l'entreprise manquant, nom du titulaire manquant), sinon null (on garde alors le message de l'erreur). */
export function twilioComplianceErrorKey(error: unknown): string | null {
  const code = errorCode(error);
  if (code === 'contact_email_required') return TWILIO_COMPLIANCE_ERROR_KEY.contactEmailRequired;
  if (code === 'TWILIO_CUSTOMER_NAME_REQUIRED') return TWILIO_COMPLIANCE_ERROR_KEY.customerNameRequired;
  const status = errorStatus(error);
  if (status === 403) return TWILIO_COMPLIANCE_ERROR_KEY.forbidden;
  if (status === 404) return TWILIO_COMPLIANCE_ERROR_KEY.notFound;
  return null;
}

/** Une ressource Twilio renvoyée sans `sid` exploitable : on s'arrête au lieu de continuer sur `undefined`. */
export function requireSid(resource: unknown): string {
  const sid = resource && typeof resource === 'object' ? (resource as { sid?: unknown }).sid : undefined;
  if (typeof sid !== 'string' || !sid) {
    throw Object.assign(new Error('Twilio resource returned without a SID'), { code: 'TWILIO_INCOMPLETE' });
  }
  return sid;
}
