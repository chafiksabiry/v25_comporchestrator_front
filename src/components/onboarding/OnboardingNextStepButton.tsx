import React from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface OnboardingNextStepButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function OnboardingNextStepButton({
  onClick,
  disabled = false,
  className = "",
}: OnboardingNextStepButtonProps) {
  const { t } = useTranslation();
  const label = t("companyOnboarding.ui.nextStep");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={disabled ? t("companyOnboarding.ui.nextStepDisabledHint") : label}
      className={`onb-next-step group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full
        bg-gradient-to-r from-[#EC4899] via-[#F43F5E] to-[#8B5CF6] px-6 py-3.5
        text-sm font-black uppercase tracking-[0.14em] text-white
        shadow-[0_12px_40px_rgba(236,72,153,0.55)] ring-2 ring-white/50
        transition-all duration-300
        hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(236,72,153,0.75)] hover:ring-white/80
        active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-harx-400/40
        disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-[0_12px_40px_rgba(236,72,153,0.35)]
        ${className}`}
    >
      <style>{`
        @keyframes onbNextShine {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes onbNextPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.06); }
        }
        .onb-next-step-glow { animation: onbNextPulse 2.4s ease-in-out infinite; }
        .onb-next-step-shine {
          animation: onbNextShine 2.8s ease-in-out infinite;
        }
        .onb-next-step:hover .onb-next-step-shine { animation-duration: 1.4s; }
      `}</style>
      <span className="onb-next-step-glow pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-pink-400 to-violet-500 blur-xl" />
      <span className="onb-next-step-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <Sparkles
        size={16}
        className="relative z-10 shrink-0 text-white/90 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
        aria-hidden
      />
      <span className="relative z-10 whitespace-nowrap">{label}</span>
      <ChevronRight
        size={18}
        strokeWidth={3}
        className="relative z-10 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden
      />
    </button>
  );
}
