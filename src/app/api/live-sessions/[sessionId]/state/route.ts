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
  });
}
