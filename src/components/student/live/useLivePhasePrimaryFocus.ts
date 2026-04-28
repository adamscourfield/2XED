'use client';

import { useEffect } from 'react';

const FOCUS_MS_AFTER_TRANSITION = 280;
const FOCUS_MS_REDUCED_MOTION = 50;

/**
 * After a live-lesson phase change, move focus to the element marked
 * `[data-live-primary-focus]` so keyboard users land on the main action.
 * Delay matches the phase enter animation unless reduced motion is requested.
 */
export function useLivePhasePrimaryFocus(phaseKey: string) {
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? FOCUS_MS_REDUCED_MOTION : FOCUS_MS_AFTER_TRANSITION;
    const id = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>('[data-live-primary-focus]');
      if (!el) return;
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }, ms);
    return () => window.clearTimeout(id);
  }, [phaseKey]);
}
