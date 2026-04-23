import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { AdminPageFrame } from '@/components/admin/AdminPageFrame';
import { QuestionFormClient } from '../QuestionFormClient';

export default async function NewQuestionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const allSkills = await prisma.skill.findMany({
    select: { id: true, code: true, name: true, strand: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <AdminPageFrame
      maxWidthClassName="max-w-3xl"
      title="New question"
      subtitle="This question will be saved directly to the database."
      backHref="/admin/questions"
      backLabel="← Question bank"
    >
      <div className="anx-card rounded-2xl p-6 sm:p-8">
        <QuestionFormClient mode="create" allSkills={allSkills} />
      </div>
    </AdminPageFrame>
  );
}
