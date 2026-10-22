import type { Wallet, RateCard, TokenRateCard, Leg, LegCharge } from '@/domain/billing';
import type { OnboardingStepId, OnboardingTimings } from '@/domain/onboarding';
import type { PlanId } from '@/domain/plans';
import type { TemplateId, QueueDraft } from '@/domain/templates';
import type { DunningPolicy } from '@/domain/dunning';

export interface Company {
  name: string;
  siren: string;
  representativeEmail: string;
  documents: Array<{ name: string; size: number }>;
  kybStatus: 'draft' | 'submitted';
}

export interface Agent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  invitationStatus: 'pending' | 'invited' | 'active';
  invitedAt: string;
}

export interface PhoneNumber {
  id: string;
  e164: string;
  label: string;
  type: 'local' | 'national';
  boughtAt: string;
  /** Rattachée à la ligne de l'abonnement ou à une ligne supplémentaire. */
  lineIndex: number;
}

export interface Queue extends QueueDraft {
  id: string;
  createdAt: string;
}

/** Plage de travail : un agent, sur une file, un jour, une heure. */
export interface Shift {
  id: string;
  agentId: string;
  queueId: string;
  /** 0 = lundi … 6 = dimanche */
  day: number;
  hour: number;
}

export interface CallRecord {
  id: string;
  at: string;
  direction: 'inbound' | 'outbound';
  remote: string;
  agentLabel: string;
  legs: Leg[];
  charges: LegCharge[];
  minutes: number;
  units: number;
  answered: boolean;
  aiEvaluation?: AiEvaluation;
}

export interface AiEvaluation {
  sentiment: 'positif' | 'neutre' | 'négatif';
  outcome: 'résolu' | 'à rappeler' | 'non résolu';
  fraudSuspected: boolean;
  summary: string;
  tokens: number;
}

export interface LedgerEntry {
  id: string;
  at: string;
  kind: 'topup' | 'call' | 'ai' | 'adjustment';
  label: string;
  /** Positif = crédit, négatif = débit (dix-millièmes d'euro). */
  units: number;
  balanceAfter: number;
}

export interface Subscription {
  planId: PlanId;
  startedAt: string;
  nextRenewalAt: string;
  cardLast4: string;
}

export interface AppState {
  version: 1;
  company: Company | null;
  templateId: TemplateId | null;
  subscription: Subscription | null;
  wallet: Wallet;
  agents: Agent[];
  numbers: PhoneNumber[];
  extraLines: number;
  queues: Queue[];
  script: string;
  shifts: Shift[];
  calls: CallRecord[];
  ledger: LedgerEntry[];
  onboarding: { done: boolean; currentStep: OnboardingStepId; timings: OnboardingTimings };
  /** Date de l'échec du dernier prélèvement récurrent, null si tout est à jour. */
  paymentFailedAt: string | null;
  settings: {
    rateCard: RateCard;
    tokenCard: TokenRateCard;
    dunning: DunningPolicy;
    /** Plafond de dépassement autorisé pour un appel en cours (en dix-millièmes d'euro), null = aucun. */
    maxOverrunUnits: number | null;
  };
}
