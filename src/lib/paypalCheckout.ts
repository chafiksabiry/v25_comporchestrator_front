export type PaypalPopupOutcome = 'approved' | 'cancelled' | 'closed';

const PAYPAL_RETURN_ORIGINS = new Set([
  'https://harxv25comporchestratorfront.netlify.app',
  'https://harx25pageslinks.netlify.app'
]);

export const safeParseJson = async (res: Response) => {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return null;
  }
};

/** Wait until PayPal redirects to our return/cancel page or the user closes the popup. */
export const waitForPaypalPopup = (popup: Window): Promise<PaypalPopupOutcome> =>
  new Promise((resolve) => {
    let settled = false;
    let closedGraceTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (outcome: PaypalPopupOutcome) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(timer);
      if (closedGraceTimer) clearTimeout(closedGraceTimer);
      resolve(outcome);
    };

    const onMessage = (ev: MessageEvent) => {
      const data = ev?.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== 'HARX_PAYPAL_RETURN' && data.type !== 'HARX_PAYPAL_CANCEL') return;
      if (ev.origin && !PAYPAL_RETURN_ORIGINS.has(ev.origin)) return;
      if (data.type === 'HARX_PAYPAL_RETURN') finish('approved');
      if (data.type === 'HARX_PAYPAL_CANCEL') finish('cancelled');
    };
    window.addEventListener('message', onMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        if (!closedGraceTimer) {
          closedGraceTimer = setTimeout(() => finish('closed'), 1200);
        }
        return;
      }
      if (closedGraceTimer) {
        clearTimeout(closedGraceTimer);
        closedGraceTimer = undefined;
      }
      try {
        const href = popup.location.href;
        if (/paypal-return\.html/i.test(href) || /\/paypal\/return/i.test(href)) {
          finish('approved');
        } else if (/paypal-cancel\.html/i.test(href) || /\/paypal\/cancel/i.test(href)) {
          finish('cancelled');
        }
      } catch {
        /* cross-origin while on paypal.com */
      }
    }, 400);
  });

export const openCenteredPopup = (url: string, title: string, w = 520, h = 720): Window | null => {
  const dualLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualTop = window.screenTop ?? window.screenY ?? 0;
  const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const height = window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = dualLeft + (width - w) / 2;
  const top = dualTop + (height - h) / 2;
  return window.open(
    url,
    title,
    `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`
  );
};

export type PaymentPurpose = 'wallet_deposit' | 'minutes_purchase';

export type CheckoutInitBody =
  | { companyId: string; purpose: 'wallet_deposit'; provider: 'stripe' | 'paypal'; amountEuros: number }
  | { companyId: string; purpose: 'minutes_purchase'; provider: 'stripe' | 'paypal'; minutes: number };

export async function initCompanyCheckout(apiBaseUrl: string, body: CheckoutInitBody) {
  const res = await fetch(`${apiBaseUrl}/payments/checkout/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await safeParseJson(res);
  if (!data) throw new Error('Réponse du serveur de paiement invalide.');
  if (!res.ok || !data?.paymentId) {
    throw new Error(data?.message || data?.error || "Impossible d'initialiser le paiement.");
  }
  return data as {
    paymentId: string;
    paypalOrderId?: string;
    paypalApproveUrl?: string;
    amountEuros?: number;
  };
}

export async function confirmCompanyCheckout(
  apiBaseUrl: string,
  paymentId: string,
  providerRef?: string
) {
  const res = await fetch(`${apiBaseUrl}/payments/checkout/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, providerRef })
  });
  const data = await safeParseJson(res);
  if (!data) throw new Error('Réponse du serveur de paiement invalide.');
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || data?.error || 'Paiement non confirmé.');
  }
  return data;
}

export async function runPaypalCheckoutFlow(
  apiBaseUrl: string,
  initBody: CheckoutInitBody
): Promise<{ paymentId: string }> {
  const initData = await initCompanyCheckout(apiBaseUrl, initBody);
  if (!initData.paypalApproveUrl) {
    throw new Error("La commande PayPal n'a pas pu être créée.");
  }

  const popup = openCenteredPopup(initData.paypalApproveUrl, 'paypal-checkout');
  if (!popup) {
    throw new Error('Veuillez autoriser les pop-ups pour finaliser le paiement PayPal.');
  }

  const outcome = await waitForPaypalPopup(popup);
  if (outcome === 'cancelled') {
    throw new Error('PAYPAL_CANCELLED');
  }
  if (outcome === 'closed') {
    throw new Error('PAYPAL_CLOSED');
  }

  if (!popup.closed) popup.close();
  await confirmCompanyCheckout(apiBaseUrl, initData.paymentId, initData.paypalOrderId);
  return { paymentId: initData.paymentId };
}

export async function runStripeCheckoutFlow(
  apiBaseUrl: string,
  initBody: CheckoutInitBody
): Promise<{ paymentId: string }> {
  const initData = await initCompanyCheckout(apiBaseUrl, initBody);
  await confirmCompanyCheckout(apiBaseUrl, initData.paymentId);
  return { paymentId: initData.paymentId };
}

export async function fetchPaymentConfig(apiBaseUrl: string) {
  try {
    const res = await fetch(`${apiBaseUrl}/payments/checkout/config`);
    const cfg = await safeParseJson(res);
    if (!res.ok || !cfg) return { paypalEnabled: false, stripeEnabled: false };
    return {
      paypalEnabled: Boolean(cfg.paypal?.enabled),
      stripeEnabled: Boolean(cfg.stripe?.enabled) || true,
      minutesUnitPriceEuros: cfg.pricing?.minutesUnitPriceEuros ?? 1
    };
  } catch {
    return { paypalEnabled: false, stripeEnabled: true, minutesUnitPriceEuros: 1 };
  }
}
