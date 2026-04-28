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
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { StaffDashboardShell } from '@/components/staff/StaffDashboardShell';
import { LeadershipClassStudentPanel } from '@/app/teacher/leadership/LeadershipClassStudentPanel';

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

  // All classrooms with enrollments + teacher info (subject matched via subjectSlug)
  const allClassrooms = await prisma.classroom.findMany({
    include: {
      teachers: {
        take: 1,
        include: { teacherProfile: { include: { user: { select: { name: true, email: true } } } } },
      },
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
        .filter((c) => c.subjectSlug === subject.slug)
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

          const leadTeacher = cls.teachers[0]?.teacherProfile?.user;
          const teacherName = leadTeacher?.name ?? leadTeacher?.email ?? 'Unassigned';

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
            avgMastery: (() => {
              const vals = cls.enrollments.flatMap((e) => e.student.skillMasteries.map((m) => m.mastery));
              return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : 0;
            })(),
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

  const displayName = user.name?.trim() || user.email?.split('@')[0] || 'there';
  const atRiskKnowledgeStates = subjectGroups.reduce((s, g) => s + g.atRiskCount, 0);
  const durableKnowledgeStates = subjectGroups.reduce((s, g) => s + g.durableCount, 0);

  return (
    <LearningPageShell
      title="Leadership dashboard"
      subtitle="Cross-classroom overview with filters for time range and subject."
      maxWidthClassName="max-w-7xl"
      appChrome="teacher"
      appChromeShowLeadershipNav
    >
      <StaffDashboardShell
        variant="leadership"
        eyebrow="School overview"
        displayName={displayName}
        title="Whole-school learning health"
        lead={`${schoolTotalStudents} students across ${allClassrooms.length} classrooms. Scan risk and mastery by subject, then open a class for detail.`}
        stats={[
          { label: 'Students', value: String(schoolTotalStudents) },
          { label: 'Classrooms', value: String(allClassrooms.length) },
          {
            label: `Practice (${days}d)`,
            value: String(schoolRecentAttempts.length),
            hint: `${pct(schoolRecentCorrect, schoolRecentAttempts.length)} accuracy · ${trendLabel(schoolTrend)} vs prior window`,
          },
          {
            label: 'Risk / durable',
            value: `${atRiskKnowledgeStates} / ${durableKnowledgeStates}`,
            hint: 'Knowledge-state bands aggregated across filtered subjects',
          },
        ]}
        heroActions={
          <>
            <Link href="/teacher/dashboard" className="anx-btn-secondary">
              Teacher dashboard
            </Link>
          </>
        }
      >
        <div className="staff-dash-bento">
          <div className="staff-dash-bento-main">
            <div className="staff-dash-filter-row">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--anx-text-muted)]">Window</span>
              <div className="staff-dash-pill-group">
                {[7, 30, 90].map((d) => (
                  <a
                    key={d}
                    href={`/teacher/leadership?days=${d}${subjectFilter !== 'ALL' ? `&subject=${subjectFilter}` : ''}`}
                    className={`staff-dash-pill${days === d ? ' staff-dash-pill--active' : ''}`}
                  >
                    Last {d} days
                  </a>
                ))}
              </div>
            </div>

            <div className="staff-dash-filter-row">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--anx-text-muted)]">Subject</span>
              <div className="staff-dash-pill-group">
                <a href={`/teacher/leadership?days=${days}`} className={`staff-dash-pill${subjectFilter === 'ALL' ? ' staff-dash-pill--active' : ''}`}>
                  All subjects
                </a>
                {subjects.map((s) => (
                  <a
                    key={s.id}
                    href={`/teacher/leadership?days=${days}&subject=${s.slug}`}
                    className={`staff-dash-pill${subjectFilter === s.slug ? ' staff-dash-pill--active' : ''}`}
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>

            <div className="staff-dash-section-gap">
              {subjectGroups.map((group) => (
                <section key={group.subject.id} className="staff-dash-subject-block">
                  <div className="staff-dash-subject-header">
                    <div>
                      <h2 className="staff-dash-subject-title">{group.subject.title}</h2>
                      <p className="staff-dash-subject-sub">
                        {group.totalStudents} students · {group.classrooms.length} classrooms ·{' '}
                        <span
                          style={{
                            color:
                              group.subjectTrend === 'UP'
                                ? 'var(--anx-success)'
                                : group.subjectTrend === 'DOWN'
                                  ? 'var(--anx-danger)'
                                  : 'var(--anx-text-muted)',
                          }}
                        >
                          {trendLabel(group.subjectTrend)}
                        </span>{' '}
                        · {group.atRiskCount} at risk · {group.durableCount} durable
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[color:var(--anx-text-muted)]">Avg mastery</p>
                      <p
                        className="text-lg font-bold"
                        style={{
                          color:
                            group.avgMastery >= 70 ? 'var(--anx-success)' : group.avgMastery >= 50 ? 'var(--anx-warning)' : 'var(--anx-danger)',
                        }}
                      >
                        {group.avgMastery}%
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {group.classrooms.map((cls) => (
                      <LeadershipClassStudentPanel
                        key={cls.id}
                        storageKey={`leadership-class-students:${cls.id}`}
                        defaultOpen={cls.atRisk > 0 || cls.amber > 0}
                        classSummary={{
                          name: cls.name,
                          yearGroup: cls.yearGroup,
                          teacherName: cls.teacherName,
                          studentCount: cls.studentCount,
                          avgMastery: cls.avgMastery,
                          clsTrendLabel: trendLabel(cls.clsTrend),
                          atRisk: cls.atRisk,
                          amber: cls.amber,
                        }}
                        studentRows={cls.studentRows.map((r) => ({
                          id: r.id,
                          name: r.name,
                          riskLevel: r.riskLevel,
                          riskScore: r.riskScore,
                          avgDle: r.avgDle,
                          durability: r.durability,
                          masteryAvg: r.masteryAvg,
                          accuracy: r.accuracy,
                          trendLabel: trendLabel(r.trend),
                        }))}
                      />
                    ))}

                    {group.classrooms.length === 0 && (
                      <p className="text-sm text-[color:var(--anx-text-muted)]">No classrooms for this subject.</p>
                    )}
                  </div>
                </section>
              ))}

              {subjectGroups.length === 0 && (
                <div className="staff-dash-class-panel px-6 py-16 text-center text-[color:var(--anx-text-muted)]">
                  No data available for this filter.
                </div>
              )}
            </div>
          </div>

          <aside className="staff-dash-bento-side">
            <section className="staff-dash-side-card">
              <p className="student-dash-eyebrow" style={{ color: 'var(--anx-text-muted)' }}>
                Snapshot
              </p>
              <h3 className="staff-dash-side-title">This view</h3>
              <ul className="staff-dash-meta-list">
                <li>
                  <strong>Scope</strong> Leadership (all linked classrooms)
                </li>
                <li>
                  <strong>Window</strong> Last {days} days
                </li>
                <li>
                  <strong>Subject</strong> {subjectFilter === 'ALL' ? 'All' : subjectFilter}
                </li>
                <li>
                  <strong>Question attempts (2× window)</strong> {schoolTotalAttempts} loaded for trends
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </StaffDashboardShell>
    </LearningPageShell>
  );
}
