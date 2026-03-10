import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirstMock = vi.fn();
const skillMasteryFindUniqueMock = vi.fn();
const findManyMock = vi.fn();

vi.mock('@/db/prisma', () => ({
  prisma: {
    event: {
      findFirst: findFirstMock,
      findMany: findManyMock,
    },
    skillMastery: {
      findUnique: skillMasteryFindUniqueMock,
    },
    item: {
      findMany: vi.fn(async () => []),
    },
  },
}));

describe('route assignment intervention fallback', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    findManyMock.mockReset();
    skillMasteryFindUniqueMock.mockReset();

    // default: no diagnostic attempts and no mastery shortcut path
    findManyMock.mockResolvedValue([]);
    skillMasteryFindUniqueMock.mockResolvedValue(null);
  });

  it('recommends intervention when last failed route is C', async () => {
    findFirstMock
      .mockResolvedValueOnce({ payload: { routeType: 'C' } }) // lastShadowFailure
      .mockResolvedValueOnce(null); // lastAssignedRoute

    const { selectExplanationRoute } = await import('@/features/diagnostic/routeAssignment');
    const result = await selectExplanationRoute('user-1', 'subject-1', 'skill-1', 'N1.1');

    expect(result.routeType).toBe('C');
    expect(result.source).toBe('fallback_chain');
    expect(result.interventionRecommended).toBe(true);
    expect(result.reason).toMatch(/fallback chain exhausted/i);
  });

  it('falls forward from route A failure to route B before intervention', async () => {
    findFirstMock
      .mockResolvedValueOnce({ payload: { routeType: 'A' } }) // lastShadowFailure
      .mockResolvedValueOnce(null); // lastAssignedRoute

    const { selectExplanationRoute } = await import('@/features/diagnostic/routeAssignment');
    const result = await selectExplanationRoute('user-1', 'subject-1', 'skill-1', 'N1.1');

    expect(result.routeType).toBe('B');
    expect(result.source).toBe('fallback_chain');
    expect(result.interventionRecommended).toBeUndefined();
    expect(result.reason).toMatch(/fallback after failed route a/i);
  });
});
