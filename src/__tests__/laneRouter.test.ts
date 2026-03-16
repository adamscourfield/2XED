import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/db/prisma', () => ({
  prisma: {
    liveParticipant: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    laneTransition: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    studentSkillState: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    skillMastery: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    skill: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    liveSession: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
    },
    explanationPerformance: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    explanationRoute: {
      findFirst: vi.fn().mockResolvedValue({ id: 'route-1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    liveAttempt: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    item: {
      findFirst: vi.fn().mockResolvedValue({ id: 'item-1' }),
    },
  },
}));

import { assignLane, checkReteachThreshold, handleHandback } from '@/lib/live/lane-router';
import { prisma } from '@/db/prisma';
import type { DiagnosticAttempt } from '@/lib/live/lane-router';

const mockFindUnique = prisma.liveParticipant.findUnique as ReturnType<typeof vi.fn>;
const mockFindMany = (prisma.liveParticipant as any).findMany as ReturnType<typeof vi.fn>;
const mockSessionUpdate = prisma.liveSession.update as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock for participant lookup
  mockFindUnique.mockResolvedValue({
    id: 'part-1',
    studentUserId: 'student-1',
    liveSessionId: 'session-1',
    session: { skillId: 'skill-1' },
  });

  // Default: no participants (for checkReteachThreshold)
  mockFindMany.mockResolvedValue([]);
});

describe('assignLane', () => {
  it('assigns Lane 1 when anchor is correct, no hints, independent', async () => {
    const attempts: DiagnosticAttempt[] = [
      {
        itemId: 'item-1',
        questionRole: 'anchor',
        correct: true,
        hintsUsed: 0,
        supportLevel: 'INDEPENDENT',
        responseTimeMs: 5000,
      },
      {
        itemId: 'item-2',
        questionRole: 'misconception_check',
        correct: true,
        hintsUsed: 0,
        supportLevel: 'INDEPENDENT',
        responseTimeMs: 4000,
      },
    ];

    const result = await assignLane('part-1', 'session-1', attempts);

    expect(result.lane).toBe('LANE_1');
  });

  it('assigns Lane 2 when anchor correct but hints used', async () => {
    const attempts: DiagnosticAttempt[] = [
      {
        itemId: 'item-1',
        questionRole: 'anchor',
        correct: true,
        hintsUsed: 1,
        supportLevel: 'LIGHT_PROMPT',
        responseTimeMs: 8000,
      },
    ];

    const result = await assignLane('part-1', 'session-1', attempts);

    expect(result.lane).toBe('LANE_2');
  });

  it('assigns Lane 3 when anchor is incorrect', async () => {
    const attempts: DiagnosticAttempt[] = [
      {
        itemId: 'item-1',
        questionRole: 'anchor',
        correct: false,
        hintsUsed: 0,
        supportLevel: 'INDEPENDENT',
        responseTimeMs: 3000,
      },
    ];

    const result = await assignLane('part-1', 'session-1', attempts);

    expect(result.lane).toBe('LANE_3');
    expect(result.reason).toBe('ANCHOR_FAILED');
  });

  it('assigns Lane 3 with MISCONCEPTION_FAILED when both anchor and misconception fail', async () => {
    const attempts: DiagnosticAttempt[] = [
      {
        itemId: 'item-1',
        questionRole: 'anchor',
        correct: false,
        hintsUsed: 0,
        supportLevel: 'INDEPENDENT',
        responseTimeMs: 3000,
      },
      {
        itemId: 'item-2',
        questionRole: 'misconception_check',
        correct: false,
        hintsUsed: 0,
        supportLevel: 'INDEPENDENT',
        responseTimeMs: 4000,
      },
    ];

    const result = await assignLane('part-1', 'session-1', attempts);

    expect(result.lane).toBe('LANE_3');
    expect(result.reason).toBe('MISCONCEPTION_FAILED');
  });

  it('assigns Lane 3 when anchor correct but scaffolded', async () => {
    const attempts: DiagnosticAttempt[] = [
      {
        itemId: 'item-1',
        questionRole: 'anchor',
        correct: true,
        hintsUsed: 0,
        supportLevel: 'SCAFFOLDED',
        responseTimeMs: 12000,
      },
    ];

    const result = await assignLane('part-1', 'session-1', attempts);

    expect(result.lane).toBe('LANE_3');
    expect(result.reason).toBe('SCAFFOLDED_CORRECT');
  });

  it('assigns Lane 3 when no diagnostic attempts present', async () => {
    const result = await assignLane('part-1', 'session-1', []);

    expect(result.lane).toBe('LANE_3');
    expect(result.reason).toBe('ANCHOR_FAILED');
  });
});

describe('checkReteachThreshold', () => {
  it('does not set reteach alert when fewer than threshold in Lane 3', async () => {
    // 2 out of 10 in Lane 3 = 20% < 35%
    mockFindMany.mockResolvedValue([
      ...Array(8).fill(null).map(() => ({ currentLane: 'LANE_1', isUnexpectedFailure: false, laneAssignedAt: new Date() })),
      ...Array(2).fill(null).map(() => ({ currentLane: 'LANE_3', isUnexpectedFailure: false, laneAssignedAt: new Date() })),
    ]);

    await checkReteachThreshold('session-1');

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reteachAlert: false },
      })
    );
  });

  it('sets reteach alert when >= 50% in Lane 3 and all expected failures', async () => {
    // 5 out of 10 = 50% >= 50% (allExpected=true => threshold=0.50)
    mockFindMany.mockResolvedValue([
      ...Array(5).fill(null).map(() => ({ currentLane: 'LANE_1', isUnexpectedFailure: false, laneAssignedAt: new Date() })),
      ...Array(5).fill(null).map(() => ({ currentLane: 'LANE_3', isUnexpectedFailure: false, laneAssignedAt: new Date() })),
    ]);

    await checkReteachThreshold('session-1');

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reteachAlert: true },
      })
    );
  });

  it('sets reteach alert when >= 35% in Lane 3 with unexpected failures', async () => {
    // 4 out of 10 = 40% >= 35% (allExpected=false => threshold=0.35)
    mockFindMany.mockResolvedValue([
      ...Array(6).fill(null).map(() => ({ currentLane: 'LANE_1', isUnexpectedFailure: false, laneAssignedAt: new Date() })),
      ...Array(3).fill(null).map(() => ({ currentLane: 'LANE_3', isUnexpectedFailure: false, laneAssignedAt: new Date() })),
      { currentLane: 'LANE_3', isUnexpectedFailure: true, laneAssignedAt: new Date() },
    ]);

    await checkReteachThreshold('session-1');

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reteachAlert: true },
      })
    );
  });
});

describe('handleHandback', () => {
  it('moves participant from Lane 3 to Lane 2', async () => {
    const result = await handleHandback('part-1', 'session-1', 'teacher-1');

    expect(result.newLane).toBe('LANE_2');
    expect(prisma.liveParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentLane: 'LANE_2',
          holdingAtFinalCheck: false,
        }),
      })
    );
    expect(prisma.laneTransition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transitionType: 'HANDED_BACK',
          fromLane: 'LANE_3',
          toLane: 'LANE_2',
          triggeredBy: 'teacher-1',
        }),
      })
    );
  });
});
