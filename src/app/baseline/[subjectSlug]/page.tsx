import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { AppChrome } from '@/components/AppChrome';
import { authOptions } from '@/features/auth/authOptions';
import { BaselineRunClient } from '@/features/baseline/BaselineRunClient';
import { prisma } from '@/db/prisma';

export default async function BaselinePage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { role?: string };
  if (user.role && user.role !== 'STUDENT') redirect('/dashboard');

  const { subjectSlug } = await params;
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: {
      id: true,
      baselineSessions: {
        where: { userId: (session.user as { id: string }).id, status: 'COMPLETED' },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!subject) redirect('/dashboard');
  if (subject.baselineSessions.length > 0) redirect(`/learn/${subjectSlug}`);

  return (
    <AppChrome variant="student">
      <BaselineRunClient subjectSlug={subjectSlug} />
    </AppChrome>
  );
}
