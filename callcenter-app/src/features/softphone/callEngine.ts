import { useSyncExternalStore } from 'react';
import { inboundLeg, outboundLeg, transferLeg, type Leg, type RateClass } from '@/domain/billing';
import { getState } from '@/store/store';
import { inboundBlockReason, outboundBlockReason } from '@/store/selectors';
import { recordCall } from '@/store/actions';
import { uid } from '@/store/store';

/**
 * Moteur d'appel SIMULÉ. Il applique les vraies règles de facturation (domain/billing) à des
 * appels dont les durées sont réelles, sans réseau téléphonique. Pour une vraie téléphonie, une
 * implémentation de `SoftphoneProvider` basée sur @twilio/voice-sdk ou @telnyx/webrtc (déjà
 * utilisés dans le micro-frontend entreprise) remplace ce moteur ; la facturation reste inchangée.
 */
export interface SoftphoneProvider {
  readonly id: 'simulated' | 'twilio' | 'telnyx';
  placeOutbound(remote: string, agentLabel: string): { ok: true } | { ok: false; reason: string };
  simulateInbound(agentLabel: string): { ok: true } | { ok: false; reason: string };
  transfer(): void;
  hangup(): void;
}

export type Phase = 'ringing' | 'ivr' | 'queue' | 'talking';

export interface ActiveCall {
  id: string;
  direction: 'inbound' | 'outbound';
  remote: string;
  agentLabel: string;
  rateClass: RateClass;
  phase: Phase;
  startedAt: number;
  ivrStartedAt?: number;
  queueStartedAt?: number;
  talkStartedAt?: number;
  transferredAt?: number;
}

const RING_MS = 2500;
const IVR_MS = 4000;
const QUEUE_MS = 6000;

let active: ActiveCall | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function set(next: ActiveCall | null) {
  active = next;
  emit();
}
function later(ms: number, fn: () => void) {
  timers.push(setTimeout(fn, ms));
}
function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

export function rateClassFor(remote: string): RateClass {
  const digits = remote.replace(/[^\d+]/g, '');
  return /^(\+33|0033|0)[67]/.test(digits) ? 'outbound_mobile_fr' : 'outbound_fixed_fr';
}

const secondsBetween = (from: number, to: number) => Math.max(0, Math.ceil((to - from) / 1000));

export function buildLegs(call: ActiveCall, endedAt: number): { legs: Leg[]; answered: boolean } {
  const answered = call.talkStartedAt !== undefined;
  const legs: Leg[] = [];
  const mainEnd = call.transferredAt ?? endedAt;

  if (call.direction === 'outbound') {
    if (answered) {
      legs.push(outboundLeg({ id: `${call.id}-1`, rateClass: call.rateClass, talkSeconds: secondsBetween(call.talkStartedAt!, mainEnd) }));
    }
  } else {
    // Entrant : tout est facturé depuis la prise en charge par le système (menu vocal compris).
    const ivrEnd = call.queueStartedAt ?? mainEnd;
    const queueEnd = call.talkStartedAt ?? mainEnd;
    legs.push(
      inboundLeg({
        id: `${call.id}-1`,
        ivrSeconds: call.ivrStartedAt ? secondsBetween(call.ivrStartedAt, Math.min(ivrEnd, mainEnd)) : 0,
        queueSeconds: call.queueStartedAt ? secondsBetween(call.queueStartedAt, Math.min(queueEnd, mainEnd)) : 0,
        talkSeconds: call.talkStartedAt ? secondsBetween(call.talkStartedAt, mainEnd) : 0,
      })
    );
  }

  if (call.transferredAt !== undefined) {
    legs.push(
      transferLeg({ id: `${call.id}-2`, rateClass: 'outbound_fixed_fr', talkSeconds: secondsBetween(call.transferredAt, endedAt) })
    );
  }
  return { legs, answered };
}

export const simulatedProvider: SoftphoneProvider = {
  id: 'simulated',

  placeOutbound(remote, agentLabel) {
    if (active) return { ok: false, reason: 'Un appel est déjà en cours.' };
    const reason = outboundBlockReason(getState());
    if (reason) return { ok: false, reason };
    const now = Date.now();
    set({
      id: uid('c'),
      direction: 'outbound',
      remote,
      agentLabel,
      rateClass: rateClassFor(remote),
      phase: 'ringing',
      startedAt: now,
    });
    later(RING_MS, () => {
      if (active?.phase === 'ringing') set({ ...active, phase: 'talking', talkStartedAt: Date.now() });
    });
    return { ok: true };
  },

  simulateInbound(agentLabel) {
    if (active) return { ok: false, reason: 'Un appel est déjà en cours.' };
    const reason = inboundBlockReason(getState());
    if (reason) return { ok: false, reason };
    const now = Date.now();
    const caller = `+336${Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')}`;
    set({
      id: uid('c'),
      direction: 'inbound',
      remote: caller,
      agentLabel,
      rateClass: 'inbound_fr',
      phase: 'ivr',
      startedAt: now,
      ivrStartedAt: now,
    });
    later(IVR_MS, () => {
      if (active?.phase === 'ivr') set({ ...active, phase: 'queue', queueStartedAt: Date.now() });
    });
    later(IVR_MS + QUEUE_MS, () => {
      if (active?.phase === 'queue') set({ ...active, phase: 'talking', talkStartedAt: Date.now() });
    });
    return { ok: true };
  },

  transfer() {
    if (active && active.phase === 'talking' && active.transferredAt === undefined) {
      set({ ...active, transferredAt: Date.now() });
    }
  },

  hangup() {
    if (!active) return;
    const call = active;
    const endedAt = Date.now();
    clearTimers();
    const { legs, answered } = buildLegs(call, endedAt);
    set(null);
    recordCall({
      direction: call.direction,
      remote: call.remote,
      agentLabel: call.agentLabel,
      legs,
      answered,
    });
  },
};

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useActiveCall(): ActiveCall | null {
  return useSyncExternalStore(subscribe, () => active, () => null);
}

export const PHASE_LABEL: Record<Phase, string> = {
  ringing: 'Sonnerie…',
  ivr: 'Menu vocal',
  queue: 'File d’attente',
  talking: 'En conversation',
};
