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
