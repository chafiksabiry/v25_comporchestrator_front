import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  SetupStepField,
  STEP_FIELD_ORDER,
  STEP_FIELD_TO_ROUTE,
} from '../../../services/gigSetupSync';

interface StepCompleteDetail {
  gigId?: string;
  field: SetupStepField;
  nextRoute: string;
}

/** Listens for `harx:gig-step-complete` and surfaces a unified
 *  "Continue →" toast so the rep is funnelled straight into the
 *  next setup page regardless of which page just completed the
 *  current step. Mounted once at the dashboard layout root. */
const StepCompletionToaster: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent<StepCompleteDetail>).detail;
      if (!detail || !detail.field) return;

      const idx = STEP_FIELD_ORDER.indexOf(detail.field);
      const isLast = idx === STEP_FIELD_ORDER.length - 1;
      const nextField =
        idx >= 0 && !isLast ? STEP_FIELD_ORDER[idx + 1] : null;

      const stepLabel = t(`gigDetails.setupBanner.steps.${detail.field}`);
      const nextLabel = nextField
        ? t(`gigDetails.setupBanner.steps.${nextField}`)
        : '';

      // Always dismiss any previous step-complete toast first so
      // back-to-back actions don't stack identical CTAs.
      toast.dismiss('harx-step-complete');

      toast.custom(
        (toastInst) => (
          <div
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg ring-1 ring-emerald-100 ${
              toastInst.visible ? 'animate-in fade-in slide-in-from-top-2' : 'opacity-0'
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <div className="min-w-0 max-w-[280px]">
              <div className="truncate text-sm font-semibold text-gray-900">
                {t('gigDetails.setupBanner.toast.stepCompleted', { step: stepLabel })}
              </div>
              {nextField ? (
                <div className="mt-0.5 truncate text-xs text-gray-500">
                  {t('gigDetails.setupBanner.toast.nextStepHint', { next: nextLabel })}
                </div>
              ) : (
                <div className="mt-0.5 truncate text-xs text-emerald-600">
                  {t('gigDetails.setupBanner.toast.allDone')}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastInst.id);
                if (nextField) {
                  navigate(detail.nextRoute);
                }
              }}
              className="ml-2 inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              {nextField
                ? t('gigDetails.setupBanner.toast.cta')
                : t('gigDetails.setupBanner.completed')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
        {
          id: 'harx-step-complete',
          duration: 8000,
          position: 'top-right',
        }
      );

      // Reference unused imports/types to please TS in case route
      // map shrinks unexpectedly.
      void STEP_FIELD_TO_ROUTE;
    };

    window.addEventListener('harx:gig-step-complete', handler);
    return () => window.removeEventListener('harx:gig-step-complete', handler);
  }, [t, navigate]);

  return null;
};

export default StepCompletionToaster;
