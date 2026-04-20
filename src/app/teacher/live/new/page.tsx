import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
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
    <main className="anx-shell anx-scene min-h-screen py-10">
      <div className="mx-auto w-full max-w-lg px-4">
      <h1 className="mb-6 text-2xl font-bold text-white drop-shadow-sm">Launch Live Session</h1>
      <NewLiveSessionForm
        classrooms={classrooms}
        subjects={subjects}
        skillsBySubject={skillsBySubject}
      />
      </div>
    </main>
  );
}
