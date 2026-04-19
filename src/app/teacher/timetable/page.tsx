import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { LearningPageShell } from '@/components/LearningPageShell';
import { TeacherTimetablePage } from '@/components/teacher/TeacherTimetablePage';

export default async function TeacherTimetableRoute() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') {
    redirect('/dashboard');
  }

  return (
    <LearningPageShell
      title="Class timetables"
      subtitle={`Recurring lesson slots for ${user.name ?? user.email}`}
      maxWidthClassName="max-w-4xl"
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
    >
      <TeacherTimetablePage />
    </LearningPageShell>
  );
}
