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
import { parseOpeningCheckQueue } from '@/lib/live/live-check-plan';
import { RUBRIC_CORRECT_THRESHOLD } from '@/lib/live/markingConstants';
import { nextPracticeIntent } from '@/lib/live/difficultyLadder';
import { selectLiveItem } from '@/lib/live/selectLiveItem';

const SNAPSHOT_MAX_BYTES = 5 * 1024 * 1024;
const STROKES_MAX_COUNT = 10_000;

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
})
  .refine((data) => data.answer.trim().length > 0 || !!data.canvasData, {
    message: 'Answer or canvas data is required',
    path: ['answer'],
  })
  .refine((data) => !data.canvasData || data.canvasData.snapshotBase64.length <= SNAPSHOT_MAX_BYTES, {
    message: 'Canvas snapshot is too large',
    path: ['canvasData', 'snapshotBase64'],
  })
  .refine((data) => !data.canvasData?.snapshotCropped || data.canvasData.snapshotCropped.length <= SNAPSHOT_MAX_BYTES, {
    message: 'Cropped canvas snapshot is too large',
    path: ['canvasData', 'snapshotCropped'],
  })
  .refine((data) => !data.canvasData?.strokes || data.canvasData.strokes.length <= STROKES_MAX_COUNT, {
    message: 'Canvas stroke data is too large',
    path: ['canvasData', 'strokes'],
  });

interface Props {
  params: Promise<{ sessionId: string }>;
}

