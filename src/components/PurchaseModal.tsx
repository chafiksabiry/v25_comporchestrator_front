import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, Phone, Shield, X, Loader2, Sparkles, Gift, CreditCard, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RequirementForm } from './RequirementForm';
import { phoneNumberService } from '../services/api';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseStatus: 'idle' | 'confirming' | 'requirements' | 'purchasing' | 'success' | 'error';
  purchaseResponse?: {
    phoneNumber: string;
    status: string;
    features: any;
    provider: string;
  } | null;
  selectedNumber: string | null;
  countryReq: {
    hasRequirements: boolean;
    requirements?: any[];
  };
  requirementStatus: {
    isChecking: boolean;
    hasRequirements: boolean;
    isComplete: boolean;
    error: string | null;
  };
  provider: string;
  purchaseError: string | null;
  onSubmitRequirements: (values: Record<string, any>) => Promise<void>;
  onConfirmPurchase: (sids?: { bundleSid?: string; addressSid?: string; paymentId?: string }) => Promise<void>;
  onSetPurchaseStatus: (status: 'idle' | 'confirming' | 'requirements' | 'purchasing' | 'success' | 'error') => void;
  onSetSelectedNumber: (number: string | null) => void;
  onSetShowPurchaseModal: (show: boolean) => void;
  /** When true, this company can claim the very first phone line as a free trial. */
  trialEligible?: boolean;
  /** Duration of the free trial in days (defaults to 15). */
  trialDurationDays?: number;
  /** Company / gig identifiers needed to initialize a paid checkout. */
  companyId?: string;
  gigId?: string;
  /** Public API base URL — forwarded to Stripe so the return page can confirm. */
  apiBaseUrl?: string;
}

type CheckoutConfig = {
  paypal: { enabled: boolean; clientId?: string; mode?: string };
  stripe: { enabled: boolean };
  pricing: { amountCents: number; currency: string };
};

