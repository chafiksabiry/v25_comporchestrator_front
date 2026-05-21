export type PaypalPopupOutcome = 'approved' | 'cancelled' | 'closed';

const RETURN_ORIGINS = new Set([
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
      if (ev.origin && !RETURN_ORIGINS.has(ev.origin)) return;
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

/** Wait until Stripe redirects to our return/cancel page or the user closes the popup. */
export const waitForStripePopup = (popup: Window): Promise<PaypalPopupOutcome> =>
  new Promise((resolve) => {
    let settled = false;
    let closedGraceTimer: ReturnType<typeof setTimeout> | undefined;
    let sessionIdFromMessage: string | null = null;

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
      if (data.type !== 'HARX_STRIPE_RETURN' && data.type !== 'HARX_STRIPE_CANCEL') return;
      if (ev.origin && !RETURN_ORIGINS.has(ev.origin)) return;
      if (data.type === 'HARX_STRIPE_RETURN') {
        if (typeof data.sessionId === 'string') sessionIdFromMessage = data.sessionId;
        finish('approved');
      }
      if (data.type === 'HARX_STRIPE_CANCEL') finish('cancelled');
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
        if (/stripe-return\.html/i.test(href)) {
          finish('approved');
        } else if (/stripe-cancel\.html/i.test(href)) {
          finish('cancelled');
        }
      } catch {
        /* cross-origin while on stripe checkout */
      }
    }, 400);

    // Expose the captured session id via a side-channel for callers that need it
    (resolve as unknown as { sessionId?: () => string | null }).sessionId = () => sessionIdFromMessage;
  });

export async function runStripeCheckoutFlow(
  apiBaseUrl: string,
  initBody: CheckoutInitBody
): Promise<{ paymentId: string }> {
  const initData = await initCompanyCheckout(apiBaseUrl, initBody) as {
    paymentId: string;
    checkoutUrl?: string;
  };

  // No checkoutUrl → backend ran in stub mode (no STRIPE_SECRET_KEY). Just confirm.
  if (!initData.checkoutUrl) {
    await confirmCompanyCheckout(apiBaseUrl, initData.paymentId);
    return { paymentId: initData.paymentId };
  }

  const popup = openCenteredPopup(initData.checkoutUrl, 'stripe-checkout');
  if (!popup) {
    throw new Error('Veuillez autoriser les pop-ups pour finaliser le paiement par carte.');
  }

  const outcome = await waitForStripePopup(popup);
  if (outcome === 'cancelled') throw new Error('STRIPE_CANCELLED');
  if (outcome === 'closed') throw new Error('STRIPE_CLOSED');

  if (!popup.closed) popup.close();
  await confirmCompanyCheckout(apiBaseUrl, initData.paymentId);
  return { paymentId: initData.paymentId };
}

/** Map checkout flow errors to user-facing French toasts. */
export function paymentFlowErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'PAYPAL_CANCELLED' || msg === 'STRIPE_CANCELLED') return 'Paiement annulé.';
  if (msg === 'PAYPAL_CLOSED') {
    return 'Fenêtre PayPal fermée avant validation. Complétez le paiement sur PayPal.';
  }
  if (msg === 'STRIPE_CLOSED') {
    return 'Fenêtre de paiement fermée avant validation. Complétez le paiement par carte.';
  }
  return msg || 'Échec du paiement.';
}

export type SubscriptionCheckoutInitBody = {
  userId: string;
  companyId: string;
  priceId: string;
  planName: string;
  provider: 'stripe' | 'paypal';
  returnUrl?: string;
  apiBaseUrl?: string;
};

/** Current page URL to return after Stripe hosted checkout (hash-router safe). */
export function getStripeCheckoutReturnUrl(): string {
  return window.location.href.split(/[?&]subscription=/)[0];
}

export function hasSubscriptionReturnFlag(): boolean {
  const search = new URLSearchParams(window.location.search);
  if (search.get('subscription') === 'success') return true;
  const hash = window.location.hash;
  if (!hash.includes('?')) return false;
  const hashQuery = hash.slice(hash.indexOf('?') + 1);
  return new URLSearchParams(hashQuery).get('subscription') === 'success';
}

export function clearSubscriptionReturnFlag(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('subscription');
  if (url.hash.includes('?')) {
    const [path, query] = url.hash.split('?');
    const hp = new URLSearchParams(query);
    hp.delete('subscription');
    const q = hp.toString();
    url.hash = q ? `${path}?${q}` : path;
  }
  window.history.replaceState({}, '', url.toString());
}

