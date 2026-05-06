import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';
import { TeacherResourcesClient } from '@/app/teacher/resources/TeacherResourcesClient';
import { loadTeacherResourcesData } from '@/data/teacherResourcesCatalog';

export default async function TeacherResourcesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const initialResources = await loadTeacherResourcesData({
    teacherUserId: user.id,
    subjectId: null,
  });

  return (
    <LearningPageShell
      title=""
      subtitle=""
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      hideHeader
      maxWidthClassName="max-w-6xl"
    >
      <TeacherResourcesClient initialData={initialResources} />
    </LearningPageShell>
  );
}
