import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { SeatingPlanClient } from '@/components/teacher/seating/SeatingPlanClient';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SeatingPlanPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user) redirect('/login');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') {
    redirect('/dashboard');
  }

  const { sessionId } = await params;
  const live = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, classroomId: true, teacherUserId: true, classroom: { select: { name: true } } },
  });

  if (!live) redirect('/teacher/live');
  if (live.teacherUserId !== user.id && user.role === 'TEACHER') redirect('/teacher/live');

  return (
    <LearningPageShell
      appChrome="teacher"
      title="Seating plan"
      subtitle={`Arrange ${live.classroom.name}, then watch seats colour by lane during the lesson.`}
      maxWidthClassName="max-w-5xl"
    >
      <SeatingPlanClient sessionId={live.id} classroomId={live.classroomId} />
    </LearningPageShell>
  );
}
