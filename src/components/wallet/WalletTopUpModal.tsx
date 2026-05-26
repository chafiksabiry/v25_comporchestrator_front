import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, DollarSign, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchPaymentConfig,
  getOrchestratorApiBase,
  paymentFlowErrorMessage,
  runPaypalCheckoutFlow,
  runStripeCheckoutFlow,
} from '../../lib/paypalCheckout';
import { refreshAndBroadcastWalletBalance } from '../../lib/walletBalanceSync';

interface WalletTopUpModalProps {
  open: boolean;
  onClose: () => void;
  companyId?: string;
  apiBaseUrl?: string;
  defaultAmount?: number;
  onSuccess?: (amount: number) => void;
}

/**
 * Reusable wallet top-up modal — same look & flow as the dashboard Wallet panel.
 * Use it from the orchestrator navbar widget or from the "Solde insuffisant" warnings.
 */
const WalletTopUpModal: React.FC<WalletTopUpModalProps> = ({
  open,
  onClose,
  companyId,
  apiBaseUrl,
  defaultAmount = 500,
  onSuccess,
}) => {
  const resolvedApiBase = apiBaseUrl || getOrchestratorApiBase();
  const [depositAmount, setDepositAmount] = useState<string>(String(defaultAmount));
  const [depositMethod, setDepositMethod] = useState<'card' | 'paypal'>('card');
  const [submitting, setSubmitting] = useState(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDepositAmount(String(defaultAmount));
    setSubmitting(false);
    fetchPaymentConfig(resolvedApiBase).then((cfg) => {
      setPaypalEnabled(cfg.paypalEnabled);
      setStripeEnabled(cfg.stripeEnabled);
    });
  }, [open, defaultAmount, resolvedApiBase]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, submitting, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      toast.error("Identifiant d'entreprise manquant.");
      return;
    }

    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Veuillez entrer un montant valide.');
      return;
    }

    if (depositMethod === 'paypal' && !paypalEnabled) {
      toast.error("PayPal n'est pas configuré sur le serveur (variables PAYPAL_*).");
      return;
    }
    if (depositMethod === 'card' && !stripeEnabled) {
      toast.error('Le paiement par carte est temporairement indisponible.');
      return;
    }

    setSubmitting(true);
    try {
      const provider: 'paypal' | 'stripe' = depositMethod === 'paypal' ? 'paypal' : 'stripe';
      const initBody = {
        companyId,
        purpose: 'wallet_deposit' as const,
        provider,
        amountEuros: parsed,
      };

      if (provider === 'paypal') {
        await runPaypalCheckoutFlow(resolvedApiBase, initBody);
      } else {
        await runStripeCheckoutFlow(resolvedApiBase, initBody);
      }

      // Always refresh the navbar + any open panels (Approval & Publishing,
      // Operations wallet, etc.) — parent onSuccess alone is not enough when
      // it only updates local state.
      await refreshAndBroadcastWalletBalance(companyId);

      toast.success(`Dépôt de ${parsed.toLocaleString('fr-FR')} € validé !`);
      onSuccess?.(parsed);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(paymentFlowErrorMessage(err) || 'Échec de communication avec la passerelle.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm"
      style={{ padding: 'clamp(8px, 4vh, 32px) 16px' }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md bg-white rounded-[2rem] border border-gray-100 p-6 shadow-2xl space-y-6 relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          disabled={submitting}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Alimenter mon Portefeuille</h3>
          <p className="text-xs text-gray-500">Créditez instantanément votre solde en Euros.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Montant à créditer (€)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                €
              </div>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
                min="1"
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Méthode de paiement
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDepositMethod('card')}
                className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                  depositMethod === 'card'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-600'
                    : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <CreditCard size={18} />
                <span>Carte Bancaire</span>
              </button>
              <button
                type="button"
                onClick={() => setDepositMethod('paypal')}
                className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                  depositMethod === 'paypal'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-600'
                    : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <DollarSign size={18} />
                <span>PayPal</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-2.5 text-[10px] text-blue-800/80 font-bold leading-relaxed">
            <Info size={16} className="shrink-0 text-blue-600" />
            <span>
              Paiement sécurisé par carte ou PayPal — crédit immédiat du portefeuille après confirmation.
              {depositMethod === 'paypal' && " Une fenêtre PayPal s'ouvrira pour valider le paiement."}
              {depositMethod === 'card' && " Une fenêtre sécurisée s'ouvrira pour saisir votre carte."}
            </span>
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              (depositMethod === 'paypal' && !paypalEnabled) ||
              (depositMethod === 'card' && !stripeEnabled)
            }
            className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-orange-500/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Transaction en cours...'
              : depositMethod === 'paypal'
                ? `Payer ${depositAmount} € avec PayPal`
                : `Payer ${depositAmount} € par carte`}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default WalletTopUpModal;
