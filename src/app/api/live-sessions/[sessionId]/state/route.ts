import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { getRecommendedExplanationForLiveSession } from '@/lib/live/live-session-explanation-bridge';

interface LiveSupportEventSummary {
  shownCount: number;
  acknowledgedCount: number;
  recheckStartedCount: number;
  rejoinedCount: number;
  escalatedCount: number;
  latestOutcomes: Array<{
    studentUserId: string;
    outcome: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3';
    createdAt: string;
  }>;
}

interface StudentMessageSummary {
  studentUserId: string;
  studentName: string;
  kind: 'message' | 'help';
  message: string | null;
  lane: 'LANE_1' | 'LANE_2' | 'LANE_3' | null;
  createdAt: string;
}

interface MarkingCriterion {
  element?: string;
  score?: number;
  maxScore?: number;
}

interface StoredMarkingResult {
  score?: number;
  criteria?: MarkingCriterion[];
}

function getAttemptOutcome(attempt: { correct: boolean; markingResult: unknown }): 'correct' | 'partial' | 'incorrect' {
  const marking = (attempt.markingResult as StoredMarkingResult | null) ?? null;
  if (marking && typeof marking.score === 'number') {
    if (marking.score >= 0.6) return 'correct';
    if (marking.score > 0) return 'partial';
    return 'incorrect';
  }
  return attempt.correct ? 'correct' : 'incorrect';
}

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              knowledgeSkillStates: true,
              interventionFlags: {
                where: { isResolved: false },
                select: { id: true, skillId: true, reason: true },
                take: 5,
              },
            },
          },
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
      skill: { select: { id: true, code: true, name: true } },
    },
  });

  // Build lane distribution
  const laneCounts = { LANE_1: 0, LANE_2: 0, LANE_3: 0 };
  const laneStudents: Record<string, Array<{ id: string; name: string | null; email: string }>> = {
    LANE_1: [], LANE_2: [], LANE_3: [],
  };

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  for (const p of liveSession.participants) {
    if (p.isActive) {
      laneCounts[p.currentLane] = (laneCounts[p.currentLane] ?? 0) + 1;
      laneStudents[p.currentLane]?.push({ id: p.studentUserId, name: p.student.name, email: p.student.email });
    }
  }

  // Build per-skill response summary
  const skillSummary = new Map<
    string,
    { total: number; answered: Set<string>; correct: number; partial: number; incorrect: number }
  >();

  const participantIds = new Set(liveSession.participants.map((p) => p.studentUserId));

  for (const attempt of liveSession.liveAttempts) {
    const entry = skillSummary.get(attempt.skillId) ?? {
      total: participantIds.size,
      answered: new Set<string>(),
      correct: 0,
      partial: 0,
      incorrect: 0,
    };
    entry.answered.add(attempt.studentUserId);
    const outcome = getAttemptOutcome(attempt);
    if (outcome === 'correct') entry.correct += 1;
    else if (outcome === 'partial') entry.partial += 1;
    else entry.incorrect += 1;
    skillSummary.set(attempt.skillId, entry);
  }

  const responseSummary = Array.from(skillSummary.entries()).map(([skillId, s]) => ({
    skillId,
    totalParticipants: s.total,
    answeredCount: s.answered.size,
    correctCount: s.correct,
    partialCount: s.partial,
    incorrectCount: s.incorrect,
  }));

  const weaknessCriterionScores = new Map<string, { total: number; count: number }>();
  for (const attempt of liveSession.liveAttempts) {
    const marking = (attempt.markingResult as { criteria?: Array<{ element?: string; score?: number; maxScore?: number }> } | null) ?? null;
    const criteria = Array.isArray(marking?.criteria) ? marking.criteria : [];
    for (const criterion of criteria) {
      const element = typeof criterion.element === 'string' ? criterion.element.trim() : '';
      const score = typeof criterion.score === 'number' ? criterion.score : null;
      const maxScore = typeof criterion.maxScore === 'number' ? criterion.maxScore : null;
      if (!element || score === null || maxScore === null || maxScore <= 0) continue;
      const entry = weaknessCriterionScores.get(element) ?? { total: 0, count: 0 };
      entry.total += score / maxScore;
      entry.count += 1;
      weaknessCriterionScores.set(element, entry);
    }
  }
  const weaknessTags = Array.from(weaknessCriterionScores.entries())
    .map(([element, entry]) => ({ element, average: entry.total / entry.count }))
    .sort((a, b) => a.average - b.average)
    .slice(0, 3)
    .map((entry) => entry.element);

  const recommendedExplanation = await getRecommendedExplanationForLiveSession(prisma, {
    phases: liveSession.phases,
    primarySkillId: liveSession.skillId,
    responseSummary,
    weaknessTags,
  });

  const supportEvents = await prisma.event.findMany({
    where: {
      name: {
        in: [
          'live_explanation_shown',
          'live_explanation_acknowledged',
          'live_support_recheck_started',
          'live_support_recheck_completed',
          'live_student_message',
          'live_student_help_request',
        ],
      },
      payload: {
        path: ['liveSessionId'],
        equals: sessionId,
      },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      studentUserId: true,
      createdAt: true,
      payload: true,
    },
    take: 50,
  });

  const studentNameMap = new Map(liveSession.participants.map((participant) => [participant.studentUserId, participant.student.name ?? participant.student.email]));

  const supportSummary: LiveSupportEventSummary & {
    latestOutcomes: Array<{
      studentUserId: string;
      studentName: string;
      outcome: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3';
      createdAt: string;
    }>;
  } = {
    shownCount: supportEvents.filter((event) => event.name === 'live_explanation_shown').length,
    acknowledgedCount: supportEvents.filter((event) => event.name === 'live_explanation_acknowledged').length,
    recheckStartedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_started').length,
    rejoinedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_completed' && (event.payload as { outcome?: string }).outcome === 'rejoined_lane_1').length,
    escalatedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_completed' && (event.payload as { outcome?: string }).outcome === 'escalated_lane_3').length,
    latestOutcomes: supportEvents
      .filter((event) => event.name === 'live_support_recheck_completed' && typeof (event.payload as { outcome?: string }).outcome === 'string' && Boolean(event.studentUserId))
      .slice(0, 8)
      .map((event) => ({
        studentUserId: event.studentUserId!,
        studentName: studentNameMap.get(event.studentUserId!) ?? 'Unknown student',
        outcome: (event.payload as { outcome: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3' }).outcome,
        createdAt: event.createdAt.toISOString(),
      })),
  };

  // Build participants with their skill states
  const participants = liveSession.participants.map((p) => {
    const relevantStates = liveSession.skillId
      ? p.student.knowledgeSkillStates.filter((s) => s.skillId === liveSession.skillId)
      : p.student.knowledgeSkillStates;

    return {
      studentId: p.studentUserId,
      name: p.student.name,
      email: p.student.email,
      isActive: p.isActive,
      joinedAt: p.joinedAt,
      skillStates: relevantStates.map((s) => ({
        skillId: s.skillId,
        masteryProbability: s.masteryProbability,
        retrievalStrength: s.retrievalStrength,
        transferAbility: s.transferAbility,
        durabilityBand: s.durabilityBand,
      })),
      hasOpenFlag: p.student.interventionFlags.length > 0,
    };
  });

  const participantCount = liveSession.participants.filter((p) => p.isActive).length;

  // ── Misconception signal aggregation ────────────────────────────────────
  // Count distinct students per misconceptionId across all wrong attempts.
  // Join with skill enrichment to attach human-readable labels.
  const mcStudentMap = new Map<string, Set<string>>();
  for (const attempt of liveSession.liveAttempts) {
    if (!attempt.correct && attempt.misconceptionId) {
      const existing = mcStudentMap.get(attempt.misconceptionId) ?? new Set<string>();
      existing.add(attempt.studentUserId);
      mcStudentMap.set(attempt.misconceptionId, existing);
    }
  }

  // Load misconception labels from the skills referenced in this session
  const skillIdsInSession = [...new Set(liveSession.liveAttempts.map((a) => a.skillId))];
  const skillsWithEnrichment = skillIdsInSession.length > 0
    ? await prisma.skill.findMany({
        where: { id: { in: skillIdsInSession } },
        select: { misconceptions: true },
      })
    : [];

  type McEntry = { id: string; label: string; description: string };
  const mcLabelMap = new Map<string, { label: string; description: string }>();
  for (const skill of skillsWithEnrichment) {
    if (!skill.misconceptions) continue;
    const entries = skill.misconceptions as unknown as McEntry[];
    for (const entry of entries) {
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
      studentNames: [...students]
        .map((id) => studentNameMap.get(id) ?? 'Unknown')
        .slice(0, 5),
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  // ── Student messages ─────────────────────────────────────────────────────
  const studentMessages = supportEvents
    .filter((e) => e.name === 'live_student_message' || e.name === 'live_student_help_request')
    .filter((e) => Boolean(e.studentUserId))
    .slice(0, 10)
    .map((e) => ({
      studentUserId: e.studentUserId!,
      studentName: studentNameMap.get(e.studentUserId!) ?? 'Unknown student',
      kind: e.name === 'live_student_message' ? ('message' as const) : ('help' as const),
      message: ((e.payload as { message?: string | null }).message ?? null),
      lane: ((e.payload as { lane?: 'LANE_1' | 'LANE_2' | 'LANE_3' | null }).lane ?? null),
      createdAt: e.createdAt.toISOString(),
    }));

  // ── Rubric criteria aggregation ───────────────────────────────────────────
  const rubricCriterionMap = new Map<string, { totalScore: number; totalMaxScore: number; count: number; students: Set<string> }>();
  for (const attempt of liveSession.liveAttempts) {
    const marking = (attempt.markingResult as StoredMarkingResult | null) ?? null;
    const criteria = Array.isArray(marking?.criteria) ? marking.criteria : [];
    for (const criterion of criteria) {
      const element = typeof criterion.element === 'string' ? criterion.element : null;
      const score = typeof criterion.score === 'number' ? criterion.score : null;
      const maxScore = typeof criterion.maxScore === 'number' ? criterion.maxScore : null;
      if (!element || score === null || maxScore === null) continue;
      const entry = rubricCriterionMap.get(element) ?? { totalScore: 0, totalMaxScore: 0, count: 0, students: new Set<string>() };
      entry.totalScore += score;
      entry.totalMaxScore += maxScore;
      entry.count += 1;
      entry.students.add(attempt.studentUserId);
      rubricCriterionMap.set(element, entry);
    }
  }

  const rubricCriteria = Array.from(rubricCriterionMap.entries())
    .map(([element, entry]) => ({
      element,
      averageScore: entry.count > 0 ? entry.totalScore / entry.count : 0,
      averageMaxScore: entry.count > 0 ? entry.totalMaxScore / entry.count : 0,
      affectedStudents: entry.students.size,
    }))
    .sort((a, b) => (a.averageScore / Math.max(a.averageMaxScore, 1)) - (b.averageScore / Math.max(b.averageMaxScore, 1)));

  // ── Per-lane attempt summary for the current skill ───────────────────────
  // Gives the teacher a live correct/incorrect tally per lane so they can see
  // how each group is responding during the shadow-check phase.
  const currentSkillId =
    Array.isArray(liveSession.phases) && liveSession.phases.length > 0
      ? ((liveSession.phases[liveSession.currentPhaseIndex] as { skillId?: string } | undefined)?.skillId ?? liveSession.skillId)
      : liveSession.skillId;

  const laneAttemptAcc: Record<string, { answered: Set<string>; correct: number; incorrect: number }> = {
    LANE_1: { answered: new Set(), correct: 0, incorrect: 0 },
    LANE_2: { answered: new Set(), correct: 0, incorrect: 0 },
    LANE_3: { answered: new Set(), correct: 0, incorrect: 0 },
  };

  const participantLaneMap = new Map(
    liveSession.participants.filter((p) => p.isActive).map((p) => [p.studentUserId, p.currentLane])
  );

  for (const attempt of liveSession.liveAttempts) {
    if (attempt.skillId !== currentSkillId) continue;
    const lane = participantLaneMap.get(attempt.studentUserId);
    if (!lane || !(lane in laneAttemptAcc)) continue;
    const acc = laneAttemptAcc[lane]!;
    acc.answered.add(attempt.studentUserId);
    if (getAttemptOutcome(attempt) === 'correct') acc.correct++;
    else acc.incorrect++;
  }

  const laneSummary: Record<string, { answeredCount: number; correctCount: number; incorrectCount: number }> = {};
  for (const [lane, acc] of Object.entries(laneAttemptAcc)) {
    laneSummary[lane] = {
      answeredCount: acc.answered.size,
      correctCount: acc.correct,
      incorrectCount: acc.incorrect,
    };
  }

  // ── Per-student response breakdown ────────────────────────────────────────
  // Build attempt counts per student from the already-fetched liveAttempts.
  const studentAttemptMap = new Map<string, { total: number; correct: number; partial: number; lastOutcome: 'correct' | 'partial' | 'incorrect' | null }>();
  for (const attempt of liveSession.liveAttempts) {
    const entry = studentAttemptMap.get(attempt.studentUserId) ?? { total: 0, correct: 0, partial: 0, lastOutcome: null };
    const outcome = getAttemptOutcome(attempt);
    entry.total += 1;
    if (outcome === 'correct') entry.correct += 1;
    if (outcome === 'partial') entry.partial += 1;
    entry.lastOutcome = outcome;
    studentAttemptMap.set(attempt.studentUserId, entry);
  }

  // Determine each active participant's lane
  const studentLaneMap = new Map<string, 'LANE_1' | 'LANE_2' | 'LANE_3'>();
  for (const p of liveSession.participants) {
    if (p.isActive) studentLaneMap.set(p.studentUserId, p.currentLane);
  }

  const studentResponses = liveSession.participants
    .filter((p) => p.isActive)
    .map((p) => {
      const attempts = studentAttemptMap.get(p.studentUserId) ?? { total: 0, correct: 0, partial: 0, lastOutcome: null };
      return {
        studentUserId: p.studentUserId,
        name: p.student.name ?? p.student.email,
        lane: studentLaneMap.get(p.studentUserId) ?? 'LANE_1' as const,
        attemptCount: attempts.total,
        correctCount: attempts.correct,
        partialCount: attempts.partial,
        lastOutcome: attempts.lastOutcome,
        hasOpenFlag: p.student.interventionFlags.length > 0,
      };
    })
    .sort((a, b) => a.lane.localeCompare(b.lane) || (a.name ?? '').localeCompare(b.name ?? ''));

  return NextResponse.json({
    sessionId: liveSession.id,
    status: liveSession.status,
    joinCode: liveSession.joinCode,
    startedAt: liveSession.startedAt,
    skillId: liveSession.skillId,
    skill: liveSession.skill,
    phases: liveSession.phases,
    currentPhaseIndex: liveSession.currentPhaseIndex,
    currentContent: liveSession.currentContent,
    participantCount,
    participants,
    laneCounts,
    laneStudents,
    responseSummary,
    laneSummary,
    recommendedExplanation,
    supportSummary,
    studentMessages,
    misconceptionSignals,
    rubricCriteria,
    studentResponses,
  });
}
