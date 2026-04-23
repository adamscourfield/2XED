import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { LearningPageShell } from '@/components/LearningPageShell';
import { StudentFlowHero } from '@/components/student/StudentFlowHero';

interface Props {
  params: Promise<{ subjectSlug: string }>;
}

export default async function DiagnosticIntroPage({ params }: Props) {
  const { subjectSlug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userId = (session.user as { id: string }).id;

  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) notFound();

  const existing = await prisma.diagnosticSession.findFirst({
    where: { userId, subjectId: subject.id, status: 'IN_PROGRESS' },
  });

  const sessionData = existing ?? null;

  return (
    <LearningPageShell
      appChrome="student"
      title="Find your starting level"
      subtitle={`${subject.title} · a short, friendly check-in before practice.`}
      maxWidthClassName="max-w-2xl"
      hero={(
        <StudentFlowHero
          eyebrow="Diagnostic"
          title="Let's find where to start"
          lead="Answer honestly — there is no pass or fail. We use this to place you on the right path."
        />
      )}
    >
      <div className="anx-card space-y-6 p-6 sm:p-8">
        <div className="anx-callout-info">
          <p className="font-semibold text-[color:var(--anx-text)]">What to expect</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed opacity-95">
            <li>Usually 12 to 25 questions</li>
            <li>Mix of skills so we see the big picture</li>
            <li>May finish early once we are confident</li>
          </ul>
        </div>
        {sessionData ? (
          <div className="anx-callout-warning">
            <p className="font-semibold">Pick up where you left off</p>
            <p className="mt-1 text-sm">
              You have an in-progress diagnostic ({sessionData.itemsSeen} question{sessionData.itemsSeen !== 1 ? 's' : ''} answered so far).
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/diagnostic/${subjectSlug}/run`}
            className="anx-btn-primary flex-1 py-3.5 text-center"
          >
            {sessionData ? 'Resume quiz' : 'Start quiz'}
          </Link>
          <Link
            href="/dashboard"
            className="anx-btn-secondary px-4 py-3.5 text-center sm:shrink-0"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </LearningPageShell>
  );
}
