import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { TeacherFlowHero } from '@/components/teacher/TeacherFlowHero';
import { NewLiveSessionForm } from './NewLiveSessionForm';

export default async function TeacherLiveNewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER') redirect('/dashboard');

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: {
      classrooms: {
        include: {
          classroom: {
            select: { id: true, name: true, yearGroup: true },
          },
        },
      },
    },
  });

  const classrooms = teacherProfile?.classrooms.map((tc) => tc.classroom) ?? [];

  const subjects = await prisma.subject.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { title: 'asc' },
  });

  const skillsBySubject = await prisma.skill.findMany({
    where: { subjectId: { in: subjects.map((s) => s.id) } },
    select: { id: true, code: true, name: true, strand: true, subjectId: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <LearningPageShell
      appChrome="teacher"
      title="Live lesson"
      subtitle="Set your class, subject, and skills — then arrange phases before students join."
      maxWidthClassName="max-w-2xl"
      hero={(
        <TeacherFlowHero
          titleId="teacher-live-new-hero-title"
          eyebrow="Teaching workspace"
          title="Launch a live session"
          lead="Students join with a six-letter code. You control the flow from the conductor when you are ready."
        />
      )}
    >
      <div className="mx-auto w-full max-w-2xl">
        <NewLiveSessionForm
          classrooms={classrooms}
          subjects={subjects}
          skillsBySubject={skillsBySubject}
        />
      </div>
    </LearningPageShell>
  );
}
