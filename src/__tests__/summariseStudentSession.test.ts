import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/prisma', () => ({
  prisma: {
    liveParticipant: { findUnique: vi.fn() },
    liveSession: { findUnique: vi.fn() },
    liveAttempt: { findMany: vi.fn() },
    laneTransition: { findMany: vi.fn() },
    skill: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/db/prisma';
import { summariseStudentSession } from '@/lib/live/summariseStudentSession';

const p = prisma as unknown as {
  liveParticipant: { findUnique: ReturnType<typeof vi.fn> };
  liveSession: { findUnique: ReturnType<typeof vi.fn> };
  liveAttempt: { findMany: ReturnType<typeof vi.fn> };
  laneTransition: { findMany: ReturnType<typeof vi.fn> };
  skill: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  p.laneTransition.findMany.mockResolvedValue([]);
});

describe('summariseStudentSession', () => {
  it('returns null when the student was not a participant', async () => {
    p.liveParticipant.findUnique.mockResolvedValue(null);
    p.liveSession.findUnique.mockResolvedValue({ id: 's1', status: 'COMPLETED', skill: null, subject: { title: 'Maths' } });

    const result = await summariseStudentSession('s1', 'u1');
    expect(result).toBeNull();
  });

  it('returns null when the session does not exist', async () => {
    p.liveParticipant.findUnique.mockResolvedValue({ currentLane: 'LANE_1' });
    p.liveSession.findUnique.mockResolvedValue(null);

    const result = await summariseStudentSession('s1', 'u1');
    expect(result).toBeNull();
  });

  it('flags a weak skill (<60%) as a focus area and a strong skill (>=80%) as a strength', async () => {
    p.liveParticipant.findUnique.mockResolvedValue({ currentLane: 'LANE_2' });
    p.liveSession.findUnique.mockResolvedValue({
      id: 's1',
      status: 'COMPLETED',
      skill: { id: 'sk-weak', code: 'N1.1', name: 'Weak skill' },
      subject: { title: 'Maths' },
    });
    p.liveAttempt.findMany.mockResolvedValue([
      // Weak skill: 1/3 correct → focus area
      { skillId: 'sk-weak', correct: false, markingResult: null, misconceptionId: null, createdAt: new Date(1) },
      { skillId: 'sk-weak', correct: false, markingResult: null, misconceptionId: null, createdAt: new Date(2) },
      { skillId: 'sk-weak', correct: true, markingResult: null, misconceptionId: null, createdAt: new Date(3) },
      // Strong skill: 4/4 correct → strength
      { skillId: 'sk-strong', correct: true, markingResult: null, misconceptionId: null, createdAt: new Date(4) },
      { skillId: 'sk-strong', correct: true, markingResult: null, misconceptionId: null, createdAt: new Date(5) },
      { skillId: 'sk-strong', correct: true, markingResult: null, misconceptionId: null, createdAt: new Date(6) },
      { skillId: 'sk-strong', correct: true, markingResult: null, misconceptionId: null, createdAt: new Date(7) },
    ]);
    p.skill.findMany.mockResolvedValue([
      { id: 'sk-weak', code: 'N1.1', name: 'Weak skill', misconceptions: [] },
      { id: 'sk-strong', code: 'N1.2', name: 'Strong skill', misconceptions: [] },
    ]);

    const result = await summariseStudentSession('s1', 'u1');
    expect(result).not.toBeNull();
    expect(result!.attemptCount).toBe(7);
    expect(result!.correctCount).toBe(5);
    expect(result!.focusAreas.some((a) => a.kind === 'skill' && a.label === 'Weak skill' && a.skillId === 'sk-weak')).toBe(true);
    expect(result!.strengths).toContain('Strong skill');
    expect(result!.strengths).not.toContain('Weak skill');
  });

  it('surfaces a hit misconception as a focus area carrying its skillId', async () => {
    p.liveParticipant.findUnique.mockResolvedValue({ currentLane: 'LANE_3' });
    p.liveSession.findUnique.mockResolvedValue({
      id: 's1',
      status: 'COMPLETED',
      skill: { id: 'sk1', code: 'N1.1', name: 'Skill' },
      subject: { title: 'Maths' },
    });
    p.liveAttempt.findMany.mockResolvedValue([
      { skillId: 'sk1', correct: false, markingResult: null, misconceptionId: 'MC_001', createdAt: new Date(1) },
    ]);
    p.skill.findMany.mockResolvedValue([
      {
        id: 'sk1',
        code: 'N1.1',
        name: 'Skill',
        misconceptions: [{ id: 'MC_001', label: 'Adds numerators and denominators', description: 'Treats fractions like whole numbers' }],
      },
    ]);

    const result = await summariseStudentSession('s1', 'u1');
    const mc = result!.focusAreas.find((a) => a.kind === 'misconception');
    expect(mc).toBeDefined();
    expect(mc!.label).toBe('Adds numerators and denominators');
    expect(mc!.skillId).toBe('sk1');
  });

  it('treats rubric scores at/above the correct threshold as correct', async () => {
    p.liveParticipant.findUnique.mockResolvedValue({ currentLane: 'LANE_1' });
    p.liveSession.findUnique.mockResolvedValue({
      id: 's1', status: 'COMPLETED', skill: null, subject: { title: 'English' },
    });
    p.liveAttempt.findMany.mockResolvedValue([
      // correct flag false but rubric score high → counts as correct
      { skillId: 'sk1', correct: false, markingResult: { score: 0.95 }, misconceptionId: null, createdAt: new Date(1) },
      { skillId: 'sk1', correct: false, markingResult: { score: 0.4 }, misconceptionId: null, createdAt: new Date(2) },
    ]);
    p.skill.findMany.mockResolvedValue([{ id: 'sk1', code: 'E1', name: 'Analysis', misconceptions: [] }]);

    const result = await summariseStudentSession('s1', 'u1');
    expect(result!.correctCount).toBe(1);
    expect(result!.partialCount).toBe(1);
  });
});
