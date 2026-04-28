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
    { total: number; answered: Set<string>; correct: number }
  >();

  const participantIds = new Set(liveSession.participants.map((p) => p.studentUserId));

  for (const attempt of liveSession.liveAttempts) {
    const entry = skillSummary.get(attempt.skillId) ?? {
      total: participantIds.size,
      answered: new Set<string>(),
      correct: 0,
    };
    entry.answered.add(attempt.studentUserId);
    if (attempt.correct) entry.correct += 1;
    skillSummary.set(attempt.skillId, entry);
  }

  const responseSummary = Array.from(skillSummary.entries()).map(([skillId, s]) => ({
    skillId,
    totalParticipants: s.total,
    answeredCount: s.answered.size,
    correctCount: s.correct,
  }));

  const recommendedExplanation = await getRecommendedExplanationForLiveSession(prisma, {
    phases: liveSession.phases,
    primarySkillId: liveSession.skillId,
    responseSummary,
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

  const messageEvents = supportEvents.filter((event) => event.name === 'live_student_message' || event.name === 'live_student_help_request');

  const studentMessages: StudentMessageSummary[] = messageEvents
    .filter((event) => Boolean(event.studentUserId))
    .slice(0, 8)
    .map((event) => ({
      studentUserId: event.studentUserId!,
      studentName: studentNameMap.get(event.studentUserId!) ?? 'Unknown student',
      kind: event.name === 'live_student_message' ? 'message' : 'help',
      message: ((event.payload as { message?: string | null }).message ?? null),
      lane: ((event.payload as { lane?: 'LANE_1' | 'LANE_2' | 'LANE_3' | null }).lane ?? null),
      createdAt: event.createdAt.toISOString(),
    }));

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

  // ── Per-student response breakdown ────────────────────────────────────────
  // Build attempt counts per student from the already-fetched liveAttempts.
  const studentAttemptMap = new Map<string, { total: number; correct: number; lastCorrect: boolean | null }>();
  for (const attempt of liveSession.liveAttempts) {
    const entry = studentAttemptMap.get(attempt.studentUserId) ?? { total: 0, correct: 0, lastCorrect: null };
    entry.total += 1;
    if (attempt.correct) entry.correct += 1;
    entry.lastCorrect = attempt.correct;
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
      const attempts = studentAttemptMap.get(p.studentUserId) ?? { total: 0, correct: 0, lastCorrect: null };
      return {
        studentUserId: p.studentUserId,
        name: p.student.name ?? p.student.email,
        lane: studentLaneMap.get(p.studentUserId) ?? 'LANE_1' as const,
        attemptCount: attempts.total,
        correctCount: attempts.correct,
        lastCorrect: attempts.lastCorrect,
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
    recommendedExplanation,
    supportSummary,
    studentMessages,
    misconceptionSignals,
    studentMessages,
    studentResponses,
  });
}
