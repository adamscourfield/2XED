import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser, STAFF_ROLES } from '@/lib/api/auth';
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

export async function GET(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(STAFF_ROLES);
  if (response) return response;

  const userId = user.id;
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
        select: {
          studentUserId: true,
          fromLane: true,
          toLane: true,
          transitionType: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      skill: { select: { id: true, code: true, name: true } },
      subject: { select: { title: true } },
    },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (user.role === 'TEACHER' && liveSession.teacherUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const durationMinutes =
    liveSession.startedAt && liveSession.endedAt
      ? Math.round((liveSession.endedAt.getTime() - liveSession.startedAt.getTime()) / 60000)
      : null;

  const studentNameMap = new Map(
    liveSession.participants.map((p) => [p.studentUserId, p.student.name ?? p.student.email]),
  );

  // Per-student attempt aggregation
  const studentAttemptMap = new Map<
    string,
    { total: number; correct: number; partial: number; lastOutcome: 'correct' | 'partial' | 'incorrect' | null }
  >();
  let totalAttempts = 0;
  let totalCorrect = 0;

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

  // Final lane distribution
  const finalLaneCounts = { LANE_1: 0, LANE_2: 0, LANE_3: 0 };
  for (const p of liveSession.participants) {
    if (p.isActive && p.currentLane in finalLaneCounts) {
      finalLaneCounts[p.currentLane as keyof typeof finalLaneCounts]++;
    }
  }

  // Lane transition summary
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
          select: { id: true, code: true, name: true, misconceptions: true },
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

  // Rubric criteria aggregation
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
      averageScore: entry.count > 0 ? entry.totalScore / entry.count : 0,
      averageMaxScore: entry.count > 0 ? entry.totalMaxScore / entry.count : 0,
      affectedStudents: entry.students.size,
    }))
    .sort(
      (a, b) =>
        a.averageScore / Math.max(a.averageMaxScore, 1) -
        b.averageScore / Math.max(b.averageMaxScore, 1),
    );

  // Per-skill response summary
  const skillSummaryMap = new Map<
    string,
    { answered: Set<string>; correct: number; partial: number; incorrect: number }
  >();
  for (const attempt of liveSession.liveAttempts) {
    const entry = skillSummaryMap.get(attempt.skillId) ?? {
      answered: new Set<string>(),
      correct: 0,
      partial: 0,
      incorrect: 0,
    };
    entry.answered.add(attempt.studentUserId);
    const outcome = getAttemptOutcome(attempt);
    if (outcome === 'correct') entry.correct++;
    else if (outcome === 'partial') entry.partial++;
    else entry.incorrect++;
    skillSummaryMap.set(attempt.skillId, entry);
  }

  const skillMetaMap = new Map(skillsWithEnrichment.map((s) => [s.id, { code: s.code, name: s.name }]));

  const responseSummary = Array.from(skillSummaryMap.entries()).map(([skillId, s]) => ({
    skillId,
    skillCode: skillMetaMap.get(skillId)?.code ?? null,
    skillName: skillMetaMap.get(skillId)?.name ?? null,
    totalParticipants: participantCount,
    answeredCount: s.answered.size,
    correctCount: s.correct,
    partialCount: s.partial,
    incorrectCount: s.incorrect,
  }));

  return NextResponse.json({
    sessionId: liveSession.id,
    status: liveSession.status,
    startedAt: liveSession.startedAt?.toISOString() ?? null,
    endedAt: liveSession.endedAt?.toISOString() ?? null,
    durationMinutes,
    skill: liveSession.skill,
    subject: { title: liveSession.subject.title },
    participantCount,
    totalAttempts,
    overallCorrectRate: totalAttempts > 0 ? totalCorrect / totalAttempts : null,
    finalLaneCounts,
    escalationCount,
    resolutionCount,
    studentResults,
    misconceptionSignals,
    rubricCriteria,
    responseSummary,
  });
}
