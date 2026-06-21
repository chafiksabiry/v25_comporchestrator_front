import { getDashCallsApiBase } from '../components/dashboard/lib/callsApiBase';

export type BilingualText = { fr: string; en: string };

export type CompanyFraudStatsApi = {
  totalFraudCount: number;
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
