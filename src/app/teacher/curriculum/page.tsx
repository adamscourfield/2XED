import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { CurriculumPlanner } from './CurriculumPlanner';
import type { CurriculumPlanSummary } from '@/app/api/curriculum-plans/route';

export default async function CurriculumPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const subjects = await prisma.subject.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { title: 'asc' },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planModel = (prisma as any).curriculumPlan;
  const plans: CurriculumPlanSummary[] = planModel
    ? await planModel
        .findMany({
          where: { teacherUserId: user.id },
          include: {
            subject: { select: { title: true } },
            units: { select: { id: true, _count: { select: { lessons: true } } } },
          },
          orderBy: { updatedAt: 'desc' },
        })
        .then(
          (
            rows: Array<{
              id: string;
              title: string;
              subjectId: string;
              academicYear: string | null;
              termLabel: string | null;
              createdAt: Date;
              updatedAt: Date;
              subject: { title: string };
              units: Array<{ id: string; _count: { lessons: number } }>;
            }>,
          ) =>
            rows.map((p) => ({
              id: p.id,
              title: p.title,
              subjectId: p.subjectId,
              subjectTitle: p.subject.title,
              academicYear: p.academicYear,
              termLabel: p.termLabel,
              unitCount: p.units.length,
              lessonCount: p.units.reduce((sum, u) => sum + u._count.lessons, 0),
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            })),
        )
    : [];

  return (
    <LearningPageShell appChrome="teacher" hideHeader maxWidthClassName="max-w-3xl">
      <CurriculumPlanner plans={plans} subjects={subjects} />
    </LearningPageShell>
  );
}
