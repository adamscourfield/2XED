import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { getRecommendedExplanationForLiveSession } from '@/lib/live/live-session-explanation-bridge';

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

/**
 * GET /api/live-sessions/[sessionId]/stream
 *
 * Server-Sent Events stream for the teacher conductor dashboard.
 * Delivers periodic state snapshots (every 3s) as SSE events so the
 * client can react without polling individual endpoints.
 *
 * Events emitted:
 *   - "state"  — full session state snapshot (participants, attempts, phases)
 *   - "ping"   — keepalive every 15s
 *
 * The stream closes after 10 minutes (Next.js edge runtime / serverless
 * functions have execution time limits; teachers should reconnect if
 * the stream drops).
 */
export async function GET(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  // Verify ownership
  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherUserId: true },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const encoder = new TextEncoder();

  function sseMessage(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  async function buildSnapshot() {
    const ls = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        skill: { select: { id: true, code: true, name: true } },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                knowledgeSkillStates: {
                  select: { skillId: true, masteryProbability: true, durabilityBand: true },
                },
                interventionFlags: {
                  where: { isResolved: false },
                  select: { id: true },
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
            createdAt: true,
          },
        },
      },
    });

    if (!ls) return null;

    const participantIds = new Set(ls.participants.map((p) => p.studentUserId));
    const participantCount = ls.participants.filter((p) => p.isActive).length;
    const skillSummary = new Map<string, { answered: Set<string>; correct: number; partial: number; incorrect: number }>();

    for (const attempt of ls.liveAttempts) {
      const entry = skillSummary.get(attempt.skillId) ?? { answered: new Set(), correct: 0, partial: 0, incorrect: 0 };
      entry.answered.add(attempt.studentUserId);
      const outcome = getAttemptOutcome(attempt);
      if (outcome === 'correct') entry.correct += 1;
      else if (outcome === 'partial') entry.partial += 1;
      else entry.incorrect += 1;
      skillSummary.set(attempt.skillId, entry);
    }

    // Lane distribution from participants
    const laneCounts = { LANE_1: 0, LANE_2: 0, LANE_3: 0 };
    const laneStudents: Record<string, Array<{ id: string; name: string | null; email: string; hasFlag: boolean }>> = {
      LANE_1: [], LANE_2: [], LANE_3: [],
    };

    for (const p of ls.participants) {
      if (p.isActive) {
        laneCounts[p.currentLane] = (laneCounts[p.currentLane] ?? 0) + 1;
        laneStudents[p.currentLane]?.push({
          id: p.studentUserId,
          name: p.student.name,
          email: p.student.email,
          hasFlag: p.student.interventionFlags.length > 0,
        });
      }
    }

    const responseSummary = Array.from(skillSummary.entries()).map(([skillId, s]) => ({
      skillId,
      totalParticipants: participantIds.size,
      answeredCount: s.answered.size,
      correctCount: s.correct,
      partialCount: s.partial,
      incorrectCount: s.incorrect,
    }));

    const weaknessCriterionScores = new Map<string, { total: number; count: number }>();
    for (const attempt of ls.liveAttempts) {
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
      phases: ls.phases,
      primarySkillId: ls.skillId,
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

    const studentMessages = supportEvents
      .filter((event) => event.name === 'live_student_message' || event.name === 'live_student_help_request')
      .filter((event) => Boolean(event.studentUserId))
      .slice(0, 8)
      .map((event) => {
        const participant = ls.participants.find((p) => p.studentUserId === event.studentUserId);
        return {
          studentUserId: event.studentUserId!,
          studentName: participant?.student.name ?? participant?.student.email ?? 'Unknown student',
          kind: event.name === 'live_student_message' ? 'message' : 'help',
          message: ((event.payload as { message?: string | null }).message ?? null),
          lane: ((event.payload as { lane?: 'LANE_1' | 'LANE_2' | 'LANE_3' | null }).lane ?? null),
          createdAt: event.createdAt.toISOString(),
        };
      });

    const mcStudentMap = new Map<string, Set<string>>();
    for (const attempt of ls.liveAttempts) {
      if (!attempt.correct && attempt.misconceptionId) {
        const existing = mcStudentMap.get(attempt.misconceptionId) ?? new Set<string>();
        existing.add(attempt.studentUserId);
        mcStudentMap.set(attempt.misconceptionId, existing);
      }
    }

    const skillIdsInSession = [...new Set(ls.liveAttempts.map((a) => a.skillId))];
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

    const participantNameMap = new Map(ls.participants.map((p) => [p.studentUserId, p.student.name ?? p.student.email]));
    const misconceptionSignals = Array.from(mcStudentMap.entries())
      .map(([misconceptionId, students]) => ({
        misconceptionId,
        label: mcLabelMap.get(misconceptionId)?.label ?? misconceptionId,
        description: mcLabelMap.get(misconceptionId)?.description ?? '',
        studentCount: students.size,
        studentNames: [...students].map((id) => participantNameMap.get(id) ?? 'Unknown').slice(0, 5),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    const rubricCriterionMap = new Map<string, { totalScore: number; totalMaxScore: number; count: number; students: Set<string> }>();
    for (const attempt of ls.liveAttempts) {
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

    const studentAttemptMap = new Map<string, { total: number; correct: number; partial: number; lastOutcome: 'correct' | 'partial' | 'incorrect' | null }>();
    for (const attempt of ls.liveAttempts) {
      const entry = studentAttemptMap.get(attempt.studentUserId) ?? { total: 0, correct: 0, partial: 0, lastOutcome: null };
      const outcome = getAttemptOutcome(attempt);
      entry.total += 1;
      if (outcome === 'correct') entry.correct += 1;
      if (outcome === 'partial') entry.partial += 1;
      entry.lastOutcome = outcome;
      studentAttemptMap.set(attempt.studentUserId, entry);
    }

    const studentResponses = ls.participants
      .filter((p) => p.isActive)
      .map((p) => {
        const attempts = studentAttemptMap.get(p.studentUserId) ?? { total: 0, correct: 0, partial: 0, lastOutcome: null };
        return {
          studentUserId: p.studentUserId,
          name: p.student.name ?? p.student.email,
          lane: p.currentLane,
          attemptCount: attempts.total,
          correctCount: attempts.correct,
          partialCount: attempts.partial,
          lastOutcome: attempts.lastOutcome,
          hasOpenFlag: p.student.interventionFlags.length > 0,
        };
      })
      .sort((a, b) => a.lane.localeCompare(b.lane) || a.name.localeCompare(b.name));

    return {
      sessionId: ls.id,
      status: ls.status,
      joinCode: ls.joinCode,
      startedAt: ls.startedAt,
      skillId: ls.skillId,
      skill: ls.skill,
      phases: ls.phases,
      currentPhaseIndex: ls.currentPhaseIndex,
      currentContent: ls.currentContent,
      participantCount,
      laneCounts,
      laneStudents,
      responseSummary,
      recommendedExplanation,
      misconceptionSignals,
      supportSummary: {
        shownCount: supportEvents.filter((event) => event.name === 'live_explanation_shown').length,
        acknowledgedCount: supportEvents.filter((event) => event.name === 'live_explanation_acknowledged').length,
        recheckStartedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_started').length,
        rejoinedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_completed' && (event.payload as { outcome?: string }).outcome === 'rejoined_lane_1').length,
        escalatedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_completed' && (event.payload as { outcome?: string }).outcome === 'escalated_lane_3').length,
        latestOutcomes: supportEvents
          .filter((event) => event.name === 'live_support_recheck_completed' && typeof (event.payload as { outcome?: string }).outcome === 'string' && Boolean(event.studentUserId))
          .slice(0, 8)
          .map((event) => {
            const participant = ls.participants.find((p) => p.studentUserId === event.studentUserId);
            return {
              studentUserId: event.studentUserId,
              studentName: participant?.student.name ?? participant?.student.email ?? 'Unknown student',
              outcome: (event.payload as { outcome: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3' }).outcome,
              createdAt: event.createdAt.toISOString(),
            };
          }),
      },
      studentMessages,
      rubricCriteria,
      studentResponses,
    };
  }

  const stream = new ReadableStream({
    async start(controller) {
      const abortSignal = req.signal;
      let pingCount = 0;
      const MAX_ITERATIONS = 200; // ~10 min at 3s intervals

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(sseMessage(event, data));
        } catch {
          // Stream already closed
        }
      };

      // Initial snapshot
      const initial = await buildSnapshot();
      if (initial) send('state', initial);

      const interval = setInterval(async () => {
        if (abortSignal.aborted || pingCount >= MAX_ITERATIONS) {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        pingCount++;

        // Send ping every 5 intervals (~15s)
        if (pingCount % 5 === 0) {
          send('ping', { ts: Date.now() });
        }

        const snapshot = await buildSnapshot();
        if (!snapshot) {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        send('state', snapshot);

        // Auto-close if session completed
        if (snapshot.status === 'COMPLETED') {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 3000);

      abortSignal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
