import React from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onClick: () => void;
  className?: string;
  variant?: "default" | "cta";
}

export function OnboardingBackButton({
  onClick,
  className = "",
  variant = "default",
}: Props) {
  const { t } = useTranslation();
  const label = t("companyOnboarding.ui.backToOnboarding");

  if (variant === "cta") {
    return (
      <>
        <style>{`
          @keyframes onbBackPulse {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.06); }
          }
          @keyframes onbBackPing {
            0% { opacity: 0.55; transform: scale(0.95); }
            100% { opacity: 0; transform: scale(1.5); }
          }
          @keyframes onbBackArrow {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(-4px); }
          }
          .onb-back-glow { animation: onbBackPulse 2.6s ease-in-out infinite; }
          .onb-back-ping { animation: onbBackPing 2.6s ease-out infinite; }
          .onb-back-arrow { animation: onbBackArrow 1.8s ease-in-out infinite; }
          .onb-back-btn:hover .onb-back-glow {
            opacity: 1;
            animation-duration: 1.4s;
          }
          .onb-back-btn:hover .onb-back-arrow {
            animation-duration: 0.9s;
          }
        `}</style>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          title={label}
          className={`onb-back-btn group relative inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-harx-500 to-harx-alt-500 pl-3 pr-5 py-2.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-2xl shadow-harx-500/40 ring-2 ring-white/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-harx-500/60 active:scale-95 ${className}`}
        >
          <span className="onb-back-glow absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-harx-400 to-harx-alt-400 opacity-70 blur-md" />
          <span className="onb-back-ping absolute inset-0 -z-10 rounded-full bg-harx-400/40" />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 shadow-inner">
            <ArrowLeft size={14} strokeWidth={3} className="onb-back-arrow text-white" />
          </span>
          {label}
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-harx-300 hover:bg-harx-50 hover:text-harx-700 active:scale-95 ${className}`}
    >
      <ArrowLeft size={16} aria-hidden />
      {label}
    </button>
  );
}
