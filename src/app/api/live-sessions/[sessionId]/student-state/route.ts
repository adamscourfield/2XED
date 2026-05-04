import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { parseOpeningCheckQueue } from '@/lib/live/live-check-plan';

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
    select: {
      id: true,
      currentLane: true,
      currentExplanationId: true,
      pendingRecheckItemId: true,
      openingCheckQueue: true,
      openingCheckIndex: true,
    },
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

  let pendingRecheckItem: { id: string; question: string; type: string; options: unknown; skillId?: string } | null =
    null;

  if (participant.currentLane === 'LANE_2' && participant.pendingRecheckItemId) {
    const nextRecheckItem = await prisma.item.findUnique({
      where: { id: participant.pendingRecheckItemId },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
        skills: { select: { skillId: true }, take: 1 },
      },
    });

    if (nextRecheckItem) {
      pendingRecheckItem = {
        id: nextRecheckItem.id,
        question: nextRecheckItem.question,
        type: nextRecheckItem.type,
        options: nextRecheckItem.options,
        skillId: nextRecheckItem.skills[0]?.skillId ?? liveSession.skillId ?? undefined,
      };
    }
  }

  let openingCheckItem: typeof pendingRecheckItem = null;
  if (liveSession.status === 'ACTIVE' && participant.currentLane === 'LANE_1' && !participant.pendingRecheckItemId) {
    const queue = parseOpeningCheckQueue(participant.openingCheckQueue);
    const idx = participant.openingCheckIndex ?? 0;
    const slot = queue[idx];
    if (slot) {
      const answered = await prisma.liveAttempt.findFirst({
        where: {
          liveSessionId: sessionId,
          studentUserId: userId,
          itemId: slot.itemId,
        },
        select: { id: true },
      });
      if (!answered) {
        const row = await prisma.item.findUnique({
          where: { id: slot.itemId },
          select: { id: true, question: true, type: true, options: true },
        });
        if (row) {
          openingCheckItem = {
            id: row.id,
            question: row.question,
            type: row.type,
            options: row.options,
            skillId: slot.skillId,
          };
        }
      }
    }
  }

  let currentContent = liveSession.currentContent as Record<string, unknown> | null;
  if (
    currentContent?.contentType === 'PRACTICE' &&
    currentContent?.audience === 'individual' &&
    currentContent?.individualAssignments &&
    typeof currentContent.individualAssignments === 'object'
  ) {
    const assignment = (currentContent.individualAssignments as Record<string, { item?: unknown }>)[userId] ?? null;
    currentContent = assignment?.item
      ? {
          ...currentContent,
          item: assignment.item,
        }
      : null;
  }

  return NextResponse.json({
    status: liveSession.status,
    currentPhaseIndex: liveSession.currentPhaseIndex,
    currentContent,
    studentLane: participant.currentLane,
    pendingRecheckItem: pendingRecheckItem ?? openingCheckItem,
  });
}
