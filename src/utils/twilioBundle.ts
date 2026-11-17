/**
 * Données du dossier réglementaire Twilio construites côté navigateur. L'e-mail de contact (destinataire des notifications d'état
 * de Twilio) et le libellé du dossier sont décidés par le serveur à partir de l'entreprise : le navigateur n'envoie ni l'un ni l'autre.
 */

const text = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/** Type de titulaire Twilio (business / individual) d'après le libellé de l'exigence « end_user » ; individual par défaut. */
export function endUserTypeFrom(requirementName: unknown): 'business' | 'individual' {
  return text(requirementName).split(' ')[0].toLowerCase() === 'business' ? 'business' : 'individual';
}

/** Corps de POST /phone-numbers/twilio/bundles : uniquement ce que l'utilisateur a choisi. */
export function bundleRequest(regulationSid: string, isoCountry: string, endUserType?: string) {
  return { regulationSid, isoCountry, ...(endUserType ? { endUserType } : {}) };
}

/**
 * Nom du titulaire de l'adresse : celui saisi par l'utilisateur (« customer_name », sinon le nom de l'entité « end_user »).
 * Jamais de valeur générique : '' si rien n'a été saisi (l'appelant doit alors s'arrêter).
 */
export function customerNameFrom(values: Record<string, unknown>): string {
  return text(values['customer_name']) || text(values['end_user']);
}

/** Des champs d'adresse ont été saisis : une adresse Twilio doit être créée. */
export function hasAddressFields(values: Record<string, unknown>): boolean {
  return Boolean(values['street'] || values['city'] || values['postal_code']);
}
