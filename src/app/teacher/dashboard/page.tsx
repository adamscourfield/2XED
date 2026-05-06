import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { LearningPageShell } from '@/components/LearningPageShell';
import { loadTeacherHomeData } from '@/app/teacher/dashboard/teacherDashboardData';
import { TeacherHomeDashboard } from '@/app/teacher/dashboard/TeacherHomeDashboard';

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const data = await loadTeacherHomeData(user.id);

  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <LearningPageShell
      title="Home"
      subtitle="Teacher workspace"
      maxWidthClassName="max-w-5xl"
      appChrome="teacher"
      hideHeader
    >
      <TeacherHomeDashboard
        data={data}
        displayName={displayName}
        greeting={greeting}
      />
    </LearningPageShell>
  );
}
