/** Scroll the real dashboard scrollport (main overflow), not only window. */
export function scrollPageToTop(behavior: ScrollBehavior = 'smooth') {
  const run = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const nodes = document.querySelectorAll<HTMLElement>(
      'main.overflow-y-auto, main.flex-1.overflow-y-auto, main.overflow-y-auto.overflow-x-hidden, [data-harx-scroll-root]'
    );
    nodes.forEach((el) => {
      try {
        el.scrollTo({ top: 0, behavior });
      } catch {
        el.scrollTop = 0;
      }
    });
  };

  // After React paints the next step
  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });
}
