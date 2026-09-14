import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Cookies from 'js-cookie';
import {
  Cpu,
  RefreshCw,
  Sparkles,
  X,
  CreditCard,
  DollarSign,
  Info,
  Activity,
  Briefcase,
} from 'lucide-react';
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
import { getGigsByCompanyId } from '../../../api/matching';

type TokensState = {
  companyId: string;
  tokens: number;
  purchasedTokens: number;
  consumedTokens: number;
};

type DisplayTokenPack = { label: string; tokens: number; priceCents: number };

type GigUsageRow = {
  gigId: string | null;
  tokensUsed: number;
  requests: number;
  lastUsedAt: string | null;
  title?: string;
};

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

function formatEuroFromCents(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
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
  const [gigUsage, setGigUsage] = useState<GigUsageRow[]>([]);

  const companyId = Cookies.get('companyId') || '';
  const apiBaseUrl = getOrchestratorApiBase();

  const fetchData = async (isSilent = false) => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    try {
      const [walletRes, usageRes, gigs] = await Promise.all([
        fetch(`${apiBaseUrl}/tokens-company/${companyId}`),
        fetch(`${apiBaseUrl}/tokens-company/${companyId}/usage-by-gig`),
        getGigsByCompanyId(companyId).catch(() => [] as any[]),
      ]);

      if (walletRes.ok) {
        const json = await walletRes.json();
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

      if (usageRes.ok) {
        const usageJson = await usageRes.json();
        const titleById = new Map<string, string>();
        (Array.isArray(gigs) ? gigs : []).forEach((g: any) => {
          const id = String(g?._id || g?.id || '');
          const title = String(g?.title || g?.name || '').trim();
          if (id) titleById.set(id, title || id);
        });
        const rows: GigUsageRow[] = Array.isArray(usageJson?.data)
          ? usageJson.data.map((row: any) => ({
              gigId: row.gigId ? String(row.gigId) : null,
              tokensUsed: Number(row.tokensUsed) || 0,
              requests: Number(row.requests) || 0,
              lastUsedAt: row.lastUsedAt || null,
              title: row.gigId
                ? titleById.get(String(row.gigId)) || `Gig ${String(row.gigId).slice(-6)}`
                : t('tokensPanel.usage.noGig', 'Hors gig / non attribué'),
            }))
          : [];
        setGigUsage(rows);
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

  const priceCents = useMemo(
    () => computeDisplayPriceCents(parseFloat(tokensToBuy) || 0, displayPacks, customRateCents),
    [tokensToBuy, displayPacks, customRateCents]
  );
  const priceLabel = formatEuroFromCents(priceCents);

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
          <RefreshCw className="h-12 w-12 animate-spin text-slate-500" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {t('tokensPanel.loading', 'Chargement du solde tokens…')}
          </p>
        </div>
      </div>
    );
  }

  const balance = tokensWallet?.tokens ?? 0;
  const purchased = tokensWallet?.purchasedTokens ?? 0;
  const consumed = tokensWallet?.consumedTokens ?? 0;
  const usagePct =
    purchased > 0 ? Math.min(100, Math.round((consumed / purchased) * 100)) : balance > 0 ? 0 : 100;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8 animate-fade-in">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-2xl bg-slate-900/5 p-2.5 text-slate-800">
              <Cpu size={22} />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {t('tokensPanel.title', 'Tokens AI')}
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
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
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            aria-label={t('tokensPanel.refresh', 'Actualiser')}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowBuyModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
          >
            <Sparkles size={15} />
            {t('tokensPanel.buy', 'Acheter des tokens')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 text-white shadow-xl md:col-span-2">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-slate-700/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-slate-600/10 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col justify-between space-y-8">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                {t('tokensPanel.cards.balance', 'Solde disponible')}
              </span>
              <Cpu size={22} className="text-white/30" />
            </div>

            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Tokens AI restants
              </span>
              <span className="block text-5xl font-semibold tracking-tight tabular-nums">
                {formatAiTokensBalance(balance)}
              </span>
              <p className="mt-2 text-sm text-slate-400 tabular-nums">
                {balance.toLocaleString('fr-FR')} tokens
              </p>

              <div className="mt-6 flex flex-wrap items-end gap-8">
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('tokensPanel.cards.purchased', 'Tokens achetés')}
                  </span>
                  <span className="text-2xl font-semibold tracking-tight tabular-nums text-white">
                    {formatAiTokensBalance(purchased)}
                  </span>
                </div>
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('tokensPanel.cards.consumed', 'Tokens consommés')}
                  </span>
                  <span className="text-2xl font-semibold tracking-tight tabular-nums text-slate-300">
                    {formatAiTokensBalance(consumed)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Débit à chaque usage AI (Claude, OpenAI, Gemini)
                </span>
                <span className="tabular-nums">{usagePct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-slate-300 transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Activity size={15} />
              {t('tokensPanel.usageTitle', 'Utilisation')}
            </div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('tokensPanel.cards.consumed', 'Tokens consommés')}
            </h3>
            <span className="mb-3 block text-4xl font-semibold tabular-nums text-slate-900">
              {formatAiTokensBalance(consumed)}
            </span>
            <p className="text-xs leading-relaxed text-slate-500">
              {t(
                'tokensPanel.usageHint',
                'Les tokens sont débités après chaque génération réussie (formation, scripts, analyses).'
              )}
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowBuyModal(true)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-semibold uppercase tracking-wider text-slate-800 transition hover:border-slate-300 hover:bg-white"
            >
              {t('tokensPanel.buy', 'Acheter des tokens')}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              {t('tokensPanel.usage.byGigTitle', 'Consommation par gig')}
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            {gigUsage.length} gig{gigUsage.length > 1 ? 's' : ''}
          </span>
        </div>

        {gigUsage.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              {t('tokensPanel.usage.empty', 'Aucune consommation AI enregistrée pour l’instant.')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {t(
                'tokensPanel.usage.emptyHint',
                'Dès qu’un outil AI (formation, script, analyse) est utilisé sur un gig, le détail apparaît ici.'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">{t('tokensPanel.usage.colGig', 'Gig')}</th>
                  <th className="px-4 py-3">{t('tokensPanel.usage.colTokens', 'Tokens')}</th>
                  <th className="px-4 py-3">{t('tokensPanel.usage.colRequests', 'Requêtes')}</th>
                  <th className="px-4 py-3 text-right">
                    {t('tokensPanel.usage.colLast', 'Dernier usage')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {gigUsage.map((row) => (
                  <tr key={row.gigId || 'none'} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.title}</div>
                      {row.gigId && (
                        <div className="mt-0.5 font-mono text-[10px] text-slate-400">{row.gigId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                      {formatAiTokensBalance(row.tokensUsed)}
                      <span className="ml-1 text-[10px] font-normal text-slate-400">
                        ({row.tokensUsed.toLocaleString('fr-FR')})
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{row.requests}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {row.lastUsedAt
                        ? new Date(row.lastUsedAt).toLocaleString('fr-FR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showBuyModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md animate-fade-in-up space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setShowBuyModal(false)}
                className="absolute right-4 top-4 rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                <X size={18} />
              </button>

              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {t('tokensPanel.modal.title', 'Acheter des tokens AI')}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {t(
                    'tokensPanel.modal.subtitle',
                    'Choisissez un pack ou une quantité, puis payez par carte ou PayPal.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {displayPacks.map((pack) => {
                  const selected = Number(tokensToBuy) === pack.tokens;
                  return (
                    <button
                      key={pack.tokens}
                      type="button"
                      onClick={() => setTokensToBuy(String(pack.tokens))}
                      className={`flex flex-col items-center justify-between rounded-xl border p-3 text-center transition ${
                        selected
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        {pack.label}
                      </span>
                      <span className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                        {formatAiTokensBalance(pack.tokens)}
                      </span>
                      <span className="mt-1 text-[10px] font-semibold tabular-nums text-slate-600">
                        {formatEuroFromCents(pack.priceCents)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleBuySubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('tokensPanel.modal.customQty', 'Quantité personnalisée')}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Cpu size={16} />
                    </div>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={tokensToBuy}
                      onChange={(e) => setTokensToBuy(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold tabular-nums text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('tokensPanel.modal.paymentMethod', 'Méthode de paiement')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold uppercase tracking-wider transition ${
                        paymentMethod === 'card'
                          ? 'border-slate-900 bg-slate-50 text-slate-900'
                          : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard size={18} />
                      <span>Carte</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold uppercase tracking-wider transition ${
                        paymentMethod === 'paypal'
                          ? 'border-slate-900 bg-slate-50 text-slate-900'
                          : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <DollarSign size={18} />
                      <span>PayPal</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] font-medium leading-relaxed text-slate-600">
                  <Info size={16} className="shrink-0 text-slate-500" />
                  <span>
                    {t(
                      'tokensPanel.modal.secureNote',
                      'Paiement sécurisé. Les tokens sont crédités dès confirmation du paiement.'
                    )}{' '}
                    {paymentMethod === 'paypal'
                      ? 'Une fenêtre PayPal s’ouvrira pour valider.'
                      : 'Une fenêtre sécurisée s’ouvrira pour la carte.'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <span className="text-xs font-medium text-slate-500">
                    {t('tokensPanel.modal.total', 'Total')}
                  </span>
                  <span className="text-base font-semibold tabular-nums text-slate-900">
                    {priceLabel}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={
                    submittingBuy ||
                    (paymentMethod === 'paypal' && !paypalEnabled) ||
                    (paymentMethod === 'card' && !stripeEnabled)
                  }
                  className="w-full rounded-xl bg-slate-900 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50"
                >
                  {submittingBuy
                    ? t('tokensPanel.modal.processing', 'Traitement…')
                    : paymentMethod === 'paypal'
                      ? `Payer ${priceLabel} avec PayPal`
                      : `Payer ${priceLabel} par carte`}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default TokensCompanyPanel;
