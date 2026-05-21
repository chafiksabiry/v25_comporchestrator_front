import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { X, ShieldCheck } from 'lucide-react';
import { STRIPE_PUBLIC_KEY } from '../../config/stripe';
import {
  confirmSubscriptionCheckout,
  initSubscriptionStripeEmbedded,
  type SubscriptionCheckoutInitBody,
} from '../../lib/paypalCheckout';

let stripeSingleton: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripeSingleton) stripeSingleton = loadStripe(STRIPE_PUBLIC_KEY);
  return stripeSingleton;
};

interface Props {
  open: boolean;
  apiBaseUrl: string;
  body: SubscriptionCheckoutInitBody;
  planName: string;
  priceLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EmbeddedSubscriptionCheckout: React.FC<Props> = ({
  open,
  apiBaseUrl,
  body,
  planName,
  priceLabel,
  onClose,
  onSuccess,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const stripePromise = useMemo(() => getStripe(), []);
  const bodyKey = `${body.priceId}|${body.companyId}|${body.userId}|${body.provider}`;

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setPaymentId(null);
      setError(null);
      setConfirming(false);
      return;
    }

    let cancelled = false;
    setClientSecret(null);
    setPaymentId(null);
    setError(null);
    initSubscriptionStripeEmbedded(apiBaseUrl, body)
      .then((data) => {
        if (cancelled) return;
        setClientSecret(data.clientSecret);
        setPaymentId(data.paymentId);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Échec de l’initialisation.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apiBaseUrl, bodyKey]);

  const handleComplete = async () => {
    if (!paymentId) {
      setError('Identifiant de paiement manquant.');
      return;
    }
    setConfirming(true);
    try {
      await confirmSubscriptionCheckout(apiBaseUrl, paymentId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation échouée.');
    } finally {
      setConfirming(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0b14]/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 bg-harx-50 rounded-xl flex items-center justify-center text-harx-500 shadow-inner">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Paiement sécurisé</h2>
              <p className="text-xs font-bold text-gray-500">
                Plan {planName} — {priceLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!confirming) onClose();
            }}
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 text-gray-500 hover:text-gray-900"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <div className="m-6 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600">
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {!clientSecret && !error && (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 border-4 border-harx-500/20 border-t-harx-500 rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Initialisation Stripe…
              </p>
            </div>
          )}

          {clientSecret && (
            <div className="p-2">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret, onComplete: handleComplete }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}

          {confirming && (
            <div className="px-6 pb-6">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-800/80 font-bold text-center">
                Finalisation de l’abonnement…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbeddedSubscriptionCheckout;
