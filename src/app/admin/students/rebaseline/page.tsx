import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { AdminRebaselineClient } from '@/features/admin/AdminRebaselineClient';
import Link from 'next/link';

export default async function AdminRebaselinePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') redirect('/dashboard');

  const subjects = await prisma.subject.findMany({
    select: { slug: true, title: true },
    orderBy: { title: 'asc' },
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--anx-surface-bright)' }}>
      <header className="border-b px-8 py-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="anx-section-label mb-0.5" style={{ color: 'var(--anx-text-muted)' }}>Admin</p>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--anx-text)' }}>Re-baseline student onboarding</h1>
          </div>
          <Link href="/admin" className="text-sm font-medium" style={{ color: 'var(--anx-primary)' }}>
            ← Platform overview
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        <div className="anx-callout-info text-left text-sm leading-relaxed">
          <p className="font-semibold" style={{ color: 'var(--anx-text)' }}>What this does</p>
          <p className="mt-1">
            For the chosen subject, all diagnostic sessions for that student are marked abandoned, and skill mastery rows for skills in that subject are removed.
            The next time the student opens learning for that subject, they will be sent through onboarding again so placement can be refreshed.
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
            Practice history and attempts outside the diagnostic are not deleted. A <code className="rounded bg-[var(--anx-surface-container-low)] px-1">student_rebaselined</code> event is recorded with your reason.
          </p>
        </div>

        {subjects.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>No subjects configured.</p>
        ) : (
          <AdminRebaselineClient subjects={subjects} />
        )}
      </main>
    </div>
  );
}
