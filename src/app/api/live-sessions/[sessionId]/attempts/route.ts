import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { recordKnowledgeAttempt } from '@/features/knowledge-state/knowledgeStateService';
import { emitEvent } from '@/features/telemetry/eventService';
import { escalateLane } from '@/lib/live/lane-router';

const schema = z.object({
  itemId: z.string().min(1),
  skillId: z.string().min(1),
  answer: z.string().min(1),
  responseTimeMs: z.number().int().min(0),
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { itemId, skillId, answer, responseTimeMs } = parsed.data;

  // Verify student is a participant in this session
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

  if (!participant) return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 });

  const liveSession = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!liveSession || liveSession.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
  }

  // Look up the item and check correctness
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const correct = item.answer.trim().toLowerCase() === answer.trim().toLowerCase();

  const createdAttempt = await prisma.liveAttempt.create({
    data: {
      liveSessionId: sessionId,
      studentUserId: userId,
      itemId,
      skillId,
      answer,
      correct,
      responseTimeMs,
    },
  });

  // Update knowledge state via knowledge state service
  await recordKnowledgeAttempt({
    userId,
    skillId,
    itemId,
    correct,
    responseTimeMs,
  });

  // Find next unanswered item for this student in this session
  let recheckOutcome: 'rejoined_lane_1' | 'stayed_lane_2' | 'escalated_lane_3' | null = null;
  let laneAfterAttempt: 'LANE_1' | 'LANE_2' | 'LANE_3' | null = participant.currentLane;

  if (participant.currentLane === 'LANE_2' && participant.pendingRecheckItemId === itemId) {
    if (correct) {
      await prisma.liveParticipant.update({
        where: { id: participant.id },
        data: {
          currentLane: 'LANE_1',
          currentExplanationId: null,
          pendingRecheckItemId: null,
          escalationReason: null,
          holdingAtFinalCheck: false,
        },
      });
      await prisma.laneTransition.create({
        data: {
          liveSessionId: sessionId,
          participantId: participant.id,
          studentUserId: userId,
          fromLane: 'LANE_2',
          toLane: 'LANE_1',
          transitionType: 'RESOLVED',
          triggeredBy: 'shadow_check',
        },
      });
      recheckOutcome = 'rejoined_lane_1';
      laneAfterAttempt = 'LANE_1';
    } else {
      await prisma.liveParticipant.update({
        where: { id: participant.id },
        data: {
          pendingRecheckItemId: null,
        },
      });
      const failedExplanationId = participant.currentExplanationId ?? '';
      const escalation = await escalateLane(participant.id, sessionId, failedExplanationId);
      recheckOutcome = 'escalated_lane_3';
      laneAfterAttempt = escalation.newLane;
    }

    await emitEvent({
      name: 'live_support_recheck_completed',
      actorUserId: userId,
      studentUserId: userId,
      subjectId: liveSession.subjectId,
      skillId,
      itemId,
      attemptId: createdAttempt.id,
      payload: {
        liveSessionId: sessionId,
        participantId: participant.id,
        studentUserId: userId,
        itemId,
        skillId,
        correct,
        laneAfterAttempt,
        outcome: recheckOutcome,
      },
    });
  } else {
    const queue = (participant.openingCheckQueue as Array<{ itemId: string; skillId: string }> | null) ?? [];
    const idx = participant.openingCheckIndex ?? 0;
    const cur = queue[idx];
    if (cur?.itemId === itemId) {
      await prisma.liveParticipant.update({
        where: { id: participant.id },
        data: { openingCheckIndex: idx + 1 },
      });
    }
  }

  const answeredItemIds = await prisma.liveAttempt.findMany({
    where: { liveSessionId: sessionId, studentUserId: userId },
    select: { itemId: true },
  });
  const answeredSet = new Set(answeredItemIds.map((a) => a.itemId));

  const participantAfter = await prisma.liveParticipant.findUnique({
    where: { id: participant.id },
    select: { openingCheckQueue: true, openingCheckIndex: true },
  });
  const queueAfter = (participantAfter?.openingCheckQueue as Array<{ itemId: string; skillId: string }> | null) ?? [];
  const idxAfter = participantAfter?.openingCheckIndex ?? 0;
  const nextOpening = queueAfter[idxAfter];

  let nextItem: {
    id: string;
    question: string;
    type: string;
    options: unknown;
    skillId: string;
  } | null = null;

  if (nextOpening) {
    const openingItem = await prisma.item.findUnique({
      where: { id: nextOpening.itemId },
      select: { id: true, question: true, type: true, options: true },
    });
    if (openingItem) {
      nextItem = { ...openingItem, skillId: nextOpening.skillId };
    }
  }

  if (!nextItem) {
    const sessionSkillId = liveSession.skillId ?? skillId;
    const poolItem = await prisma.item.findFirst({
      where: {
        id: { notIn: Array.from(answeredSet) },
        skills: {
          some: { skillId: sessionSkillId },
        },
      },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
      },
    });
    if (poolItem) {
      nextItem = { ...poolItem, skillId: sessionSkillId };
    }
  }

  return NextResponse.json({
    correct,
    nextItem: nextItem
      ? {
          id: nextItem.id,
          question: nextItem.question,
          type: nextItem.type,
          options: nextItem.options,
          skillId: nextItem.skillId,
        }
      : null,
    recheckOutcome,
    laneAfterAttempt,
  });
}
