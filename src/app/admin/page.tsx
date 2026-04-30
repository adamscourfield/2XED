import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { AdminHomeDashboard } from '@/app/admin/AdminHomeDashboard';

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

function dleverdict(durable: number, developing: number, atRisk: number): {
  label: string;
  colour: string;
  bg: string;
  description: string;
} {
  const total = durable + developing + atRisk;
  if (total === 0)
    return {
      label: 'No data',
      colour: 'var(--anx-text-muted)',
      bg: 'var(--anx-surface-container-low)',
      description: 'Not enough evidence yet.',
    };
  const durablePct = durable / total;
  const atRiskPct = atRisk / total;
  if (durablePct >= 0.45)
    return {
      label: 'POSITIVE',
      colour: 'var(--anx-success)',
      bg: 'var(--anx-success-soft)',
      description: 'Most learners are consolidating knowledge durably.',
    };
  if (atRiskPct >= 0.55)
    return {
      label: 'CONCERN',
      colour: 'var(--anx-danger-text)',
      bg: 'var(--anx-danger-soft)',
      description: 'Majority of skill states are at-risk. Review reteach policy and content coverage.',
    };
  return {
    label: 'DEVELOPING',
    colour: 'var(--anx-warning-text)',
    bg: 'var(--anx-warning-soft)',
    description: 'Platform is building learner durability — monitor trends.',
  };
}

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    skillStateAgg,
    avgDleResult,
    itemCount,
    realItemCount,
    openNotes,
    totalSkills,
    skillsWithItems,
    openInterventions,
    recentAttempts,
    thirtyDayAttempts,
    recentStudentIds,
    liveSessions7d,
    subjects,
  ] = await Promise.all([
    prisma.studentSkillState.groupBy({
      by: ['durabilityBand'],
      _count: { durabilityBand: true },
    }),
    prisma.studentSkillState.aggregate({
      _avg: { latestDle: true },
    }),
    prisma.item.count(),
    prisma.item.count({ where: { skills: { some: {} } } }),
    prisma.itemReviewNote.count({ where: { status: 'OPEN' } }),
    prisma.skill.count(),
    prisma.skill.count({ where: { items: { some: {} } } }),
    prisma.interventionFlag.count({ where: { isResolved: false } }),
    prisma.questionAttempt.findMany({
      where: { occurredAt: { gte: sevenDaysAgo } },
      select: { correct: true, userId: true },
    }),
    prisma.questionAttempt.findMany({
      where: { occurredAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo } },
      select: { correct: true },
    }),
    prisma.questionAttempt.findMany({
      where: { occurredAt: { gte: sevenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.liveSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.subject.findMany({ select: { id: true, title: true, slug: true } }),
  ]);

  const bandMap = Object.fromEntries(skillStateAgg.map((r) => [r.durabilityBand, r._count.durabilityBand]));
  const durableCount = bandMap['DURABLE'] ?? 0;
  const developingCount = bandMap['DEVELOPING'] ?? 0;
  const atRiskCount = bandMap['AT_RISK'] ?? 0;
  const totalStates = durableCount + developingCount + atRiskCount;
  const avgDle = avgDleResult._avg.latestDle;
  const verdict = dleverdict(durableCount, developingCount, atRiskCount);

  const recentCorrect = recentAttempts.filter((a) => a.correct).length;
  const recentTotal = recentAttempts.length;
  const accuracyPct7d = recentTotal > 0 ? Math.round((recentCorrect / recentTotal) * 100) : null;

  const prevCorrect = thirtyDayAttempts.filter((a) => a.correct).length;
  const prevTotal = thirtyDayAttempts.length;
  const accuracyPct30d = prevTotal > 0 ? Math.round((prevCorrect / prevTotal) * 100) : null;

  const accuracyTrend =
    accuracyPct7d !== null && accuracyPct30d !== null ? accuracyPct7d - accuracyPct30d : null;

  const activeStudents = recentStudentIds.length;
  const coverageGaps = totalSkills - skillsWithItems;

  return (
    <div className="anx-app-canvas min-h-screen">
      <header className="border-b px-8 py-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="anx-section-label mb-0.5" style={{ color: 'var(--anx-text-muted)' }}>
              Ember
            </p>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--anx-text)' }}>
              Platform Overview
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            <span>{user.name ?? user.email}</span>
            <span className="anx-badge anx-badge-blue">ADMIN</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-8 py-8">
        <AdminHomeDashboard
          verdict={verdict}
          avgDle={avgDle}
          durableCount={durableCount}
          developingCount={developingCount}
          atRiskCount={atRiskCount}
          totalStates={totalStates}
          durablePct={pct(durableCount, totalStates)}
          developingPct={pct(developingCount, totalStates)}
          atRiskPct={pct(atRiskCount, totalStates)}
          accuracyPct7d={accuracyPct7d}
          accuracyTrend={accuracyTrend}
          activeStudents={activeStudents}
          recentTotal={recentTotal}
          liveSessions7d={liveSessions7d}
          openInterventions={openInterventions}
          realItemCount={realItemCount}
          itemCount={itemCount}
          openNotes={openNotes}
          coverageGaps={coverageGaps}
          skillsWithItems={skillsWithItems}
          totalSkills={totalSkills}
          skillCoveragePct={pct(skillsWithItems, totalSkills)}
          subjects={subjects}
        />
      </main>
    </div>
  );
}
