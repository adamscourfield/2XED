import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
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
    <main className="anx-shell" style={{ background: 'var(--anx-surface-bright)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/admin/questions" className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            ← Question Bank
          </Link>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--anx-text)' }}>
            New question
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--anx-text-secondary)' }}>
            This question will be saved directly to the database.
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--anx-surface-container-lowest)', border: '1px solid var(--anx-border)' }}
        >
          <QuestionFormClient
            mode="create"
            allSkills={allSkills}
          />
        </div>
      </div>
    </main>
  );
}
