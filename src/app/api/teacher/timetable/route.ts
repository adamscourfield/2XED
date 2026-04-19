import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

const recurrenceSchema = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY_NTH']);

const createBodySchema = z.object({
  classroomId: z.string().min(1),
  label: z.string().max(200).optional().nullable(),
  room: z.string().max(120).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6),
  minuteOfDay: z.number().int().min(0).max(1439),
  durationMinutes: z.number().int().min(5).max(600).optional().default(60),
  recurrence: recurrenceSchema.optional().default('WEEKLY'),
  week0Anchor: z.string().min(4).optional().nullable(),
  nthWeekOfMonth: z.number().int().min(1).max(5).optional().nullable(),
  timezone: z.string().max(80).optional().default('Europe/London'),
});

function assertTeacher(sessionUser: { id: string; role?: string }) {
  if (sessionUser.role !== 'TEACHER' && sessionUser.role !== 'ADMIN' && sessionUser.role !== 'LEADERSHIP') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  const forbidden = assertTeacher(user);
  if (forbidden) return forbidden;

  const classroomId = req.nextUrl.searchParams.get('classroomId')?.trim();

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: {
      classrooms: {
        include: {
          classroom: {
            include: {
              timetableSlots: { orderBy: [{ dayOfWeek: 'asc' }, { minuteOfDay: 'asc' }] },
            },
          },
        },
      },
    },
  });

  if (!teacherProfile) {
    return NextResponse.json({ classrooms: [] });
  }

  const rows = teacherProfile.classrooms.map((tc) => ({
    id: tc.classroom.id,
    name: tc.classroom.name,
    subjectSlug: tc.classroom.subjectSlug,
    slots: tc.classroom.timetableSlots.map((s) => ({
      id: s.id,
      classroomId: s.classroomId,
      label: s.label,
      room: s.room,
      dayOfWeek: s.dayOfWeek,
      minuteOfDay: s.minuteOfDay,
      durationMinutes: s.durationMinutes,
      recurrence: s.recurrence,
      week0Anchor: s.week0Anchor?.toISOString() ?? null,
      nthWeekOfMonth: s.nthWeekOfMonth,
      timezone: s.timezone,
    })),
  }));

  if (classroomId) {
    const cls = rows.find((r) => r.id === classroomId);
    if (!cls) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    return NextResponse.json(cls);
  }

  return NextResponse.json({ classrooms: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  const forbidden = assertTeacher(user);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: { classrooms: { where: { classroomId: parsed.data.classroomId } } },
  });

  if (!teacherProfile?.classrooms.length) {
    return NextResponse.json({ error: 'Not allowed for this classroom' }, { status: 403 });
  }

  const data = parsed.data;
  if (data.recurrence === 'BIWEEKLY' && !data.week0Anchor) {
    return NextResponse.json({ error: 'week0Anchor is required for BIWEEKLY' }, { status: 400 });
  }
  if (data.recurrence === 'MONTHLY_NTH' && (data.nthWeekOfMonth == null || data.nthWeekOfMonth < 1)) {
    return NextResponse.json({ error: 'nthWeekOfMonth (1–5) is required for MONTHLY_NTH' }, { status: 400 });
  }

  const slot = await prisma.classroomTimetableSlot.create({
    data: {
      classroomId: data.classroomId,
      label: data.label ?? null,
      room: data.room ?? null,
      dayOfWeek: data.dayOfWeek,
      minuteOfDay: data.minuteOfDay,
      durationMinutes: data.durationMinutes,
      recurrence: data.recurrence,
      week0Anchor: data.week0Anchor ? new Date(data.week0Anchor) : null,
      nthWeekOfMonth: data.nthWeekOfMonth ?? null,
      timezone: data.timezone,
    },
  });

  return NextResponse.json({
    id: slot.id,
    classroomId: slot.classroomId,
    label: slot.label,
    room: slot.room,
    dayOfWeek: slot.dayOfWeek,
    minuteOfDay: slot.minuteOfDay,
    durationMinutes: slot.durationMinutes,
    recurrence: slot.recurrence,
    week0Anchor: slot.week0Anchor?.toISOString() ?? null,
    nthWeekOfMonth: slot.nthWeekOfMonth,
    timezone: slot.timezone,
  });
}
