import { useSyncExternalStore } from 'react';
import { DEFAULT_DUNNING_POLICY } from '@/domain/dunning';
import type { AppState } from './types';

const STORAGE_KEY = 'harx-callcenter-state-v1';

/**
 * TARIFS DE DÉMONSTRATION — à remplacer par la grille contractuelle (coûts opérateur par destination
 * et marges prédéfinies). Ils servent uniquement à montrer le moteur de facturation.
 */
export const DEMO_RATE_CARD = {
  currency: 'EUR' as const,
  costPerMinute: { outbound_fixed_fr: 0.0187, outbound_mobile_fr: 0.0404, inbound_fr: 0.01 },
  marginRate: 0.3,
};

export const DEMO_TOKEN_CARD = { costPerMillionTokens: 5, marginRate: 0.3 };

export function initialState(): AppState {
  return {
    version: 1,
    company: null,
    templateId: null,
    subscription: null,
    wallet: { balanceUnits: 0 },
    agents: [],
    numbers: [],
    extraLines: 0,
    queues: [],
    script: '',
    shifts: [],
    calls: [],
    ledger: [],
    onboarding: { done: false, currentStep: 'company', timings: {} },
    paymentFailedAt: null,
    settings: {
      rateCard: DEMO_RATE_CARD,
      tokenCard: DEMO_TOKEN_CARD,
      dunning: DEFAULT_DUNNING_POLICY,
      maxOverrunUnits: null,
    },
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === 1) return { ...initialState(), ...parsed };
    }
  } catch {
    /* stockage indisponible ou corrompu : on repart de zéro */
  }
  return initialState();
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export const getState = (): AppState => state;

export function setState(updater: (s: AppState) => AppState): void {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function resetState(): void {
  state = initialState();
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export const uid = (prefix: string): string =>
  `${prefix}_${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`;
