import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/prisma', () => ({
  prisma: {
    classroom: { count: vi.fn() },
    teacherProfile: { findUnique: vi.fn() },
    classroomEnrollment: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/db/prisma';
import { parseSeats, teacherCanManageClassroom, loadClassroomRoster } from '@/lib/live/seatingPlan';

const p = prisma as unknown as {
  classroom: { count: ReturnType<typeof vi.fn> };
  teacherProfile: { findUnique: ReturnType<typeof vi.fn> };
  classroomEnrollment: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseSeats', () => {
  it('keeps valid in-range seats', () => {
    const seats = parseSeats([{ studentUserId: 'a', row: 0, col: 1 }, { studentUserId: 'b', row: 2, col: 3 }], 5, 6);
    expect(seats).toHaveLength(2);
  });

  it('drops out-of-range seats', () => {
    const seats = parseSeats([{ studentUserId: 'a', row: 9, col: 0 }, { studentUserId: 'b', row: 0, col: 9 }], 5, 6);
    expect(seats).toHaveLength(0);
  });

  it('dedupes a student and a cell', () => {
    const seats = parseSeats(
      [
        { studentUserId: 'a', row: 0, col: 0 },
        { studentUserId: 'a', row: 1, col: 1 }, // same student again → dropped
        { studentUserId: 'b', row: 0, col: 0 }, // same cell → dropped
      ],
      5, 6,
    );
    expect(seats).toEqual([{ studentUserId: 'a', row: 0, col: 0 }]);
  });

  it('ignores malformed input', () => {
    expect(parseSeats('nope', 5, 6)).toEqual([]);
    expect(parseSeats([{ row: 0, col: 0 }, null, 42], 5, 6)).toEqual([]);
  });
});

describe('teacherCanManageClassroom', () => {
  it('allows a teacher who teaches the classroom', async () => {
    p.teacherProfile.findUnique.mockResolvedValue({ classrooms: [{ classroomId: 'c1' }] });
    expect(await teacherCanManageClassroom('t1', 'TEACHER', 'c1')).toBe(true);
  });

  it('rejects a teacher who does not teach it', async () => {
    p.teacherProfile.findUnique.mockResolvedValue({ classrooms: [] });
    expect(await teacherCanManageClassroom('t1', 'TEACHER', 'c1')).toBe(false);
  });

  it('allows an admin for any existing classroom', async () => {
    p.classroom.count.mockResolvedValue(1);
    expect(await teacherCanManageClassroom('a1', 'ADMIN', 'c1')).toBe(true);
    expect(p.teacherProfile.findUnique).not.toHaveBeenCalled();
  });
});

describe('loadClassroomRoster', () => {
  it('maps enrollments to sorted name entries (name falls back to email)', async () => {
    p.classroomEnrollment.findMany.mockResolvedValue([
      { studentUserId: 'b', student: { name: 'Zoe', email: 'z@x' } },
      { studentUserId: 'a', student: { name: null, email: 'aaron@x' } },
    ]);
    const roster = await loadClassroomRoster('c1');
    expect(roster).toEqual([
      { studentUserId: 'a', name: 'aaron@x' },
      { studentUserId: 'b', name: 'Zoe' },
    ]);
  });
});
