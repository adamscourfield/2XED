import { beforeEach, describe, expect, it, vi } from 'vitest';

const emitEventMock = vi.fn();
const interventionUpsertMock = vi.fn();
const gradeAttemptMock = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => ({ user: { id: 'user-1' } })),
}));

vi.mock('@/features/auth/authOptions', () => ({ authOptions: {} }));

vi.mock('@/db/prisma', () => ({
  prisma: {
    item: {
      findUnique: vi.fn(async () => ({ id: 'item-1', answer: '4', type: 'MCQ', question: '2+2', options: ['3', '4'] })),
    },
    skillMastery: {
      findUnique: vi.fn(async () => null),
    },
    attempt: {
      create: vi.fn(async () => ({ id: 'att-1', createdAt: new Date('2026-03-10T10:00:00.000Z') })),
      findFirst: vi.fn(async () => null),
    },
    interventionFlag: {
      upsert: interventionUpsertMock,
    },
  },
}));

vi.mock('@/features/learn/gradeAttempt', () => ({
  gradeAttempt: gradeAttemptMock,
  getAnswerFormatHint: vi.fn(() => null),
}));

vi.mock('@/features/telemetry/eventService', () => ({
  emitEvent: emitEventMock,
}));

vi.mock('@/features/mastery/updateMastery', () => ({
  updateSkillMastery: vi.fn(async () => undefined),
}));

vi.mock('@/features/gamification/gamificationService', () => ({
  consumeGuessingSafeguard: vi.fn(async () => ({ xpMultiplier: 1, penaltyApplied: false, penaltyRemaining: 0 })),
  grantReward: vi.fn(async () => undefined),
  maybeGrantDailyStreak: vi.fn(async () => undefined),
}));

describe('learn attempt shadow pair events', () => {
  beforeEach(() => {
    emitEventMock.mockClear();
    interventionUpsertMock.mockClear();
    gradeAttemptMock.mockReset();
  });

  it('emits shadow_pair_passed when final shadow pair is fully correct', async () => {
    gradeAttemptMock.mockReturnValue(true);
    const { POST } = await import('@/app/api/learn/attempt/route');

    const req = {
      json: async () => ({
        itemId: 'item-1',
        skillId: 'skill-1',
        subjectId: 'subject-1',
        answer: '4',
        isLast: true,
        questionIndex: 1,
        routeType: 'A',
        totalItems: 2,
        previousResults: [{ itemId: 'item-0', correct: true }],
      }),
    } as Request;

    await POST(req as never);

    const names = emitEventMock.mock.calls.map(([arg]) => arg.name);
    expect(names).toContain('route_completed');
    expect(names).toContain('shadow_pair_passed');
    expect(names).not.toContain('shadow_pair_failed');
  });

  it('emits shadow_pair_failed and intervention_flagged for route C repeated failure', async () => {
    gradeAttemptMock.mockReturnValue(false);
    const { POST } = await import('@/app/api/learn/attempt/route');

    const req = {
      json: async () => ({
        itemId: 'item-1',
        skillId: 'skill-1',
        subjectId: 'subject-1',
        answer: '3',
        isLast: true,
        questionIndex: 1,
        routeType: 'C',
        totalItems: 2,
        previousResults: [{ itemId: 'item-0', correct: false }],
      }),
    } as Request;

    await POST(req as never);

    const names = emitEventMock.mock.calls.map(([arg]) => arg.name);
    expect(names).toContain('shadow_pair_failed');
    expect(names).toContain('intervention_flagged');
    expect(interventionUpsertMock).toHaveBeenCalledTimes(1);
  });
});
