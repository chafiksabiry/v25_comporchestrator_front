/**
 * Controls visibility of the parent shell's navbar features (UPGRADE button, MY WALLET pill).
 *
 * Strategy:
 *  1) Dispatch a `setNavbarFeatures` CustomEvent so the shell can listen and react cleanly.
 *  2) As a fallback (when the shell is not yet updated), apply a CSS rule that hides
 *     navbar items by `data-navbar-feature` attribute, AND a text-content based DOM hack
 *     that finds the button/pill by its visible label (EN + FR) and toggles its display.
 *
 * Triggers (from CompanyOnboarding):
 *   - UPGRADE  → shown from step 11 (Subscription Plan)
 *   - WALLET   → shown from step 12 (Gig Activation)
 */

export interface NavbarFeatures {
  showUpgrade: boolean;
  showWallet: boolean;
}

const STYLE_ID = "harx-navbar-feature-style";

const UPGRADE_LABELS = ["UPGRADE", "AMÉLIORER", "AMELIORER", "PASSER À"];
const WALLET_LABELS = ["MY WALLET", "MON PORTEFEUILLE", "PORTEFEUILLE"];

function ensureStyleTag() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    body.harx-hide-upgrade [data-navbar-feature="upgrade"] { display: none !important; }
    body.harx-hide-wallet [data-navbar-feature="wallet"] { display: none !important; }
  `;
  document.head.appendChild(style);
}

function findContainerByLabel(labels: string[]): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>("button, a, [role='button'], div")
  );
  for (const el of targets) {
    const text = (el.textContent || "").trim().toUpperCase();
    if (!text) continue;
    if (text.length > 80) continue; // skip large containers
    if (labels.some((l) => text.includes(l))) {
      // Walk up to find the closest pill / button container (max 3 levels)
      let node: HTMLElement | null = el;
      for (let i = 0; i < 3 && node; i += 1) {
        if (
          node.tagName === "BUTTON" ||
          node.tagName === "A" ||
          (node.getAttribute("role") === "button") ||
          node.classList.contains("pill") ||
          node.dataset.navbarFeature
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return el;
    }
  }
  return null;
}

function applyDomHack(features: NavbarFeatures) {
  if (typeof document === "undefined") return;

  const upgradeEl = findContainerByLabel(UPGRADE_LABELS);
  if (upgradeEl) upgradeEl.style.display = features.showUpgrade ? "" : "none";

  const walletEl = findContainerByLabel(WALLET_LABELS);
  if (walletEl) walletEl.style.display = features.showWallet ? "" : "none";

  document.body.classList.toggle("harx-hide-upgrade", !features.showUpgrade);
  document.body.classList.toggle("harx-hide-wallet", !features.showWallet);
}

let mutationObserver: MutationObserver | null = null;
let currentFeatures: NavbarFeatures = { showUpgrade: true, showWallet: true };

export function setNavbarFeatures(features: NavbarFeatures): void {
  currentFeatures = features;

  if (typeof window === "undefined") return;
  ensureStyleTag();

  window.dispatchEvent(
    new CustomEvent("setNavbarFeatures", { detail: features })
  );

  applyDomHack(features);

  // Re-apply when the shell re-renders (qiankun lifecycle, route change, etc.)
  if (!mutationObserver) {
    mutationObserver = new MutationObserver(() => {
      applyDomHack(currentFeatures);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }
}

export function resetNavbarFeatures(): void {
  setNavbarFeatures({ showUpgrade: true, showWallet: true });
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}
