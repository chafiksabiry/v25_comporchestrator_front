import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Registers the floating + in-page back CTA via App.tsx `globalBackConfig`.
 *
 * The provided `action` is captured by ref so callers may pass an inline
 * arrow function or a prop that changes reference on every render without
 * triggering an effect re-run (which would re-dispatch the event in a tight
 * loop and crash with "Maximum update depth exceeded").
 */
export function useOnboardingGlobalBack(action: (() => void) | undefined) {
  const { t } = useTranslation();
  const actionRef = useRef(action);

  // Keep the ref pointing at the latest action without causing the registration
  // effect below to re-fire on every render.
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const enabled = Boolean(action);

  useEffect(() => {
    if (!enabled) return;

    const stableAction = () => {
      actionRef.current?.();
    };

    window.dispatchEvent(
      new CustomEvent("setGlobalBack", {
        detail: {
          label: t("companyOnboarding.ui.backToOnboarding"),
          action: stableAction,
        },
      })
    );

    return () => {
      window.dispatchEvent(new CustomEvent("setGlobalBack", { detail: null }));
    };
  }, [enabled, t]);
}

export function goToCompanyOnboardingTab() {
  localStorage.setItem("activeTab", "company-onboarding");
  window.dispatchEvent(
    new CustomEvent("tabChange", { detail: { tab: "company-onboarding" } })
  );
}
