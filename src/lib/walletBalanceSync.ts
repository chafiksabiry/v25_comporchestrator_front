import Cookies from 'js-cookie';

export type WalletBalanceSnapshot = {
  balance: number;
  minutes?: number;
  escrow?: number;
};

function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL ||
    'http://localhost:3003/api'
  );
}

/**
 * Fetch company € balance (authoritative: WalletCompany) plus minutes/lines from escrow wallet.
 */
export async function fetchCompanyWalletSnapshot(
  companyId?: string
): Promise<WalletBalanceSnapshot | null> {
  const compId = companyId || Cookies.get('companyId');
  if (!compId) return null;

  const apiBaseUrl = getApiBaseUrl();

  try {
    const [walletRes, escrowRes] = await Promise.all([
      fetch(`${apiBaseUrl}/wallet-company/${compId}`),
      fetch(`${apiBaseUrl}/escrow/wallet/${compId}`).catch(() => null),
    ]);

    let balance = 0;
    if (walletRes.ok) {
      const walletJson = await walletRes.json();
      if (walletJson.success && walletJson.data) {
        balance = Number(walletJson.data.balance) || 0;
      }
    } else if (escrowRes?.ok) {
      const escrowJson = await escrowRes.json();
      if (escrowJson.success && escrowJson.data) {
        balance = Number(escrowJson.data.balance) || 0;
      }
    }

    let minutes: number | undefined;
    let escrow: number | undefined;
    if (escrowRes?.ok) {
      const escrowJson = await escrowRes.json();
      if (escrowJson.success && escrowJson.data) {
        minutes = Number(escrowJson.data.minutes) || 0;
        escrow = Number(escrowJson.data.escrow) || 0;
        if (!walletRes.ok) {
          balance = Number(escrowJson.data.balance) || balance;
        }
      }
    }

    return { balance, minutes, escrow };
  } catch (err) {
    console.error('[walletBalanceSync] fetch failed:', err);
    return null;
  }
}

/** Notify header, Operations dashboard, and any panel listening for wallet changes. */
export function broadcastWalletBalance(snapshot: WalletBalanceSnapshot): void {
  window.dispatchEvent(
    new CustomEvent('balanceUpdated', {
      detail: {
        balance: snapshot.balance,
        ...(snapshot.minutes !== undefined ? { minutes: snapshot.minutes } : {}),
        ...(snapshot.escrow !== undefined ? { escrow: snapshot.escrow } : {}),
      },
    })
  );
}

/**
 * Re-fetch wallet from API and broadcast — call after Stripe/PayPal deposit succeeds.
 * Retries briefly when the webhook/return page may still be settling the credit.
 */
export async function refreshAndBroadcastWalletBalance(
  companyId?: string,
  options?: { retries?: number; delayMs?: number }
): Promise<WalletBalanceSnapshot | null> {
  const retries = options?.retries ?? 4;
  const delayMs = options?.delayMs ?? 400;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const snapshot = await fetchCompanyWalletSnapshot(companyId);
    if (snapshot) {
      broadcastWalletBalance(snapshot);
      return snapshot;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}