export async function initSubscriptionCheckout(
  apiBaseUrl: string,
  body: SubscriptionCheckoutInitBody & { uiMode?: 'embedded' | 'hosted' }
) {
  const res = await fetch(`${apiBaseUrl}/subscriptions/checkout/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await safeParseJson(res);
  if (!data) throw new Error('Réponse du serveur invalide.');
  if (!res.ok || !data?.paymentId) {
    throw new Error(data?.message || data?.error || "Impossible d'initialiser l'abonnement.");
  }
  return data as {
    paymentId: string;
    checkoutUrl?: string;
    paypalOrderId?: string;
    paypalApproveUrl?: string;
    clientSecret?: string;
    sessionId?: string;
    uiMode?: 'embedded' | 'hosted';
  };
}

/**
 * Init an embedded Stripe Checkout session.
 * Returns { paymentId, clientSecret, sessionId } to be passed to <EmbeddedCheckoutProvider/>.
 */
export async function initSubscriptionStripeEmbedded(
  apiBaseUrl: string,
  body: SubscriptionCheckoutInitBody
) {
  const data = await initSubscriptionCheckout(apiBaseUrl, { ...body, uiMode: 'embedded' });
  if (!data.clientSecret) {
    throw new Error("Stripe n'a pas renvoyé de client_secret.");
  }
  return {
    paymentId: data.paymentId,
    clientSecret: data.clientSecret,
    sessionId: data.sessionId || '',
  };
}

export async function confirmSubscriptionCheckout(
  apiBaseUrl: string,
  paymentId: string,
  providerRef?: string
) {
  const res = await fetch(`${apiBaseUrl}/subscriptions/checkout/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, providerRef })
  });
  const data = await safeParseJson(res);
  if (!data) throw new Error('Réponse du serveur invalide.');
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || data?.error || 'Abonnement non confirmé.');
  }
  return data;
}

export async function runSubscriptionPaypalFlow(
  apiBaseUrl: string,
  body: SubscriptionCheckoutInitBody
) {
  const initData = await initSubscriptionCheckout(apiBaseUrl, body);
  if (!initData.paypalApproveUrl) {
    throw new Error("La commande PayPal n'a pas pu être créée.");
  }
  const popup = openCenteredPopup(initData.paypalApproveUrl, 'paypal-subscription');
  if (!popup) throw new Error('Autorisez les pop-ups pour finaliser le paiement PayPal.');
  const outcome = await waitForPaypalPopup(popup);
  if (outcome === 'cancelled') throw new Error('PAYPAL_CANCELLED');
  if (outcome === 'closed') throw new Error('PAYPAL_CLOSED');
  if (!popup.closed) popup.close();
  await confirmSubscriptionCheckout(apiBaseUrl, initData.paymentId, initData.paypalOrderId);
  return initData;
}

/**
 * Stripe subscription checkout via full-page redirect (reliable return from checkout.stripe.com).
 * Confirmation runs on stripe-return.html; the app page handles ?subscription=success on return.
 */
export async function runSubscriptionStripeFlow(
  apiBaseUrl: string,
  body: SubscriptionCheckoutInitBody
): Promise<never> {
  const initData = await initSubscriptionCheckout(apiBaseUrl, {
    ...body,
    returnUrl: body.returnUrl || getStripeCheckoutReturnUrl(),
    apiBaseUrl: body.apiBaseUrl || apiBaseUrl,
  });
  if (!initData.checkoutUrl) {
    throw new Error('Session de paiement non créée.');
  }
  window.location.assign(initData.checkoutUrl);
  return new Promise(() => {}) as never;
}

export async function fetchSubscriptionCheckoutConfig(apiBaseUrl: string) {
  try {
    const res = await fetch(`${apiBaseUrl}/subscriptions/checkout/config`);
    const cfg = await safeParseJson(res);
    if (!res.ok || !cfg) return { paypalEnabled: false, stripeEnabled: false };
    return {
      paypalEnabled: Boolean(cfg.paypal?.enabled),
      stripeEnabled: Boolean(cfg.stripe?.enabled)
    };
  } catch {
    return { paypalEnabled: false, stripeEnabled: false };
  }
}

export async function fetchPaymentConfig(apiBaseUrl: string) {
  try {
    const res = await fetch(`${apiBaseUrl}/payments/checkout/config`);
    const cfg = await safeParseJson(res);
    if (!res.ok || !cfg) {
      return { paypalEnabled: false, stripeEnabled: false, minutesUnitPriceEuros: 1 };
    }
    return {
      paypalEnabled: Boolean(cfg.paypal?.enabled),
      stripeEnabled: Boolean(cfg.stripe?.enabled),
      minutesUnitPriceEuros: cfg.pricing?.minutesUnitPriceEuros ?? 1
    };
  } catch {
    return { paypalEnabled: false, stripeEnabled: false, minutesUnitPriceEuros: 1 };
  }
}
