import { DATA_MODE, authFetch, orchestratorApiBase } from '@/lib/session';
import { toUnits } from '@/domain/billing';

/**
 * Lecture du solde € existant (`/wallet-company/:companyId`, même contrat que le micro-frontend entreprise).
 * Retourne null en mode démo ou si l'API est injoignable.
 */
export async function fetchLiveBalanceUnits(companyId: string): Promise<number | null> {
  if (DATA_MODE !== 'live') return null;
  try {
    const res = await authFetch(`${orchestratorApiBase()}/wallet-company/${encodeURIComponent(companyId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    const balance = json?.success && json?.data ? Number(json.data.balance) : NaN;
    return Number.isFinite(balance) ? toUnits(balance) : null;
  } catch {
    return null;
  }
}
