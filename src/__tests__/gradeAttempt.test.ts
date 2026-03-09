import { describe, it, expect } from 'vitest';
import { gradeAttempt } from '@/features/learn/gradeAttempt';

describe('gradeAttempt', () => {
  it('returns true for correct answer', () => {
    expect(gradeAttempt('Paris', 'Paris')).toBe(true);
  });

  it('returns false for incorrect answer', () => {
    expect(gradeAttempt('Paris', 'London')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(gradeAttempt('Paris', 'paris')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(gradeAttempt('Paris', '  Paris  ')).toBe(true);
  });

  it('accepts comma variations in numeric-text answers', () => {
    expect(gradeAttempt('6,000,000 + 40,000 + 70', '6000000 + 40000 + 70')).toBe(true);
  });

  it('normalizes boolean synonyms', () => {
    expect(gradeAttempt('True', 'yes')).toBe(true);
    expect(gradeAttempt('False', 'incorrect')).toBe(true);
  });

  it('normalizes ampersand and and consistently', () => {
    expect(gradeAttempt('one hundred and five', 'one hundred & five')).toBe(true);
  });
});
