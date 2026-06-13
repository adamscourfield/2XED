import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getServerSessionMock } = vi.hoisted(() => ({ getServerSessionMock: vi.fn() }));

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }));
vi.mock('@/features/auth/authOptions', () => ({ authOptions: {} }));

vi.mock('@/db/prisma', () => ({
  prisma: {
    liveParticipant: { findUnique: vi.fn() },
    liveSession: { findUnique: vi.fn() },
    liveAttempt: { findMany: vi.fn() },
    laneTransition: { findMany: vi.fn() },
    skill: { findMany: vi.fn() },
    lesson: { findUnique: vi.fn() },
  },
}));

import { prisma } from '@/db/prisma';
import { GET as mySummaryGet } from '@/app/api/live-sessions/[sessionId]/my-summary/route';
import { GET as lessonGet } from '@/app/api/lessons/[lessonId]/route';

const p = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

function studentParams() {
  return { params: Promise.resolve({ sessionId: 'sess-1' }) };
}
function lessonParams() {
  return { params: Promise.resolve({ lessonId: 'lesson-1' }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.laneTransition.findMany.mockResolvedValue([]);
  p.liveAttempt.findMany.mockResolvedValue([]);
  p.skill.findMany.mockResolvedValue([]);
});

describe('GET /api/live-sessions/[sessionId]/my-summary', () => {
  it('returns 401 when unauthenticated', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await mySummaryGet({} as never, studentParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-student role', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 't1', role: 'TEACHER' } });
    const res = await mySummaryGet({} as never, studentParams());
    expect(res.status).toBe(403);
  });

  it('returns 403 when the student was not a participant', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'STUDENT' } });
    p.liveParticipant.findUnique.mockResolvedValue(null);
    p.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', status: 'COMPLETED', skill: null, subject: { title: 'Maths' } });
    const res = await mySummaryGet({} as never, studentParams());
    expect(res.status).toBe(403);
  });

  it('returns 200 with the summary for a participant', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'STUDENT' } });
    p.liveParticipant.findUnique.mockResolvedValue({ currentLane: 'LANE_1' });
    p.liveSession.findUnique.mockResolvedValue({
      id: 'sess-1', status: 'COMPLETED', skill: null, subject: { title: 'Maths' },
    });
    const res = await mySummaryGet({} as never, studentParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe('sess-1');
    expect(body.finalLane).toBe('LANE_1');
  });
});

describe('GET /api/lessons/[lessonId] ownership', () => {
  const fullLesson = {
    id: 'lesson-1',
    teacherUserId: 'owner-1',
    subject: { id: 'sub1', title: 'Maths', slug: 'ks3-maths' },
    curriculumUnit: null,
    blocks: [],
  };

  it('returns 403 when the requesting teacher is not the owner', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'other-teacher', role: 'TEACHER' } });
    p.lesson.findUnique.mockResolvedValue(fullLesson);
    const res = await lessonGet({} as never, lessonParams());
    expect(res.status).toBe(403);
  });

  it('returns 200 for the owning teacher', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1', role: 'TEACHER' } });
    p.lesson.findUnique.mockResolvedValue(fullLesson);
    const res = await lessonGet({} as never, lessonParams());
    expect(res.status).toBe(200);
  });

  it('lets an ADMIN read a lesson they do not own', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    p.lesson.findUnique.mockResolvedValue(fullLesson);
    const res = await lessonGet({} as never, lessonParams());
    expect(res.status).toBe(200);
  });

  it('returns 404 when the lesson does not exist', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1', role: 'TEACHER' } });
    p.lesson.findUnique.mockResolvedValue(null);
    const res = await lessonGet({} as never, lessonParams());
    expect(res.status).toBe(404);
  });
});
