import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { AdminPageFrame } from '@/components/admin/AdminPageFrame';
import { QuestionListClient } from './QuestionListClient';

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="anx-card rounded-xl p-4">
      <p className="anx-section-label m-0 text-[10px]" style={{ color: 'var(--anx-text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--anx-text)' }}>
        {value.toLocaleString('en-GB')}
      </p>
    </div>
  );
}

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
  const statCount = Math.min(typeBreakdown.length + 1, 7);
  const gridTemplate = { gridTemplateColumns: `repeat(${statCount}, minmax(0, 1fr))` } as const;

  return (
    <AdminPageFrame
      maxWidthClassName="max-w-6xl"
      title="Question bank"
      subtitle="Author, search, and manage all questions linked to subjects in the database."
      actions={(
        <Link href="/admin/questions/new" className="anx-btn-primary px-5 py-2.5 text-sm no-underline">
          + New question
        </Link>
      )}
    >
      <section className="grid gap-3" style={gridTemplate}>
        <StatTile label="Total" value={total} />
        {typeBreakdown.map((b) => (
          <StatTile key={b.type} label={b.type} value={b.count} />
        ))}
      </section>

      <QuestionListClient skills={skills} />
    </AdminPageFrame>
  );
}
