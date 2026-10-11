/**
 * Plan quotas come only from Stripe product metadata:
 * ACTIVE GIGS / Active GIGs, ACTIVE REPS,
 * COMMUNICATION MINUTES Included, AI TOKEN (Million),
 * ACTIVE LOCAL NUMBER (Included) / Active local numbers.
 */

export type PlanLimits = {
  maxGigs: number | null;
  maxReps: number | null;
  communicationMinutes: number | null;
  activeLocalNumbers: number | null;
  aiToken: string | null;
  aiTokensIncluded: number | null;
  planName: string | null;
};

function metadataEntries(metadata: unknown): [string, unknown][] {
  if (!metadata) return [];
  if (metadata instanceof Map) return [...metadata.entries()];
  if (typeof metadata === 'object') return Object.entries(metadata as Record<string, unknown>);
  return [];
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findEntry(metadata: unknown, ...candidates: string[]): { key: string; value: unknown } | null {
  const wanted = candidates.map(normalizeKey).filter(Boolean);
  const entries = metadataEntries(metadata);
  for (const w of wanted) {
    for (const [key, value] of entries) {
      if (normalizeKey(key) === w) return { key, value };
    }
  }
  for (const w of wanted) {
    for (const [key, value] of entries) {
      if (normalizeKey(key).startsWith(w)) return { key, value };
    }
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
  const match = String(value ?? '').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = parseNumber(value);
    if (n != null) return n;
  }
  return null;
}

export function extractPlanLimits(
  metadata: unknown,
  fields?: Partial<PlanLimits> | null
): PlanLimits {
  const gigs = findEntry(metadata, 'ACTIVE GIGS', 'Active GIGs');
  const reps = findEntry(metadata, 'ACTIVE REPS', 'Active REPs');
  const minutes = findEntry(metadata, 'COMMUNICATION MINUTES Included', 'COMMUNICATION MINUTES');
  const locals = findEntry(
    metadata,
    'ACTIVE LOCAL NUMBER (Included)',
    'ACTIVE LOCAL NUMBER',
    'ACTIVE LOCAL NUMBERS',
    'Active local numbers'
  );
  const ai = findEntry(metadata, 'AI TOKEN (Million)', 'AI TOKEN');
  const aiRaw = ai ? String(ai.value ?? '').trim() : '';
  const aiAmount = ai ? parseNumber(ai.value) : null;
  const inMillions = Boolean(ai && (/million/i.test(ai.key) || /million/i.test(aiRaw)));

  return {
    maxGigs: parseNumber(gigs?.value) ?? firstNumber(fields?.maxGigs),
    maxReps: parseNumber(reps?.value) ?? firstNumber(fields?.maxReps),
    communicationMinutes: parseNumber(minutes?.value) ?? firstNumber(fields?.communicationMinutes),
    activeLocalNumbers: parseNumber(locals?.value) ?? firstNumber(fields?.activeLocalNumbers),
    aiToken: aiRaw || fields?.aiToken || null,
    aiTokensIncluded:
      aiAmount == null ? firstNumber(fields?.aiTokensIncluded) : inMillions ? aiAmount * 1_000_000 : aiAmount,
    planName: fields?.planName ?? null,
  };
}

export function limitsFromSubscriptionPayload(payload: any): PlanLimits {
  const plan = payload?.data?.planId && typeof payload.data.planId === 'object' ? payload.data.planId : {};
  const limits = payload?.limits && typeof payload.limits === 'object' ? payload.limits : {};
  const metadata = limits.metadata || plan.metadata;
  return extractPlanLimits(metadata, {
    maxGigs: limits.maxGigs ?? plan.maxGigs,
    maxReps: limits.maxReps ?? plan.maxReps,
    communicationMinutes: limits.communicationMinutes ?? plan.communicationMinutes,
    activeLocalNumbers: limits.activeLocalNumbers ?? plan.activeLocalNumbers,
    aiToken: limits.aiToken ?? plan.aiToken,
    aiTokensIncluded: limits.aiTokensIncluded ?? plan.aiTokensIncluded,
    planName: limits.planName || plan.name || null,
  });
}
