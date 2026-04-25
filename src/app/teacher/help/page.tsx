import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';

export default async function TeacherHelpPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') redirect('/dashboard');

  return (
    <LearningPageShell title="Help centre" subtitle="Guidance for teachers" appChrome="teacher" appChromeShowLeadershipNav={role === 'ADMIN' || role === 'LEADERSHIP'}>
      <div className="anx-card max-w-xl p-6 text-sm text-[color:var(--anx-text-secondary)]">
        <p className="m-0">
          Documentation and walkthroughs will appear here. For now, use the timetable and class analytics pages from the sidebar, or contact your school admin if Observe linking needs updating.
        </p>
      </div>
    </LearningPageShell>
  );
}
