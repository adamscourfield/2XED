import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getServerSessionMock } = vi.hoisted(() => ({ getServerSessionMock: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }));
vi.mock('@/features/auth/authOptions', () => ({ authOptions: {} }));

vi.mock('@/db/prisma', () => ({
  prisma: {
    liveSession: { findUnique: vi.fn(), update: vi.fn() },
    explanationRoute: { findUnique: vi.fn() },
    classroom: { count: vi.fn() },
    teacherProfile: { findUnique: vi.fn() },
    seatingPlan: { findUnique: vi.fn(), upsert: vi.fn() },
    classroomEnrollment: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/db/prisma';
import { POST as broadcastPost } from '@/app/api/live-sessions/[sessionId]/broadcast/route';
import { PATCH as phasePatch } from '@/app/api/live-sessions/[sessionId]/phase/route';
import { GET as seatingGet, PUT as seatingPut } from '@/app/api/classrooms/[classroomId]/seating-plan/route';

const p = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

function req(body: unknown) {
  return { json: async () => body } as never;
}
const sessionParams = { params: Promise.resolve({ sessionId: 'sess-1' }) };
const classParams = { params: Promise.resolve({ classroomId: 'class-1' }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST broadcast', () => {
  it('401 unauthenticated, 403 non-teacher', async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    expect((await broadcastPost(req({}), sessionParams)).status).toBe(401);

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 's', role: 'STUDENT' } });
    expect((await broadcastPost(req({ contentType: 'MESSAGE', message: 'x' }), sessionParams)).status).toBe(403);
  });

  it('400 on an invalid contentType', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 't1', role: 'TEACHER' } });
    expect((await broadcastPost(req({ contentType: 'NONSENSE' }), sessionParams)).status).toBe(400);
  });

  it('404 when the session is missing, 403 when not the owner', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 't1', role: 'TEACHER' } });
    p.liveSession.findUnique.mockResolvedValueOnce(null);
    expect((await broadcastPost(req({ contentType: 'MESSAGE', message: 'hi' }), sessionParams)).status).toBe(404);

    p.liveSession.findUnique.mockResolvedValueOnce({ id: 'sess-1', teacherUserId: 'other', status: 'ACTIVE' });
    expect((await broadcastPost(req({ contentType: 'MESSAGE', message: 'hi' }), sessionParams)).status).toBe(403);
  });

  it('200 stores the broadcast for the owning teacher', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 't1', role: 'TEACHER' } });
    p.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', teacherUserId: 't1', status: 'ACTIVE' });
    p.liveSession.update.mockResolvedValue({});
    const res = await broadcastPost(req({ contentType: 'MESSAGE', message: 'Pens down' }), sessionParams);
    expect(res.status).toBe(200);
    expect(p.liveSession.update).toHaveBeenCalled();
    const body = await res.json();
    expect(body.content.message).toBe('Pens down');
    expect(body.content.targetLanes).toEqual(['LANE_1', 'LANE_2', 'LANE_3']);
  });
});

describe('PATCH phase', () => {
  beforeEach(() => getServerSessionMock.mockResolvedValue({ user: { id: 't1', role: 'TEACHER' } }));

  it('403 when not the owner', async () => {
    p.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', teacherUserId: 'other', phases: [{}, {}], currentPhaseIndex: 0 });
    expect((await phasePatch(req({}), sessionParams)).status).toBe(403);
  });

  it('400 when the session has no phases', async () => {
    p.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', teacherUserId: 't1', phases: [], currentPhaseIndex: 0 });
    expect((await phasePatch(req({}), sessionParams)).status).toBe(400);
  });

  it('400 when already at the last phase', async () => {
    p.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', teacherUserId: 't1', phases: [{}, {}], currentPhaseIndex: 1 });
    expect((await phasePatch(req({}), sessionParams)).status).toBe(400);
  });

  it('200 advances to the next phase', async () => {
    p.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', teacherUserId: 't1', phases: [{ a: 1 }, { b: 2 }], currentPhaseIndex: 0 });
    p.liveSession.update.mockResolvedValue({ id: 'sess-1', currentPhaseIndex: 1, currentContent: { b: 2 } });
    const res = await phasePatch(req({}), sessionParams);
    expect(res.status).toBe(200);
    expect((await res.json()).currentPhaseIndex).toBe(1);
  });
});

describe('seating-plan routes', () => {
  it('GET: 401 unauth, 403 student, 403 when not managing the classroom', async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    expect((await seatingGet(req({}), classParams)).status).toBe(401);

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 's', role: 'STUDENT' } });
    expect((await seatingGet(req({}), classParams)).status).toBe(403);

    getServerSessionMock.mockResolvedValueOnce({ user: { id: 't1', role: 'TEACHER' } });
    p.teacherProfile.findUnique.mockResolvedValueOnce({ classrooms: [] });
    expect((await seatingGet(req({}), classParams)).status).toBe(403);
  });

  it('GET: 200 returns a default grid + roster for a managing teacher', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 't1', role: 'TEACHER' } });
    p.teacherProfile.findUnique.mockResolvedValue({ classrooms: [{ classroomId: 'class-1' }] });
    p.seatingPlan.findUnique.mockResolvedValue(null);
    p.classroomEnrollment.findMany.mockResolvedValue([{ studentUserId: 'a', student: { name: 'Ann', email: 'a@x' } }]);
    const res = await seatingGet(req({}), classParams);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toMatchObject({ rows: 5, cols: 6, seats: [] });
    expect(body.roster).toEqual([{ studentUserId: 'a', name: 'Ann' }]);
  });

  it('PUT: 400 invalid body, and drops seats for non-enrolled students', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 't1', role: 'TEACHER' } });
    p.teacherProfile.findUnique.mockResolvedValue({ classrooms: [{ classroomId: 'class-1' }] });

    expect((await seatingPut(req({ rows: 'no' }), classParams)).status).toBe(400);

    p.classroomEnrollment.findMany.mockResolvedValue([{ studentUserId: 'a', student: { name: 'Ann', email: 'a@x' } }]);
    p.seatingPlan.upsert.mockResolvedValue({});
    const res = await seatingPut(
      req({ rows: 5, cols: 6, seats: [{ studentUserId: 'a', row: 0, col: 0 }, { studentUserId: 'ghost', row: 1, col: 1 }] }),
      classParams,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.seats).toEqual([{ studentUserId: 'a', row: 0, col: 0 }]); // 'ghost' dropped
  });
});
