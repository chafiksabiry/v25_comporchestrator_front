import React from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ONBOARDING_NEXT_STEP_GATE_EVENT = "onboardingNextStepGate";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

export function OnboardingNextStepButton({
  onClick,
  disabled = false,
  disabledHint,
}: Props) {
  const { t } = useTranslation();
  const label = t("companyOnboarding.ui.nextStep");

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[60] sm:bottom-8 sm:right-8"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={disabled && disabledHint ? disabledHint : label}
        className={`onboarding-next-step pointer-events-auto group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_40px_rgba(236,72,153,0.55)] ring-2 ring-white/50 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-harx-300/80 ${
          disabled
            ? "cursor-not-allowed opacity-55 saturate-50"
            : "hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_16px_48px_rgba(236,72,153,0.75)] active:scale-[0.98]"
        }`}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-harx-500 via-rose-500 to-harx-alt-500" />
        <span className="absolute inset-0 bg-gradient-to-r from-harx-alt-500 via-fuchsia-500 to-harx-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-disabled:opacity-0" />
        <span className="onboarding-next-step-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <span className="onboarding-next-step-ping pointer-events-none absolute -inset-1 rounded-full bg-rose-400/40" />

        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 shadow-inner backdrop-blur-sm">
          <Sparkles
            size={16}
            className="text-white drop-shadow-sm transition-transform duration-300 group-hover:rotate-12 group-disabled:rotate-0"
            strokeWidth={2.5}
          />
        </span>
        <span className="relative">{label}</span>
        <ChevronRight
          size={18}
          strokeWidth={3}
          className="relative transition-transform duration-300 group-hover:translate-x-1 group-disabled:translate-x-0"
        />
      </button>

      <style>{`
        @keyframes onboardingNextStepShine {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes onboardingNextStepPing {
          0% { opacity: 0.5; transform: scale(0.95); }
          100% { opacity: 0; transform: scale(1.35); }
        }
        .onboarding-next-step-shine {
          animation: onboardingNextStepShine 2.8s ease-in-out infinite;
        }
        .onboarding-next-step-ping {
          animation: onboardingNextStepPing 2.4s ease-out infinite;
        }
        .onboarding-next-step:hover .onboarding-next-step-shine {
          animation-duration: 1.4s;
        }
        .onboarding-next-step:disabled .onboarding-next-step-shine,
        .onboarding-next-step:disabled .onboarding-next-step-ping {
          animation: none;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