function formatPrice(amountCents: number, currency: string, locale = 'fr-FR'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: (currency || 'EUR').toUpperCase(),
      minimumFractionDigits: 2,
    }).format((amountCents || 0) / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

const TITLE_KEYS: Record<string, string> = {
  confirming: 'telephonySetup.purchaseModal.confirm.title',
  requirements: 'telephonySetup.purchaseModal.requirements.title',
  purchasing: 'telephonySetup.purchaseModal.purchasing.title',
  success: 'telephonySetup.purchaseModal.success.title',
  error: 'telephonySetup.purchaseModal.error.title',
};

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  purchaseStatus,
  purchaseResponse,
  selectedNumber,
  countryReq,
  requirementStatus,
  provider,
  purchaseError,
  onSubmitRequirements,
  onConfirmPurchase,
  onSetPurchaseStatus,
  onSetSelectedNumber,
  onSetShowPurchaseModal,
  trialEligible = false,
  trialDurationDays = 15,
  companyId = '',
  gigId = '',
  apiBaseUrl = '',
}) => {
  const { t } = useTranslation();

  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);
  const [payingWith, setPayingWith] = useState<null | 'stripe' | 'paypal'>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || trialEligible || checkoutConfig) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await phoneNumberService.getCheckoutConfig();
        if (!cancelled) setCheckoutConfig(cfg);
      } catch (e) {
        if (!cancelled) setPaymentError(t('telephonySetup.purchaseModal.payment.loadConfigError'));
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, trialEligible, checkoutConfig, t]);

  if (!isOpen) return null;

  const closeAll = () => {
    if (popupRef.current && !popupRef.current.closed) {
      try { popupRef.current.close(); } catch { /* ignore */ }
    }
    popupRef.current = null;
    setPayingWith(null);
    setPaymentError(null);
    onSetShowPurchaseModal(false);
    onSetPurchaseStatus('idle');
    onSetSelectedNumber(null);
  };

  const openCheckoutPopup = (url: string) => {
    const w = 520;
    const h = 720;
    const dualLeft = window.screenLeft ?? window.screenX;
    const dualTop = window.screenTop ?? window.screenY;
    const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
    const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;
    const left = dualLeft + (width - w) / 2;
    const top = dualTop + (height - h) / 2;
    const popup = window.open(
      url,
      'harx-line-checkout',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,location=no`
    );
    popupRef.current = popup;
    return popup;
  };

  const startPaidCheckout = async (provider: 'stripe' | 'paypal') => {
    if (!selectedNumber || !companyId || !gigId) {
      setPaymentError(t('telephonySetup.purchaseModal.payment.missingContext'));
      return;
    }
    setPaymentError(null);
    setPayingWith(provider);

    try {
      const init = await phoneNumberService.initLineCheckout({
        phoneNumber: selectedNumber,
        gigId,
        companyId,
        provider,
        apiBaseUrl,
        returnUrl: window.location.href,
      });

      const url = provider === 'stripe' ? init.checkoutUrl : init.paypalApproveUrl;
      if (!url) {
        setPayingWith(null);
        setPaymentError(t('telephonySetup.purchaseModal.payment.missingCheckoutUrl'));
        return;
      }

      const popup = openCheckoutPopup(url);
      if (!popup) {
        setPayingWith(null);
        setPaymentError(t('telephonySetup.purchaseModal.payment.popupBlocked'));
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        const data = event.data || {};
        if (data.type === 'HARX_STRIPE_RETURN' && data.paymentId === init.paymentId) {
          window.removeEventListener('message', handleMessage);
          setPayingWith(null);
          try {
            await onConfirmPurchase({ paymentId: init.paymentId });
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : 'Purchase failed');
          }
        } else if (data.type === 'HARX_PAYPAL_RETURN' && data.paymentId === init.paymentId) {
          window.removeEventListener('message', handleMessage);
          try {
            await phoneNumberService.confirmLineCheckout({
              paymentId: init.paymentId,
              providerRef: data.token || init.paypalOrderId,
            });
            setPayingWith(null);
            await onConfirmPurchase({ paymentId: init.paymentId });
          } catch (err) {
            setPayingWith(null);
            setPaymentError(err instanceof Error ? err.message : 'PayPal capture failed');
          }
        }
      };
      window.addEventListener('message', handleMessage);

      const cancelPoll = setInterval(() => {
        if (popup.closed && payingWith) {
          clearInterval(cancelPoll);
          window.removeEventListener('message', handleMessage);
          setPayingWith((prev) => (prev === provider ? null : prev));
        }
      }, 800);
    } catch (err: any) {
      setPayingWith(null);
      const msg = err?.response?.data?.message || err?.message || 'Failed to start checkout';
      setPaymentError(msg);
    }
  };

  const isClosable = purchaseStatus !== 'purchasing';
  const displayNumber = purchaseResponse?.phoneNumber || selectedNumber || '';
  const providerLabel = (purchaseResponse?.provider || provider || 'twilio').toUpperCase();

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => isClosable && closeAll()}
      />

      <div className="relative flex min-h-full w-full items-center justify-center py-8">
        <div
          className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(37,99,235,0.35)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        >
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 px-8 pt-7 pb-8 text-white">
            <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top_right,white,transparent_60%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
                {purchaseStatus === 'success' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : purchaseStatus === 'error' ? (
                  <AlertCircle className="h-6 w-6" />
                ) : purchaseStatus === 'purchasing' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : purchaseStatus === 'requirements' ? (
                  <Shield className="h-6 w-6" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100/80">
                  {providerLabel}
                </p>
                <h3 className="mt-1 text-xl font-black tracking-tight">
                  {t(TITLE_KEYS[purchaseStatus] || TITLE_KEYS.confirming)}
                </h3>
              </div>
              {isClosable && (
                <button
                  onClick={closeAll}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-8 py-7">
            {purchaseStatus === 'requirements' && (
              <RequirementForm
                requirements={countryReq.requirements || []}
                onSubmit={onSubmitRequirements}
                onCancel={closeAll}
              />
            )}

            {purchaseStatus === 'confirming' && (
              <div className="space-y-6">
                <p className="text-[15px] leading-relaxed text-gray-600">
                  {trialEligible
                    ? t('telephonySetup.purchaseModal.confirm.trialSubtitle', { days: trialDurationDays })
                    : t('telephonySetup.purchaseModal.confirm.subtitle')}
                </p>

                {trialEligible && (
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white p-5 shadow-sm">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/30 blur-2xl" />
                    <div className="relative flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
                          {t('telephonySetup.purchaseModal.trial.tag')}
                        </p>
                        <h4 className="mt-1 text-base font-black text-emerald-900">
                          {t('telephonySetup.purchaseModal.trial.title', { days: trialDurationDays })}
                        </h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-emerald-800/90">
                          {t('telephonySetup.purchaseModal.trial.description', { days: trialDurationDays })}
                        </p>
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700/80">
                          {t('telephonySetup.purchaseModal.trial.noPayment')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-blue-50/50 via-white to-white p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">
                    {t('telephonySetup.purchaseModal.confirm.phoneLabel')}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-gray-900 tabular-nums">
                      {displayNumber}
                    </span>
                  </div>
                </div>

                {!trialEligible && (
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
                          {t('telephonySetup.purchaseModal.payment.amountLabel')}
                        </p>
                        <p className="mt-1 text-2xl font-black text-gray-900 tabular-nums">
                          {checkoutConfig
                            ? formatPrice(checkoutConfig.pricing.amountCents, checkoutConfig.pricing.currency)
                            : '—'}
                        </p>
                      </div>
                      <p className="text-[11px] font-medium italic text-gray-400 max-w-[55%] text-right leading-tight">
                        {t('telephonySetup.purchaseModal.payment.note')}
                      </p>
                    </div>

                    {paymentError && (
                      <div className="rounded-xl border border-red-100 bg-red-50/70 p-3 text-sm text-red-700">
                        {paymentError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={!checkoutConfig?.stripe.enabled || payingWith !== null}
                        onClick={() => startPaidCheckout('stripe')}
                        className="group relative flex items-center justify-between gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-gray-100 disabled:hover:shadow-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">
                              {t('telephonySetup.purchaseModal.payment.stripe')}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {t('telephonySetup.purchaseModal.payment.card')}
                            </p>
                          </div>
                        </div>
                        {payingWith === 'stripe' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                      </button>

                      <button
                        type="button"
                        disabled={!checkoutConfig?.paypal.enabled || payingWith !== null}
                        onClick={() => startPaidCheckout('paypal')}
                        className="group relative flex items-center justify-between gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-gray-100 disabled:hover:shadow-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                            <Wallet className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">PayPal</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {t('telephonySetup.purchaseModal.payment.wallet')}
                            </p>
                          </div>
                        </div>
                        {payingWith === 'paypal' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                      </button>
                    </div>

                    {payingWith && (
                      <p className="text-center text-xs italic text-gray-500">
                        {t('telephonySetup.purchaseModal.payment.popupOpen')}
                      </p>
                    )}
                  </div>
                )}

                {provider === 'telnyx' && (
                  <div
                    className={`flex items-start gap-3 rounded-2xl p-4 ${
                      requirementStatus.isComplete
                        ? 'bg-emerald-50 ring-1 ring-emerald-100'
                        : 'bg-amber-50 ring-1 ring-amber-100'
                    }`}
                  >
                    {requirementStatus.isComplete ? (
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    )}
                    <div className="flex-1 text-sm text-gray-700">
                      {requirementStatus.isComplete ? (
                        t('telephonySetup.purchaseModal.confirm.approved')
                      ) : (
                        <>
                          {t('telephonySetup.purchaseModal.confirm.requirementsNeeded')}
                          <button
                            onClick={() => onSetPurchaseStatus('requirements')}
                            className="ml-2 font-bold text-blue-600 underline-offset-2 hover:underline"
                          >
                            {t('telephonySetup.purchaseModal.confirm.completeNow')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {purchaseStatus === 'purchasing' && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-blue-100" />
                  <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
                </div>
                <p className="mt-6 text-base font-bold text-gray-900">
                  {displayNumber}
                </p>
                <p className="mt-2 max-w-sm text-sm text-gray-500">
                  {t('telephonySetup.purchaseModal.purchasing.subtitle')}
                </p>
              </div>
            )}

            {purchaseStatus === 'success' && (
              <div className="text-center">
                <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-60" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>
                <p className="text-base text-gray-700">
                  {t('telephonySetup.purchaseModal.success.subtitle', { number: displayNumber })}
                </p>

                {purchaseResponse?.status && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-1.5 ring-1 ring-gray-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {t('telephonySetup.purchaseModal.success.statusLabel')}
                    </span>
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        purchaseResponse.status === 'active'
                          ? 'text-emerald-600'
                          : purchaseResponse.status === 'pending'
                            ? 'text-amber-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {purchaseResponse.status}
                    </span>
                  </div>
                )}

                {purchaseResponse?.features && Object.keys(purchaseResponse.features).length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
                      {t('telephonySetup.purchaseModal.success.featuresLabel')}
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {Object.entries(purchaseResponse.features).map(([feature, enabled]) => (
                        <span
                          key={feature}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            enabled
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                              : 'bg-gray-50 text-gray-400 ring-1 ring-gray-100'
                          }`}
                        >
                          {enabled && <Sparkles className="h-3 w-3" />}
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-6 text-xs italic text-gray-400">
                  {t('telephonySetup.purchaseModal.success.footnote')}
                </p>
              </div>
            )}

            {purchaseStatus === 'error' && (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-base font-bold text-red-700">
                  {purchaseError || t('telephonySetup.purchaseModal.error.fallback')}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {t('telephonySetup.purchaseModal.error.subtitle')}
                </p>
              </div>
            )}
          </div>

          {purchaseStatus !== 'requirements' && purchaseStatus !== 'purchasing' && (
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-8 py-5">
              {purchaseStatus === 'confirming' && (
                <>
                  <button
                    onClick={closeAll}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700"
                  >
                    {t('telephonySetup.purchaseModal.confirm.cancel')}
                  </button>
                  {trialEligible && (
                    <button
                      onClick={() => onConfirmPurchase()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98]"
                    >
                      <Gift className="h-4 w-4" />
                      {t('telephonySetup.purchaseModal.confirm.trialCta')}
                    </button>
                  )}
                </>
              )}

              {purchaseStatus === 'error' && (
                <>
                  <button
                    onClick={closeAll}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700"
                  >
                    {t('telephonySetup.purchaseModal.error.close')}
                  </button>
                  <button
                    onClick={() => onSetPurchaseStatus('confirming')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.98]"
                  >
                    {t('telephonySetup.purchaseModal.error.retry')}
                  </button>
                </>
              )}

              {purchaseStatus === 'success' && (
                <button
                  onClick={closeAll}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98]"
                >
                  <CheckCircle className="h-4 w-4" />
                  {t('telephonySetup.purchaseModal.success.close')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
