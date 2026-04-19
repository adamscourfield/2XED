import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

const recurrenceSchema = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY_NTH']);

const patchBodySchema = z.object({
  label: z.string().max(200).optional().nullable(),
  room: z.string().max(120).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  minuteOfDay: z.number().int().min(0).max(1439).optional(),
  durationMinutes: z.number().int().min(5).max(600).optional(),
  recurrence: recurrenceSchema.optional(),
  week0Anchor: z.string().min(4).optional().nullable(),
  nthWeekOfMonth: z.number().int().min(1).max(5).optional().nullable(),
  timezone: z.string().max(80).optional(),
});

function assertTeacher(sessionUser: { id: string; role?: string }) {
  if (sessionUser.role !== 'TEACHER' && sessionUser.role !== 'ADMIN' && sessionUser.role !== 'LEADERSHIP') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

async function assertOwnsSlot(userId: string, slotId: string) {
  const slot = await prisma.classroomTimetableSlot.findUnique({
    where: { id: slotId },
    include: {
      classroom: {
        include: {
          teachers: { where: { teacherProfile: { userId } } },
        },
      },
    },
  });

  if (!slot) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  if (slot.classroom.teachers.length === 0) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { slot };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slotId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  const forbidden = assertTeacher(user);
  if (forbidden) return forbidden;

  const { slotId } = await ctx.params;
  const own = await assertOwnsSlot(user.id, slotId);
  if ('error' in own) return own.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }

  const nextRecurrence = parsed.data.recurrence ?? own.slot.recurrence;
  if (nextRecurrence === 'BIWEEKLY') {
    const anchor = parsed.data.week0Anchor !== undefined ? parsed.data.week0Anchor : own.slot.week0Anchor?.toISOString();
    if (!anchor) {
      return NextResponse.json({ error: 'week0Anchor is required for BIWEEKLY' }, { status: 400 });
    }
  }
  if (nextRecurrence === 'MONTHLY_NTH') {
    const nth =
      parsed.data.nthWeekOfMonth !== undefined ? parsed.data.nthWeekOfMonth : own.slot.nthWeekOfMonth;
    if (nth == null || nth < 1) {
      return NextResponse.json({ error: 'nthWeekOfMonth (1–5) is required for MONTHLY_NTH' }, { status: 400 });
    }
  }

  const updated = await prisma.classroomTimetableSlot.update({
    where: { id: slotId },
    data: {
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.room !== undefined ? { room: parsed.data.room } : {}),
      ...(parsed.data.dayOfWeek !== undefined ? { dayOfWeek: parsed.data.dayOfWeek } : {}),
      ...(parsed.data.minuteOfDay !== undefined ? { minuteOfDay: parsed.data.minuteOfDay } : {}),
      ...(parsed.data.durationMinutes !== undefined ? { durationMinutes: parsed.data.durationMinutes } : {}),
      ...(parsed.data.recurrence !== undefined ? { recurrence: parsed.data.recurrence } : {}),
      ...(parsed.data.week0Anchor !== undefined
        ? { week0Anchor: parsed.data.week0Anchor ? new Date(parsed.data.week0Anchor) : null }
        : {}),
      ...(parsed.data.nthWeekOfMonth !== undefined ? { nthWeekOfMonth: parsed.data.nthWeekOfMonth } : {}),
      ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    classroomId: updated.classroomId,
    label: updated.label,
    room: updated.room,
    dayOfWeek: updated.dayOfWeek,
    minuteOfDay: updated.minuteOfDay,
    durationMinutes: updated.durationMinutes,
    recurrence: updated.recurrence,
    week0Anchor: updated.week0Anchor?.toISOString() ?? null,
    nthWeekOfMonth: updated.nthWeekOfMonth,
    timezone: updated.timezone,
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slotId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  const forbidden = assertTeacher(user);
  if (forbidden) return forbidden;

  const { slotId } = await ctx.params;
  const own = await assertOwnsSlot(user.id, slotId);
  if ('error' in own) return own.error;

  await prisma.classroomTimetableSlot.delete({ where: { id: slotId } });
  return NextResponse.json({ ok: true });
}
