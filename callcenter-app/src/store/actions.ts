import {
  callCharge,
  debit,
  credit,
  tokenChargeUnits,
  toUnits,
  type Leg,
} from '@/domain/billing';
import type { OnboardingStepId } from '@/domain/onboarding';
import { ONBOARDING_STEPS } from '@/domain/onboarding';
import type { PlanId } from '@/domain/plans';
import { getTemplate, type TemplateId } from '@/domain/templates';
import { inviteAgents as inviteAgentsApi } from '@/api/agents';
import type { NumberCandidate } from '@/api/numbers';
import { getState, setState, uid } from './store';
import type { AiEvaluation, CallRecord, Company, LedgerEntry, Queue } from './types';

const nowIso = () => new Date().toISOString();

function pushLedger(
  s: ReturnType<typeof getState>,
  entry: Omit<LedgerEntry, 'id' | 'at' | 'balanceAfter'>,
  balanceAfter: number
): LedgerEntry[] {
  return [{ id: uid('led'), at: nowIso(), balanceAfter, ...entry }, ...s.ledger].slice(0, 200);
}

/* ---------------------------------------------------------------- parcours */

export function startStep(step: OnboardingStepId): void {
  setState((s) => {
    if (s.onboarding.timings[step]) return { ...s, onboarding: { ...s.onboarding, currentStep: step } };
    return {
      ...s,
      onboarding: {
        ...s.onboarding,
        currentStep: step,
        timings: { ...s.onboarding.timings, [step]: { startedAt: Date.now() } },
      },
    };
  });
}

export function completeStep(step: OnboardingStepId): void {
  setState((s) => {
    const timing = s.onboarding.timings[step] ?? { startedAt: Date.now() };
    const timings = { ...s.onboarding.timings, [step]: { ...timing, completedAt: Date.now() } };
    const idx = ONBOARDING_STEPS.findIndex((x) => x.id === step);
    const next = ONBOARDING_STEPS[idx + 1];
    if (next && !timings[next.id]) timings[next.id] = { startedAt: Date.now() };
    return {
      ...s,
      onboarding: {
        done: !next,
        currentStep: next ? next.id : step,
        timings,
      },
    };
  });
}

export function goToStep(step: OnboardingStepId): void {
  startStep(step);
}

/* ---------------------------------------------------------------- entreprise */

export function saveCompany(company: Company): void {
  setState((s) => ({ ...s, company }));
}

export function chooseTemplate(id: TemplateId): void {
  const t = getTemplate(id);
  setState((s) => {
    const queue: Queue = { ...t.queue, id: uid('queue'), createdAt: nowIso() };
    return { ...s, templateId: id, queues: [queue], script: t.script, shifts: [] };
  });
}

/* ---------------------------------------------------------------- équipe */

export async function inviteAgents(companyId: string, emails: string[]) {
  const known = new Set(getState().agents.map((a) => a.email));
  const fresh = emails.filter((e) => !known.has(e));
  const result = await inviteAgentsApi(companyId, fresh);
  setState((s) => ({ ...s, agents: [...s.agents, ...result.agents] }));
  return { ...result, skipped: emails.filter((e) => known.has(e)) };
}

/* ---------------------------------------------------------------- forfait et solde */

export function subscribeToPlan(planId: PlanId): void {
  const start = new Date();
  const renew = new Date(start.getTime() + 30 * 86_400_000);
  setState((s) => ({
    ...s,
    subscription: { planId, startedAt: start.toISOString(), nextRenewalAt: renew.toISOString(), cardLast4: '4242' },
  }));
}

export function topUp(eur: number): void {
  const units = toUnits(eur);
  setState((s) => {
    const wallet = credit(s.wallet, units);
    return {
      ...s,
      wallet,
      ledger: pushLedger(s, { kind: 'topup', label: `Recharge de ${eur.toLocaleString('fr-FR')} €`, units }, wallet.balanceUnits),
    };
  });
}

export function setPaymentFailure(date: Date | null): void {
  setState((s) => ({ ...s, paymentFailedAt: date ? date.toISOString() : null }));
}

/* ---------------------------------------------------------------- téléphonie */

export function buyNumber(candidate: NumberCandidate): void {
  setState((s) => ({
    ...s,
    numbers: [
      ...s.numbers,
      {
        id: candidate.id,
        e164: candidate.e164,
        label: candidate.label,
        type: candidate.type,
        boughtAt: nowIso(),
        lineIndex: Math.min(s.numbers.length, s.extraLines),
      },
    ],
  }));
}

