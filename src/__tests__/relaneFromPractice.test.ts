import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/prisma', () => ({
  prisma: {
    liveParticipant: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    liveAttempt: { findMany: vi.fn().mockResolvedValue([]) },
    laneTransition: { create: vi.fn().mockResolvedValue({}) },
    explanationPerformance: { findMany: vi.fn().mockResolvedValue([]) },
    explanationRoute: { findFirst: vi.fn().mockResolvedValue({ id: 'route-A' }) },
    liveSession: { update: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('@/features/telemetry/eventService', () => ({ emitEvent: vi.fn().mockResolvedValue(undefined) }));

import { prisma } from '@/db/prisma';
import { reEvaluateLaneFromPractice, LANE_DEMOTE_STREAK } from '@/lib/live/lane-router';

const p = prisma as unknown as {
  liveParticipant: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  liveAttempt: { findMany: ReturnType<typeof vi.fn> };
  laneTransition: { create: ReturnType<typeof vi.fn> };
};

const wrong = (n: number) => Array.from({ length: n }, () => ({ correct: false }));

function participant(overrides: Record<string, unknown> = {}) {
  return {
    currentLane: 'LANE_1',
    studentUserId: 'stu-1',
    pendingRecheckItemId: null,
    laneAssignedAt: new Date('2026-06-13T09:00:00Z'),
    session: { skillId: 'skill-1' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.liveParticipant.findMany.mockResolvedValue([]);
});

describe('reEvaluateLaneFromPractice', () => {
  it('does nothing below the failure streak', async () => {
    p.liveParticipant.findUnique.mockResolvedValue(participant());
    p.liveAttempt.findMany.mockResolvedValue(wrong(LANE_DEMOTE_STREAK - 1));
    const res = await reEvaluateLaneFromPractice('part-1', 'sess-1', 'skill-1');
    expect(res.changed).toBe(false);
    expect(p.liveParticipant.update).not.toHaveBeenCalled();
  });

  it('does nothing when the recent run is not all incorrect', async () => {
    p.liveParticipant.findUnique.mockResolvedValue(participant());
    p.liveAttempt.findMany.mockResolvedValue([{ correct: false }, { correct: true }, { correct: false }]);
    const res = await reEvaluateLaneFromPractice('part-1', 'sess-1', 'skill-1');
    expect(res.changed).toBe(false);
  });

  it('demotes LANE_1 → LANE_2 on a fresh failure streak, with an alternative explanation', async () => {
    p.liveParticipant.findUnique.mockResolvedValue(participant({ currentLane: 'LANE_1' }));
    p.liveAttempt.findMany.mockResolvedValue(wrong(LANE_DEMOTE_STREAK));
    const res = await reEvaluateLaneFromPractice('part-1', 'sess-1', 'skill-1');

    expect(res).toMatchObject({ changed: true, fromLane: 'LANE_1', toLane: 'LANE_2', recommendedExplanationId: 'route-A' });
    expect(p.liveParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentLane: 'LANE_2', escalationReason: 'PRACTICE_REGRESSION', currentExplanationId: 'route-A' }),
      }),
    );
    expect(p.laneTransition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromLane: 'LANE_1', toLane: 'LANE_2', transitionType: 'ESCALATED', reason: 'PRACTICE_REGRESSION' }),
      }),
    );
  });

  it('demotes LANE_2 → LANE_3 on a fresh failure streak', async () => {
    p.liveParticipant.findUnique.mockResolvedValue(participant({ currentLane: 'LANE_2' }));
    p.liveAttempt.findMany.mockResolvedValue(wrong(LANE_DEMOTE_STREAK));
    const res = await reEvaluateLaneFromPractice('part-1', 'sess-1', 'skill-1');
    expect(res).toMatchObject({ changed: true, fromLane: 'LANE_2', toLane: 'LANE_3' });
  });

  it('never auto-demotes a LANE_3 student', async () => {
    p.liveParticipant.findUnique.mockResolvedValue(participant({ currentLane: 'LANE_3' }));
    p.liveAttempt.findMany.mockResolvedValue(wrong(LANE_DEMOTE_STREAK));
    const res = await reEvaluateLaneFromPractice('part-1', 'sess-1', 'skill-1');
    expect(res.changed).toBe(false);
    expect(p.liveAttempt.findMany).not.toHaveBeenCalled();
  });

  it('does not touch a student mid-recheck', async () => {
    p.liveParticipant.findUnique.mockResolvedValue(participant({ pendingRecheckItemId: 'item-9' }));
    p.liveAttempt.findMany.mockResolvedValue(wrong(LANE_DEMOTE_STREAK));
    const res = await reEvaluateLaneFromPractice('part-1', 'sess-1', 'skill-1');
    expect(res.changed).toBe(false);
  });

  it('only counts attempts since the lane was assigned', async () => {
    const assignedAt = new Date('2026-06-13T09:30:00Z');
    p.liveParticipant.findUnique.mockResolvedValue(participant({ laneAssignedAt: assignedAt }));
    p.liveAttempt.findMany.mockResolvedValue(wrong(LANE_DEMOTE_STREAK));
    await reEvaluateLaneFromPractice('part-1', 'sess-1', 'skill-1');
    expect(p.liveAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdAt: { gt: assignedAt } }) }),
    );
  });
});
