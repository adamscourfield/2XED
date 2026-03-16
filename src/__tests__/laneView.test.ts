import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/prisma', () => ({
  prisma: {
    liveParticipant: {
      findMany: vi.fn(),
    },
    liveSession: {
      findUnique: vi.fn(),
    },
    studentSkillState: {
      findMany: vi.fn(),
    },
    explanationRoute: {
      findMany: vi.fn(),
    },
  },
}));

import { getLaneView } from '@/lib/live/lane-view';
import { prisma } from '@/db/prisma';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getLaneView', () => {
  it('returns empty lanes when no participants', async () => {
    (prisma.liveParticipant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.liveSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ skillId: 'skill-1' });
    (prisma.studentSkillState.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.explanationRoute.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getLaneView('session-1');

    expect(result.lane1.count).toBe(0);
    expect(result.lane2.count).toBe(0);
    expect(result.lane3.count).toBe(0);
    expect(result.totalParticipants).toBe(0);
  });

  it('groups participants by lane correctly', async () => {
    const now = new Date();
    (prisma.liveParticipant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'p1',
        studentUserId: 'u1',
        currentLane: 'LANE_1',
        currentExplanationId: null,
        escalationReason: null,
        isUnexpectedFailure: false,
        holdingAtFinalCheck: false,
        laneAssignedAt: now,
        student: { id: 'u1', name: 'Alice' },
      },
      {
        id: 'p2',
        studentUserId: 'u2',
        currentLane: 'LANE_2',
        currentExplanationId: 'exp-1',
        escalationReason: 'ANCHOR_FAILED',
        isUnexpectedFailure: false,
        holdingAtFinalCheck: false,
        laneAssignedAt: now,
        student: { id: 'u2', name: 'Bob' },
      },
      {
        id: 'p3',
        studentUserId: 'u3',
        currentLane: 'LANE_3',
        currentExplanationId: null,
        escalationReason: 'MISCONCEPTION_FAILED',
        isUnexpectedFailure: true,
        holdingAtFinalCheck: true,
        laneAssignedAt: now,
        student: { id: 'u3', name: 'Charlie' },
      },
    ]);
    (prisma.liveSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ skillId: 'skill-1' });
    (prisma.studentSkillState.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 'u1', masteryProbability: 0.9 },
      { userId: 'u2', masteryProbability: 0.6 },
      { userId: 'u3', masteryProbability: 0.2 },
    ]);
    (prisma.explanationRoute.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'exp-1', routeType: 'A' },
    ]);

    const result = await getLaneView('session-1');

    expect(result.lane1.count).toBe(1);
    expect(result.lane1.students[0].studentName).toBe('Alice');
    expect(result.lane2.count).toBe(1);
    expect(result.lane2.students[0].studentName).toBe('Bob');
    expect(result.lane3.count).toBe(1);
    expect(result.lane3.students[0].studentName).toBe('Charlie');
    expect(result.totalParticipants).toBe(3);
    expect(result.unassigned).toBe(0);
  });

  it('counts unassigned participants without laneAssignedAt', async () => {
    (prisma.liveParticipant.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'p1',
        studentUserId: 'u1',
        currentLane: 'LANE_3',
        currentExplanationId: null,
        escalationReason: null,
        isUnexpectedFailure: false,
        holdingAtFinalCheck: false,
        laneAssignedAt: null,
        student: { id: 'u1', name: 'Diane' },
      },
    ]);
    (prisma.liveSession.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ skillId: 'skill-1' });
    (prisma.studentSkillState.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.explanationRoute.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getLaneView('session-1');

    expect(result.unassigned).toBe(1);
    expect(result.lane3.count).toBe(0);
  });
});
