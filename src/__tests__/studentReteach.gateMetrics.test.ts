import { describe, it, expect } from 'vitest';
import {
  clamp01,
  rateCorrect,
  median,
  classifyResponseTimeBand,
  computeCorrectnessTrendDelta,
  buildGateMetrics,
  inferReasonCodes,
  type ParsedAttempt,
} from '@/features/reteach/studentReteach';
import { getDefaultReteachPolicy } from '@/features/reteach/reteachPolicyContract';

const config = getDefaultReteachPolicy('v2');

function makeAttempt(overrides: Partial<ParsedAttempt> = {}): ParsedAttempt {
  return {
    correct: true,
    supportLevel: 'INDEPENDENT',
    isDelayedRetrieval: false,
    ...overrides,
  };
}

describe('clamp01', () => {
  it('returns fallback for undefined', () => {
    expect(clamp01(undefined)).toBe(0);
    expect(clamp01(undefined, 1)).toBe(1);
  });

  it('returns fallback for NaN', () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(NaN, 0.5)).toBe(0.5);
  });

  it('clamps below 0 to 0', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(-0.001)).toBe(0);
  });

  it('clamps above 1 to 1', () => {
    expect(clamp01(2)).toBe(1);
    expect(clamp01(1.001)).toBe(1);
  });

  it('passes through values in [0, 1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });
});

describe('rateCorrect', () => {
  it('returns 0 for empty array', () => {
    expect(rateCorrect([])).toBe(0);
  });

  it('returns 1 when all correct', () => {
    expect(rateCorrect([{ correct: true }, { correct: true }])).toBe(1);
  });

  it('returns 0 when none correct', () => {
    expect(rateCorrect([{ correct: false }, { correct: false }])).toBe(0);
  });

  it('returns exact ratio for mixed', () => {
    expect(rateCorrect([{ correct: true }, { correct: false }, { correct: true }, { correct: false }])).toBe(0.5);
  });

  it('handles single item', () => {
    expect(rateCorrect([{ correct: true }])).toBe(1);
    expect(rateCorrect([{ correct: false }])).toBe(0);
  });
});

describe('median', () => {
  it('returns null for empty array', () => {
    expect(median([])).toBeNull();
  });

  it('returns single element', () => {
    expect(median([7])).toBe(7);
  });

  it('returns middle element for odd-length sorted array', () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it('returns middle element for odd-length unsorted array', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('returns average of two middle elements for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('handles even-length unsorted array', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('handles two elements', () => {
    expect(median([10, 20])).toBe(15);
  });
});

describe('classifyResponseTimeBand', () => {
  it('returns unknown for null', () => {
    expect(classifyResponseTimeBand(null)).toBe('unknown');
  });

  it('returns fast for < 8000ms', () => {
    expect(classifyResponseTimeBand(0)).toBe('fast');
    expect(classifyResponseTimeBand(7999)).toBe('fast');
  });

  it('returns balanced for 8000ms to 35000ms inclusive', () => {
    expect(classifyResponseTimeBand(8000)).toBe('balanced');
    expect(classifyResponseTimeBand(20000)).toBe('balanced');
    expect(classifyResponseTimeBand(35000)).toBe('balanced');
  });

  it('returns slow for > 35000ms', () => {
    expect(classifyResponseTimeBand(35001)).toBe('slow');
    expect(classifyResponseTimeBand(100000)).toBe('slow');
  });
});

describe('computeCorrectnessTrendDelta', () => {
  it('returns 0 for empty array', () => {
    expect(computeCorrectnessTrendDelta([])).toBe(0);
  });

  it('uses all items as recent window when fewer than 3', () => {
    const attempts = [makeAttempt({ correct: true }), makeAttempt({ correct: true })];
    // recent = [0,1], prior = [] (rate 0); delta = 1 - 0 = 1
    expect(computeCorrectnessTrendDelta(attempts)).toBe(1);
  });

  it('computes delta across prior=[0..2] and recent=[3..5] for exactly 6 attempts', () => {
    const attempts = [
      makeAttempt({ correct: false }),
      makeAttempt({ correct: false }),
      makeAttempt({ correct: false }),
      makeAttempt({ correct: true }),
      makeAttempt({ correct: true }),
      makeAttempt({ correct: true }),
    ];
    // prior=[0,1,2] rate=0; recent=[3,4,5] rate=1; delta=1
    expect(computeCorrectnessTrendDelta(attempts)).toBe(1);
  });

  it('caps both windows at 3 for more than 6 attempts', () => {
    const attempts = [
      makeAttempt({ correct: false }),
      makeAttempt({ correct: false }),
      makeAttempt({ correct: false }),
      makeAttempt({ correct: false }),
      makeAttempt({ correct: true }),
      makeAttempt({ correct: true }),
      makeAttempt({ correct: true }),
    ];
    // recent = last 3 = [4,5,6] all correct; prior = [1,2,3] (indices 1..3 of 7-item array)
    // prior slice(-6,-3) = items at indices 1,2,3 = all false → rate 0
    // delta = 1 - 0 = 1
    expect(computeCorrectnessTrendDelta(attempts)).toBe(1);
  });

  it('returns negative delta for declining trend', () => {
    const attempts = [
      makeAttempt({ correct: true }),
      makeAttempt({ correct: true }),
      makeAttempt({ correct: true }),
      makeAttempt({ correct: false }),
      makeAttempt({ correct: false }),
      makeAttempt({ correct: false }),
    ];
    // prior=[0,1,2] rate=1; recent=[3,4,5] rate=0; delta=-1
    expect(computeCorrectnessTrendDelta(attempts)).toBe(-1);
  });
});

describe('buildGateMetrics', () => {
  it('counts consecutiveIndependentCorrect from end', () => {
    const parsed = [
      makeAttempt({ correct: false, supportLevel: 'INDEPENDENT' }),
      makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
      makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
    ];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.consecutiveIndependentCorrect).toBe(2);
  });

  it('resets consecutiveIndependentCorrect at first wrong from end', () => {
    const parsed = [
      makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
      makeAttempt({ correct: false, supportLevel: 'INDEPENDENT' }),
      makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
    ];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.consecutiveIndependentCorrect).toBe(1);
  });

  it('computes hintRelianceRate correctly for mixed support levels', () => {
    const parsed = [
      makeAttempt({ supportLevel: 'INDEPENDENT' }),
      makeAttempt({ supportLevel: 'LIGHT_PROMPT' }),
      makeAttempt({ supportLevel: 'WORKED_EXAMPLE' }),
      makeAttempt({ supportLevel: 'INDEPENDENT' }),
    ];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.hintRelianceRate).toBe(0.5);
  });

  it('sets delayedRetrievalOk to true when no delayed retrieval checks', () => {
    const parsed = [makeAttempt({ isDelayedRetrieval: false })];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.delayedRetrievalOk).toBe(true);
  });

  it('sets delayedRetrievalOk to false when last delayed check is wrong', () => {
    const parsed = [
      makeAttempt({ isDelayedRetrieval: true, correct: true }),
      makeAttempt({ isDelayedRetrieval: true, correct: false }),
    ];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.delayedRetrievalOk).toBe(false);
  });

  it('sets delayedRetrievalOk to true when last delayed check is correct', () => {
    const parsed = [
      makeAttempt({ isDelayedRetrieval: true, correct: false }),
      makeAttempt({ isDelayedRetrieval: true, correct: true }),
    ];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.delayedRetrievalOk).toBe(true);
  });

  it('returns unknown responseTimeBand when no response times', () => {
    const parsed = [makeAttempt({ responseTimeMs: undefined })];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.medianResponseTimeMs).toBeNull();
    expect(metrics.responseTimeBand).toBe('unknown');
  });

  it('attemptsUsed equals parsed length', () => {
    const parsed = [makeAttempt(), makeAttempt(), makeAttempt()];
    const metrics = buildGateMetrics(parsed, config, 0);
    expect(metrics.attemptsUsed).toBe(3);
  });

  it('passes failedLoops through to metrics', () => {
    const metrics = buildGateMetrics([], config, 3);
    expect(metrics.failedLoops).toBe(3);
  });
});

