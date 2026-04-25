import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';
import { TeacherReportsDashboard, TeacherReportsHeaderActions } from './TeacherReportsClient';

export default async function TeacherReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { role?: string };
  const role = user.role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') redirect('/dashboard');
  const showLeadership = role === 'ADMIN' || role === 'LEADERSHIP';

  return (
    <LearningPageShell
      title="Reports"
      subtitle="Understand the impact of your teaching and drive durable learning."
      appChrome="teacher"
      appChromeShowLeadershipNav={showLeadership}
      maxWidthClassName="max-w-7xl"
      actions={<TeacherReportsHeaderActions />}
    >
      <TeacherReportsDashboard />
    </LearningPageShell>
  );
}
