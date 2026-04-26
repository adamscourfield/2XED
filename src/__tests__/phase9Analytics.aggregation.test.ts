import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/prisma', () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/db/prisma';

const mockFindMany = prisma.event.findMany as ReturnType<typeof vi.fn>;

function makeDate(offsetHours = 0) {
  return new Date(Date.now() - offsetHours * 60 * 60 * 1000);
}

beforeEach(() => {
  vi.clearAllMocks();
});

async function importAnalytics() {
  const { getPhase9Analytics } = await import('@/features/reteach/phase9Analytics');
  return getPhase9Analytics;
}

describe('getPhase9Analytics — basic counts', () => {
  it('returns nulls and zeros when no events', async () => {
    mockFindMany.mockResolvedValue([]);
    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');

    expect(result.loopsStarted).toBe(0);
    expect(result.gateEvaluations).toBe(0);
    expect(result.passes).toBe(0);
    expect(result.escalations).toBe(0);
    expect(result.recoveryRate).toBeNull();
    expect(result.escalationRate).toBeNull();
    expect(result.avgAttemptsBeforePass).toBeNull();
    expect(result.avgHoursToRecovery).toBeNull();
  });

  it('computes recoveryRate and escalationRate correctly', async () => {
    const pathId = 'path-1';
    const startedAt = makeDate(2);
    const gateAt = makeDate(0);

    mockFindMany
      .mockResolvedValueOnce([{ payload: { assignedPathId: pathId }, createdAt: startedAt }]) // assigned
      .mockResolvedValueOnce([
        { payload: { assignedPathId: pathId, decision: 'pass', decisionTrace: { decisionReason: 'mastery_with_independence' } }, createdAt: gateAt, studentUserId: 'u1', skillId: 'sk1' },
        { payload: { assignedPathId: pathId, decision: 'pass', decisionTrace: { decisionReason: 'mastery_with_independence' } }, createdAt: gateAt, studentUserId: 'u2', skillId: 'sk2' },
        { payload: { assignedPathId: pathId, decision: 'escalate', decisionTrace: { decisionReason: 'repeated_failed_loops' } }, createdAt: gateAt, studentUserId: 'u3', skillId: 'sk3' },
      ]) // gates
      .mockResolvedValueOnce([]) // attempts
      .mockResolvedValueOnce([]); // escalations

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');

    expect(result.passes).toBe(2);
    expect(result.escalations).toBe(1);
    expect(result.recoveryRate).toBeCloseTo(2 / 3);
    expect(result.escalationRate).toBeCloseTo(1 / 3);
  });
});

describe('getPhase9Analytics — avgAttemptsBeforePass', () => {
  it('averages attempts across passing paths', async () => {
    const path1 = 'path-1';
    const path2 = 'path-2';
    const gateAt = makeDate(0);

    mockFindMany
      .mockResolvedValueOnce([
        { payload: { assignedPathId: path1 }, createdAt: makeDate(5) },
        { payload: { assignedPathId: path2 }, createdAt: makeDate(5) },
      ]) // assigned
      .mockResolvedValueOnce([
        { payload: { assignedPathId: path1, decision: 'pass', decisionTrace: {} }, createdAt: gateAt, studentUserId: 'u1', skillId: 'sk1' },
        { payload: { assignedPathId: path2, decision: 'pass', decisionTrace: {} }, createdAt: gateAt, studentUserId: 'u2', skillId: 'sk2' },
      ]) // gates
      .mockResolvedValueOnce([
        { payload: { assignedPathId: path1 }, createdAt: gateAt },
        { payload: { assignedPathId: path1 }, createdAt: gateAt },
        { payload: { assignedPathId: path1 }, createdAt: gateAt },
        { payload: { assignedPathId: path1 }, createdAt: gateAt }, // 4 attempts for path1
        { payload: { assignedPathId: path2 }, createdAt: gateAt },
        { payload: { assignedPathId: path2 }, createdAt: gateAt },
        { payload: { assignedPathId: path2 }, createdAt: gateAt },
        { payload: { assignedPathId: path2 }, createdAt: gateAt },
        { payload: { assignedPathId: path2 }, createdAt: gateAt },
        { payload: { assignedPathId: path2 }, createdAt: gateAt }, // 6 attempts for path2
      ]) // attempts
      .mockResolvedValueOnce([]); // escalations

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');
    expect(result.avgAttemptsBeforePass).toBe(5); // (4 + 6) / 2
  });

  it('excludes pass when pathId has no attempt entries', async () => {
    const gateAt = makeDate(0);
    mockFindMany
      .mockResolvedValueOnce([]) // assigned (no match for 'orphan-path')
      .mockResolvedValueOnce([
        { payload: { assignedPathId: 'orphan-path', decision: 'pass', decisionTrace: {} }, createdAt: gateAt, studentUserId: 'u1', skillId: 'sk1' },
      ]) // gates
      .mockResolvedValueOnce([]) // attempts
      .mockResolvedValueOnce([]); // escalations

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');
    expect(result.avgAttemptsBeforePass).toBeNull();
  });
});

