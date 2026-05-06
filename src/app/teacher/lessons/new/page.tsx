import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { NewLessonForm } from '@/app/teacher/lessons/new/NewLessonForm';

export default async function NewLessonPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const subjects = await prisma.subject.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { title: 'asc' },
  });

  return (
    <LearningPageShell
      title="New lesson"
      subtitle="Give your lesson a title and topic to get started."
      appChrome="teacher"
      maxWidthClassName="max-w-xl"
    >
      <NewLessonForm subjects={subjects} />
    </LearningPageShell>
  );
}
