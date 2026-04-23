import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { emitEvent } from '@/features/telemetry/eventService';
import { scheduleNextReview } from '@/features/mastery/masteryService';
import Link from 'next/link';
import { LearningPageShell } from '@/components/LearningPageShell';
import { StudentFlowHero } from '@/components/student/StudentFlowHero';

interface Props {
  params: Promise<{ subjectSlug: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function DiagnosticCompletePage({ params, searchParams }: Props) {
  const { subjectSlug } = await params;
  const { sessionId } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userId = (session.user as { id: string }).id;

  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) notFound();

  const diagSession = sessionId
    ? await prisma.diagnosticSession.findUnique({ where: { id: sessionId } })
    : await prisma.diagnosticSession.findFirst({
        where: { userId, subjectId: subject.id, status: 'IN_PROGRESS' },
      });

  if (!diagSession || diagSession.userId !== userId) {
    redirect(`/learn/${subjectSlug}`);
  }

  if (diagSession.status === 'IN_PROGRESS') {
    await prisma.diagnosticSession.update({
      where: { id: diagSession.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    const payload = diagSession.payload as {
      estimates: Record<string, { skillCode: string; strand: string; correct: number; total: number; masteryEstimate: number }>;
      strandCounts: Record<string, number>;
    };
    const now = new Date();

    for (const [skillCode, est] of Object.entries(payload.estimates ?? {})) {
      const skill = await prisma.skill.findUnique({
        where: { subjectId_code: { subjectId: subject.id, code: skillCode } },
      });
      if (!skill) continue;

      const mastery = est.masteryEstimate;
      const nextReviewAt = scheduleNextReview(mastery, 0, now);

      await prisma.skillMastery.upsert({
        where: { userId_skillId: { userId, skillId: skill.id } },
        update: { mastery, nextReviewAt, lastPracticedAt: now },
        create: {
          userId,
          skillId: skill.id,
          mastery,
          confirmedCount: 0,
          nextReviewAt,
          lastPracticedAt: now,
        },
      });
    }

    await emitEvent({
      name: 'diagnostic_completed',
      actorUserId: userId,
      studentUserId: userId,
      subjectId: subject.id,
      payload: {
        sessionId: diagSession.id,
        subjectSlug,
        itemsSeen: diagSession.itemsSeen,
      },
    });
  }

  return (
    <LearningPageShell
      appChrome="student"
      title="You're ready to start"
      subtitle={`${subject.title} · diagnostic complete.`}
      maxWidthClassName="max-w-2xl"
      hero={(
        <StudentFlowHero
          eyebrow="Nice work"
          title="Your path is set"
          lead={`You answered ${diagSession.itemsSeen} question${diagSession.itemsSeen !== 1 ? 's' : ''}. We have a good place to begin your practice.`}
        />
      )}
    >
      <div className="anx-card space-y-6 p-6 text-center sm:p-8">
        <div className="anx-callout-info text-left">
          <p className="font-semibold text-[color:var(--anx-text)]">What happens next</p>
          <p className="mt-1 text-sm leading-relaxed">
            Your first skill is ready. We will guide you question by question — same calm layout as your dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/learn/${subjectSlug}`}
            className="anx-btn-primary px-8 py-3.5 text-center"
          >
            Start my next skill
          </Link>
          <Link
            href="/dashboard"
            className="anx-btn-secondary px-6 py-3.5 text-center"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </LearningPageShell>
  );
}
