import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

export async function GET() {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const now = new Date();
  const subjects = await prisma.subject.findMany({
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      slug: true,
      skills: {
        select: {
          id: true,
          masteries: {
            where: { userId: user.id },
            select: { mastery: true },
          },
          knowledgeSkillReviews: {
            where: { userId: user.id, completedAt: null, scheduledFor: { lte: now } },
            select: { id: true },
          },
        },
      },
      diagnosticSessions: {
        where: { userId: user.id, status: 'COMPLETED' },
        select: { id: true },
        take: 1,
      },
      baselineSessions: {
        where: { userId: user.id, status: 'COMPLETED' },
        select: { id: true },
        take: 1,
      },
    },
  });

  const items = subjects.map((subject) => {
    const masteryRows = subject.skills.flatMap((skill) => skill.masteries);
    const averageMastery =
      masteryRows.length === 0
        ? 0
        : masteryRows.reduce((sum, row) => sum + row.mastery, 0) / masteryRows.length;
    const dueNowCount = subject.skills.reduce((sum, skill) => sum + skill.knowledgeSkillReviews.length, 0);
    const onboardingComplete = subject.diagnosticSessions.length > 0 || subject.baselineSessions.length > 0;

    return {
      id: subject.id,
      title: subject.title,
      slug: subject.slug,
      href: onboardingComplete ? `/learn/${subject.slug}` : `/baseline/${subject.slug}`,
      averageMastery: Math.round(averageMastery * 100),
      dueNowCount,
      onboardingComplete,
    };
  });

  return NextResponse.json({ subjects: items });
}
