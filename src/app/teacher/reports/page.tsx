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
      titleClassName="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl"
      subtitle="Understand the impact of your teaching and drive durable learning."
      subtitleClassName="max-w-2xl text-sm text-muted sm:text-base"
      meta={
        <p className="m-0 text-xs text-muted">
          Figures reflect your selected cohort and reporting period. Demo preview — live sync coming soon.
        </p>
      }
      appChrome="teacher"
      appChromeShowLeadershipNav={showLeadership}
      maxWidthClassName="max-w-[min(100%,1600px)]"
      innerClassName="sm:px-8 lg:px-10"
      contentWrapperClassName="anx-reports-page -mx-4 rounded-2xl bg-[var(--report-canvas)] px-4 py-6 sm:-mx-6 sm:px-6 sm:py-8 lg:-mx-10 lg:px-10"
      actions={<TeacherReportsHeaderActions />}
    >
      <TeacherReportsDashboard />
    </LearningPageShell>
  );
}
