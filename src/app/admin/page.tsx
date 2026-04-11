import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

// DLE verdict bucketing
// latestDle is a raw score; durabilityBand is the banded signal.
// We treat DURABLE as positive evidence, AT_RISK as negative.
function dleverdict(durable: number, developing: number, atRisk: number): {
  label: string;
  colour: string;
  bg: string;
  description: string;
} {
  const total = durable + developing + atRisk;
  if (total === 0) return { label: 'No data', colour: 'var(--anx-text-muted)', bg: 'var(--anx-surface-container-low)', description: 'Not enough evidence yet.' };
  const durablePct = durable / total;
  const atRiskPct = atRisk / total;
  if (durablePct >= 0.45) return { label: 'POSITIVE', colour: 'var(--anx-success)', bg: 'var(--anx-success-soft)', description: 'Most learners are consolidating knowledge durably.' };
  if (atRiskPct >= 0.55) return { label: 'CONCERN', colour: 'var(--anx-danger-text)', bg: 'var(--anx-danger-soft)', description: 'Majority of skill states are at-risk. Review reteach policy and content coverage.' };
  return { label: 'DEVELOPING', colour: 'var(--anx-warning-text)', bg: 'var(--anx-warning-soft)', description: 'Platform is building learner durability — monitor trends.' };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // ── Parallel data fetching ─────────────────────────────────────────────────
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
    // DLE band distribution
    prisma.studentSkillState.groupBy({
      by: ['durabilityBand'],
      _count: { durabilityBand: true },
    }),
    // Average DLE score
    prisma.studentSkillState.aggregate({
      _avg: { latestDle: true },
    }),
    // Total items
    prisma.item.count(),
    // Items linked to at least one skill (real questions, not orphaned)
    prisma.item.count({ where: { skills: { some: {} } } }),
    // Open QA review notes
    prisma.itemReviewNote.count({ where: { status: 'OPEN' } }),
    // Total skills
    prisma.skill.count(),
    // Skills with at least one item
    prisma.skill.count({ where: { items: { some: {} } } }),
    // Open intervention flags
    prisma.interventionFlag.count({ where: { isResolved: false } }),
    // Recent attempts (7d)
    prisma.questionAttempt.findMany({
      where: { occurredAt: { gte: sevenDaysAgo } },
      select: { correct: true, userId: true },
    }),
    // 30-day attempts for trend context
    prisma.questionAttempt.findMany({
      where: { occurredAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo } },
      select: { correct: true },
    }),
    // Active student count (7d)
    prisma.questionAttempt.findMany({
      where: { occurredAt: { gte: sevenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    // Live sessions this week
    prisma.liveSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    // Subjects (for nav links)
    prisma.subject.findMany({ select: { id: true, title: true, slug: true } }),
  ]);

  // ── DLE calculations ───────────────────────────────────────────────────────
  const bandMap = Object.fromEntries(skillStateAgg.map((r) => [r.durabilityBand, r._count.durabilityBand]));
  const durableCount = bandMap['DURABLE'] ?? 0;
  const developingCount = bandMap['DEVELOPING'] ?? 0;
  const atRiskCount = bandMap['AT_RISK'] ?? 0;
  const totalStates = durableCount + developingCount + atRiskCount;
  const avgDle = avgDleResult._avg.latestDle;
  const verdict = dleverdict(durableCount, developingCount, atRiskCount);

  // ── Success rate calculations ──────────────────────────────────────────────
  const recentCorrect = recentAttempts.filter((a) => a.correct).length;
  const recentTotal = recentAttempts.length;
  const accuracyPct7d = recentTotal > 0 ? Math.round((recentCorrect / recentTotal) * 100) : null;

  const prevCorrect = thirtyDayAttempts.filter((a) => a.correct).length;
  const prevTotal = thirtyDayAttempts.length;
  const accuracyPct30d = prevTotal > 0 ? Math.round((prevCorrect / prevTotal) * 100) : null;

  const accuracyTrend =
    accuracyPct7d !== null && accuracyPct30d !== null
      ? accuracyPct7d - accuracyPct30d
      : null;

  const activeStudents = recentStudentIds.length;
  const coverageGaps = totalSkills - skillsWithItems;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--anx-surface-bright)' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b px-8 py-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="anx-section-label mb-0.5" style={{ color: 'var(--anx-text-muted)' }}>Anaxi Learn</p>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--anx-text)' }}>Platform Overview</h1>
          </div>
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            <span>{user.name ?? user.email}</span>
            <span className="anx-badge anx-badge-blue">ADMIN</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-8 py-8">

        {/* ── DLE Verdict ─────────────────────────────────────────────────── */}
        <section>
          <p className="anx-section-label mb-3" style={{ color: 'var(--anx-text-muted)' }}>Durability signal</p>
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--anx-border)', background: verdict.bg }}>
            <div className="flex flex-wrap items-start justify-between gap-6">

              {/* Verdict badge */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black"
                  style={{ background: verdict.colour, color: '#fff' }}
                >
                  {verdict.label === 'POSITIVE' ? '↑' : verdict.label === 'CONCERN' ? '↓' : '~'}
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight" style={{ color: verdict.colour }}>DLE {verdict.label}</p>
                  <p className="mt-0.5 text-sm" style={{ color: 'var(--anx-text-secondary)' }}>{verdict.description}</p>
                </div>
              </div>

              {/* Numeric stats */}
              <div className="flex flex-wrap gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-text)' }}>
                    {avgDle !== null && avgDle !== undefined ? avgDle.toFixed(2) : '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>avg DLE score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-success)' }}>{fmt(durableCount)}</p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>durable states</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-warning-text)' }}>{fmt(developingCount)}</p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>developing</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-serif" style={{ color: 'var(--anx-danger-text)' }}>{fmt(atRiskCount)}</p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>at-risk</p>
                </div>
              </div>
            </div>

            {/* Distribution bar */}
            {totalStates > 0 && (
              <div className="mt-5">
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="transition-all" style={{ width: pct(durableCount, totalStates), background: 'var(--anx-success)' }} />
                  <div className="transition-all" style={{ width: pct(developingCount, totalStates), background: 'var(--anx-warning)' }} />
                  <div className="transition-all" style={{ width: pct(atRiskCount, totalStates), background: 'var(--anx-danger)' }} />
                </div>
                <div className="mt-1.5 flex gap-4 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                  <span>Durable {pct(durableCount, totalStates)}</span>
                  <span>Developing {pct(developingCount, totalStates)}</span>
                  <span>At-risk {pct(atRiskCount, totalStates)}</span>
                  <span className="ml-auto">{fmt(totalStates)} total skill states</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Three-column metric grid ─────────────────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-3">

          {/* Student success */}
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
            <p className="anx-section-label mb-4" style={{ color: 'var(--anx-text-muted)' }}>Student success — last 7 days</p>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold font-serif" style={{
                    color: accuracyPct7d === null ? 'var(--anx-text-muted)'
                      : accuracyPct7d >= 75 ? 'var(--anx-success)'
                      : accuracyPct7d >= 55 ? 'var(--anx-warning-text)'
                      : 'var(--anx-danger-text)',
                  }}>
                    {accuracyPct7d !== null ? `${accuracyPct7d}%` : '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>answer accuracy</p>
                </div>
                {accuracyTrend !== null && (
                  <span className={`anx-badge ${accuracyTrend > 2 ? 'anx-badge-green' : accuracyTrend < -2 ? 'anx-badge-red' : 'anx-badge-blue'}`}>
                    {accuracyTrend > 0 ? `↑ +${accuracyTrend}pp` : accuracyTrend < 0 ? `↓ ${accuracyTrend}pp` : '→ stable'} vs prev 7d
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <p className="text-lg font-bold font-serif" style={{ color: 'var(--anx-text)' }}>{fmt(activeStudents)}</p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>active learners</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <p className="text-lg font-bold font-serif" style={{ color: 'var(--anx-text)' }}>{fmt(recentTotal)}</p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>question attempts</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <p className="text-lg font-bold font-serif" style={{ color: 'var(--anx-text)' }}>{fmt(liveSessions7d)}</p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>live sessions</p>
                </div>
                <div className="rounded-xl p-3" style={{
                  background: openInterventions > 0 ? 'var(--anx-danger-soft)' : 'var(--anx-surface-container-low)',
                }}>
                  <p className="text-lg font-bold font-serif" style={{ color: openInterventions > 0 ? 'var(--anx-danger-text)' : 'var(--anx-text)' }}>
                    {fmt(openInterventions)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>open interventions</p>
                </div>
              </div>
            </div>
            <Link href="/admin/interventions" className="mt-4 block text-xs font-medium" style={{ color: 'var(--anx-primary)' }}>
              View interventions →
            </Link>
          </div>

          {/* Question database */}
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
            <p className="anx-section-label mb-4" style={{ color: 'var(--anx-text-muted)' }}>Question database</p>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold font-serif" style={{ color: 'var(--anx-text)' }}>{fmt(realItemCount)}</p>
                <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>active items ({fmt(itemCount)} total incl. unlinked)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{
                  background: openNotes > 0 ? 'var(--anx-warning-soft)' : 'var(--anx-surface-container-low)',
                }}>
                  <p className="text-lg font-bold font-serif" style={{ color: openNotes > 0 ? 'var(--anx-warning-text)' : 'var(--anx-text)' }}>
                    {fmt(openNotes)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>flagged items</p>
                </div>
                <div className="rounded-xl p-3" style={{
                  background: coverageGaps > 0 ? 'var(--anx-danger-soft)' : 'var(--anx-surface-container-low)',
                }}>
                  <p className="text-lg font-bold font-serif" style={{ color: coverageGaps > 0 ? 'var(--anx-danger-text)' : 'var(--anx-text)' }}>
                    {fmt(coverageGaps)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>skills with no items</p>
                </div>
                <div className="rounded-xl p-3 col-span-2" style={{ background: 'var(--anx-surface-container-low)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>skill coverage</p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--anx-text-secondary)' }}>{pct(skillsWithItems, totalSkills)}</p>
                  </div>
                  <div className="anx-progress-track">
                    <div className="anx-progress-bar" style={{ width: pct(skillsWithItems, totalSkills) }} />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--anx-text-muted)' }}>{fmt(skillsWithItems)} of {fmt(totalSkills)} skills have questions</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              {subjects.slice(0, 2).map((s) => (
                <Link key={s.id} href={`/admin/content/${s.slug}`} className="text-xs font-medium" style={{ color: 'var(--anx-primary)' }}>
                  {s.title} QA →
                </Link>
              ))}
            </div>
          </div>

          {/* Insight & analytics links */}
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
            <p className="anx-section-label mb-4" style={{ color: 'var(--anx-text-muted)' }}>Analytics & tools</p>
            <div className="space-y-2">
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/insight/${s.slug}`}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--anx-surface-container-low)]"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>{s.title}</p>
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Insight dashboard</p>
                  </div>
                  <span style={{ color: 'var(--anx-text-faint)' }}>→</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 border-t pt-3 space-y-1" style={{ borderColor: 'var(--anx-border)' }}>
              {[
                { label: 'Question Bank', href: '/admin/questions', sub: 'Author & manage all questions' },
                { label: 'Content audit', href: '/admin/content-audit', sub: 'Coverage & gaps by strand' },
                { label: 'Content ingestion', href: '/admin/content-ingestion', sub: 'Review & publish batches' },
                { label: 'Knowledge state', href: '/admin/knowledge-state', sub: 'Debug learner state traces' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-[var(--anx-surface-container-low)]"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--anx-text)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>{item.sub}</p>
                  </div>
                  <span style={{ color: 'var(--anx-text-faint)' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom nav strip ────────────────────────────────────────────── */}
        <section className="rounded-2xl border" style={{ borderColor: 'var(--anx-border)', background: 'var(--anx-surface-container-lowest)' }}>
          <div className="grid divide-x sm:grid-cols-3 lg:grid-cols-6" style={{ borderColor: 'var(--anx-border)' }}>
            {[
              { label: 'Insight', href: subjects[0] ? `/admin/insight/${subjects[0].slug}` : '/admin/insight/ks3-maths', icon: '📊' },
              { label: 'Interventions', href: '/admin/interventions', icon: '⚑', alert: openInterventions > 0 },
              { label: 'Questions', href: '/admin/questions', icon: '✏️' },
              { label: 'QA Workbench', href: subjects[0] ? `/admin/content/${subjects[0].slug}` : '/admin/content/ks3-maths', icon: '🔬', alert: openNotes > 0 },
              { label: 'Content Audit', href: '/admin/content-audit', icon: '📋' },
              { label: 'Ingestion', href: '/admin/content-ingestion', icon: '📥' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-1 px-4 py-4 text-center transition-colors hover:bg-[var(--anx-surface-container-low)] first:rounded-l-2xl last:rounded-r-2xl"
              >
                <span className="text-xl">{link.icon}</span>
                <span className="text-xs font-medium" style={{ color: link.alert ? 'var(--anx-danger-text)' : 'var(--anx-text-secondary)' }}>
                  {link.label}
                  {link.alert && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--anx-danger)]" />}
                </span>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
