import { describe, it, expect } from 'vitest';
import { computeMasteryUpdate } from '@/features/mastery/updateMastery';

const now = new Date('2024-06-15T12:00:00.000Z');
const pastDate = new Date('2024-06-14T12:00:00.000Z');
const futureDate = new Date('2024-06-16T12:00:00.000Z');

describe('computeMasteryUpdate — isDueReview', () => {
  it('isDueReview is true when mode=REVIEW and nextReviewAt <= now', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.8, confirmedCount: 1, streak: 1, nextReviewAt: pastDate },
      mode: 'REVIEW',
      now,
    });
    expect(result.isDueReview).toBe(true);
  });

  it('isDueReview is false when mode=REVIEW and nextReviewAt > now', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.8, confirmedCount: 1, streak: 1, nextReviewAt: futureDate },
      mode: 'REVIEW',
      now,
    });
    expect(result.isDueReview).toBe(false);
  });

  it('isDueReview is false when mode=REVIEW and nextReviewAt is null', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.8, confirmedCount: 1, streak: 1, nextReviewAt: null },
      mode: 'REVIEW',
      now,
    });
    expect(result.isDueReview).toBe(false);
  });

  it('isDueReview is false when mode=PRACTICE regardless of nextReviewAt', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.8, confirmedCount: 1, streak: 1, nextReviewAt: pastDate },
      mode: 'PRACTICE',
      now,
    });
    expect(result.isDueReview).toBe(false);
  });
});

describe('computeMasteryUpdate — confirmedCount logic', () => {
  it('increments confirmedCount from 0 to 1 on passing due review', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.7, confirmedCount: 0, streak: 0, nextReviewAt: pastDate },
      mode: 'REVIEW',
      now,
    });
    expect(result.newConfirmedCount).toBe(1);
  });

  it('increments confirmedCount from 1 to 2 on passing due review', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.8, confirmedCount: 1, streak: 1, nextReviewAt: pastDate },
      mode: 'REVIEW',
      now,
    });
    expect(result.newConfirmedCount).toBe(2);
  });

  it('caps confirmedCount at 2 (does not exceed)', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.9, confirmedCount: 2, streak: 2, nextReviewAt: pastDate },
      mode: 'REVIEW',
      now,
    });
    expect(result.newConfirmedCount).toBe(2);
  });

  it('does not increment confirmedCount in PRACTICE mode even if passing', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.8, confirmedCount: 1, streak: 1, nextReviewAt: pastDate },
      mode: 'PRACTICE',
      now,
    });
    expect(result.newConfirmedCount).toBe(1);
  });

  it('does not change confirmedCount when mastery below threshold', () => {
    const result = computeMasteryUpdate({
      mastery: 0.5,
      existing: { mastery: 0.8, confirmedCount: 1, streak: 2, nextReviewAt: pastDate },
      mode: 'REVIEW',
      now,
    });
    expect(result.newConfirmedCount).toBe(1);
  });
});

describe('computeMasteryUpdate — streak logic', () => {
  it('increments streak on passing mastery', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.7, confirmedCount: 0, streak: 3, nextReviewAt: null },
      mode: 'PRACTICE',
      now,
    });
    expect(result.newStreak).toBe(4);
  });

  it('resets streak to 0 on failing mastery', () => {
    const result = computeMasteryUpdate({
      mastery: 0.4,
      existing: { mastery: 0.9, confirmedCount: 2, streak: 5, nextReviewAt: null },
      mode: 'PRACTICE',
      now,
    });
    expect(result.newStreak).toBe(0);
  });

  it('starts streak at 1 on first passing attempt (no existing)', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: null,
      mode: 'PRACTICE',
      now,
    });
    expect(result.newStreak).toBe(1);
  });

  it('starts streak at 0 on first failing attempt (no existing)', () => {
    const result = computeMasteryUpdate({
      mastery: 0.4,
      existing: null,
      mode: 'PRACTICE',
      now,
    });
    expect(result.newStreak).toBe(0);
  });
});

describe('computeMasteryUpdate — status transitions', () => {
  it('transitions NOT_YET → DEVELOPING when mastery crosses 0.6', () => {
    const result = computeMasteryUpdate({
      mastery: 0.7,
      existing: { mastery: 0.4, confirmedCount: 0, streak: 0, nextReviewAt: null },
      mode: 'PRACTICE',
      now,
    });
    expect(result.previousStatus).toBe('NOT_YET');
    expect(result.nextStatus).toBe('DEVELOPING');
  });

  it('transitions DEVELOPING → SECURE when mastery >= 0.85 and confirmedCount reaches 2', () => {
    const result = computeMasteryUpdate({
      mastery: 0.9,
      existing: { mastery: 0.9, confirmedCount: 1, streak: 1, nextReviewAt: pastDate },
      mode: 'REVIEW',
      now,
    });
    expect(result.previousStatus).toBe('DEVELOPING');
    expect(result.nextStatus).toBe('SECURE');
  });

  it('detects no status transition when status is unchanged', () => {
    const result = computeMasteryUpdate({
      mastery: 0.7,
      existing: { mastery: 0.65, confirmedCount: 0, streak: 1, nextReviewAt: null },
      mode: 'PRACTICE',
      now,
    });
    expect(result.previousStatus).toBe('DEVELOPING');
    expect(result.nextStatus).toBe('DEVELOPING');
  });

  it('transitions SECURE → NOT_YET on mastery drop', () => {
    const result = computeMasteryUpdate({
      mastery: 0.3,
      existing: { mastery: 0.95, confirmedCount: 2, streak: 3, nextReviewAt: null },
      mode: 'PRACTICE',
      now,
    });
    expect(result.previousStatus).toBe('SECURE');
    expect(result.nextStatus).toBe('NOT_YET');
  });
});
