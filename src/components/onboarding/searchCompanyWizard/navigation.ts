/** Navigate to the Company Onboarding tab in the comporchestrator shell */
export function redirectToCompanyOnboarding() {
  localStorage.setItem("activeTab", "company-onboarding");
  window.dispatchEvent(
    new CustomEvent("tabChange", { detail: { tab: "company-onboarding" } })
  );
  window.dispatchEvent(new CustomEvent("openComporchestrator"));

  if (!window.location.hash.includes("orchestrator")) {
    const base = window.location.pathname.replace(/\/$/, "") || "";
    window.location.href = `${base}#/orchestrator`;
  }
}
