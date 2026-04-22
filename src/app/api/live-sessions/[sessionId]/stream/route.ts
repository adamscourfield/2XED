import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

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
            createdAt: true,
          },
        },
      },
    });

    if (!ls) return null;

    const participantCount = ls.participants.length;
    const skillSummary = new Map<string, { answered: Set<string>; correct: number }>();

    for (const attempt of ls.liveAttempts) {
      const entry = skillSummary.get(attempt.skillId) ?? { answered: new Set(), correct: 0 };
      entry.answered.add(attempt.studentUserId);
      if (attempt.correct) entry.correct += 1;
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

    return {
      sessionId: ls.id,
      status: ls.status,
      joinCode: ls.joinCode,
      startedAt: ls.startedAt,
      phases: ls.phases,
      currentPhaseIndex: ls.currentPhaseIndex,
      currentContent: ls.currentContent,
      participantCount,
      laneCounts,
      laneStudents,
      responseSummary: Array.from(skillSummary.entries()).map(([skillId, s]) => ({
        skillId,
        totalParticipants: participantCount,
        answeredCount: s.answered.size,
        correctCount: s.correct,
      })),
      supportSummary: {
        shownCount: supportEvents.filter((event) => event.name === 'live_explanation_shown').length,
        acknowledgedCount: supportEvents.filter((event) => event.name === 'live_explanation_acknowledged').length,
        recheckStartedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_started').length,
        rejoinedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_completed' && (event.payload as { outcome?: string }).outcome === 'rejoined_lane_1').length,
        escalatedCount: supportEvents.filter((event) => event.name === 'live_support_recheck_completed' && (event.payload as { outcome?: string }).outcome === 'escalated_lane_3').length,
        latestOutcomes: supportEvents
          .filter((event) => event.name === 'live_support_recheck_completed' && typeof (event.payload as { outcome?: string }).outcome === 'string' && Boolean(event.studentUserId))
          .slice(0, 8)
          .map((event) => ({
            studentUserId: event.studentUserId,
            outcome: (event.payload as { outcome: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3' }).outcome,
            createdAt: event.createdAt.toISOString(),
          })),
      },
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
