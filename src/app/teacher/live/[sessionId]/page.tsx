import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { TeacherLiveWorkspace } from '@/components/teacher/workspace/TeacherLiveWorkspace';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function TeacherLiveSessionPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER') redirect('/dashboard');

  const { sessionId } = await params;

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherUserId: true },
  });

  if (!liveSession || liveSession.teacherUserId !== user.id) redirect('/teacher/dashboard');

  // Live workspace runs full-bleed (no AppChrome) so the teacher sees a calm,
  // canvas-first teaching surface instead of an admin dashboard shell.
  return (
    <main className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
      <TeacherLiveWorkspace sessionId={sessionId} />
    </main>
  );
}
