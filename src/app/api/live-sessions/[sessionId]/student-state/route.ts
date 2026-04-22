import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

interface Props {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/live-sessions/[sessionId]/student-state
 *
 * Lightweight poll endpoint for student devices. Returns only what students
 * need to detect phase changes and teacher broadcasts:
 *   - status
 *   - currentPhaseIndex
 *   - currentContent (broadcast payload if any)
 *   - studentLane
 *   - pendingRecheckItem (if teacher handed the student back to app)
 *
 * Students poll this every 3s while in a session.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  // Verify student is a participant
  const participant = await prisma.liveParticipant.findUnique({
    where: {
      liveSessionId_studentUserId: {
        liveSessionId: sessionId,
        studentUserId: userId,
      },
    },
    select: { id: true, currentLane: true, currentExplanationId: true },
  });

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      currentPhaseIndex: true,
      currentContent: true,
      skillId: true,
    },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  let pendingRecheckItem: { id: string; question: string; type: string; options: unknown } | null = null;

  if (participant.currentLane === 'LANE_2' && participant.currentExplanationId && liveSession.skillId) {
    const attemptedItems = await prisma.liveAttempt.findMany({
      where: {
        liveSessionId: sessionId,
        studentUserId: userId,
      },
      select: { itemId: true },
    });
    const attemptedSet = new Set(attemptedItems.map((attempt) => attempt.itemId));

    const nextRecheckItem = await prisma.item.findFirst({
      where: {
        skills: { some: { skillId: liveSession.skillId } },
        id: { notIn: Array.from(attemptedSet) },
      },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
      },
    });

    if (nextRecheckItem) {
      pendingRecheckItem = nextRecheckItem;
    }
  }

  return NextResponse.json({
    status: liveSession.status,
    currentPhaseIndex: liveSession.currentPhaseIndex,
    currentContent: liveSession.currentContent,
    studentLane: participant.currentLane,
    pendingRecheckItem,
  });
}
