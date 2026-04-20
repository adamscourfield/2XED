import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { hasCompletedOnboardingDiagnostic } from '@/features/learn/onboarding';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;
  const now = new Date();

  const subjects = await prisma.subject.findMany({
    orderBy: { title: 'asc' },
    include: {
      skills: {
        include: {
          masteries: { where: { userId } },
        },
      },
    },
  });

  const subjectsPayload = [];
  for (const subject of subjects) {
    const onboardingComplete = await hasCompletedOnboardingDiagnostic(userId, subject.id);
    const dueSkills = subject.skills.filter((skill) => {
      const mastery = skill.masteries[0];
      if (!mastery) return true;
      if (!mastery.nextReviewAt) return true;
      return mastery.nextReviewAt <= now;
    });
    const averageMastery = subject.skills.length
      ? Math.round(
          (subject.skills.reduce(
            (sum, skill) => sum + (skill.masteries[0]?.mastery ?? 0),
            0
          ) /
            subject.skills.length) *
            100
        )
      : 0;

    subjectsPayload.push({
      id: subject.id,
      title: subject.title,
      slug: subject.slug,
      href: onboardingComplete ? `/learn/${subject.slug}` : `/diagnostic/${subject.slug}`,
      averageMastery,
      dueNowCount: dueSkills.length,
      onboardingComplete,
    });
  }

  return NextResponse.json({ subjects: subjectsPayload });
}
