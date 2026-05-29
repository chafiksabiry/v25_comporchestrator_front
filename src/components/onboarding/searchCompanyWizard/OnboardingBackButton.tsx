import React from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onClick: () => void;
  className?: string;
}

export function OnboardingBackButton({ onClick, className = "" }: Props) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-harx-300 hover:bg-harx-50 hover:text-harx-700 active:scale-95 ${className}`}
    >
      <ArrowLeft size={16} aria-hidden />
      {t("companyOnboarding.ui.backToOnboarding")}
    </button>
  );
}
