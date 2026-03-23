/**
 * /teacher/leadership — School Leadership Dashboard
 *
 * Accessible to: ADMIN + LEADERSHIP roles
 *
 * Purpose: Full cross-classroom, cross-subject overview of all students
 * across the entire school — aggregated view for SLT / department heads.
 *
 * Layout mirrors the Teacher Dashboard structure but:
 *   - Shows ALL classrooms (not filtered by teacher)
 *   - Groups by SUBJECT first, then classroom
 *   - Includes a school-wide aggregate stat bar at the top
 *   - Flags at-risk students with risk colour coding
 *   - Subject-level filter tabs
 *   - Trends (DLE momentum, question accuracy) at subject level
 *   - Export-style summary row per classroom
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { selectNextSkill } from '@/features/learn/nextSkill';
import { getUserGamificationSummary } from '@/features/gamification/gamificationService';

const DAYS_DEFAULT = 30;

// ---------------------------------------------------------------------------
// Helpers (mirrored from teacher dashboard)
// ---------------------------------------------------------------------------

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

function trendDirection(recent: number, prev: number): 'UP' | 'FLAT' | 'DOWN' {
  const delta = recent - prev;
  if (delta > 0.03) return 'UP';
  if (delta < -0.03) return 'DOWN';
  return 'FLAT';
}

function trendLabel(d: 'UP' | 'FLAT' | 'DOWN'): string {
  if (d === 'UP') return '↑ Improving';
  if (d === 'DOWN') return '↓ Declining';
  return '→ Stable';
}

function riskLevel(score: number): 'RED' | 'AMBER' | 'GREEN' {
  if (score >= 50) return 'RED';
  if (score >= 25) return 'AMBER';
  return 'GREEN';
}

function riskScore(checkpointRate: number, interactionPassRate: number, interventions: number, wrongFirstDiff: number): number {
  let s = 0;
  if (interventions > 0) s += 45;
  if (checkpointRate < 0.5) s += 25; else if (checkpointRate < 0.7) s += 15;
  if (interactionPassRate < 0.5) s += 20; else if (interactionPassRate < 0.7) s += 10;
  if (wrongFirstDiff >= 3) s += 15; else if (wrongFirstDiff > 0) s += 8;
  return Math.min(100, s);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface Props {
  searchParams?: Promise<{ days?: string; subject?: string }>;
}

export default async function LeadershipDashboardPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const days = Number(params.days ?? DAYS_DEFAULT);
  const subjectFilter = params.subject ?? 'ALL';

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const user = session.user as { id: string; role?: string; name?: string | null; email?: string | null };
  if (user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') redirect('/dashboard');

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const trendWindowStart = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

  // All subjects
  const subjects = await prisma.subject.findMany({ select: { id: true, title: true, slug: true } });

  // All classrooms with enrollments + teacher info
  const allClassrooms = await prisma.classroom.findMany({
    include: {
      subject: true,
      teacherProfile: { include: { user: { select: { name: true, email: true } } } },
      enrollments: {
        include: {
          student: {
            include: {
              skillMasteries: { select: { mastery: true, confirmedCount: true, nextReviewAt: true, lastPracticedAt: true } },
              knowledgeSkillStates: { select: { latestDle: true, durabilityBand: true } },
              attempts: {
                where: { createdAt: { gte: since } },
                select: { correct: true, createdAt: true },
              },
            },
          },
        },
      },
    },
  });

  // All question attempts in window (for school-wide trends)
  const schoolAttempts = await prisma.questionAttempt.findMany({
    where: { occurredAt: { gte: trendWindowStart } },
    select: { userId: true, correct: true, occurredAt: true, skill: { select: { subjectId: true } } },
  });

  const now = new Date();

  // Build subject groups
  const subjectGroups = subjects
    .map((subject) => {
      const classrooms = allClassrooms
        .filter((c) => c.subjectId === subject.id)
        .filter((c) => subjectFilter === 'ALL' || subject.slug === subjectFilter);

      const allStudentIds = [...new Set(classrooms.flatMap((c) => c.enrollments.map((e) => e.studentUserId)))];
      const subjectAttempts = schoolAttempts.filter((a) => a.skill.subjectId === subject.id);
      const recentAttempts = subjectAttempts.filter((a) => a.occurredAt >= since);
      const previousAttempts = subjectAttempts.filter((a) => a.occurredAt < since);

      const recentCorrect = recentAttempts.filter((a) => a.correct).length;
      const prevCorrect = previousAttempts.filter((a) => a.correct).length;
      const recentAcc = recentAttempts.length ? recentCorrect / recentAttempts.length : 0;
      const prevAcc = previousAttempts.length ? prevCorrect / previousAttempts.length : 0;
      const subjectTrend = trendDirection(recentAcc, prevAcc);

      // Aggregate across subject
      const allMasteries = classrooms.flatMap((c) =>
        c.enrollments.flatMap((e) => e.student.skillMasteries.map((m) => m.mastery))
      );
      const avgMastery = allMasteries.length
        ? Math.round((allMasteries.reduce((a, b) => a + b, 0) / allMasteries.length) * 100)
        : 0;

      const allKnowledgeStates = classrooms.flatMap((c) =>
        c.enrollments.flatMap((e) => e.student.knowledgeSkillStates)
      );
      const durableCount = allKnowledgeStates.filter((s) => s.durabilityBand === 'DURABLE').length;
      const atRiskCount = allKnowledgeStates.filter((s) => s.durabilityBand === 'AT_RISK').length;
      const developingCount = allKnowledgeStates.filter((s) => s.durabilityBand === 'DEVELOPING').length;

      const totalStudents = allStudentIds.length;
      const requiringAction = classrooms.reduce(
        (sum, c) =>
          sum +
          c.enrollments.filter((e) => {
            const masteryVals = e.student.skillMasteries.map((m) => m.mastery);
            const mAvg = masteryVals.length ? masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length : 0;
            return riskScore(
              mAvg >= 0.7 ? 1 : mAvg >= 0.5 ? 0.8 : 0.3,
              mAvg >= 0.7 ? 1 : mAvg >= 0.5 ? 0.8 : 0.3,
              0,
              mAvg < 0.5 ? 1 : 0
            ) >= 25;
          }).length,
        0
      );

      return {
        subject,
        classrooms: classrooms.map((cls) => {
          const clsAttempts = schoolAttempts.filter((a) =>
            cls.enrollments.some((e) => e.studentUserId === a.userId)
          );
          const clsRecent = clsAttempts.filter((a) => a.occurredAt >= since);
          const clsPrev = clsAttempts.filter((a) => a.occurredAt < since);
          const clsTrend = trendDirection(
            clsRecent.length ? clsRecent.filter((a) => a.correct).length / clsRecent.length : 0,
            clsPrev.length ? clsPrev.filter((a) => a.correct).length / clsPrev.length : 0
          );

          const teacherName = cls.teacherProfile?.user.name ?? cls.teacherProfile?.user.email ?? 'Unassigned';

          const studentRows = cls.enrollments.map((enrollment) => {
            const student = enrollment.student;
            const masteryVals = student.skillMasteries.map((m) => m.mastery);
            const masteryAvg = masteryVals.length
              ? Math.round((masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length) * 100)
              : 0;
            const knowledgeStates = student.knowledgeSkillStates;
            const durability =
              knowledgeStates.find((s) => s.durabilityBand === 'AT_RISK')?.durabilityBand ??
              knowledgeStates.find((s) => s.durabilityBand === 'DEVELOPING')?.durabilityBand ??
              knowledgeStates.find((s) => s.durabilityBand === 'DURABLE')?.durabilityBand ??
              null;
            const dleVals = knowledgeStates.map((s) => s.latestDle).filter((v): v is number => typeof v === 'number');
            const avgDle = dleVals.length ? dleVals.reduce((a, b) => a + b, 0) / dleVals.length : null;
            const attempts = student.attempts;
            const recentAttempts2 = attempts.filter((a) => a.createdAt >= since);
            const correctRecent = recentAttempts2.filter((a) => a.correct).length;
            const accuracy = recentAttempts2.length ? correctRecent / recentAttempts2.length : 0;

            const rs = riskScore(
              accuracy >= 0.7 ? 1 : accuracy >= 0.5 ? 0.8 : 0.3,
              accuracy >= 0.7 ? 1 : accuracy >= 0.5 ? 0.8 : 0.3,
              0,
              accuracy < 0.5 ? 1 : 0
            );
            const rl = riskLevel(rs);

            return {
              id: student.id,
              name: student.name ?? student.email ?? student.id,
              masteryAvg,
              accuracy: pct(correctRecent, recentAttempts2.length),
              avgDle: avgDle != null ? avgDle.toFixed(2) : '—',
              durability,
              riskLevel: rl,
              riskScore: rs,
              trend: trendDirection(accuracy, 0),
            };
          });

          const clsAtRisk = studentRows.filter((s) => s.riskLevel === 'RED').length;
          const clsAmber = studentRows.filter((s) => s.riskLevel === 'AMBER').length;

          return {
            id: cls.id,
            name: cls.name,
            yearGroup: cls.yearGroup,
            teacherName,
            studentCount: cls.enrollments.length,
            avgMastery: cls.enrollments.length
              ? Math.round(
                  cls.enrollments
                    .flatMap((e) => e.student.skillMasteries.map((m) => m.mastery))
                    .reduce((a, b) => a + b, 0) /
                    cls.enrollments.flatMap((e) => e.student.skillMasteries.map((m) => m.mastery)).length
                ) * 100 || 0
              : 0,
            clsTrend,
            atRisk: clsAtRisk,
            amber: clsAmber,
            studentRows,
          };
        }),
        totalStudents,
        avgMastery,
        subjectTrend,
        durableCount,
        atRiskCount,
        developingCount,
        requiringAction,
      };
    })
    .filter((g) => g.totalStudents > 0 && (subjectFilter === 'ALL' || g.subject.slug === subjectFilter));

  // School-wide totals
  const schoolTotalStudents = [...new Set(allClassrooms.flatMap((c) => c.enrollments.map((e) => e.studentUserId)))].length;
  const schoolTotalAttempts = schoolAttempts.length;
  const schoolRecentAttempts = schoolAttempts.filter((a) => a.occurredAt >= since);
  const schoolRecentCorrect = schoolRecentAttempts.filter((a) => a.correct).length;

  const schoolTrend = trendDirection(
    schoolRecentAttempts.length ? schoolRecentCorrect / schoolRecentAttempts.length : 0,
    0
  );

  return (
    <LearningPageShell
      title="Leadership Dashboard"
      subtitle={`Full school overview — ${schoolTotalStudents} students across ${allClassrooms.length} classrooms`}
      maxWidthClassName="max-w-7xl"
      meta={
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="anx-chip">Leadership view</span>
          <span className="anx-chip">All subjects</span>
          <span className="anx-chip">
            Window: <strong>{days}d</strong>
          </span>
        </div>
      }
    >
      {/* School-wide aggregate */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="anx-stat"><p className="anx-stat-label">Total students</p><p className="anx-stat-value">{schoolTotalStudents}</p></div>
        <div className="anx-stat"><p className="anx-stat-label">Classrooms</p><p className="anx-stat-value">{allClassrooms.length}</p></div>
        <div className="anx-stat"><p className="anx-stat-label">Questions ({days}d)</p><p className="anx-stat-value">{schoolRecentAttempts.length}</p></div>
        <div className="anx-stat"><p className="anx-stat-label">Accuracy ({days}d)</p><p className="anx-stat-value">{pct(schoolRecentCorrect, schoolRecentAttempts.length)}</p></div>
        <div className="anx-stat"><p className="anx-stat-label">At risk</p><p className="anx-stat-value" style={{ color: 'var(--anx-danger)' }}>{subjectGroups.reduce((s, g) => s + g.atRiskCount, 0)}</p></div>
        <div className="anx-stat"><p className="anx-stat-label">Durable</p><p className="anx-stat-value" style={{ color: 'var(--anx-success)' }}>{subjectGroups.reduce((s, g) => s + g.durableCount, 0)}</p></div>
      </div>

      {/* Time window + subject filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 text-xs">
          {[7, 30, 90].map((d) => (
            <a
              key={d}
              href={`/teacher/leadership?days=${d}${subjectFilter !== 'ALL' ? `&subject=${subjectFilter}` : ''}`}
              className={`rounded-lg border px-3 py-1.5 font-medium transition-all ${
                days === d
                  ? 'border-[var(--anx-primary)] bg-[var(--anx-primary-soft)] text-[var(--anx-primary)]'
                  : 'border-[var(--anx-border)] bg-white text-[var(--anx-text-secondary)]'
              }`}
            >
              {d}d
            </a>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <a
            href={`/teacher/leadership?days=${days}`}
            className={`rounded-lg border px-3 py-1.5 font-medium transition-all ${
              subjectFilter === 'ALL'
                ? 'border-[var(--anx-primary)] bg-[var(--anx-primary-soft)] text-[var(--anx-primary)]'
                : 'border-[var(--anx-border)] bg-white text-[var(--anx-text-secondary)]'
            }`}
          >
            All subjects
          </a>
          {subjects.map((s) => (
            <a
              key={s.id}
              href={`/teacher/leadership?days=${days}&subject=${s.slug}`}
              className={`rounded-lg border px-3 py-1.5 font-medium transition-all ${
                subjectFilter === s.slug
                  ? 'border-[var(--anx-primary)] bg-[var(--anx-primary-soft)] text-[var(--anx-primary)]'
                  : 'border-[var(--anx-border)] bg-white text-[var(--anx-text-secondary)]'
              }`}
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Subject groups */}
      <div className="space-y-8">
        {subjectGroups.map((group) => (
          <section key={group.subject.id}>
            {/* Subject header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--anx-text)' }}>
                  {group.subject.title}
                </h2>
                <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                  {group.totalStudents} students · {group.classrooms.length} classrooms ·{' '}
                  <span style={{ color: group.subjectTrend === 'UP' ? 'var(--anx-success)' : group.subjectTrend === 'DOWN' ? 'var(--anx-danger)' : 'var(--anx-text-muted)' }}>
                    {trendLabel(group.subjectTrend)}
                  </span>{' '}
                  · {group.atRiskCount} at risk · {group.durableCount} durable
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>Avg mastery</p>
                  <p className="font-semibold" style={{ color: group.avgMastery >= 70 ? 'var(--anx-success)' : group.avgMastery >= 50 ? 'var(--anx-warning)' : 'var(--anx-danger)' }}>
                    {group.avgMastery}%
                  </p>
                </div>
              </div>
            </div>

            {/* Classrooms for this subject */}
            <div className="space-y-3">
              {group.classrooms.map((cls) => (
                <div key={cls.id} className="anx-card overflow-hidden">
                  {/* Classroom summary bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--anx-border)] bg-[var(--anx-surface-soft)] px-5 py-3">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--anx-text)' }}>{cls.name}</p>
                      <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                        {cls.yearGroup ?? '—'} · Teacher: {cls.teacherName} · {cls.studentCount} students
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {(cls.atRisk > 0 || cls.amber > 0) && (
                        <span className="anx-badge anx-badge-red">{cls.atRisk} at risk</span>
                      )}
                      {cls.amber > 0 && (
                        <span className="anx-badge anx-badge-amber">{cls.amber} amber</span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                        {cls.avgMastery}% mastery · {trendLabel(cls.clsTrend)}
                      </span>
                    </div>
                  </div>

                  {/* Student table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                        <tr>
                          <th className="px-4 py-2.5 text-left font-medium">Student</th>
                          <th className="px-3 py-2.5 text-left font-medium">Risk</th>
                          <th className="px-3 py-2.5 text-left font-medium">DLE</th>
                          <th className="px-3 py-2.5 text-left font-medium">Durability</th>
                          <th className="px-3 py-2.5 text-left font-medium">Mastery</th>
                          <th className="px-3 py-2.5 text-left font-medium">Accuracy</th>
                          <th className="px-3 py-2.5 text-left font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--anx-border-subtle)' }}>
                        {cls.studentRows.map((row) => (
                          <tr
                            key={row.id}
                            className={row.riskLevel === 'RED' ? 'bg-rose-50/60' : row.riskLevel === 'AMBER' ? 'bg-amber-50/40' : ''}
                          >
                            <td className="px-4 py-2.5 font-medium text-[color:var(--anx-text)]">{row.name}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-bold ${
                                  row.riskLevel === 'RED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : row.riskLevel === 'AMBER'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {row.riskLevel} ({row.riskScore})
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs">{row.avgDle}</td>
                            <td className="px-3 py-2.5">
                              {row.durability ? (
                                <span
                                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                    row.durability === 'AT_RISK'
                                      ? 'bg-rose-100 text-rose-800'
                                      : row.durability === 'DEVELOPING'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {row.durability}
                                </span>
                              ) : (
                                <span className="text-[color:var(--anx-text-muted)]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-medium">{row.masteryAvg}%</td>
                            <td className="px-3 py-2.5">{row.accuracy}</td>
                            <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--anx-text-secondary)' }}>
                              {trendLabel(row.trend)}
                            </td>
                          </tr>
                        ))}
                        {cls.studentRows.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                              No students enrolled.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {group.classrooms.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>No classrooms for this subject.</p>
              )}
            </div>
          </section>
        ))}

        {subjectGroups.length === 0 && (
          <div className="anx-card px-6 py-16 text-center" style={{ color: 'var(--anx-text-muted)' }}>
            No data available for this filter.
          </div>
        )}
      </div>
    </LearningPageShell>
  );
}
