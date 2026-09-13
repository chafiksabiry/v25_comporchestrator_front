import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { Cpu, RefreshCw, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  fetchPaymentConfig,
  getOrchestratorApiBase,
  paymentFlowErrorMessage,
  runPaypalCheckoutFlow,
  runStripeCheckoutFlow,
} from '../../../lib/paypalCheckout';
import { formatAiTokensBalance } from '../../../lib/aiTokensUsage';

type TokensState = {
  companyId: string;
  tokens: number;
  purchasedTokens: number;
  consumedTokens: number;
};

type DisplayTokenPack = { label: string; tokens: number; priceCents: number };

const defaultDisplayPacks: DisplayTokenPack[] = [
  { label: 'Starter', tokens: 50000, priceCents: 900 },
  { label: 'Pro', tokens: 200000, priceCents: 2900 },
  { label: 'Scale', tokens: 1000000, priceCents: 9900 },
];

function computeDisplayPriceCents(
  tokens: number,
  packs: DisplayTokenPack[],
  customRateCents: number
): number {
  const qty = Number(tokens);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  const pack = packs.find((p) => p.tokens === qty);
  if (pack) return pack.priceCents;
  return Math.max(1, Math.round(qty * customRateCents));
}

export function TokensCompanyPanel() {
  const { t } = useTranslation();
  const [tokensWallet, setTokensWallet] = useState<TokensState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [tokensToBuy, setTokensToBuy] = useState('50000');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [submittingBuy, setSubmittingBuy] = useState(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [displayPacks, setDisplayPacks] = useState<DisplayTokenPack[]>(defaultDisplayPacks);
  const [customRateCents, setCustomRateCents] = useState(0.02);

  const companyId = Cookies.get('companyId') || '';
  const apiBaseUrl = getOrchestratorApiBase();

  const fetchData = async (isSilent = false) => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/tokens-company/${companyId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const data = json.data;
          const safe: TokensState = {
            companyId: data.companyId || companyId,
            tokens: typeof data.tokens === 'number' ? data.tokens : 0,
            purchasedTokens: typeof data.purchasedTokens === 'number' ? data.purchasedTokens : 0,
            consumedTokens: typeof data.consumedTokens === 'number' ? data.consumedTokens : 0,
          };
          setTokensWallet(safe);
          window.dispatchEvent(
            new CustomEvent('balanceUpdated', { detail: { tokens: safe.tokens } })
          );
        }
      }
    } catch (err) {
      console.error('Error loading Tokens Company data:', err);
      toast.error(t('tokensPanel.toasts.loadFailed', 'Impossible de charger les tokens AI.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [companyId]);

  useEffect(() => {
    if (!showBuyModal) return;
    fetchPaymentConfig(apiBaseUrl).then((cfg) => {
      setPaypalEnabled(cfg.paypalEnabled);
      setStripeEnabled(cfg.stripeEnabled);
      if (Array.isArray(cfg.tokenPacks) && cfg.tokenPacks.length > 0) {
        setDisplayPacks(
          cfg.tokenPacks.map((pack: { label: string; tokens: number; priceCents: number }) => ({
            label: pack.label,
            tokens: pack.tokens,
            priceCents: pack.priceCents,
          }))
        );
      }
      if (cfg.tokensCustomRateCents > 0) setCustomRateCents(cfg.tokensCustomRateCents);
    });
  }, [showBuyModal, apiBaseUrl]);

  const priceLabel = useMemo(() => {
    const cents = computeDisplayPriceCents(parseFloat(tokensToBuy) || 0, displayPacks, customRateCents);
    return `${(cents / 100).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }, [tokensToBuy, displayPacks, customRateCents]);

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.round(parseFloat(tokensToBuy));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t('tokensPanel.toasts.invalidQty', 'Veuillez entrer un volume valide.'));
      return;
    }
    if (paymentMethod === 'paypal' && !paypalEnabled) {
      toast.error("PayPal n'est pas configuré sur le serveur.");
      return;
    }
    if (paymentMethod === 'card' && !stripeEnabled) {
      toast.error('Le paiement par carte est temporairement indisponible.');
      return;
    }

    setSubmittingBuy(true);
    try {
      const provider: 'paypal' | 'stripe' = paymentMethod === 'paypal' ? 'paypal' : 'stripe';
      const initBody = {
        companyId,
        purpose: 'tokens_purchase' as const,
        provider,
        tokens: parsed,
      };
      if (provider === 'paypal') {
        await runPaypalCheckoutFlow(apiBaseUrl, initBody);
      } else {
        await runStripeCheckoutFlow(apiBaseUrl, initBody);
      }
      toast.success(
        t('tokensPanel.toasts.buySuccess', {
          count: parsed.toLocaleString(),
          defaultValue: `Achat de ${parsed.toLocaleString()} tokens réussi !`,
        })
      );
      setShowBuyModal(false);
      void fetchData(true);
    } catch (err: unknown) {
      console.error(err);
      toast.error(paymentFlowErrorMessage(err));
    } finally {
      setSubmittingBuy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-12 w-12 animate-spin text-violet-500" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {t('tokensPanel.loading', 'Chargement du solde tokens…')}
          </p>
        </div>
      </div>
    );
  }

  const balance = tokensWallet?.tokens ?? 0;
  const purchased = tokensWallet?.purchasedTokens ?? 0;
  const consumed = tokensWallet?.consumedTokens ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in p-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-2xl bg-violet-500/10 p-2 text-violet-500">
              <Cpu size={24} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {t('tokensPanel.title', 'Tokens AI')}
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            {t(
              'tokensPanel.subtitle',
              'Rechargez des tokens prépayés pour les outils AI (formation, scripts, analyses).'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void fetchData(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {t('tokensPanel.refresh', 'Actualiser')}
          </button>
          <button
            type="button"
            onClick={() => setShowBuyModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-sm"
          >
            <Sparkles size={16} />
            {t('tokensPanel.buy', 'Acheter des tokens')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            {t('tokensPanel.cards.balance', 'Solde disponible')}
          </p>
          <p className="text-3xl font-black tabular-nums text-slate-900">
            {formatAiTokensBalance(balance)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{balance.toLocaleString('fr-FR')} tokens</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            {t('tokensPanel.cards.purchased', 'Tokens achetés')}
          </p>
          <p className="text-3xl font-black tabular-nums text-slate-900">
            {formatAiTokensBalance(purchased)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            {t('tokensPanel.cards.consumed', 'Tokens consommés')}
          </p>
          <p className="text-3xl font-black tabular-nums text-slate-900">
            {formatAiTokensBalance(consumed)}
          </p>
        </div>
      </div>

      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                {t('tokensPanel.modal.title', 'Acheter des tokens AI')}
              </h2>
              <button type="button" onClick={() => setShowBuyModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBuySubmit} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {displayPacks.map((pack) => (
                  <button
                    key={pack.tokens}
                    type="button"
                    onClick={() => setTokensToBuy(String(pack.tokens))}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                      Number(tokensToBuy) === pack.tokens
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>{pack.label}</div>
                    <div className="tabular-nums">{formatAiTokensBalance(pack.tokens)}</div>
                    <div className="text-[10px] text-slate-500">
                      {(pack.priceCents / 100).toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('tokensPanel.modal.customQty', 'Quantité personnalisée')}
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={tokensToBuy}
                  onChange={(e) => setTokensToBuy(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${
                    paymentMethod === 'card'
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Carte
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${
                    paymentMethod === 'paypal'
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  PayPal
                </button>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t('tokensPanel.modal.total', 'Total')}
                </span>
                <span className="text-sm font-black tabular-nums text-slate-900">{priceLabel}</span>
              </div>
              <button
                type="submit"
                disabled={submittingBuy}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-2.5 text-sm font-black uppercase tracking-wide text-white disabled:opacity-60"
              >
                {submittingBuy
                  ? t('tokensPanel.modal.processing', 'Traitement…')
                  : t('tokensPanel.modal.confirm', 'Payer')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokensCompanyPanel;
