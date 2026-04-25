import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';

export default async function TeacherSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') redirect('/dashboard');

  return (
    <LearningPageShell title="Settings" subtitle="Account and preferences" appChrome="teacher" appChromeShowLeadershipNav={role === 'ADMIN' || role === 'LEADERSHIP'}>
      <div className="anx-card max-w-xl p-6 text-sm text-[color:var(--anx-text-secondary)]">
        <p className="m-0">Teacher-specific settings will be added here. Sign out from the sidebar when you are done on a shared device.</p>
      </div>
    </LearningPageShell>
  );
}
