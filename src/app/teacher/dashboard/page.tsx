import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { LearningPageShell } from '@/components/LearningPageShell';
import { loadTeacherDashboardData } from '@/app/teacher/dashboard/teacherDashboardData';
import { TeacherHomeDashboard } from '@/app/teacher/dashboard/TeacherHomeDashboard';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const data = await loadTeacherDashboardData(user.id, 30);

  if (!data.teacherProfile) {
    return (
      <LearningPageShell
        title="Teacher Dashboard"
        subtitle={`Observe-linked analytics for ${user.name ?? user.email}`}
        appChrome="teacher"
        appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No teacher profile linked yet. Add a TeacherProfile row mapped to your Observe teacher id.
        </div>
      </LearningPageShell>
    );
  }

  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);

  return (
    <LearningPageShell
      title="Home"
      subtitle="Teacher workspace"
      maxWidthClassName="max-w-6xl"
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      hideHeader
      childrenClassName="td-home-page-canvas"
    >
      <TeacherHomeDashboard data={data} displayName={displayName} greeting={greeting} userRole={user.role ?? 'TEACHER'} />
    </LearningPageShell>
  );
}
