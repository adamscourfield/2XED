export const MASTERY_STABLE_THRESHOLD = 0.85;
export const MASTERY_IMPROVING_THRESHOLD = 0.6;

export function calculateMastery(correct: number, total: number): number {
  if (total === 0) return 0;
  return correct / total;
}

export function scheduleNextReview(
  mastery: number,
  confirmedCount: number,
  now: Date = new Date(),
  halfLifeDays?: number
): Date {
  const next = new Date(now);

  // When the knowledge-state system has a personalised half-life, use it directly.
  // We schedule the next review at 90 % of the half-life (matching the review-due
  // threshold in nextQuestionPolicy) capped to at least 1 day and at most 60 days.
  if (halfLifeDays !== undefined && halfLifeDays > 0) {
    const days = Math.min(60, Math.max(1, Math.round(halfLifeDays * 0.9)));
    next.setDate(next.getDate() + days);
    return next;
  }

  // Fallback: static mastery-band buckets used before knowledge-state data exists.
  if (mastery < MASTERY_IMPROVING_THRESHOLD) {
    next.setDate(next.getDate() + 1);
  } else if (mastery < MASTERY_STABLE_THRESHOLD) {
    next.setDate(next.getDate() + 3);
  } else if (confirmedCount < 2) {
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + 14);
  }
  return next;
}

export function isSkillStable(mastery: number, confirmedCount: number): boolean {
  return mastery >= MASTERY_STABLE_THRESHOLD && confirmedCount >= 2;
}