const AI_MARKING_TIMEOUT_MS = 8_000;

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

  // Fetch participant, session, and item in parallel — avoids three sequential round-trips.
  const [participant, liveSession, item] = await Promise.all([
    prisma.liveParticipant.findUnique({
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
    }),
    prisma.liveSession.findUnique({ where: { id: sessionId } }),
    prisma.item.findUnique({ where: { id: itemId } }),
  ]);

  if (!participant) return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 });
  if (!liveSession || liveSession.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
  }
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  // Validate that the submitted skillId belongs to this session's subject to prevent
  // a student from recording attempts against arbitrary skills.
  const skillBelongsToSubject = await prisma.skill.count({
    where: { id: skillId, subjectId: liveSession.subjectId },
  });
  if (!skillBelongsToSubject) {
    return NextResponse.json({ error: 'Invalid skillId for this session' }, { status: 400 });
  }

  const itemBelongsToSkill = await prisma.itemSkill.count({
    where: { itemId, skillId },
  });
  if (!itemBelongsToSkill) {
    return NextResponse.json({ error: 'Invalid item for this skill' }, { status: 400 });
  }

  // Idempotency guard — if this exact item was already submitted in this session
  // (e.g. rapid double-tap), return the earlier result rather than creating a duplicate.
  // H5: re-derive nextItem on the duplicate path so the student isn't stranded mid-queue.
  const existing = await prisma.liveAttempt.findFirst({
    where: { liveSessionId: sessionId, studentUserId: userId, itemId },
    select: { correct: true, markingResult: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) {
    // Re-derive queue position so nextItem is correct for the idempotent response.
    const participantNow = await prisma.liveParticipant.findUnique({
      where: { id: participant.id },
      select: { openingCheckQueue: true, openingCheckIndex: true },
    });
    const queueNow = parseOpeningCheckQueue(participantNow?.openingCheckQueue);
    const idxNow = participantNow?.openingCheckIndex ?? 0;
    const nextOpeningNow = queueNow[idxNow];
    let idempotentNextItem: { id: string; question: string; type: string; options: unknown; skillId: string } | null = null;
    if (nextOpeningNow) {
      const openingItem = await prisma.item.findUnique({
        where: { id: nextOpeningNow.itemId },
        select: { id: true, question: true, type: true, options: true },
      });
      if (openingItem) idempotentNextItem = { ...openingItem, skillId: nextOpeningNow.skillId };
    }
    return NextResponse.json({
      correct: existing.correct,
      markingResult: existing.markingResult,
      nextItem: idempotentNextItem,
      questionNumber: Math.min(idxNow + 1, queueNow.length) || 1,
      totalQuestions: queueNow.length || 1,
      poolExhausted: idempotentNextItem === null,
      recheckOutcome: null,
      laneAfterAttempt: participant.currentLane,
    });
  }

  let markingResult: ReturnType<typeof markSchema.parse> | null = null;
  let correct = item.answer.trim().toLowerCase() === answer.trim().toLowerCase();

  if (shouldUseRichMarking(item)) {
    try {
      const markPromise = aiMarkingService.mark({
        questionId: itemId,
        answer,
        canvasData: canvasData ?? null,
        mode: 'DRAFT',
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI marking timed out')), AI_MARKING_TIMEOUT_MS),
      );
      const marked = await Promise.race([markPromise, timeoutPromise]);
      markingResult = markSchema.parse(marked);
      correct = markingResult.score >= RUBRIC_CORRECT_THRESHOLD;
    } catch (err) {
      console.warn('[attempts] AI marking failed, falling back to string match:', (err as Error).message);
      // Fall back to exact string match already set above.
    }
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
      const escalation = await escalateLane(participant.id, sessionId, participant.currentExplanationId, weaknessTags);
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
    const queue = parseOpeningCheckQueue(participant.openingCheckQueue);
    const idx = participant.openingCheckIndex ?? 0;
    const cur = queue[idx];
    if (cur?.itemId === itemId) {
      await prisma.liveParticipant.update({
        where: { id: participant.id },
        data: { openingCheckIndex: { increment: 1 } },
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
  const queueAfter = parseOpeningCheckQueue(participantAfter?.openingCheckQueue);
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
    // Use the current phase's skill if available — a multi-phase session may have advanced
    // past the primary skill, so falling back to liveSession.skillId would serve items for
    // the wrong phase. Falls back to the primary skill, then to the submitted skillId.
    const phaseSkillId = Array.isArray(liveSession.phases) && liveSession.phases.length > 0
      ? ((liveSession.phases[liveSession.currentPhaseIndex] as { skillId?: string } | undefined)?.skillId ?? null)
      : null;
    const sessionSkillId = phaseSkillId ?? liveSession.skillId ?? skillId;

    // Automatic difficulty ladder: recent outcomes on this skill decide whether
    // the next item steps up (challenge), holds (similar), or steps down (easier).
    const recentAttempts = await prisma.liveAttempt.findMany({
      where: { liveSessionId: sessionId, studentUserId: userId, skillId: sessionSkillId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { correct: true },
    });
    let ladderIntent = nextPracticeIntent(recentAttempts.map((a) => a.correct));
    // A one-off miss that signalled a tagged misconception gets an item
    // targeting that misconception rather than generic same-level practice.
    if (ladderIntent === 'PRACTICE_SIMILAR' && !correct && misconceptionId) {
      ladderIntent = 'PRACTICE_MISCONCEPTION';
    }

    const selection = await selectLiveItem({
      sessionId,
      subjectId: liveSession.subjectId,
      skillId: sessionSkillId,
      intent: ladderIntent,
      audience: 'individual',
      targetStudentIds: [userId],
      misconceptionId,
      excludeItemIds: Array.from(answeredSet),
    });
    let poolItem = selection.item
      ? {
          id: selection.item.id,
          question: selection.item.question,
          type: selection.item.type,
          options: selection.item.options,
        }
      : null;

    // Pool exhausted — generate fresh AI questions and serve the first one.
    // Fix: wrap in a 5 s timeout so a slow generation call never blocks a student submission.
    const AI_GENERATION_TIMEOUT_MS = 5_000;
    let poolExhausted = false;
    if (!poolItem) {
      try {
        const skill = await prisma.skill.findUnique({
          where: { id: sessionSkillId },
          select: { code: true, masteryDefinition: true },
        });
        if (skill?.masteryDefinition) {
          const generatePromise = generateQuestionsForSkill({ skillCode: skill.code, count: 5 });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timed out')), AI_GENERATION_TIMEOUT_MS),
          );
          const generated = await Promise.race([generatePromise, timeoutPromise]);
          if (generated.length > 0) {
            poolItem = await prisma.item.findUnique({
              where: { id: generated[0].id },
              select: { id: true, question: true, type: true, options: true },
            });
          }
        }
      } catch (err) {
        console.warn('[attempts] AI generation fallback failed:', (err as Error).message);
      }
      if (!poolItem) poolExhausted = true;
    }

    if (poolItem) {
      nextItem = { ...poolItem, skillId: sessionSkillId };
    }
  }

  // H7: return queue position so the client can show "Question N of M" for opening-check queues.
  const queueFinal = parseOpeningCheckQueue(participantAfter?.openingCheckQueue);
  const idxFinal = participantAfter?.openingCheckIndex ?? 0;

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
    // questionNumber is the position just answered (1-based); totalQuestions is queue size.
    // Falls back to 1/1 for broadcast checks which have no queue.
    questionNumber: queueFinal.length > 1 ? Math.min(idxFinal, queueFinal.length) : 1,
    totalQuestions: queueFinal.length > 1 ? queueFinal.length : 1,
    poolExhausted: nextItem === null,
    recheckOutcome,
    laneAfterAttempt,
  });
}
