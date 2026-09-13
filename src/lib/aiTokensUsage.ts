import Cookies from 'js-cookie';
import { getOrchestratorApiBase } from './paypalCheckout';

export function formatAiTokensBalance(tokens: number): string {
  const n = Number(tokens) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.max(0, Math.round(n)));
}

/** Rough estimate when provider usage is unavailable (~4 chars ≈ 1 token). */
export function estimateTokensFromText(...parts: Array<string | undefined | null>): number {
  const chars = parts.reduce((sum, p) => sum + String(p || '').length, 0);
  return Math.max(1, Math.ceil(chars / 4));
}

export async function fetchCompanyAiTokens(companyId?: string): Promise<number> {
  const id = companyId || Cookies.get('companyId');
  if (!id) return 0;
  const apiBaseUrl = getOrchestratorApiBase();
  const res = await fetch(`${apiBaseUrl}/tokens-company/${id}`);
  if (!res.ok) return 0;
  const json = await res.json();
  return typeof json?.data?.tokens === 'number' ? json.data.tokens : 0;
}

export async function assertCompanyHasAiTokens(minRequired = 1, companyId?: string): Promise<number> {
  const id = companyId || Cookies.get('companyId');
  if (!id) {
    throw new Error('Company introuvable pour vérifier les tokens AI.');
  }
  const apiBaseUrl = getOrchestratorApiBase();
  const res = await fetch(
    `${apiBaseUrl}/tokens-company/${encodeURIComponent(id)}/check?min=${Math.max(1, minRequired)}`
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(
      json?.message || 'Solde de tokens AI insuffisant. Rechargez pour continuer.'
    ) as Error & { code?: string; tokens?: number };
    err.code = 'insufficient_tokens';
    err.tokens = json?.data?.tokens ?? 0;
    throw err;
  }
  return typeof json?.data?.tokens === 'number' ? json.data.tokens : 0;
}

export async function chargeCompanyAiUsage(opts: {
  usageId: string;
  tokensUsed: number;
  tool: string;
  meta?: Record<string, unknown>;
  companyId?: string;
  /** Skip when backend already billed this request. */
  skipIfBackendBilled?: boolean;
}): Promise<{ tokens: number; charged: boolean }> {
  if (opts.skipIfBackendBilled) {
    return { tokens: await fetchCompanyAiTokens(opts.companyId), charged: false };
  }
  const id = opts.companyId || Cookies.get('companyId');
  if (!id) return { tokens: 0, charged: false };
  const used = Math.max(0, Math.round(Number(opts.tokensUsed) || 0));
  if (used <= 0) return { tokens: await fetchCompanyAiTokens(id), charged: false };

  const apiBaseUrl = getOrchestratorApiBase();
  const res = await fetch(`${apiBaseUrl}/tokens-company/charge-usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyId: id,
      usageId: opts.usageId,
      tokensUsed: used,
      tool: opts.tool,
      meta: opts.meta || undefined,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 402 || json?.error === 'insufficient_tokens') {
    const err = new Error(
      json?.message || 'Solde de tokens AI insuffisant. Rechargez pour continuer.'
    ) as Error & { code?: string; tokens?: number };
    err.code = 'insufficient_tokens';
    err.tokens = json?.data?.tokens ?? 0;
    throw err;
  }
  if (!res.ok) {
    console.warn('[tokens] charge-usage failed', res.status, json);
    return { tokens: await fetchCompanyAiTokens(id), charged: false };
  }

  const next = typeof json?.data?.tokens === 'number' ? json.data.tokens : 0;
  window.dispatchEvent(
    new CustomEvent('balanceUpdated', {
      detail: { tokens: next },
    })
  );
  return { tokens: next, charged: Boolean(json?.charged) };
}

/** Prefer backend-reported usage; refresh navbar when backend billed. */
export function applyBackendAiUsage(usage: any, companyId?: string): boolean {
  const billed = Boolean(usage?.billed);
  if (billed) {
    const balance = typeof usage?.balance === 'number' ? usage.balance : undefined;
    if (typeof balance === 'number') {
      window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { tokens: balance } }));
    } else {
      void fetchCompanyAiTokens(companyId).then((tokens) => {
        window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { tokens } }));
      });
    }
  }
  return billed;
}
