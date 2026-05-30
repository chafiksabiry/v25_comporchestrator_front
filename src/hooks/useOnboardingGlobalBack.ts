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
    if (!enabled) {
      // When the component explicitly says "no back action" (e.g. it renders
      // its own in-content back button), proactively clear any stale global
      // CTA that a previously mounted focus view may have left behind.
      window.dispatchEvent(new CustomEvent("setGlobalBack", { detail: null }));
      return;
    }

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

/** Fired when the user should leave a focused onboarding sub-view (gigs, KB, etc.). */
export const EXIT_ONBOARDING_FOCUS_EVENT = "exitOnboardingFocusView";

export function goToCompanyOnboardingTab() {
  localStorage.setItem("activeTab", "company-onboarding");
  window.dispatchEvent(
    new CustomEvent("tabChange", { detail: { tab: "company-onboarding" } })
  );
  // Switching tabs alone does not close embedded focus views inside
  // CompanyOnboarding (showGigCreation, showKnowledgeBase, …). This event
  // is handled there to reset state and return to the phases overview.
  window.dispatchEvent(new CustomEvent(EXIT_ONBOARDING_FOCUS_EVENT));
}
