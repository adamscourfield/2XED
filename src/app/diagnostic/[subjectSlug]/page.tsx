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

  // Find or create an IN_PROGRESS session
  const existing = await prisma.diagnosticSession.findFirst({
    where: { userId, subjectId: subject.id, status: 'IN_PROGRESS' },
  });

  const sessionData = existing ?? null;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        <div>
          <p className="text-sm text-blue-600 font-medium mb-1">{subject.title}</p>
          <h1 className="text-2xl font-bold text-gray-900">Diagnostic Assessment</h1>
          <p className="text-gray-500 mt-2 text-sm">
            We&apos;ll assess your knowledge across key number strands. The test adapts to your
            performance and stops early when we have enough information.
          </p>
        </div>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Between 12 and 25 questions</li>
          <li>Covers: Place Value, Addition, Multiplication, Factors &amp; FDP</li>
          <li>Stops early if confidence is high</li>
        </ul>
        {sessionData && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You have an in-progress diagnostic ({sessionData.itemsSeen} questions answered).
          </div>
        )}
        <div className="flex gap-3">
          <Link
            href={`/diagnostic/${subjectSlug}/run`}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-center"
          >
            {sessionData ? 'Resume Diagnostic' : 'Start Diagnostic'}
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
