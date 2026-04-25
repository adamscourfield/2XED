import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';

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
      subtitle="Analytics and school-wide views"
      appChrome="teacher"
      appChromeShowLeadershipNav={showLeadership}
    >
      <div className="anx-card max-w-xl space-y-4 p-6 text-sm text-[color:var(--anx-text-secondary)]">
        <p className="m-0">Open detailed class analytics with mastery, checkpoints, and student risk signals.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/teacher/dashboard/classes" className="anx-btn-primary text-sm no-underline">
            Class analytics
          </Link>
          {showLeadership ? (
            <Link href="/teacher/leadership" className="anx-btn-secondary text-sm no-underline">
              School overview
            </Link>
          ) : null}
        </div>
      </div>
    </LearningPageShell>
  );
}
