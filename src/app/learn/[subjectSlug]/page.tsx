import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LearnSession } from '@/features/learn/LearnSession';
import { hasCompletedOnboardingDiagnostic } from '@/features/learn/onboarding';
import { selectNextSkill } from '@/features/learn/nextSkill';
import { getUserGamificationSummary } from '@/features/gamification/gamificationService';
import { selectExplanationRoute } from '@/features/diagnostic/routeAssignment';
import { StudentFocusedChrome } from '@/components/student/StudentFocusedChrome';

const QUESTIONS_PER_SESSION = 3;

interface Props {
  params: Promise<{ subjectSlug: string }>;
}

export default async function LearnPage({ params }: Props) {
  const { subjectSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userId = (session.user as { id: string }).id;

  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    include: {
      skills: {
        orderBy: { sortOrder: 'asc' },
        include: {
          prerequisites: true,
        },
      },
    },
  });

  if (!subject) redirect('/dashboard');
  const onboardingComplete = await hasCompletedOnboardingDiagnostic(userId, subject.id);
  if (!onboardingComplete) redirect(`/diagnostic/${subjectSlug}`);

  const skillIds = subject.skills.map((s) => s.id);

  const masteries = await prisma.skillMastery.findMany({
    where: { userId, skillId: { in: skillIds } },
  });

  const targetSkill = selectNextSkill(subject.skills, masteries, new Date());

  if (!targetSkill) redirect('/dashboard');

  const itemSkills = await prisma.itemSkill.findMany({
    where: { skillId: targetSkill.id },
    include: {
      item: {
        include: {
          attempts: {
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  const orderedItems = itemSkills
    .map((record) => record.item)
    .sort((a, b) => {
      const aAttempt = a.attempts[0]?.createdAt?.getTime() ?? 0;
      const bAttempt = b.attempts[0]?.createdAt?.getTime() ?? 0;
      if (a.attempts.length === 0 && b.attempts.length > 0) return -1;
      if (b.attempts.length === 0 && a.attempts.length > 0) return 1;
      return aAttempt - bAttempt;
    });

  const items = orderedItems
    .slice(0, QUESTIONS_PER_SESSION)
    .map(({ attempts, ...item }) => item);

  const retryItems = orderedItems
    .slice(QUESTIONS_PER_SESSION, QUESTIONS_PER_SESSION * 2)
    .map(({ attempts, ...item }) => item);

  const recentAttempts = await prisma.attempt.findMany({
    where: { userId, item: { skills: { some: { skillId: targetSkill.id } } } },
    orderBy: { createdAt: 'desc' },
    take: QUESTIONS_PER_SESSION * 2,
    select: { correct: true, createdAt: true },
  });

  const previousSessionAttempts = recentAttempts.slice(0, QUESTIONS_PER_SESSION);
  const previousSessionCorrect = previousSessionAttempts.filter((attempt) => attempt.correct).length;
  const hadRecentRepeatFailure =
    previousSessionAttempts.length === QUESTIONS_PER_SESSION && previousSessionCorrect <= 1;

  const gamification = await getUserGamificationSummary(userId);

  const routeSelection = await selectExplanationRoute(userId, subject.id, targetSkill.id, targetSkill.code);
  const explanationRoute = await prisma.explanationRoute.findUnique({
    where: {
      skillId_routeType: {
        skillId: targetSkill.id,
        routeType: routeSelection.routeType,
      },
    },
    select: {
      id: true,
      routeType: true,
      misconceptionSummary: true,
      workedExample: true,
      animationSchema: true,
    },
  });

  return (
    <StudentFocusedChrome contextLabel={`${subject.title} · ${targetSkill.name}`}>
      <LearnSession
        subject={subject}
        skill={targetSkill}
        items={items}
        userId={userId}
        gamification={gamification}
        retryItems={retryItems}
        hadRecentRepeatFailure={hadRecentRepeatFailure}
        explanationRoute={
          explanationRoute
            ? {
                ...explanationRoute,
                routeType: explanationRoute.routeType as 'A' | 'B' | 'C',
                animationSchema: explanationRoute.animationSchema as {
                  schemaVersion: string;
                  skillCode: string;
                  skillName: string;
                  routeType: string;
                  routeLabel: string;
                  misconceptionSummary: string;
                  generatedAt: string;
                  steps: Array<{
                    stepIndex: number;
                    id: string;
                    visuals: unknown[];
                    narration: string;
                    audioFile: string | null;
                  }>;
                  misconceptionStrip: {
                    text: string;
                    audioNarration: string;
                  };
                  loopable: boolean;
                  pauseAtEndMs: number;
                } | null,
              }
            : null
        }
      />
    </StudentFocusedChrome>
  );
}
