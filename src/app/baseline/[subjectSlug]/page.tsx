import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { BaselineRunClient } from '@/features/baseline/BaselineRunClient';
import { StudentFocusedChrome } from '@/components/student/StudentFocusedChrome';

interface Props {
  params: Promise<{ subjectSlug: string }>;
}

export default async function BaselinePage({ params }: Props) {
  const { subjectSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string };
  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) notFound();

  const completed = await prisma.baselineSession.findFirst({
    where: { userId: user.id, subjectId: subject.id, status: 'COMPLETED' },
    select: { id: true },
  });

  if (completed) {
    redirect(`/learn/${subjectSlug}`);
  }

  return (
    <StudentFocusedChrome contextLabel={`${subject.title} · Baseline`}>
      <BaselineRunClient subjectSlug={subjectSlug} />
    </StudentFocusedChrome>
  );
}