export function releaseNumber(id: string): void {
  setState((s) => ({ ...s, numbers: s.numbers.filter((n) => n.id !== id) }));
}

export function addLine(): void {
  setState((s) => ({ ...s, extraLines: s.extraLines + 1 }));
}

export function removeLine(): void {
  setState((s) => ({ ...s, extraLines: Math.max(0, s.extraLines - 1) }));
}

/* ---------------------------------------------------------------- files, script, planning */

export function saveQueue(queue: Queue): void {
  setState((s) => ({ ...s, queues: s.queues.map((q) => (q.id === queue.id ? queue : q)) }));
}

export function addQueue(draft: Omit<Queue, 'id' | 'createdAt'>): void {
  setState((s) => ({ ...s, queues: [...s.queues, { ...draft, id: uid('queue'), createdAt: nowIso() }] }));
}

export function removeQueue(id: string): void {
  setState((s) => ({
    ...s,
    queues: s.queues.filter((q) => q.id !== id),
    shifts: s.shifts.filter((sh) => sh.queueId !== id),
  }));
}

export function saveScript(script: string): void {
  setState((s) => ({ ...s, script }));
}

export function toggleShift(agentId: string, queueId: string, day: number, hour: number): void {
  setState((s) => {
    const existing = s.shifts.find(
      (x) => x.agentId === agentId && x.queueId === queueId && x.day === day && x.hour === hour
    );
    return {
      ...s,
      shifts: existing
        ? s.shifts.filter((x) => x.id !== existing.id)
        : [...s.shifts, { id: uid('shift'), agentId, queueId, day, hour }],
    };
  });
}

/* ---------------------------------------------------------------- appels et facturation */

export function recordCall(input: {
  direction: 'inbound' | 'outbound';
  remote: string;
  agentLabel: string;
  legs: Leg[];
  answered: boolean;
}): CallRecord {
  const s0 = getState();
  const charge = callCharge(s0.settings.rateCard, input.legs);
  const record: CallRecord = {
    id: uid('call'),
    at: nowIso(),
    direction: input.direction,
    remote: input.remote,
    agentLabel: input.agentLabel,
    legs: input.legs,
    charges: charge.legs,
    minutes: charge.minutes,
    units: charge.units,
    answered: input.answered,
  };
  setState((s) => {
    const wallet = debit(s.wallet, charge.units);
    const ledger =
      charge.units > 0
        ? pushLedger(
            s,
            {
              kind: 'call',
              label: `${input.direction === 'inbound' ? 'Entrant' : 'Sortant'} ${input.remote} — ${charge.minutes} min`,
              units: -charge.units,
            },
            wallet.balanceUnits
          )
        : s.ledger;
    return { ...s, wallet, ledger, calls: [record, ...s.calls].slice(0, 200) };
  });
  return record;
}

/** Évaluation IA simulée : déterministe à partir de l'appel ; consomme des jetons facturés avec marge. */
export function evaluateCallWithAi(callId: string): AiEvaluation | null {
  const call = getState().calls.find((c) => c.id === callId);
  if (!call || call.aiEvaluation) return call?.aiEvaluation ?? null;
  const seconds = call.legs.reduce((sum, l) => sum + l.seconds, 0);
  const hash = [...call.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const sentiments: AiEvaluation['sentiment'][] = ['positif', 'neutre', 'négatif'];
  const outcomes: AiEvaluation['outcome'][] = ['résolu', 'à rappeler', 'non résolu'];
  const evaluation: AiEvaluation = {
    sentiment: sentiments[hash % 3],
    outcome: outcomes[(hash >> 3) % 3],
    fraudSuspected: hash % 17 === 0,
    summary: `Échange de ${seconds} s. Évaluation simulée : branchez le moteur d’analyse HARX pour un résultat réel.`,
    tokens: 1500 + seconds * 20,
  };
  const units = tokenChargeUnits(evaluation.tokens, getState().settings.tokenCard);
  setState((s) => {
    const wallet = debit(s.wallet, units);
    return {
      ...s,
      wallet,
      ledger: pushLedger(
        s,
        { kind: 'ai', label: `Évaluation IA — ${evaluation.tokens.toLocaleString('fr-FR')} jetons`, units: -units },
        wallet.balanceUnits
      ),
      calls: s.calls.map((c) => (c.id === callId ? { ...c, aiEvaluation: evaluation } : c)),
    };
  });
  return evaluation;
}