describe('inferReasonCodes', () => {
  const baseInput = {
    userId: 'u1',
    subjectId: 's1',
    skillId: 'sk1',
    routeType: 'A' as const,
    checkpointAccuracy: 1,
    wrongFirstDifferenceRate: 0,
    interactionPassRate: 1,
    dleTrend: 0,
  };

  it('returns empty array when all metrics above thresholds', () => {
    expect(inferReasonCodes(baseInput, config)).toEqual([]);
  });

  it('triggers LOW_CHECKPOINT_ACCURACY when checkpointAccuracy below trigger', () => {
    const codes = inferReasonCodes({ ...baseInput, checkpointAccuracy: 0 }, config);
    expect(codes).toContain('LOW_CHECKPOINT_ACCURACY');
  });

  it('triggers HIGH_WRONG_FIRST_DIFF when wrongFirstDifferenceRate above trigger', () => {
    const codes = inferReasonCodes({ ...baseInput, wrongFirstDifferenceRate: 1 }, config);
    expect(codes).toContain('HIGH_WRONG_FIRST_DIFF');
  });

  it('triggers LOW_INTERACTION_PASS when interactionPassRate below trigger', () => {
    const codes = inferReasonCodes({ ...baseInput, interactionPassRate: 0 }, config);
    expect(codes).toContain('LOW_INTERACTION_PASS');
  });

  it('triggers NEGATIVE_DLE_TREND when dleTrend below trigger', () => {
    const codes = inferReasonCodes({ ...baseInput, dleTrend: -1 }, config);
    expect(codes).toContain('NEGATIVE_DLE_TREND');
  });

  it('can return multiple codes simultaneously', () => {
    const codes = inferReasonCodes({ ...baseInput, checkpointAccuracy: 0, interactionPassRate: 0 }, config);
    expect(codes).toContain('LOW_CHECKPOINT_ACCURACY');
    expect(codes).toContain('LOW_INTERACTION_PASS');
  });

  it('uses safe fallback for undefined inputs — no false triggers', () => {
    const input = {
      userId: 'u1',
      subjectId: 's1',
      skillId: 'sk1',
      routeType: 'A' as const,
    };
    // checkpointAccuracy undefined → clamp01(undefined, 1) = 1 (no trigger)
    // wrongFirstDifferenceRate undefined → clamp01(undefined, 0) = 0 (no trigger)
    // interactionPassRate undefined → clamp01(undefined, 1) = 1 (no trigger)
    // dleTrend undefined → 0 (no trigger at default -0.12 threshold)
    const codes = inferReasonCodes(input, config);
    expect(codes).toEqual([]);
  });
});
