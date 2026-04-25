import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';

export default async function TeacherResourcesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') redirect('/dashboard');

  return (
    <LearningPageShell title="Resources" subtitle="Teaching materials and references" appChrome="teacher" appChromeShowLeadershipNav={role === 'ADMIN' || role === 'LEADERSHIP'}>
      <div className="anx-card max-w-xl space-y-4 p-6 text-sm text-[color:var(--anx-text-secondary)]">
        <p className="m-0">Curated resource packs will be listed here. You can still open the English booklet review flow or your class timetable from the links below.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/teacher/content/review" className="anx-btn-secondary text-sm no-underline">
            Content review
          </Link>
          <Link href="/teacher/timetable" className="anx-btn-secondary text-sm no-underline">
            Timetable
          </Link>
        </div>
      </div>
    </LearningPageShell>
  );
}
