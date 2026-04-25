import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';

export type EventPayload = Record<string, unknown>;

export function parseDays(input: string | undefined): number {
  const n = Number(input ?? '30');
  if (![7, 30, 90].includes(n)) return 30;
  return n;
}

export const teacherDashboardProfileInclude = {
  classrooms: {
    include: {
      classroom: {
        include: {
          enrollments: {
            include: {
              student: {
                include: {
                  skillMasteries: {
                    select: { mastery: true, confirmedCount: true, nextReviewAt: true },
                  },
                  knowledgeSkillStates: {
                    select: {
                      latestDle: true,
                      durabilityBand: true,
                      latestInstructionalTimeMs: true,
                    },
                  },
                },
              },
              studentProfile: true,
            },
          },
        },
      },
    },
  },
} as const;

export type TeacherProfileWithClassrooms = Prisma.TeacherProfileGetPayload<{
  include: typeof teacherDashboardProfileInclude;
}>;

export async function loadTeacherDashboardData(userId: string, days: number) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: teacherDashboardProfileInclude,
  });

  if (!teacherProfile) {
    return { teacherProfile: null };
  }

  const recentSessions = await prisma.liveSession.findMany({
    where: { teacherUserId: userId },
    include: {
      subject: { select: { title: true } },
      skill: { select: { name: true, code: true } },
      classroom: { select: { name: true, externalClassId: true, yearGroup: true, subjectSlug: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  const allStudentIds = [...new Set(teacherProfile.classrooms.flatMap((tc) => tc.classroom.enrollments.map((e) => e.studentUserId)))];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = allStudentIds.length
    ? await prisma.event.findMany({
        where: {
          studentUserId: { in: allStudentIds },
          createdAt: { gte: since },
          name: {
            in: [
              'question_answered',
              'route_completed',
              'step_checkpoint_attempted',
              'step_interaction_evaluated',
              'intervention_flagged',
              'reward_granted',
            ],
          },
        },
        select: {
          name: true,
          studentUserId: true,
          subjectId: true,
          payload: true,
          createdAt: true,
        },
      })
    : [];

  const trendWindowStart = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
  const questionAttempts = allStudentIds.length
    ? await prisma.questionAttempt.findMany({
        where: {
          userId: { in: allStudentIds },
          occurredAt: { gte: trendWindowStart },
        },
        select: {
          userId: true,
          correct: true,
          instructionalTimeMs: true,
          occurredAt: true,
          skill: { select: { subjectId: true } },
        },
      })
    : [];

  const subjectMap = new Map((await prisma.subject.findMany({ select: { id: true, slug: true } })).map((s) => [s.slug, s.id]));

  return {
    teacherProfile,
    recentSessions,
    events,
    questionAttempts,
    subjectMap,
    since,
    allStudentIds,
  };
}
