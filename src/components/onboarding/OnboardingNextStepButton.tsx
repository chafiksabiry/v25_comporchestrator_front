import React from "react";
import { createPortal } from "react-dom";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ONBOARDING_NEXT_STEP_GATE_EVENT = "onboardingNextStepGate";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

/**
 * Centered completion modal shown when an onboarding step is done.
 * Replaces the previous top-right toast + floating "Étape suivante" pair.
 */
export function OnboardingNextStepButton({
  onClick,
  disabled = false,
  disabledHint,
}: Props) {
  const { t } = useTranslation();
  const continueLabel = t("companyOnboarding.ui.nextStepContinue", {
    defaultValue: t("companyOnboarding.ui.nextStep"),
  });

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-complete-title"
      aria-describedby="onboarding-step-complete-desc"
    >
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-hidden
      />

      <div className="onboarding-step-complete-modal relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_32px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500" />

        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/35">
            <CheckCircle2 size={32} strokeWidth={2.25} className="text-white" />
          </span>

          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
            {t("companyOnboarding.ui.completed")}
          </p>
          <h2
            id="onboarding-step-complete-title"
            className="text-xl font-black tracking-tight text-slate-900"
          >
            {t("companyOnboarding.ui.stepCompleteTitle", {
              defaultValue: "Étape terminée",
            })}
          </h2>
          <p
            id="onboarding-step-complete-desc"
            className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-500"
          >
            {t("companyOnboarding.ui.nextStepHint")}
          </p>

          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={continueLabel}
            title={disabled && disabledHint ? disabledHint : continueLabel}
            className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_28px_rgba(16,185,129,0.45)] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/80 ${
              disabled
                ? "cursor-not-allowed bg-emerald-400/60 opacity-60"
                : "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:scale-[1.02] hover:shadow-[0_14px_36px_rgba(16,185,129,0.55)] active:scale-[0.98]"
            }`}
          >
            <span>{continueLabel}</span>
            <ChevronRight size={18} strokeWidth={3} />
          </button>

          {disabled && disabledHint ? (
            <p className="mt-3 text-xs font-semibold text-amber-700">{disabledHint}</p>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes onboardingStepCompleteIn {
          0%   { opacity: 0; transform: translateY(12px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .onboarding-step-complete-modal {
          animation: onboardingStepCompleteIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
