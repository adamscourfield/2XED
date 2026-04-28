import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { recordKnowledgeAttempt } from '@/features/knowledge-state/knowledgeStateService';
import { emitEvent } from '@/features/telemetry/eventService';
import { escalateLane } from '@/lib/live/lane-router';
import { generateQuestionsForSkill } from '@/lib/ai/questionGenerator';
import { aiMarkingService, markSchema } from '@/features/qa/AIMarkingService';

const schema = z.object({
  itemId: z.string().min(1),
  skillId: z.string().min(1),
  answer: z.string().optional().default(''),
  canvasData: z
    .object({
      snapshotBase64: z.string().min(1),
      snapshotCropped: z.string().optional(),
      strokes: z.array(z.unknown()).optional(),
    })
    .nullable()
    .optional(),
  responseTimeMs: z.number().int().min(0),
  confidence: z.enum(['low', 'mid', 'high']).optional(),
}).refine((data) => data.answer.trim().length > 0 || !!data.canvasData, {
  message: 'Answer or canvas data is required',
  path: ['answer'],
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

const RUBRIC_MARKING_CORRECT_THRESHOLD = 0.6;

function hasRubricPayload(options: unknown): boolean {
  return !!options && typeof options === 'object' && 'rubric' in options;
}

function shouldUseRichMarking(item: { type: string; options: unknown }): boolean {
  return item.type === 'EXTENDED_WRITING' || item.type === 'CANVAS_INPUT' || hasRubricPayload(item.options);
}

function getWeaknessTags(markingResult: { criteria?: Array<{ element?: string; score?: number; maxScore?: number }> } | null): string[] {
  const criteria = Array.isArray(markingResult?.criteria) ? markingResult.criteria : [];
  const ranked = criteria
    .map((criterion) => {
      const element = typeof criterion.element === 'string' ? criterion.element.trim() : '';
      const score = typeof criterion.score === 'number' ? criterion.score : null;
      const maxScore = typeof criterion.maxScore === 'number' ? criterion.maxScore : null;
      const ratio = score !== null && maxScore && maxScore > 0 ? score / maxScore : 1;
      return { element, ratio };
    })
    .filter((criterion) => criterion.element.length > 0)
    .sort((a, b) => a.ratio - b.ratio);

  return ranked.slice(0, 2).map((criterion) => criterion.element);
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

  const { itemId, skillId, answer, canvasData, responseTimeMs, confidence } = parsed.data;

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

  let markingResult: ReturnType<typeof markSchema.parse> | null = null;
  let correct = item.answer.trim().toLowerCase() === answer.trim().toLowerCase();

  if (shouldUseRichMarking(item)) {
    const marked = await aiMarkingService.mark({
      questionId: itemId,
      answer,
      canvasData: canvasData ?? null,
      mode: 'DRAFT',
    });
    markingResult = markSchema.parse(marked);
    correct = markingResult.score >= RUBRIC_MARKING_CORRECT_THRESHOLD;
  }

  // If wrong, look up which misconception the chosen distractor signals.
  // misconceptionMap on AI-generated items maps option text -> misconception ID.
  let misconceptionId: string | null = null;
  if (!correct && item.misconceptionMap && typeof item.misconceptionMap === 'object') {
    const map = item.misconceptionMap as Record<string, string | null>;
    misconceptionId = map[answer] ?? null;
  }

  const createdAttempt = await prisma.liveAttempt.create({
    data: {
      liveSessionId: sessionId,
      studentUserId: userId,
      itemId,
      skillId,
      answer,
      correct,
      responseTimeMs,
      markingResult: markingResult as unknown as Prisma.InputJsonValue,
      misconceptionId,
      confidence: confidence ?? null,
    },
  });

  const weaknessTags = getWeaknessTags(markingResult);

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
      const escalation = await escalateLane(participant.id, sessionId, failedExplanationId, weaknessTags);
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
        weaknessTags,
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
    let poolItem = await prisma.item.findFirst({
      where: {
        id: { notIn: Array.from(answeredSet) },
        skills: { some: { skillId: sessionSkillId } },
      },
      select: { id: true, question: true, type: true, options: true },
    });

    // Pool exhausted — generate fresh AI questions and serve the first one.
    if (!poolItem) {
      try {
        const skill = await prisma.skill.findUnique({
          where: { id: sessionSkillId },
          select: { code: true, masteryDefinition: true },
        });
        if (skill?.masteryDefinition) {
          const generated = await generateQuestionsForSkill({ skillCode: skill.code, count: 5 });
          if (generated.length > 0) {
            poolItem = await prisma.item.findUnique({
              where: { id: generated[0].id },
              select: { id: true, question: true, type: true, options: true },
            });
          }
        }
      } catch (err) {
        // Generation failure is non-fatal — student simply gets no next item.
        console.warn('[attempts] AI generation fallback failed:', (err as Error).message);
      }
    }

    if (poolItem) {
      nextItem = { ...poolItem, skillId: sessionSkillId };
    }
  }

  return NextResponse.json({
    correct,
    markingResult,
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
