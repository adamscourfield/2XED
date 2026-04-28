'use client';

import type { ReactNode } from 'react';

/**
 * Wraps live lesson UI that swaps on phase changes. Parent should set `key={phaseKey}` on this component
 * so the enter animation runs when the phase changes.
 */
export function LivePhaseTransition({ children }: { children: ReactNode }) {
  return <div className="anx-live-phase-transition">{children}</div>;
}
