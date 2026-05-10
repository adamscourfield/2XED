import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { LearningPageShell } from '@/components/LearningPageShell';
import { RUBRIC_CORRECT_THRESHOLD } from '@/lib/live/markingConstants';

interface Props {
  params: Promise<{ sessionId: string }>;
}

interface StoredMarkingResult {
  score?: number;
  criteria?: Array<{ element?: string; score?: number; maxScore?: number }>;
}

function getAttemptOutcome(attempt: { correct: boolean; markingResult: unknown }): 'correct' | 'partial' | 'incorrect' {
  const marking = (attempt.markingResult as StoredMarkingResult | null) ?? null;
  if (marking && typeof marking.score === 'number') {
    if (marking.score >= RUBRIC_CORRECT_THRESHOLD) return 'correct';
    if (marking.score > 0) return 'partial';
    return 'incorrect';
  }
  return attempt.correct ? 'correct' : 'incorrect';
}

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

function laneLabel(lane: string): string {
  if (lane === 'LANE_1') return 'Independent';
  if (lane === 'LANE_2') return 'Emerging';
  if (lane === 'LANE_3') return 'Needs support';
  return lane;
}

function LaneBadge({ lane }: { lane: string }) {
  const styles: Record<string, string> = {
    LANE_1: 'bg-[var(--anx-success-soft)] text-[var(--anx-success)]',
    LANE_2: 'bg-[var(--anx-warning-soft,#fff8e1)] text-[var(--anx-warning,#b45309)]',
    LANE_3: 'bg-[var(--anx-danger-soft,#fef2f2)] text-[var(--anx-danger-text,#b91c1c)]',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles[lane] ?? 'bg-[var(--anx-surface-container-low)] text-[var(--anx-text-muted)]'}`}>
      {laneLabel(lane)}
    </span>
  );
}

function OutcomeDot({ outcome }: { outcome: 'correct' | 'partial' | 'incorrect' | null }) {
  if (!outcome) return <span className="text-xs text-[var(--anx-text-muted)]">—</span>;
  const map = {
    correct: 'text-[var(--anx-success)]',
    partial: 'text-[var(--anx-warning,#b45309)]',
    incorrect: 'text-[var(--anx-danger-text,#b91c1c)]',
  };
  const label = { correct: 'Correct', partial: 'Partial', incorrect: 'Incorrect' };
  return <span className={`text-xs font-semibold ${map[outcome]}`}>{label[outcome]}</span>;
}

export default async function SessionReviewPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') {
    redirect('/dashboard');
  }

  const { sessionId } = await params;

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
      },
      liveAttempts: {
        select: {
          studentUserId: true,
          skillId: true,
          correct: true,
          markingResult: true,
          misconceptionId: true,
        },
      },
      transitions: {
        select: { studentUserId: true, fromLane: true, toLane: true, transitionType: true },
        orderBy: { createdAt: 'asc' },
      },
      skill: { select: { id: true, code: true, name: true } },
      subject: { select: { title: true } },
      classroom: { select: { name: true, yearGroup: true } },
    },
  });

  if (!liveSession) redirect('/teacher/live');
  if (user.role === 'TEACHER' && liveSession.teacherUserId !== user.id) {
    redirect('/teacher/live');
  }

  // Duration
  const durationMinutes =
    liveSession.startedAt && liveSession.endedAt
      ? Math.round((liveSession.endedAt.getTime() - liveSession.startedAt.getTime()) / 60000)
      : null;

  // Student name map
  const studentNameMap = new Map(
    liveSession.participants.map((p) => [p.studentUserId, p.student.name ?? p.student.email]),
  );

  // Attempt aggregation
  let totalAttempts = 0;
  let totalCorrect = 0;
  const studentAttemptMap = new Map<
    string,
    { total: number; correct: number; partial: number; lastOutcome: 'correct' | 'partial' | 'incorrect' | null }
  >();

  for (const attempt of liveSession.liveAttempts) {
    totalAttempts++;
    const outcome = getAttemptOutcome(attempt);
    if (outcome === 'correct') totalCorrect++;
    const entry = studentAttemptMap.get(attempt.studentUserId) ?? {
      total: 0,
      correct: 0,
      partial: 0,
      lastOutcome: null,
    };
    entry.total += 1;
    if (outcome === 'correct') entry.correct += 1;
    if (outcome === 'partial') entry.partial += 1;
    entry.lastOutcome = outcome;
    studentAttemptMap.set(attempt.studentUserId, entry);
  }

  const overallCorrectRate = totalAttempts > 0 ? totalCorrect / totalAttempts : null;

  // Final lane counts
  const laneCounts = { LANE_1: 0, LANE_2: 0, LANE_3: 0 };
  for (const p of liveSession.participants) {
    if (p.isActive && p.currentLane in laneCounts) {
      laneCounts[p.currentLane as keyof typeof laneCounts]++;
    }
  }

  // Transition summary
  let escalationCount = 0;
  let resolutionCount = 0;
  const everEscalated = new Set<string>();
  const resolvedStudents = new Set<string>();
  for (const t of liveSession.transitions) {
    if (t.transitionType === 'ESCALATED') {
      escalationCount++;
      everEscalated.add(t.studentUserId);
    }
    if (t.transitionType === 'RESOLVED') {
      resolutionCount++;
      resolvedStudents.add(t.studentUserId);
    }
  }

  const participantCount = liveSession.participants.filter((p) => p.isActive).length;

  // Per-student results
  const studentResults = liveSession.participants
    .filter((p) => p.isActive)
    .map((p) => {
      const attempts = studentAttemptMap.get(p.studentUserId) ?? {
        total: 0,
        correct: 0,
        partial: 0,
        lastOutcome: null,
      };
      return {
        studentId: p.studentUserId,
        name: p.student.name ?? p.student.email,
        finalLane: p.currentLane,
        attemptCount: attempts.total,
        correctCount: attempts.correct,
        partialCount: attempts.partial,
        lastOutcome: attempts.lastOutcome,
        wasEscalated: everEscalated.has(p.studentUserId),
        resolved: resolvedStudents.has(p.studentUserId),
      };
    })
    .sort(
      (a, b) =>
        a.finalLane.localeCompare(b.finalLane) || (a.name ?? '').localeCompare(b.name ?? ''),
    );

  // Misconception signals
  const mcStudentMap = new Map<string, Set<string>>();
  for (const attempt of liveSession.liveAttempts) {
    if (!attempt.correct && attempt.misconceptionId) {
      const existing = mcStudentMap.get(attempt.misconceptionId) ?? new Set<string>();
      existing.add(attempt.studentUserId);
      mcStudentMap.set(attempt.misconceptionId, existing);
    }
  }

  const skillIdsInSession = [...new Set(liveSession.liveAttempts.map((a) => a.skillId))];
  const skillsWithEnrichment =
    skillIdsInSession.length > 0
      ? await prisma.skill.findMany({
          where: { id: { in: skillIdsInSession } },
          select: { id: true, misconceptions: true },
        })
      : [];

  type McEntry = { id: string; label: string; description: string };
  const mcLabelMap = new Map<string, { label: string; description: string }>();
  for (const skill of skillsWithEnrichment) {
    if (!skill.misconceptions) continue;
    for (const entry of skill.misconceptions as unknown as McEntry[]) {
      if (entry.id && !mcLabelMap.has(entry.id)) {
        mcLabelMap.set(entry.id, { label: entry.label, description: entry.description });
      }
    }
  }

  const misconceptionSignals = Array.from(mcStudentMap.entries())
    .map(([misconceptionId, students]) => ({
      misconceptionId,
      label: mcLabelMap.get(misconceptionId)?.label ?? misconceptionId,
      description: mcLabelMap.get(misconceptionId)?.description ?? '',
      studentCount: students.size,
      studentNames: [...students].map((id) => studentNameMap.get(id) ?? 'Unknown').slice(0, 5),
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  // Rubric criteria
  const rubricMap = new Map<
    string,
    { totalScore: number; totalMaxScore: number; count: number; students: Set<string> }
  >();
  for (const attempt of liveSession.liveAttempts) {
    const marking = (attempt.markingResult as StoredMarkingResult | null) ?? null;
    for (const criterion of Array.isArray(marking?.criteria) ? marking!.criteria! : []) {
      const element = typeof criterion.element === 'string' ? criterion.element : null;
      const score = typeof criterion.score === 'number' ? criterion.score : null;
      const maxScore = typeof criterion.maxScore === 'number' ? criterion.maxScore : null;
      if (!element || score === null || maxScore === null) continue;
      const entry = rubricMap.get(element) ?? {
        totalScore: 0,
        totalMaxScore: 0,
        count: 0,
        students: new Set<string>(),
      };
      entry.totalScore += score;
      entry.totalMaxScore += maxScore;
      entry.count += 1;
      entry.students.add(attempt.studentUserId);
      rubricMap.set(element, entry);
    }
  }

  const rubricCriteria = Array.from(rubricMap.entries())
    .map(([element, entry]) => ({
      element,
      averageRatio: entry.count > 0 ? entry.totalScore / Math.max(entry.totalMaxScore, 1) : 0,
      affectedStudents: entry.students.size,
    }))
    .sort((a, b) => a.averageRatio - b.averageRatio);

  const endedDate = liveSession.endedAt
    ? liveSession.endedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const classLabel = [liveSession.classroom.name, liveSession.classroom.yearGroup]
    .filter(Boolean)
    .join(' · ');
  const pageTitle = liveSession.skill
    ? liveSession.skill.name
    : liveSession.subject.title;

  return (
    <LearningPageShell
      title="Session review"
      subtitle={`${liveSession.subject.title}${endedDate ? ` · ${endedDate}` : ''}`}
      appChrome="teacher"
      appChromeShowLeadershipNav={user.role === 'ADMIN' || user.role === 'LEADERSHIP'}
      actions={
        <Link href="/teacher/live" className="anx-btn-secondary text-sm no-underline">
          ← All sessions
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="anx-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
            {classLabel}
          </p>
          <h2 className="mt-1 text-xl font-bold" style={{ color: 'var(--anx-text)' }}>
            {pageTitle}
          </h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--anx-text-muted)' }}>
            {durationMinutes !== null && (
              <span>{durationMinutes} min lesson</span>
            )}
            <span>{participantCount} student{participantCount !== 1 ? 's' : ''}</span>
            <span>{totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''}</span>
            {endedDate && <span>Ended {endedDate}</span>}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="anx-card p-5 text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--anx-primary)' }}>
              {overallCorrectRate !== null ? `${Math.round(overallCorrectRate * 100)}%` : '—'}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
              Overall correct
            </p>
          </div>
          <div className="anx-card p-5 text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--anx-success)' }}>
              {laneCounts.LANE_1}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
              Independent
            </p>
          </div>
          <div className="anx-card p-5 text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--anx-warning,#b45309)' }}>
              {laneCounts.LANE_2}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
              Emerging
            </p>
          </div>
          <div className="anx-card p-5 text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--anx-danger-text,#b91c1c)' }}>
              {laneCounts.LANE_3}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
              Needs support
            </p>
          </div>
        </div>

        {/* Lane journey */}
        {(escalationCount > 0 || resolutionCount > 0) && (
          <div className="anx-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>
              In-lesson journeys
            </p>
            <div className="mt-3 flex flex-wrap gap-6">
              {escalationCount > 0 && (
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--anx-danger-text,#b91c1c)' }}>
                    {escalationCount}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                    student{escalationCount !== 1 ? 's' : ''} escalated to reteach lane
                  </p>
                </div>
              )}
              {resolutionCount > 0 && (
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--anx-success)' }}>
                    {resolutionCount}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>
                    student{resolutionCount !== 1 ? 's' : ''} resolved — rejoined independent lane
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Misconception signals */}
        {misconceptionSignals.length > 0 && (
          <div>
            <p className="anx-section-label mb-3" style={{ color: 'var(--anx-text-muted)' }}>
              Common misconceptions
            </p>
            <div className="space-y-2">
              {misconceptionSignals.slice(0, 5).map((mc) => (
                <div key={mc.misconceptionId} className="anx-card flex items-start gap-4 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--anx-danger-soft,#fef2f2)] text-sm font-bold" style={{ color: 'var(--anx-danger-text,#b91c1c)' }}>
                    {mc.studentCount}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--anx-text)' }}>
                      {mc.label}
                    </p>
                    {mc.description && (
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--anx-text-muted)' }}>
                        {mc.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      {mc.studentNames.join(', ')}
                      {mc.studentCount > mc.studentNames.length
                        ? ` +${mc.studentCount - mc.studentNames.length} more`
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rubric criteria */}
        {rubricCriteria.length > 0 && (
          <div>
            <p className="anx-section-label mb-3" style={{ color: 'var(--anx-text-muted)' }}>
              Rubric criteria — weakest first
            </p>
            <div className="anx-card divide-y" style={{ '--divide-color': 'var(--anx-outline-variant)' } as React.CSSProperties}>
              {rubricCriteria.map((rc) => (
                <div key={rc.element} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--anx-text)' }}>{rc.element}</p>
                    <p className="text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                      {rc.affectedStudents} student{rc.affectedStudents !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: rc.averageRatio < 0.5 ? 'var(--anx-danger-text,#b91c1c)' : rc.averageRatio < 0.75 ? 'var(--anx-warning,#b45309)' : 'var(--anx-success)' }}>
                      {Math.round(rc.averageRatio * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-student results */}
        <div>
          <p className="anx-section-label mb-3" style={{ color: 'var(--anx-text-muted)' }}>
            Student breakdown
          </p>
          {studentResults.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--anx-text-muted)' }}>No students participated.</p>
          ) : (
            <div className="anx-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--anx-outline-variant)' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Final lane</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Attempts</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Correct</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Last outcome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--anx-text-muted)' }}>Journey</th>
                  </tr>
                </thead>
                <tbody>
                  {studentResults.map((s, i) => (
                    <tr
                      key={s.studentId}
                      className={i % 2 === 0 ? '' : 'bg-[var(--anx-surface-container-lowest)]'}
                      style={{ borderBottom: i < studentResults.length - 1 ? '1px solid var(--anx-outline-variant)' : undefined }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--anx-text)' }}>
                        {s.name}
                      </td>
                      <td className="px-4 py-3">
                        <LaneBadge lane={s.finalLane} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--anx-text-secondary)' }}>
                        {s.attemptCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--anx-text-secondary)' }}>
                        {pct(s.correctCount, s.attemptCount)}
                      </td>
                      <td className="px-4 py-3">
                        <OutcomeDot outcome={s.lastOutcome} />
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--anx-text-muted)' }}>
                        {s.resolved
                          ? '✓ Resolved'
                          : s.wasEscalated
                          ? 'Escalated'
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </LearningPageShell>
  );
}
