import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { expandTimetableSlots, type TimetableRecurrence, type TimetableSlotForExpansion } from '@/features/timetable/expandTimetableSlots';

const querySchema = z.object({
  from: z.string().min(4),
  to: z.string().min(4),
});

type UpcomingLessonEvent = {
  at: string;
  kind: 'skill_review' | 'practice_due' | 'live_session' | 'class_review' | 'timetable_slot';
  title: string;
  href?: string;
  meta?: string;
};

const MAX_EVENTS = 400;

function mapRecurrence(r: string): TimetableRecurrence {
  if (r === 'BIWEEKLY' || r === 'MONTHLY_NTH') return r;
  return 'WEEKLY';
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { id: string; role?: string };
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 });
  }

  const rangeStart = new Date(parsed.data.from);
  const rangeEnd = new Date(parsed.data.to);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeEnd <= rangeStart) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  const role = user.role ?? 'STUDENT';
  const events: UpcomingLessonEvent[] = [];

  if (role === 'STUDENT') {
    const [reviews, masteries] = await Promise.all([
      prisma.skillReview.findMany({
        where: {
          userId: user.id,
          completedAt: null,
          scheduledFor: { gte: rangeStart, lt: rangeEnd },
        },
        orderBy: { scheduledFor: 'asc' },
        take: MAX_EVENTS,
        include: {
          skill: { select: { name: true, slug: true, subject: { select: { slug: true } } } },
        },
      }),
      prisma.skillMastery.findMany({
        where: {
          userId: user.id,
          nextReviewAt: { gte: rangeStart, lt: rangeEnd },
        },
        orderBy: { nextReviewAt: 'asc' },
        take: MAX_EVENTS,
        include: {
          skill: { select: { name: true, slug: true, subject: { select: { slug: true } } } },
        },
      }),
    ]);

    const reviewSkillIds = new Set(reviews.map((r) => r.skillId));

    for (const r of reviews) {
      events.push({
        at: r.scheduledFor.toISOString(),
        kind: 'skill_review',
        title: r.skill.name,
        href: `/learn/${r.skill.subject.slug}`,
        meta: 'Scheduled review',
      });
    }

    for (const m of masteries) {
      if (!m.nextReviewAt || reviewSkillIds.has(m.skillId)) continue;
      events.push({
        at: m.nextReviewAt.toISOString(),
        kind: 'practice_due',
        title: m.skill.name,
        href: `/learn/${m.skill.subject.slug}`,
        meta: 'Practice due',
      });
    }

    const enrollRows = await prisma.classroomEnrollment.findMany({
      where: { studentUserId: user.id },
      select: {
        classroom: {
          select: {
            id: true,
            name: true,
            subjectSlug: true,
            timetableSlots: true,
          },
        },
      },
    });

    const slotPayloads: TimetableSlotForExpansion[] = [];
    for (const row of enrollRows) {
      const cls = row.classroom;
      for (const s of cls.timetableSlots) {
        slotPayloads.push({
          id: s.id,
          classroomId: cls.id,
          classroomName: cls.name,
          label: s.label,
          room: s.room,
          dayOfWeek: s.dayOfWeek,
          minuteOfDay: s.minuteOfDay,
          durationMinutes: s.durationMinutes,
          recurrence: mapRecurrence(s.recurrence),
          week0Anchor: s.week0Anchor,
          nthWeekOfMonth: s.nthWeekOfMonth,
          timezone: s.timezone,
        });
      }
    }

    for (const occ of expandTimetableSlots(slotPayloads, rangeStart, rangeEnd)) {
      const cls = enrollRows.find((r) => r.classroom.id === occ.classroomId)?.classroom;
      const href = cls?.subjectSlug ? `/learn/${cls.subjectSlug}` : undefined;
      events.push({
        at: occ.startsAtUtc.toISOString(),
        kind: 'timetable_slot',
        title: occ.title,
        href,
        meta: occ.meta,
      });
    }
  } else if (role === 'TEACHER' || role === 'ADMIN' || role === 'LEADERSHIP') {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      include: {
        classrooms: { select: { classroomId: true } },
      },
    });

    if (!teacherProfile) {
      return NextResponse.json({ events: [] satisfies UpcomingLessonEvent[] });
    }

    const classroomIds = teacherProfile.classrooms.map((c) => c.classroomId);
    const enrollments =
      classroomIds.length > 0
        ? await prisma.classroomEnrollment.findMany({
            where: { classroomId: { in: classroomIds } },
            select: { studentUserId: true, student: { select: { name: true, email: true } } },
          })
        : [];

    const studentIds = [...new Set(enrollments.map((e) => e.studentUserId))];
    const studentLabel = (id: string) => {
      const row = enrollments.find((e) => e.studentUserId === id);
      if (!row) return 'Student';
      return row.student.name?.trim() || row.student.email || 'Student';
    };

    const [liveSessions, classReviews, classPractice] = await Promise.all([
      prisma.liveSession.findMany({
        where: {
          teacherUserId: user.id,
          endedAt: null,
          OR: [{ createdAt: { gte: rangeStart, lt: rangeEnd } }, { startedAt: { gte: rangeStart, lt: rangeEnd } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 80,
        include: {
          subject: { select: { title: true } },
          skill: { select: { name: true, code: true } },
          classroom: { select: { name: true } },
        },
      }),
      studentIds.length
        ? prisma.skillReview.findMany({
            where: {
              userId: { in: studentIds },
              completedAt: null,
              scheduledFor: { gte: rangeStart, lt: rangeEnd },
            },
            orderBy: { scheduledFor: 'asc' },
            take: MAX_EVENTS,
            include: {
              skill: { select: { name: true, subject: { select: { slug: true } } } },
            },
          })
        : [],
      studentIds.length
        ? prisma.skillMastery.findMany({
            where: {
              userId: { in: studentIds },
              nextReviewAt: { gte: rangeStart, lt: rangeEnd },
            },
            orderBy: { nextReviewAt: 'asc' },
            take: MAX_EVENTS,
            include: {
              skill: { select: { name: true, subject: { select: { slug: true } } } },
            },
          })
        : [],
    ]);

    for (const ls of liveSessions) {
      const at = ls.startedAt ?? ls.createdAt;
      if (at < rangeStart || at >= rangeEnd) continue;
      const topic = ls.skill ? `${ls.skill.code}: ${ls.skill.name}` : ls.subject.title;
      events.push({
        at: at.toISOString(),
        kind: 'live_session',
        title: topic,
        href: `/teacher/live/${ls.id}`,
        meta: `${ls.classroom.name} · Code ${ls.joinCode}`,
      });
    }

    const reviewKeys = new Set(classReviews.map((r) => `${r.userId}:${r.skillId}`));

    for (const r of classReviews) {
      events.push({
        at: r.scheduledFor.toISOString(),
        kind: 'class_review',
        title: r.skill.name,
        href: `/learn/${r.skill.subject.slug}`,
        meta: studentLabel(r.userId),
      });
    }

    for (const m of classPractice) {
      if (!m.nextReviewAt) continue;
      if (reviewKeys.has(`${m.userId}:${m.skillId}`)) continue;
      events.push({
        at: m.nextReviewAt.toISOString(),
        kind: 'class_review',
        title: m.skill.name,
        href: `/learn/${m.skill.subject.slug}`,
        meta: `${studentLabel(m.userId)} · Practice due`,
      });
    }

    const classrooms = await prisma.classroom.findMany({
      where: { id: { in: classroomIds } },
      select: {
        id: true,
        name: true,
        subjectSlug: true,
        timetableSlots: true,
      },
    });

    const teacherSlotPayloads: TimetableSlotForExpansion[] = [];
    for (const cls of classrooms) {
      for (const s of cls.timetableSlots) {
        teacherSlotPayloads.push({
          id: s.id,
          classroomId: cls.id,
          classroomName: cls.name,
          label: s.label,
          room: s.room,
          dayOfWeek: s.dayOfWeek,
          minuteOfDay: s.minuteOfDay,
          durationMinutes: s.durationMinutes,
          recurrence: mapRecurrence(s.recurrence),
          week0Anchor: s.week0Anchor,
          nthWeekOfMonth: s.nthWeekOfMonth,
          timezone: s.timezone,
        });
      }
    }

    for (const occ of expandTimetableSlots(teacherSlotPayloads, rangeStart, rangeEnd)) {
      const cls = classrooms.find((c) => c.id === occ.classroomId);
      events.push({
        at: occ.startsAtUtc.toISOString(),
        kind: 'timetable_slot',
        title: occ.title,
        href: cls?.subjectSlug ? `/learn/${cls.subjectSlug}` : `/teacher/timetable`,
        meta: occ.meta,
      });
    }
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));
  return NextResponse.json({ events: events.slice(0, MAX_EVENTS) });
}
