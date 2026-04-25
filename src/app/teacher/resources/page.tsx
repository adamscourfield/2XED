import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';
import { TeacherResourcesClient } from '@/app/teacher/resources/TeacherResourcesClient';

export default async function TeacherResourcesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') redirect('/dashboard');

  return (
    <LearningPageShell
      title=""
      subtitle=""
      appChrome="teacher"
      appChromeShowLeadershipNav={role === 'ADMIN' || role === 'LEADERSHIP'}
      hideHeader
      maxWidthClassName="max-w-6xl"
    >
      <TeacherResourcesClient />
    </LearningPageShell>
  );
}
