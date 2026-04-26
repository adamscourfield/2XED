import { describe, it, expect } from 'vitest';
import { evaluateBaselineStop, selectNextSkill, type BaselineSkillProgress } from '@/features/baseline/baselineService';

function makeSkill(overrides: Partial<BaselineSkillProgress> & { skillId: string }): BaselineSkillProgress {
  return {
    skillCode: overrides.skillId,
    sortOrder: 1,
    attempts: 1,
    correct: 1,
    accuracy: 1,
    remainingItemIds: ['item1'],
    ...overrides,
  };
}

describe('evaluateBaselineStop', () => {
  const baseParams = {
    minItems: 5,
    maxItems: 20,
    confidenceTarget: 0.8,
  };

  it('stops immediately when itemsSeen >= maxItems regardless of other conditions', () => {
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 20,
      skillProgress: [makeSkill({ skillId: 's1', attempts: 0 })],
    });
    expect(result).toEqual({ shouldStop: true, reason: 'max_items_reached' });
  });

  it('continues when itemsSeen < minItems', () => {
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 3,
      skillProgress: [makeSkill({ skillId: 's1', attempts: 5, accuracy: 1 })],
    });
    expect(result).toEqual({ shouldStop: false, reason: 'below_min_items' });
  });

  it('continues when a skill has 0 attempts (breadth incomplete)', () => {
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 10,
      skillProgress: [
        makeSkill({ skillId: 's1', attempts: 2, accuracy: 1 }),
        makeSkill({ skillId: 's2', attempts: 0, accuracy: 0 }),
      ],
    });
    expect(result).toEqual({ shouldStop: false, reason: 'breadth_incomplete' });
  });

  it('stops when overall accuracy meets confidence target', () => {
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 10,
      skillProgress: [
        makeSkill({ skillId: 's1', attempts: 5, correct: 5, accuracy: 1 }),
        makeSkill({ skillId: 's2', attempts: 5, correct: 5, accuracy: 1 }),
      ],
    });
    expect(result).toEqual({ shouldStop: true, reason: 'confidence_target_reached' });
  });

  it('stops when no uncertain skills remain (uncertainty reduced)', () => {
    // accuracy < 0.4 and attempts >= 2 — not uncertain (clear fail)
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 10,
      skillProgress: [
        makeSkill({ skillId: 's1', attempts: 3, correct: 0, accuracy: 0 }),
        makeSkill({ skillId: 's2', attempts: 3, correct: 0, accuracy: 0 }),
      ],
    });
    expect(result).toEqual({ shouldStop: true, reason: 'uncertainty_reduced' });
  });

  it('continues when an uncertain skill exists (accuracy in ambiguous band with < 3 attempts)', () => {
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 10,
      skillProgress: [
        makeSkill({ skillId: 's1', attempts: 2, correct: 1, accuracy: 0.5 }),
      ],
    });
    expect(result).toEqual({ shouldStop: false, reason: 'continue_sampling' });
  });

  it('treats skill with < 2 attempts as uncertain regardless of accuracy', () => {
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 10,
      skillProgress: [
        makeSkill({ skillId: 's1', attempts: 1, correct: 0, accuracy: 0 }),
      ],
    });
    expect(result).toEqual({ shouldStop: false, reason: 'continue_sampling' });
  });

  it('skill with accuracy 0.81 and 2 attempts is NOT uncertain', () => {
    // correct: 1 / attempts: 2 = overallAccuracy 0.5 < confidenceTarget 0.8, so we reach the uncertainty check
    // accuracy: 0.81 > 0.8 → outside the ambiguous band → not uncertain → uncertainty_reduced
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 10,
      skillProgress: [
        makeSkill({ skillId: 's1', attempts: 2, correct: 1, accuracy: 0.81 }),
      ],
    });
    expect(result).toEqual({ shouldStop: true, reason: 'uncertainty_reduced' });
  });

  it('skill with accuracy exactly 0.4 and 2 attempts is uncertain', () => {
    const result = evaluateBaselineStop({
      ...baseParams,
      itemsSeen: 10,
      skillProgress: [
        makeSkill({ skillId: 's1', attempts: 2, correct: 1, accuracy: 0.4 }),
      ],
    });
    expect(result).toEqual({ shouldStop: false, reason: 'continue_sampling' });
  });
});

describe('selectNextSkill', () => {
  it('returns null for empty array', () => {
    expect(selectNextSkill([])).toBeNull();
  });

  it('prefers breadth-first: returns 0-attempt skill with lowest sortOrder', () => {
    const skills = [
      makeSkill({ skillId: 's1', attempts: 1, sortOrder: 1, remainingItemIds: ['x'] }),
      makeSkill({ skillId: 's2', attempts: 0, sortOrder: 3, remainingItemIds: ['x'] }),
      makeSkill({ skillId: 's3', attempts: 0, sortOrder: 2, remainingItemIds: ['x'] }),
    ];
    const result = selectNextSkill(skills);
    expect(result?.skillId).toBe('s3');
  });

  it('uses depth sorting when all skills have attempts: lowest accuracy first', () => {
    const skills = [
      makeSkill({ skillId: 's1', attempts: 2, accuracy: 0.8, sortOrder: 1, remainingItemIds: ['x'] }),
      makeSkill({ skillId: 's2', attempts: 2, accuracy: 0.4, sortOrder: 2, remainingItemIds: ['x'] }),
    ];
    expect(selectNextSkill(skills)?.skillId).toBe('s2');
  });

  it('uses depth sorting: fewer attempts wins when accuracy tied', () => {
    const skills = [
      makeSkill({ skillId: 's1', attempts: 3, accuracy: 0.5, sortOrder: 1, remainingItemIds: ['x'] }),
      makeSkill({ skillId: 's2', attempts: 1, accuracy: 0.5, sortOrder: 2, remainingItemIds: ['x'] }),
    ];
    expect(selectNextSkill(skills)?.skillId).toBe('s2');
  });

  it('uses depth sorting: lower sortOrder breaks accuracy+attempt tie', () => {
    const skills = [
      makeSkill({ skillId: 's1', attempts: 2, accuracy: 0.5, sortOrder: 2, remainingItemIds: ['x'] }),
      makeSkill({ skillId: 's2', attempts: 2, accuracy: 0.5, sortOrder: 1, remainingItemIds: ['x'] }),
    ];
    expect(selectNextSkill(skills)?.skillId).toBe('s2');
  });

  it('returns null when no remaining items exist', () => {
    const skills = [
      makeSkill({ skillId: 's1', attempts: 1, remainingItemIds: [] }),
    ];
    expect(selectNextSkill(skills)).toBeNull();
  });
});
