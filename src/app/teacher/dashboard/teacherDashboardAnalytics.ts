export type TrendDirection = 'UP' | 'FLAT' | 'DOWN';

export function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function efficiencyScore(attempts: Array<{ correct: boolean; instructionalTimeMs: number }>): number {
  if (attempts.length === 0) return 0;
  const value = attempts.reduce((sum, a) => {
    const minutes = Math.max(1 / 60, (a.instructionalTimeMs ?? 0) / 60000);
    return sum + (a.correct ? 1 : 0) / minutes;
  }, 0);
  return value / attempts.length;
}

export function trendDirection(recent: number, previous: number): TrendDirection {
  const delta = recent - previous;
  if (delta > 0.03) return 'UP';
  if (delta < -0.03) return 'DOWN';
  return 'FLAT';
}

export function trendBadge(direction: TrendDirection): string {
  if (direction === 'UP') return '↑ Improving';
  if (direction === 'DOWN') return '↓ Declining';
  return '→ Stable';
}

export const MOMENTUM_HELP =
  'Momentum is a proxy, not a clinical metric. We compare recent vs previous equal windows using efficiency = correctness ÷ time-on-task (minutes), then bucket into Improving / Stable / Declining.';

export function getRiskModel(params: {
  checkpointRate: number;
  interactionPassRate: number;
  interventions: number;
  wrongFirstDiff: number;
}) {
  const { checkpointRate, interactionPassRate, interventions, wrongFirstDiff } = params;
  let score = 0;
  if (interventions > 0) score += 45;
  if (checkpointRate < 0.5) score += 25;
  else if (checkpointRate < 0.7) score += 15;
  if (interactionPassRate < 0.5) score += 20;
  else if (interactionPassRate < 0.7) score += 10;
  if (wrongFirstDiff >= 3) score += 15;
  else if (wrongFirstDiff > 0) score += 8;

  const riskLevel: 'RED' | 'AMBER' | 'GREEN' = score >= 50 ? 'RED' : score >= 25 ? 'AMBER' : 'GREEN';
  return { riskScore: Math.min(100, score), riskLevel };
}
