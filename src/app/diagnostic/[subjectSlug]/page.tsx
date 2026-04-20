import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';

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
    <main className="anx-shell anx-scene flex items-center justify-center">
      <div className="anx-panel w-full max-w-lg p-8 space-y-6">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--anx-primary)' }}>{subject.title}</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--anx-text)' }}>Let&apos;s find where to start</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            This short quiz helps us find the right place for you. Just try each question.
          </p>
        </div>
        <div className="anx-callout-info">
          <p className="font-semibold">What to expect</p>
          <ul className="mt-2 space-y-1 list-disc list-inside opacity-90">
            <li>Usually 12 to 25 questions</li>
            <li>It checks a few different maths skills</li>
            <li>It may finish early if we already know enough</li>
          </ul>
        </div>
        {sessionData && (
          <div className="anx-callout-warning">
            You have an in-progress diagnostic ({sessionData.itemsSeen} questions answered).
          </div>
        )}
        <div className="flex gap-3">
          <Link
            href={`/diagnostic/${subjectSlug}/run`}
            className="anx-btn-primary flex-1 py-3 text-center"
          >
            {sessionData ? 'Resume quiz' : 'Start quiz'}
          </Link>
          <Link
            href="/dashboard"
            className="anx-btn-secondary px-4 py-3 text-center"
          >
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
