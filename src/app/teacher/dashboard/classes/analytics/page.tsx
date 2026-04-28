import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LearningPageShell } from '@/components/LearningPageShell';
import { loadTeacherDashboardData, parseDays } from '@/app/teacher/dashboard/teacherDashboardData';
import { TeacherDashboardClassesView } from '@/app/teacher/dashboard/TeacherDashboardClassesView';

interface Props {
  searchParams?: Promise<{ days?: string; subtopic?: string }>;
}

export default async function TeacherClassAnalyticsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const days = parseDays(params.days);
  const subtopicFilter = params.subtopic?.trim() ?? '';

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const data = await loadTeacherDashboardData(user.id, days);

  if (!data.teacherProfile) {
    return (
      <LearningPageShell title="Class analytics" subtitle="Observe-linked metrics" appChrome="teacher">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No teacher profile linked yet. Add a TeacherProfile row mapped to your Observe teacher id.
        </div>
      </LearningPageShell>
    );
  }

  const tp = data.teacherProfile;

  return (
    <LearningPageShell
      title="Class analytics"
      subtitle={`Per-class metrics and student grid — last ${days} days.`}
      maxWidthClassName="max-w-6xl"
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      actions={
        <Link href="/teacher/dashboard/classes" className="anx-btn-secondary text-sm no-underline">
          ← Classes hub
        </Link>
      }
    >
      <TeacherDashboardClassesView
        data={data}
        days={days}
        subtopicFilter={subtopicFilter}
        teacherProfile={tp}
        externalTeacherId={tp.externalTeacherId}
        externalSchoolId={tp.externalSchoolId ?? null}
        compactLayout
      />
    </LearningPageShell>
  );
}
