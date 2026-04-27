import { describe, it, expect } from 'vitest';
import { applyGatePolicy, buildGateMetrics, type ParsedAttempt } from '@/features/reteach/studentReteach';
import { getDefaultReteachPolicy } from '@/features/reteach/reteachPolicyContract';

function makeAttempt(overrides: Partial<ParsedAttempt> = {}): ParsedAttempt {
  return {
    correct: true,
    supportLevel: 'INDEPENDENT',
    isDelayedRetrieval: false,
    ...overrides,
  };
}

/**
 * Build metrics that place all gate checks in a known state.
 * Provide an override array of ParsedAttempt to control the result.
 */
function metricsFromAttempts(parsed: ParsedAttempt[], failedLoops = 0, version: 'v1' | 'v2' = 'v2') {
  const config = getDefaultReteachPolicy(version);
  return { metrics: buildGateMetrics(parsed, config, failedLoops), config };
}

// Helper: build attempts that satisfy the v2 mastery gate
// Needs consecutiveIndependentCorrect >= 2, independentCorrectRate >= 0.8 over window of 5, no failed delayed
function passingAttempts(): ParsedAttempt[] {
  return [
    makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
    makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
    makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
    makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
    makeAttempt({ correct: true, supportLevel: 'INDEPENDENT' }),
  ];
}

describe('applyGatePolicy — v2', () => {
  it('returns pass/mastery_with_independence when mastery gate met + low hint reliance + within budget', () => {
    const { metrics, config } = metricsFromAttempts(passingAttempts());
    // hintRelianceRate = 0, attemptsUsed = 5 (<= 10), consecutive = 5 >= 2
    const result = applyGatePolicy(metrics, config);
    expect(result.decision).toBe('pass');
    expect(result.decisionReason).toBe('mastery_with_independence');
  });

  it('returns escalate/repeated_failed_loops when hardEscalationByHistory is true', () => {
    // gateEscalateAfterFailedLoops default = 2, so failedLoops >= 2 triggers
    const { metrics, config } = metricsFromAttempts([], 2);
    const result = applyGatePolicy(metrics, config);
    expect(result.decision).toBe('escalate');
    expect(result.decisionReason).toBe('repeated_failed_loops');
  });

  it('returns escalate/attempt_budget_exhausted when attemptsUsed >= 12 (no history)', () => {
    const manyAttempts = Array.from({ length: 12 }, () => makeAttempt({ correct: false }));
    const { metrics, config } = metricsFromAttempts(manyAttempts, 0);
    const result = applyGatePolicy(metrics, config);
    expect(result.decision).toBe('escalate');
    expect(result.decisionReason).toBe('attempt_budget_exhausted');
  });

  it('returns escalate/high_hint_dependence_without_recovery when hint reliance > 0.85 and trend <= 0', () => {
    // All non-independent (hintRelianceRate = 1 > 0.85) and declining trend
    const attempts = [
      makeAttempt({ correct: true, supportLevel: 'FULL_EXPLANATION' }),
      makeAttempt({ correct: true, supportLevel: 'FULL_EXPLANATION' }),
      makeAttempt({ correct: true, supportLevel: 'FULL_EXPLANATION' }),
      makeAttempt({ correct: false, supportLevel: 'FULL_EXPLANATION' }),
      makeAttempt({ correct: false, supportLevel: 'FULL_EXPLANATION' }),
      makeAttempt({ correct: false, supportLevel: 'FULL_EXPLANATION' }),
    ];
    const { metrics, config } = metricsFromAttempts(attempts, 0);
    const result = applyGatePolicy(metrics, config);
    expect(result.decision).toBe('escalate');
    expect(result.decisionReason).toBe('high_hint_dependence_without_recovery');
  });

  it('history escalation wins over attempt-budget escalation', () => {
    // failedLoops = 2 (history) AND attemptsUsed = 12 (budget)
    const manyAttempts = Array.from({ length: 12 }, () => makeAttempt({ correct: false }));
    const { metrics, config } = metricsFromAttempts(manyAttempts, 2);
    const result = applyGatePolicy(metrics, config);
    expect(result.decision).toBe('escalate');
    expect(result.decisionReason).toBe('repeated_failed_loops');
  });

  it('returns continue/needs_more_independent_success when mastery gate met but hint reliance too high', () => {
    // Build: 5 correct attempts but all with hints (hintRelianceRate = 1 > 0.7)
    const attempts = passingAttempts().map((a) => ({ ...a, supportLevel: 'LIGHT_PROMPT' as const }));
    const { metrics, config } = metricsFromAttempts(attempts, 0);
    // masteryGateMet requires consecutiveIndependentCorrect >= 2 AND independentCorrectRate >= 0.8
    // With all LIGHT_PROMPT, independent = [], so masteryGateMet = false
    // Let's instead craft a scenario: mix of independent and hint attempts
    // Use raw config to craft metrics directly
    const crafted = {
      ...metrics,
      consecutiveIndependentCorrect: 3,
      independentCorrectRate: 0.9,
      delayedRetrievalOk: true,
      hintRelianceRate: 0.8, // > 0.7 so not lowHintReliance
      attemptsUsed: 5,
      failedLoops: 0,
      correctnessTrendDelta: 0.1, // positive
      medianResponseTimeMs: null,
      responseTimeBand: 'unknown' as const,
    };
    const result = applyGatePolicy(crafted, config);
    expect(result.decision).toBe('continue');
    expect(result.decisionReason).toBe('needs_more_independent_success');
  });

  it('returns continue/recovering_keep_looping when trend is positive and no mastery gate', () => {
    const crafted = {
      consecutiveIndependentCorrect: 0,
      independentCorrectRate: 0,
      delayedRetrievalOk: true,
      hintRelianceRate: 0.5,
      attemptsUsed: 5,
      failedLoops: 0,
      correctnessTrendDelta: 0.2, // positive = recovering
      medianResponseTimeMs: null,
      responseTimeBand: 'unknown' as const,
    };
    const config = getDefaultReteachPolicy('v2');
    const result = applyGatePolicy(crafted, config);
    expect(result.decision).toBe('continue');
    expect(result.decisionReason).toBe('recovering_keep_looping');
  });

  it('returns continue/insufficient_evidence when no rules are met', () => {
    const crafted = {
      consecutiveIndependentCorrect: 0,
      independentCorrectRate: 0,
      delayedRetrievalOk: true,
      hintRelianceRate: 0.5,
      attemptsUsed: 3,
      failedLoops: 0,
      correctnessTrendDelta: -0.1, // not recovering
      medianResponseTimeMs: null,
      responseTimeBand: 'unknown' as const,
    };
    const config = getDefaultReteachPolicy('v2');
    const result = applyGatePolicy(crafted, config);
    expect(result.decision).toBe('continue');
    expect(result.decisionReason).toBe('insufficient_evidence');
  });
});

