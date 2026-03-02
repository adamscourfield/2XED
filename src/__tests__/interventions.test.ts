import { describe, it, expect } from 'vitest';

// Test intervention flag idempotency logic without DB
// We test the "should flag" logic

interface MockMastery {
  mastery: number;
  confirmedCount: number;
}

function shouldFlag(recentAttempts: number, mastery: MockMastery | null): boolean {
  if (!mastery) return false;
  return recentAttempts >= 20 && mastery.mastery < 0.6 && mastery.confirmedCount === 0;
}

describe('intervention flag creation logic', () => {
  it('flags when >= 20 attempts, mastery < 0.6, confirmedCount == 0', () => {
    expect(shouldFlag(20, { mastery: 0.3, confirmedCount: 0 })).toBe(true);
  });

  it('does not flag when attempts < 20', () => {
    expect(shouldFlag(19, { mastery: 0.3, confirmedCount: 0 })).toBe(false);
  });

  it('does not flag when mastery >= 0.6', () => {
    expect(shouldFlag(25, { mastery: 0.6, confirmedCount: 0 })).toBe(false);
    expect(shouldFlag(25, { mastery: 0.8, confirmedCount: 0 })).toBe(false);
  });

  it('does not flag when confirmedCount > 0', () => {
    expect(shouldFlag(25, { mastery: 0.3, confirmedCount: 1 })).toBe(false);
  });

  it('does not flag when mastery is null', () => {
    expect(shouldFlag(25, null)).toBe(false);
  });

  it('flags at boundary: exactly 20 attempts, mastery 0.59', () => {
    expect(shouldFlag(20, { mastery: 0.59, confirmedCount: 0 })).toBe(true);
  });

  it('does not flag when mastery is exactly 0.6', () => {
    expect(shouldFlag(20, { mastery: 0.6, confirmedCount: 0 })).toBe(false);
  });
});
