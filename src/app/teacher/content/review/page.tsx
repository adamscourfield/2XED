import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/features/auth/authOptions';
import { LearningPageShell } from '@/components/LearningPageShell';
import { BookletReviewClient } from '@/components/english/BookletReviewClient';
import { prisma } from '@/db/prisma';

export default async function TeacherContentReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'LEADERSHIP') redirect('/dashboard');

  const skills = await prisma.skill.findMany({
    select: { id: true, code: true, name: true },
    orderBy: [{ subjectId: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
  });

  return (
    <LearningPageShell
      title="Content Review"
      subtitle="Review extracted booklet blocks before publishing them to student learning."
      appChrome="teacher"
      appChromeShowLeadershipNav={role === 'ADMIN' || role === 'LEADERSHIP'}
      maxWidthClassName="max-w-5xl"
    >
      <BookletReviewClient blocks={[]} skills={skills} alreadyAccepted={[]} />
      <p className="mt-4 text-sm text-[color:var(--anx-text-secondary)]">
        No staged booklet import is attached to this workspace yet.
      </p>
    </LearningPageShell>
  );
}
