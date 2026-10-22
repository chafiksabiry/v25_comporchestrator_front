/**
 * Règles de facturation arrêtées avec le métier :
 *  - minute commencée = minute facturée (arrondi par communication)
 *  - sortant : décompte à partir du début de la discussion (décroché)
 *  - entrant : menu vocal + file d'attente + conversation sont facturés
 *  - un transfert génère une seconde communication, arrondie séparément
 *  - minutes et jetons IA : coût fournisseur + marge prédéfinie, débités d'un solde prépayé
 *  - solde nul : l'appel en cours se termine, les appels suivants sont bloqués
 *
 * Les montants sont des entiers en dix-millièmes d'euro (UNITS_PER_EUR) pour éviter les
 * erreurs d'arrondi flottant.
 */

export const UNITS_PER_EUR = 10_000;

export const toUnits = (eur: number): number => Math.round(eur * UNITS_PER_EUR);
export const fromUnits = (units: number): number => units / UNITS_PER_EUR;

export type RateClass = 'outbound_fixed_fr' | 'outbound_mobile_fr' | 'inbound_fr';

export const RATE_CLASS_LABEL: Record<RateClass, string> = {
  outbound_fixed_fr: 'Sortant — fixe France',
  outbound_mobile_fr: 'Sortant — mobile France',
  inbound_fr: 'Entrant — France',
};

export interface RateCard {
  currency: 'EUR';
  /** Coût fournisseur par minute, en euros. */
  costPerMinute: Record<RateClass, number>;
  /** Marge prédéfinie appliquée au coût (0.3 = +30 %). */
  marginRate: number;
}

export interface TokenRateCard {
  /** Coût fournisseur pour un million de jetons, en euros. */
  costPerMillionTokens: number;
  marginRate: number;
}

/** Prix de vente par minute, arrondi à la dix-millième d'euro. */
export function pricePerMinuteUnits(card: RateCard, rateClass: RateClass): number {
  return Math.round(card.costPerMinute[rateClass] * (1 + card.marginRate) * UNITS_PER_EUR);
}

export function tokenChargeUnits(tokens: number, card: TokenRateCard): number {
  const t = Math.max(0, Math.floor(tokens));
  return Math.round((t / 1_000_000) * card.costPerMillionTokens * (1 + card.marginRate) * UNITS_PER_EUR);
}

/** Toute minute commencée est due. */
export function billedMinutes(seconds: number): number {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return s === 0 ? 0 : Math.ceil(s / 60);
}

export interface Leg {
  id: string;
  direction: 'inbound' | 'outbound';
  rateClass: RateClass;
  /** Secondes facturables de cette communication. */
  seconds: number;
  kind: 'main' | 'transfer';
}

export function outboundLeg(params: { id: string; rateClass: RateClass; talkSeconds: number }): Leg {
  // La sonnerie n'est pas comptée : seul le temps de discussion l'est.
  return { id: params.id, direction: 'outbound', rateClass: params.rateClass, seconds: params.talkSeconds, kind: 'main' };
}

export function inboundLeg(params: {
  id: string;
  ivrSeconds: number;
  queueSeconds: number;
  talkSeconds: number;
}): Leg {
  const seconds = Math.max(0, params.ivrSeconds) + Math.max(0, params.queueSeconds) + Math.max(0, params.talkSeconds);
  return { id: params.id, direction: 'inbound', rateClass: 'inbound_fr', seconds, kind: 'main' };
}

export function transferLeg(params: { id: string; rateClass: RateClass; talkSeconds: number }): Leg {
  return {
    id: params.id,
    direction: params.rateClass === 'inbound_fr' ? 'inbound' : 'outbound',
    rateClass: params.rateClass,
    seconds: params.talkSeconds,
    kind: 'transfer',
  };
}

export interface LegCharge {
  legId: string;
  rateClass: RateClass;
  kind: Leg['kind'];
  seconds: number;
  minutes: number;
  units: number;
}

export function legCharge(card: RateCard, leg: Leg): LegCharge {
  const minutes = billedMinutes(leg.seconds);
  return {
    legId: leg.id,
    rateClass: leg.rateClass,
    kind: leg.kind,
    seconds: leg.seconds,
    minutes,
    units: minutes * pricePerMinuteUnits(card, leg.rateClass),
  };
}

export interface CallCharge {
  minutes: number;
  units: number;
  legs: LegCharge[];
}

export function callCharge(card: RateCard, legs: Leg[]): CallCharge {
  const charged = legs.map((l) => legCharge(card, l));
  return {
    minutes: charged.reduce((s, l) => s + l.minutes, 0),
    units: charged.reduce((s, l) => s + l.units, 0),
    legs: charged,
  };
}

/* ------------------------------------------------------------------ solde prépayé */

export interface Wallet {
  balanceUnits: number;
}

/** Un nouvel appel n'est autorisé que si le solde est strictement positif. */
export function canPlaceCall(wallet: Wallet): boolean {
  return wallet.balanceUnits > 0;
}

/** Le débit peut rendre le solde négatif : l'appel en cours n'est jamais coupé par défaut. */
export function debit(wallet: Wallet, units: number): Wallet {
  return { balanceUnits: wallet.balanceUnits - Math.max(0, units) };
}

export function credit(wallet: Wallet, units: number): Wallet {
  return { balanceUnits: wallet.balanceUnits + Math.max(0, units) };
}

/**
 * Coupure optionnelle d'un appel en cours : uniquement si un plafond de dépassement est configuré
 * (maxOverrunUnits !== null) et que le solde projeté descend sous ce plafond négatif.
 */
export function shouldCutOngoingCall(
  wallet: Wallet,
  pendingUnits: number,
  maxOverrunUnits: number | null
): boolean {
  if (maxOverrunUnits === null) return false;
  return wallet.balanceUnits - Math.max(0, pendingUnits) < -Math.abs(maxOverrunUnits);
}

export type LowBalanceLevel = 'ok' | 'low' | 'empty';

/** Alerte avant le zéro : "low" quand le solde couvre moins de `thresholdMinutes` minutes au tarif donné. */
export function balanceLevel(wallet: Wallet, unitsPerMinute: number, thresholdMinutes = 30): LowBalanceLevel {
  if (wallet.balanceUnits <= 0) return 'empty';
  if (unitsPerMinute > 0 && wallet.balanceUnits < unitsPerMinute * thresholdMinutes) return 'low';
  return 'ok';
}

export function formatEur(units: number, digits = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, 4),
  }).format(fromUnits(units));
}
