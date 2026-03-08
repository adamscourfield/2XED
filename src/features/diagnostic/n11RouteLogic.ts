export type N11Route = 'A' | 'B' | 'C';

export interface N11DiagnosticSignal {
  misconceptionTags: string[];
}

/**
 * N1.1 mapping rules (operator checklist):
 * - m1/m2 -> C
 * - m3/m4 -> B
 * - mixed/unclear -> A
 */
export function selectN11Route(signal: N11DiagnosticSignal): N11Route {
  const tags = new Set(signal.misconceptionTags.map((t) => t.trim().toLowerCase()));

  const hasM12 = tags.has('m1') || tags.has('m2');
  const hasM34 = tags.has('m3') || tags.has('m4');

  if (hasM12 && !hasM34) return 'C';
  if (hasM34 && !hasM12) return 'B';
  return 'A';
}

export function nextFallbackRoute(current: N11Route): N11Route | 'INTERVENTION' {
  if (current === 'A') return 'B';
  if (current === 'B') return 'C';
  return 'INTERVENTION';
}
