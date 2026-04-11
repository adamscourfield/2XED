import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { z } from 'zod';
import { getItemContent, gradeAttempt } from '@/features/learn/itemContent';
import { emitEvent } from '@/features/telemetry/eventService';
import { updateSkillMastery } from '@/features/mastery/updateMastery';

const attemptSchema = z.object({
  itemId: z.string(),
  skillId: z.string(),
  subjectId: z.string(),
  answer: z.string(),
  isLast: z.boolean(),
  totalItems: z.number(),
  previousResults: z.array(z.object({ itemId: z.string(), correct: z.boolean() })),
  routeType: z.enum(['A', 'B', 'C']).optional(),
  questionIndex: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const parsed = attemptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { itemId, skillId, subjectId, answer, isLast, totalItems, previousResults, routeType } = parsed.data;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const itemContent = getItemContent(item);
  const correct = gradeAttempt(itemContent.acceptedAnswers, answer, itemContent.numberLine?.tolerance);

  const attempt = await prisma.attempt.create({
    data: { userId, itemId, answer, correct },
  });

  await emitEvent({
    name: 'attempt_submitted',
    actorUserId: userId,
    studentUserId: userId,
    subjectId,
    skillId,
    itemId,
    payload: { itemId, answer, skillId, subjectId },
  });

  await emitEvent({
    name: 'attempt_graded',
    actorUserId: userId,
    studentUserId: userId,
    subjectId,
    skillId,
    itemId,
    attemptId: attempt.id,
    payload: { itemId, attemptId: attempt.id, correct, skillId, subjectId },
  });

  if (isLast) {
    const allResults = [...previousResults, { itemId, correct }];
    const correctCount = allResults.filter((r) => r.correct).length;

    // Detect if this is a due review
    const skillMastery = await prisma.skillMastery.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { nextReviewAt: true },
    });
    const now = new Date();
    const isDueReview = skillMastery?.nextReviewAt != null && skillMastery.nextReviewAt <= now;
    const mode = isDueReview ? 'REVIEW' : 'PRACTICE';

    await updateSkillMastery(userId, skillId, subjectId, correctCount, totalItems, mode);

    const accuracy = totalItems > 0 ? correctCount / totalItems : 0;

    await emitEvent({
      name: 'route_completed',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: { skillId, subjectId, routeType, totalItems, correctCount, accuracy },
    });

    const allCorrect = correctCount === totalItems;
    const allWrong = correctCount === 0;

    if (allCorrect) {
      await emitEvent({
        name: 'shadow_pair_passed',
        actorUserId: userId,
        studentUserId: userId,
        subjectId,
        skillId,
        payload: { skillId, subjectId, routeType, pairSize: totalItems, correctCount },
      });
    } else if (allWrong) {
      await emitEvent({
        name: 'shadow_pair_failed',
        actorUserId: userId,
        studentUserId: userId,
        subjectId,
        skillId,
        payload: { skillId, subjectId, routeType, pairSize: totalItems, correctCount },
      });

      if (routeType === 'C') {
        await prisma.interventionFlag.upsert({
          where: { userId_skillId: { userId, skillId } },
          update: { lastSeenAt: new Date(), isResolved: false },
          create: {
            userId,
            subjectId,
            skillId,
            reason: 'Shadow pair failed on route C',
            isResolved: false,
          },
        });

        await emitEvent({
          name: 'intervention_flagged',
          actorUserId: userId,
          studentUserId: userId,
          subjectId,
          skillId,
          payload: { skillId, reason: 'Shadow pair failed on route C' },
        });
      }
    }
  }

  return NextResponse.json({ correct });
}
