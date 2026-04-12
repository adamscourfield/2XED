import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { QuestionListClient } from './QuestionListClient';

export default async function AdminQuestionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { role?: string };
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [total, byType, skills] = await Promise.all([
    prisma.item.count({ where: { subjectId: { not: null } } }),
    prisma.item.groupBy({
      by: ['type'],
      where: { subjectId: { not: null } },
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
    }),
    prisma.skill.findMany({
      select: { id: true, code: true, name: true, strand: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  const typeBreakdown = byType.map((b) => ({ type: b.type, count: b._count.type }));

  return (
    <main className="anx-shell" style={{ background: 'var(--anx-surface-bright)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <Link
              href="/admin"
              className="text-xs"
              style={{ color: 'var(--anx-text-muted)' }}
            >
              ← Admin
            </Link>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--anx-text)' }}>
              Question Bank
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--anx-text-secondary)' }}>
              Author, search and manage all questions in the database.
            </p>
          </div>
          <Link
            href="/admin/questions/new"
            className="anx-btn-primary px-5 py-2.5 text-sm"
          >
            + New question
          </Link>
        </div>

        {/* Stats bar */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(typeBreakdown.length + 1, 6)}, minmax(0, 1fr))` }}
        >
          <div className="rounded-xl p-4" style={{ background: 'var(--anx-surface-container-lowest)', border: '1px solid var(--anx-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Total</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--anx-text)' }}>{total.toLocaleString()}</p>
          </div>
          {typeBreakdown.map((b) => (
            <div key={b.type} className="rounded-xl p-4" style={{ background: 'var(--anx-surface-container-lowest)', border: '1px solid var(--anx-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>{b.type}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--anx-text)' }}>{b.count.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Interactive list */}
        <QuestionListClient skills={skills} />
      </div>
    </main>
  );
}
