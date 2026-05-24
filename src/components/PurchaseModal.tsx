import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, Phone, Shield, X, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RequirementForm } from './RequirementForm';

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
  onConfirmPurchase: (sids?: { bundleSid?: string; addressSid?: string }) => Promise<void>;
  onSetPurchaseStatus: (status: 'idle' | 'confirming' | 'requirements' | 'purchasing' | 'success' | 'error') => void;
  onSetSelectedNumber: (number: string | null) => void;
  onSetShowPurchaseModal: (show: boolean) => void;
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
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const closeAll = () => {
    onSetShowPurchaseModal(false);
    onSetPurchaseStatus('idle');
    onSetSelectedNumber(null);
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
                  {t('telephonySetup.purchaseModal.confirm.subtitle')}
                </p>

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
                  <button
                    onClick={() => onConfirmPurchase()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.98]"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('telephonySetup.purchaseModal.confirm.confirmCta')}
                  </button>
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
