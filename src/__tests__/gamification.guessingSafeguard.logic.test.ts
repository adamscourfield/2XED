import { describe, it, expect } from 'vitest';
import { computeGuessingSafeguardTransition, type GuessingSafeguardState } from '@/features/gamification/gamificationService';

const t0 = new Date('2024-01-01T12:00:00.000Z');
const t1 = new Date('2024-01-01T12:00:05.000Z'); // 5000ms later (rapid)
const t2 = new Date('2024-01-01T12:00:10.000Z'); // 10000ms after t1 (not rapid from t1, but 10s after t0)
const t6s = new Date('2024-01-01T12:00:06.000Z'); // exactly 6000ms after t0

const defaultState: GuessingSafeguardState = {
  rapidWrongStreak: 0,
  lastWrongAt: null,
  penaltyRemaining: 0,
};

describe('computeGuessingSafeguardTransition — penalty accumulation', () => {
  it('triggers penalty after 3 rapid wrong answers', () => {
    const s0 = defaultState;
    const s1 = computeGuessingSafeguardTransition(s0, false, t0);
    expect(s1.rapidWrongStreak).toBe(1);

    const s2 = computeGuessingSafeguardTransition(s1, false, t1);
    expect(s2.rapidWrongStreak).toBe(2);

    const s3 = computeGuessingSafeguardTransition(s2, false, new Date(t1.getTime() + 3000));
    expect(s3.rapidWrongStreak).toBe(0);
    expect(s3.penaltyRemaining).toBe(5);
  });

  it('does not trigger penalty when gap between wrongs exceeds 6000ms', () => {
    const s1 = computeGuessingSafeguardTransition(defaultState, false, t0);
    // t2 is 10000ms after t1 (which is 5000ms after t0), so t2 - t0 = 10000ms — not rapid from t0
    const s2 = computeGuessingSafeguardTransition(s1, false, t2);
    // 10000ms gap from t0 > 6000ms → streak resets to 1
    expect(s2.rapidWrongStreak).toBe(1);
    expect(s2.penaltyRemaining).toBe(0);
  });

  it('does not trigger penalty after 2 rapid wrongs then correct', () => {
    const s1 = computeGuessingSafeguardTransition(defaultState, false, t0);
    const s2 = computeGuessingSafeguardTransition(s1, false, t1);
    const s3 = computeGuessingSafeguardTransition(s2, true, t1);
    expect(s3.rapidWrongStreak).toBe(0);
    expect(s3.penaltyRemaining).toBe(0);
  });
});

describe('computeGuessingSafeguardTransition — penalty consumption', () => {
  it('applies penalty (multiplier 0.5) and decrements penaltyRemaining', () => {
    const state: GuessingSafeguardState = { ...defaultState, penaltyRemaining: 3 };
    const result = computeGuessingSafeguardTransition(state, true, t0);
    expect(result.penaltyApplied).toBe(true);
    expect(result.xpMultiplier).toBe(0.5);
    expect(result.penaltyRemaining).toBe(2);
  });

  it('last penalty question: penaltyRemaining goes to 0, still applied', () => {
    const state: GuessingSafeguardState = { ...defaultState, penaltyRemaining: 1 };
    const result = computeGuessingSafeguardTransition(state, true, t0);
    expect(result.penaltyApplied).toBe(true);
    expect(result.penaltyRemaining).toBe(0);
  });

  it('no penalty when penaltyRemaining is 0', () => {
    const result = computeGuessingSafeguardTransition(defaultState, true, t0);
    expect(result.penaltyApplied).toBe(false);
    expect(result.xpMultiplier).toBe(1);
  });
});

describe('computeGuessingSafeguardTransition — streak reset on correct', () => {
  it('resets rapidWrongStreak to 0 on correct answer', () => {
    const state: GuessingSafeguardState = { ...defaultState, rapidWrongStreak: 2, lastWrongAt: t0 };
    const result = computeGuessingSafeguardTransition(state, true, t1);
    expect(result.rapidWrongStreak).toBe(0);
  });
});

describe('computeGuessingSafeguardTransition — boundary: exactly 6000ms gap', () => {
  it('treats exactly 6000ms as rapid (isRapidWrong = true, <= boundary)', () => {
    const s1 = computeGuessingSafeguardTransition(defaultState, false, t0);
    // t6s is exactly 6000ms after t0
    const s2 = computeGuessingSafeguardTransition(s1, false, t6s);
    expect(s2.rapidWrongStreak).toBe(2);
  });

  it('treats 6001ms as NOT rapid', () => {
    const s1 = computeGuessingSafeguardTransition(defaultState, false, t0);
    const t6001 = new Date(t0.getTime() + 6001);
    const s2 = computeGuessingSafeguardTransition(s1, false, t6001);
    // Not rapid → streak resets to 1
    expect(s2.rapidWrongStreak).toBe(1);
  });
});
