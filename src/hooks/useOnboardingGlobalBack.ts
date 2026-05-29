import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Registers the floating + in-page back CTA via App.tsx `globalBackConfig`. */
export function useOnboardingGlobalBack(action: (() => void) | undefined) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!action) return;

    window.dispatchEvent(
      new CustomEvent("setGlobalBack", {
        detail: {
          label: t("companyOnboarding.ui.backToOnboarding"),
          action,
        },
      })
    );

    return () => {
      window.dispatchEvent(new CustomEvent("setGlobalBack", { detail: null }));
    };
  }, [action, t]);
}

export function goToCompanyOnboardingTab() {
  localStorage.setItem("activeTab", "company-onboarding");
  window.dispatchEvent(
    new CustomEvent("tabChange", { detail: { tab: "company-onboarding" } })
  );
}
