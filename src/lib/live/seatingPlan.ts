import { prisma } from '@/db/prisma';

export interface Seat {
  studentUserId: string;
  row: number;
  col: number;
}

export interface SeatingPlanData {
  rows: number;
  cols: number;
  seats: Seat[];
}

export interface SeatingRosterEntry {
  studentUserId: string;
  name: string;
}

export const SEATING_MIN = 1;
export const SEATING_MAX = 12;

/** True when the teacher (or an admin/leadership user) may manage the classroom. */
export async function teacherCanManageClassroom(
  userId: string,
  role: string | undefined,
  classroomId: string,
): Promise<boolean> {
  if (role === 'ADMIN' || role === 'LEADERSHIP') {
    return (await prisma.classroom.count({ where: { id: classroomId } })) > 0;
  }
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { classrooms: { where: { classroomId }, select: { classroomId: true }, take: 1 } },
  });
  return Boolean(profile && profile.classrooms.length > 0);
}

/** Coerces unknown JSON into a clean Seat[] (drops malformed / out-of-range entries). */
export function parseSeats(raw: unknown, rows: number, cols: number): Seat[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Seat[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const studentUserId = typeof e.studentUserId === 'string' ? e.studentUserId : null;
    const row = typeof e.row === 'number' ? e.row : null;
    const col = typeof e.col === 'number' ? e.col : null;
    if (!studentUserId || row === null || col === null) continue;
    if (row < 0 || row >= rows || col < 0 || col >= cols) continue;
    // One seat per student, one student per cell.
    const cellKey = `${row}:${col}`;
    if (seen.has(studentUserId) || seen.has(cellKey)) continue;
    seen.add(studentUserId);
    seen.add(cellKey);
    out.push({ studentUserId, row, col });
  }
  return out;
}

/** The classroom's enrolled students, for placing into the plan. */
export async function loadClassroomRoster(classroomId: string): Promise<SeatingRosterEntry[]> {
  const enrollments = await prisma.classroomEnrollment.findMany({
    where: { classroomId },
    select: { studentUserId: true, student: { select: { name: true, email: true } } },
  });
  return enrollments
    .map((e) => ({ studentUserId: e.studentUserId, name: e.student.name ?? e.student.email }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
