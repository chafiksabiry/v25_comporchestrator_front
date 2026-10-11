import Cookies from "js-cookie";

/** Clear stale company + onboarding snapshot after DB delete or 404. */
export function clearStaleCompanyClientState(): void {
  Cookies.remove("companyId");
  Cookies.remove("companyOnboardingProgress");
  try {
    localStorage.removeItem("companyId");
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem("companyOnboardingProgress");
  } catch {
    /* ignore */
  }
}
