import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { AppChrome } from '@/components/AppChrome';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { LearnSession } from '@/features/learn/LearnSession';

export default async function LearnSubjectPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role && user.role !== 'STUDENT') redirect('/dashboard');

  const { subjectSlug } = await params;
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: {
      id: true,
      title: true,
      slug: true,
      baselineSessions: {
        where: { userId: user.id, status: 'COMPLETED' },
        select: { id: true },
        take: 1,
      },
      diagnosticSessions: {
        where: { userId: user.id, status: 'COMPLETED' },
        select: { id: true },
        take: 1,
      },
      skills: {
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          strand: true,
          intro: true,
          description: true,
          masteries: {
            where: { userId: user.id },
            select: { mastery: true, nextReviewAt: true },
          },
          items: {
            take: 5,
            select: {
              item: {
                select: { id: true, question: true, options: true, answer: true, type: true },
              },
            },
          },
          explanationRoutes: {
            where: { isActive: true },
            orderBy: { defaultPriorityRank: 'asc' },
            take: 1,
            select: {
              id: true,
              routeType: true,
              misconceptionSummary: true,
              workedExample: true,
              animationSchema: true,
            },
          },
        },
      },
    },
  });

  if (!subject) redirect('/dashboard');
  const onboardingComplete = subject.baselineSessions.length > 0 || subject.diagnosticSessions.length > 0;
  if (!onboardingComplete) redirect(`/baseline/${subject.slug}`);

  const skill = subject.skills
    .filter((candidate) => candidate.items.length > 0)
    .sort((a, b) => {
      const aMastery = a.masteries[0]?.mastery ?? 0;
      const bMastery = b.masteries[0]?.mastery ?? 0;
      if (aMastery !== bMastery) return aMastery - bMastery;
      return a.code.localeCompare(b.code);
    })[0];

  if (!skill) {
    return (
      <AppChrome variant="student">
        <main className="anx-shell anx-scene flex items-center justify-center">
          <div className="anx-panel max-w-md p-8">
            <h1 className="text-2xl font-bold text-[color:var(--anx-text)]">{subject.title}</h1>
            <p className="mt-2 text-sm text-[color:var(--anx-text-secondary)]">
              This subject does not have practice questions yet.
            </p>
          </div>
        </main>
      </AppChrome>
    );
  }

  const route = skill.explanationRoutes[0];

  return (
    <AppChrome variant="student">
      <LearnSession
        subject={{ id: subject.id, title: subject.title, slug: subject.slug }}
        skill={{
          id: skill.id,
          code: skill.code,
          name: skill.name,
          strand: skill.strand,
          intro: skill.intro,
          description: skill.description,
        }}
        items={skill.items.map((itemSkill) => itemSkill.item)}
        userId={user.id}
        explanationRoute={
          route
            ? {
                id: route.id,
                routeType: route.routeType === 'B' || route.routeType === 'C' ? route.routeType : 'A',
                misconceptionSummary: route.misconceptionSummary,
                workedExample: route.workedExample,
                animationSchema: route.animationSchema as null,
              }
            : null
        }
      />
    </AppChrome>
  );
}