describe('applyGatePolicy — v1', () => {
  it('returns pass/v1_mastery_gate_met when mastery gate is met', () => {
    const { metrics, config } = metricsFromAttempts(passingAttempts(), 0, 'v1');
    const result = applyGatePolicy(metrics, config);
    expect(result.decision).toBe('pass');
    expect(result.decisionReason).toBe('v1_mastery_gate_met');
  });

  it('returns escalate/v1_repeated_failed_loops when history escalation triggered', () => {
    const { metrics, config } = metricsFromAttempts([], 2, 'v1');
    const result = applyGatePolicy(metrics, config);
    expect(result.decision).toBe('escalate');
    expect(result.decisionReason).toBe('v1_repeated_failed_loops');
  });

  it('returns continue/insufficient_evidence when neither gate met in v1', () => {
    // In v1, attempt budget and hint reliance are ignored
    const crafted = {
      consecutiveIndependentCorrect: 0,
      independentCorrectRate: 0,
      delayedRetrievalOk: true,
      hintRelianceRate: 0.9,
      attemptsUsed: 12,
      failedLoops: 0,
      correctnessTrendDelta: 0,
      medianResponseTimeMs: null,
      responseTimeBand: 'unknown' as const,
    };
    const config = getDefaultReteachPolicy('v1');
    const result = applyGatePolicy(crafted, config);
    expect(result.decision).toBe('continue');
    expect(result.decisionReason).toBe('insufficient_evidence');
  });
});
