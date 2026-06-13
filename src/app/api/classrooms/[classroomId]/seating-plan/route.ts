import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { requireApiUser, STAFF_ROLES } from '@/lib/api/auth';
import {
  teacherCanManageClassroom,
  loadClassroomRoster,
  parseSeats,
  SEATING_MIN,
  SEATING_MAX,
  type SeatingPlanData,
} from '@/lib/live/seatingPlan';

interface Props {
  params: Promise<{ classroomId: string }>;
}

/**
 * GET — returns the classroom's seating plan (or a default empty grid) plus the
 * enrolled roster so the editor can place students.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(STAFF_ROLES);
  if (response) return response;

  const { classroomId } = await params;
  if (!(await teacherCanManageClassroom(user.id, user.role, classroomId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [plan, roster] = await Promise.all([
    prisma.seatingPlan.findUnique({ where: { classroomId } }),
    loadClassroomRoster(classroomId),
  ]);

  const rows = plan?.rows ?? 5;
  const cols = plan?.cols ?? 6;
  const data: SeatingPlanData = {
    rows,
    cols,
    seats: plan ? parseSeats(plan.seats, rows, cols) : [],
  };

  return NextResponse.json({ plan: data, roster });
}

const putSchema = z.object({
  rows: z.number().int().min(SEATING_MIN).max(SEATING_MAX),
  cols: z.number().int().min(SEATING_MIN).max(SEATING_MAX),
  seats: z.array(
    z.object({
      studentUserId: z.string().min(1),
      row: z.number().int().min(0),
      col: z.number().int().min(0),
    }),
  ),
});

/** PUT — upserts the classroom's seating plan. */
export async function PUT(req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(STAFF_ROLES);
  if (response) return response;

  const { classroomId } = await params;
  if (!(await teacherCanManageClassroom(user.id, user.role, classroomId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  // Re-validate seats against the grid + dedupe defensively (drops out-of-range
  // or duplicate placements rather than trusting the client).
  const cleanSeats = parseSeats(parsed.data.seats, parsed.data.rows, parsed.data.cols);
  // Only keep seats for students actually enrolled in this classroom.
  const roster = await loadClassroomRoster(classroomId);
  const enrolledIds = new Set(roster.map((r) => r.studentUserId));
  const seats = cleanSeats.filter((s) => enrolledIds.has(s.studentUserId));

  const seatsJson = seats as unknown as Prisma.InputJsonValue;
  await prisma.seatingPlan.upsert({
    where: { classroomId },
    create: { classroomId, rows: parsed.data.rows, cols: parsed.data.cols, seats: seatsJson },
    update: { rows: parsed.data.rows, cols: parsed.data.cols, seats: seatsJson },
  });

  return NextResponse.json({ plan: { rows: parsed.data.rows, cols: parsed.data.cols, seats }, roster });
}
