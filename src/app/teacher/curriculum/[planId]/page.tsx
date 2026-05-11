import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { LearningPageShell } from '@/components/LearningPageShell';
import { PlanDetail } from './PlanDetail';
import type { CurriculumPlanDetail } from '@/app/api/curriculum-plans/[planId]/route';

interface Props {
  params: Promise<{ planId: string }>;
}

export default async function CurriculumPlanPage({ params }: Props) {
  const { planId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planModel = (prisma as any).curriculumPlan;
  if (!planModel) notFound();

  const raw = await planModel.findUnique({
    where: { id: planId },
    include: {
      subject: { select: { id: true, title: true } },
      units: {
        orderBy: { sortOrder: 'asc' },
        include: {
          skills: { include: { skill: { select: { code: true, name: true } } } },
          lessons: {
            select: { id: true, title: true, topic: true, isPublished: true },
            orderBy: { updatedAt: 'desc' },
          },
        },
      },
    },
  });

  if (!raw || raw.teacherUserId !== user.id) notFound();

  const plan: CurriculumPlanDetail = {
    id: raw.id,
    title: raw.title,
    subjectId: raw.subject.id,
    subjectTitle: raw.subject.title,
    academicYear: raw.academicYear,
    termLabel: raw.termLabel,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    units: raw.units.map((u: {
      id: string;
      title: string;
      aims: string | null;
      successMeasures: string | null;
      dateStart: Date | null;
      dateEnd: Date | null;
      sortOrder: number;
      skills: Array<{ skillId: string; skill: { code: string; name: string } }>;
      lessons: Array<{ id: string; title: string; topic: string; isPublished: boolean }>;
    }) => ({
      id: u.id,
      title: u.title,
      aims: u.aims,
      successMeasures: u.successMeasures,
      dateStart: u.dateStart?.toISOString() ?? null,
      dateEnd: u.dateEnd?.toISOString() ?? null,
      sortOrder: u.sortOrder,
      skills: u.skills.map((s) => ({ skillId: s.skillId, skillCode: s.skill.code, skillName: s.skill.name })),
      lessons: u.lessons,
    })),
  };

  // Load skills for this subject so teacher can tag them to units
  const skills = await prisma.skill.findMany({
    where: { subjectId: raw.subject.id },
    select: { id: true, code: true, name: true },
    orderBy: [{ strand: 'asc' }, { sortOrder: 'asc' }],
  });

  return (
    <LearningPageShell
      title={plan.title}
      subtitle={`${plan.subjectTitle}${plan.academicYear ? ` · ${plan.academicYear}` : ''}${plan.termLabel ? ` · ${plan.termLabel}` : ''}`}
      appChrome="teacher"
    >
      <PlanDetail plan={plan} availableSkills={skills} subjectId={raw.subject.id} />
    </LearningPageShell>
  );
}
