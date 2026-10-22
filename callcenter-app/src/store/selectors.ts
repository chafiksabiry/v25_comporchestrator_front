import { canPlaceCall } from '@/domain/billing';
import { dunningState } from '@/domain/dunning';
import type { AppState } from './types';

export function currentDunning(s: AppState, now = new Date()) {
  return dunningState(s.paymentFailedAt ? new Date(s.paymentFailedAt) : null, now, s.settings.dunning);
}

export function outboundBlockReason(s: AppState, now = new Date()): string | null {
  if (!s.numbers.length) return 'Aucun numéro actif : achetez un numéro dans « Numéros et lignes ».';
  if (!canPlaceCall(s.wallet)) return 'Solde épuisé : rechargez votre solde pour passer de nouveaux appels.';
  if (!currentDunning(s, now).outboundAllowed)
    return 'Appels sortants suspendus : un prélèvement a échoué, régularisez votre moyen de paiement.';
  return null;
}

export function inboundBlockReason(s: AppState, now = new Date()): string | null {
  if (!s.numbers.length) return 'Aucun numéro actif.';
  if (!canPlaceCall(s.wallet)) return 'Solde épuisé : les nouveaux appels entrants sont bloqués.';
  if (!currentDunning(s, now).inboundAllowed) return 'Numéro libéré faute de paiement.';
  return null;
}

export function totalLines(s: AppState): number {
  return 1 + s.extraLines;
}

export function setupChecklist(s: AppState) {
  return [
    { id: 'kyb', label: 'Justificatifs KYB envoyés', done: s.company?.kybStatus === 'submitted' },
    { id: 'plan', label: 'Forfait souscrit', done: Boolean(s.subscription) },
    { id: 'wallet', label: 'Solde prépayé rechargé', done: s.ledger.some((l) => l.kind === 'topup') },
    { id: 'team', label: 'Au moins un agent invité', done: s.agents.length > 0 },
    { id: 'number', label: 'Numéro acheté', done: s.numbers.length > 0 },
    { id: 'queue', label: 'File et script prêts', done: s.queues.length > 0 && s.script.trim().length > 0 },
    { id: 'call', label: 'Premier appel passé', done: s.calls.some((c) => c.answered) },
  ];
}