describe('getPhase9Analytics — avgHoursToRecovery', () => {
  it('computes hours between path start and gate pass', async () => {
    const path1 = 'path-1';
    const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const gateAt = new Date();

    mockFindMany
      .mockResolvedValueOnce([{ payload: { assignedPathId: path1 }, createdAt: startedAt }])
      .mockResolvedValueOnce([
        { payload: { assignedPathId: path1, decision: 'pass', decisionTrace: {} }, createdAt: gateAt, studentUserId: 'u1', skillId: 'sk1' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');
    expect(result.avgHoursToRecovery).toBeCloseTo(2, 1);
  });
});

describe('getPhase9Analytics — decisionReasonDistribution', () => {
  it('sorts by count descending and computes shares', async () => {
    const gateAt = makeDate(0);
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { payload: { decision: 'pass', decisionTrace: { decisionReason: 'mastery_with_independence' } }, createdAt: gateAt, studentUserId: 'u1', skillId: 'sk1' },
        { payload: { decision: 'continue', decisionTrace: { decisionReason: 'recovering_keep_looping' } }, createdAt: gateAt, studentUserId: 'u2', skillId: 'sk2' },
        { payload: { decision: 'pass', decisionTrace: { decisionReason: 'mastery_with_independence' } }, createdAt: gateAt, studentUserId: 'u3', skillId: 'sk3' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');

    expect(result.decisionReasonDistribution[0].reasonCode).toBe('mastery_with_independence');
    expect(result.decisionReasonDistribution[0].count).toBe(2);
    expect(result.decisionReasonDistribution[0].share).toBeCloseTo(2 / 3);
  });
});

describe('getPhase9Analytics — suggestionEffectiveness', () => {
  it('marks recovered when a later gate pass exists for the same learner+skill', async () => {
    const escalationAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const passAt = new Date();

    mockFindMany
      .mockResolvedValueOnce([]) // assigned
      .mockResolvedValueOnce([
        {
          payload: { decision: 'pass', decisionTrace: { decisionReason: 'mastery_with_independence' } },
          createdAt: passAt,
          studentUserId: 'u1',
          skillId: 'sk1',
        },
      ]) // gates
      .mockResolvedValueOnce([]) // attempts
      .mockResolvedValueOnce([
        {
          payload: {
            reasonCode: 'repeated_failed_loops',
            interventionSuggestions: [{ code: 'RUN_WORKED_EXAMPLE_1TO1' }],
          },
          createdAt: escalationAt,
          studentUserId: 'u1',
          skillId: 'sk1',
        },
      ]); // escalations

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');
    const suggestion = result.suggestionEffectiveness.find((s) => s.suggestionCode === 'RUN_WORKED_EXAMPLE_1TO1');
    expect(suggestion?.assignedCount).toBe(1);
    expect(suggestion?.recoveredCount).toBe(1);
    expect(suggestion?.recoveryRate).toBe(1);
  });

  it('does not mark recovered when no later pass exists', async () => {
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          payload: {
            reasonCode: 'attempt_budget_exhausted',
            interventionSuggestions: [{ code: 'ASSIGN_SHORT_RETRIEVAL_SET' }],
          },
          createdAt: new Date(),
          studentUserId: 'u1',
          skillId: 'sk1',
        },
      ]);

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');
    const suggestion = result.suggestionEffectiveness.find((s) => s.suggestionCode === 'ASSIGN_SHORT_RETRIEVAL_SET');
    expect(suggestion?.recoveredCount).toBe(0);
    expect(suggestion?.recoveryRate).toBe(0);
  });

  it('defaults to UNKNOWN code when interventionSuggestions is empty', async () => {
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          payload: { reasonCode: 'some_reason', interventionSuggestions: [] },
          createdAt: new Date(),
          studentUserId: 'u1',
          skillId: 'sk1',
        },
      ]);

    const getPhase9Analytics = await importAnalytics();
    const result = await getPhase9Analytics('subject1');
    const unknown = result.suggestionEffectiveness.find((s) => s.suggestionCode === 'UNKNOWN');
    expect(unknown).toBeDefined();
    expect(unknown?.assignedCount).toBe(1);
  });
});
