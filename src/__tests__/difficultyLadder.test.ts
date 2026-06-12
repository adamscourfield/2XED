import { describe, expect, it } from 'vitest';
import { nextPracticeIntent } from '@/lib/live/difficultyLadder';

describe('nextPracticeIntent', () => {
  it('starts at similar with no history', () => {
    expect(nextPracticeIntent([])).toBe('PRACTICE_SIMILAR');
  });

  it('holds at similar after a single correct answer', () => {
    expect(nextPracticeIntent([true])).toBe('PRACTICE_SIMILAR');
  });

  it('steps up to challenge after two consecutive correct answers', () => {
    expect(nextPracticeIntent([true, true])).toBe('PRACTICE_CHALLENGE');
    expect(nextPracticeIntent([true, true, false])).toBe('PRACTICE_CHALLENGE');
  });

  it('keeps challenging while the streak continues', () => {
    expect(nextPracticeIntent([true, true, true, true])).toBe('PRACTICE_CHALLENGE');
  });

  it('retries at the same level after a single miss', () => {
    expect(nextPracticeIntent([false, true, true])).toBe('PRACTICE_SIMILAR');
  });

  it('steps down to easier after two consecutive misses', () => {
    expect(nextPracticeIntent([false, false])).toBe('PRACTICE_EASIER');
    expect(nextPracticeIntent([false, false, true])).toBe('PRACTICE_EASIER');
  });

  it('a broken correct streak does not step up', () => {
    expect(nextPracticeIntent([true, false, true])).toBe('PRACTICE_SIMILAR');
  });
});
