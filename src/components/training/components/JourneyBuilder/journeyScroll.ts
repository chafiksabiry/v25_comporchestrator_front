/**
 * Scroll journey content to top. When `[data-journey-document-scroll]` is set on the main
 * wrapper (REP company onboarding), scroll the window instead of a nested overflow region.
 */
export function scrollJourneyMainToTop() {
  const el = document.querySelector('[data-journey-main-scroll]');
  if (el instanceof HTMLElement && el.hasAttribute('data-journey-document-scroll')) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  if (el instanceof HTMLElement) {
    el.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
