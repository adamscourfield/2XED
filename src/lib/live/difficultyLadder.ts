import type { LiveItemIntent } from '@/lib/live/liveItemTypes';

/** Consecutive correct answers required before stepping up to challenge items. */
export const LADDER_STEP_UP_STREAK = 2;
/** Consecutive incorrect answers before stepping down to easier items. */
export const LADDER_STEP_DOWN_STREAK = 2;

/**
 * Automatic difficulty ladder for continuous live practice.
 *
 * Given a student's recent attempt outcomes for the active skill (most recent
 * first), picks the intent for their next item:
 *   - a streak of correct answers steps up to CHALLENGE so practice keeps
 *     getting harder until the teacher redirects the session
 *   - a streak of incorrect answers steps down to EASIER
 *   - anything else stays at SIMILAR (same level, including one-off misses,
 *     which get a retry at the current level rather than an immediate drop)
 *
 * Teacher-dispatched practice (the practice route) is unaffected — this only
 * governs the self-serve stream between teacher pushes.
 */
export function nextPracticeIntent(recentOutcomes: boolean[]): LiveItemIntent {
  if (recentOutcomes.length === 0) return 'PRACTICE_SIMILAR';

  let correctStreak = 0;
  for (const outcome of recentOutcomes) {
    if (!outcome) break;
    correctStreak++;
  }
  if (correctStreak >= LADDER_STEP_UP_STREAK) return 'PRACTICE_CHALLENGE';

  let incorrectStreak = 0;
  for (const outcome of recentOutcomes) {
    if (outcome) break;
    incorrectStreak++;
  }
  if (incorrectStreak >= LADDER_STEP_DOWN_STREAK) return 'PRACTICE_EASIER';

  return 'PRACTICE_SIMILAR';
}
