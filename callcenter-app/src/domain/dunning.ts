/**
 * Relance en cas d'échec de paiement d'un élément récurrent (abonnement, lignes, numéros payés par carte).
 * Les durées par défaut sont une PROPOSITION à valider, elles sont configurables.
 *
 * Étapes : tentative(s) de nouveau prélèvement → suspension des appels sortants → avertissement
 * de libération → libération du numéro. Les appels entrants restent actifs jusqu'à la libération.
 */

export interface DunningPolicy {
  /** Jours après l'échec où un nouveau prélèvement est tenté. */
  retryDays: number[];
  suspendOutboundDay: number;
  releaseWarningDay: number;
  releaseDay: number;
}

export const DEFAULT_DUNNING_POLICY: DunningPolicy = {
  retryDays: [1, 3],
  suspendOutboundDay: 3,
  releaseWarningDay: 6,
  releaseDay: 7,
};

export type DunningStage =
  | 'ok'
  | 'retrying'
  | 'outbound_suspended'
  | 'release_warning'
  | 'released';

export interface DunningState {
  stage: DunningStage;
  daysSinceFailure: number;
  outboundAllowed: boolean;
  inboundAllowed: boolean;
  /** Millisecondes avant la libération du numéro (0 si déjà libéré, null si pas d'échec). */
  msUntilRelease: number | null;
  nextEventAt: Date | null;
  nextEventLabel: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function dunningState(
  failedAt: Date | null,
  now: Date,
  policy: DunningPolicy = DEFAULT_DUNNING_POLICY
): DunningState {
  if (!failedAt) {
    return {
      stage: 'ok',
      daysSinceFailure: 0,
      outboundAllowed: true,
      inboundAllowed: true,
      msUntilRelease: null,
      nextEventAt: null,
      nextEventLabel: null,
    };
  }

  const elapsedMs = Math.max(0, now.getTime() - failedAt.getTime());
  const days = elapsedMs / DAY_MS;
  const at = (day: number) => new Date(failedAt.getTime() + day * DAY_MS);
  const releaseAt = at(policy.releaseDay);
  const msUntilRelease = Math.max(0, releaseAt.getTime() - now.getTime());

  let stage: DunningStage = 'retrying';
  if (days >= policy.releaseDay) stage = 'released';
  else if (days >= policy.releaseWarningDay) stage = 'release_warning';
  else if (days >= policy.suspendOutboundDay) stage = 'outbound_suspended';

  const upcoming: Array<{ day: number; label: string }> = [
    ...policy.retryDays.map((d) => ({ day: d, label: 'Nouvelle tentative de prélèvement' })),
    { day: policy.suspendOutboundDay, label: 'Suspension des appels sortants' },
    { day: policy.releaseWarningDay, label: 'Dernier avertissement avant libération du numéro' },
    { day: policy.releaseDay, label: 'Libération du numéro' },
  ]
    .filter((e) => e.day > days)
    .sort((a, b) => a.day - b.day);

  const next = upcoming[0];

  return {
    stage,
    daysSinceFailure: Math.floor(days),
    outboundAllowed: stage === 'retrying',
    inboundAllowed: stage !== 'released',
    msUntilRelease,
    nextEventAt: next ? at(next.day) : null,
    nextEventLabel: next ? next.label : null,
  };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min`;
}
