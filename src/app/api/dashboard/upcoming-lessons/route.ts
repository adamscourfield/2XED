import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

const querySchema = z.object({
  from: z.string().min(4),
  to: z.string().min(4),
});

type UpcomingLessonEvent = {
  at: string;
  kind: 'skill_review' | 'practice_due' | 'live_session' | 'class_review';
  title: string;
  href?: string;
  meta?: string;
};

const MAX_EVENTS = 400;

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
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));
  return NextResponse.json({ events: events.slice(0, MAX_EVENTS) });
}
