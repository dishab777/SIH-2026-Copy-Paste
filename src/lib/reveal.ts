import { useEffect } from 'react';

/**
 * Reveals elements marked `.reveal` as they arrive on screen.
 *
 * One observer for the whole page rather than one per element, and it does
 * nothing at all when a reader has asked for reduced motion — the stylesheet
 * already shows everything in that case.
 */
export function useReveal(deps: readonly unknown[] = []): void {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const nodes = document.querySelectorAll<HTMLElement>('.reveal:not(.is-in)');
    if (nodes.length === 0) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
