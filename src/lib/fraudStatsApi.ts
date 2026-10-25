import { getDashCallsApiBase } from '../components/dashboard/lib/callsApiBase';

export type BilingualText = { fr: string; en: string };

export type CompanyFraudStatsApi = {
  totalFraudCount: number;
  confirmedCount?: number;
  pendingReviewCount?: number;
  overturnedCount?: number;
  agentStats: Array<{
    agentId: string;
    agentName: string;
    fraudCount: number;
    warnings?: {
      agent?: BilingualText;
      agentCountLabel?: BilingualText;
    };
  }>;
  warnings?: {
    global?: BilingualText;
    countLabel?: BilingualText;
    commissionNotice?: BilingualText;
  };
};

export type AgentFraudStatsApi = {
  agentId: string;
  fraudCount: number;
  warnings?: {
    repBlacklist?: BilingualText;
    countLabel?: BilingualText;
    commissionNotice?: BilingualText;
  };
};

export function pickBilingual(text: BilingualText | undefined, language: string): string {
  if (!text) return '';
  return language.toLowerCase().startsWith('en') ? text.en : text.fr;
}

export async function fetchCompanyFraudStats(companyId: string): Promise<CompanyFraudStatsApi | null> {
  const base = getDashCallsApiBase();
  if (!base || !companyId) return null;
  try {
    const res = await fetch(`${base}/calls/company/${encodeURIComponent(companyId)}/fraud-stats`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchAgentFraudStats(agentId: string): Promise<AgentFraudStatsApi | null> {
  const base = getDashCallsApiBase();
  if (!base || !agentId) return null;
  try {
    const res = await fetch(`${base}/calls/agent/${encodeURIComponent(agentId)}/fraud-stats`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export type FraudReviewState = 'pending' | 'confirmed' | 'overturned';

export type FraudCallRow = {
  id: string;
  createdAt: string | null;
  duration: number | null;
  agentId: string;
  agentName: string;
  leadName: string | null;
  leadPhone: string | null;
  gigId: string | null;
  gigTitle: string | null;
  /** AI integrity score: below 50 reads as fraud. */
  fraudScore: number | null;
  selfCall: boolean;
  reason: BilingualText;
  recordingUrl: string | null;
  transcriptPreview: Array<{ speaker?: string; text: string }>;
  review: { state: FraudReviewState; reviewedAt: string | null; reason: string | null };
};

export type FraudCallsApi = {
  counts: Record<FraudReviewState, number>;
  calls: FraudCallRow[];
  truncated: boolean;
};

export async function fetchFraudCalls(
  companyId: string,
  options: { status: FraudReviewState | 'all'; gigId?: string }
): Promise<FraudCallsApi> {
  const base = getDashCallsApiBase();
  if (!base || !companyId) throw new Error('missing base or companyId');
  const qs = new URLSearchParams({ status: options.status });
  if (options.gigId && options.gigId !== 'all') qs.set('gigId', options.gigId);
  const res = await fetch(`${base}/calls/company/${encodeURIComponent(companyId)}/fraud-calls?${qs.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data as FraudCallsApi;
}

/** `confirm`: the fraud is real (stays counted, leaves the queue). `overturn`: false positive. */
export async function reviewFraudCall(
  callId: string,
  decision: 'confirm' | 'overturn',
  options: { reviewedBy?: string; reason?: string } = {}
): Promise<void> {
  const base = getDashCallsApiBase();
  if (!base || !callId) throw new Error('missing base or callId');
  const res = await fetch(`${base}/calls/${encodeURIComponent(callId)}/fraud-review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, ...options }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(String(json?.message || `HTTP ${res.status}`));
  }
}
