import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { z } from 'zod';
import { emitEvent } from '@/features/telemetry/eventService';
import { prisma } from '@/db/prisma';

const schema = z.object({
  subjectId: z.string(),
  skillId: z.string(),
  routeType: z.enum(['A', 'B', 'C']),
  stepIndex: z.number().int().nonnegative(),
  stepTitle: z.string(),
  correct: z.boolean(),
  retryCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative().optional(),
  alternativeShown: z.boolean().optional(),
  interactionStarted: z.boolean().optional(),
  interactionCompleted: z.boolean().optional(),
  interactionType: z.string().optional(),
  interactionDurationMs: z.number().int().nonnegative().optional(),
  completionRuleKind: z.string().optional(),
  interactionSelected: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  interactionExpected: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const {
    subjectId,
    skillId,
    routeType,
    stepIndex,
    stepTitle,
    correct,
    retryCount,
    durationMs,
    alternativeShown,
    interactionStarted,
    interactionCompleted,
    interactionType,
    interactionDurationMs,
    completionRuleKind,
    interactionSelected,
    interactionExpected,
  } = parsed.data;
  const inferredConfidence = durationMs == null ? 'medium' : durationMs > 15000 ? 'low' : durationMs > 7000 ? 'medium' : 'high';

  await emitEvent({
    name: 'step_checkpoint_attempted',
    actorUserId: userId,
    studentUserId: userId,
    subjectId,
    skillId,
    payload: {
      routeType,
      stepIndex,
      stepTitle,
      correct,
      retryCount,
      durationMs: durationMs ?? null,
      inferredConfidence,
      interactionStarted: interactionStarted ?? false,
      interactionCompleted: interactionCompleted ?? false,
      interactionType: interactionType ?? 'none',
      interactionDurationMs: interactionDurationMs ?? null,
    },
  });

  if (interactionStarted) {
    await emitEvent({
      name: 'step_interaction_started',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: {
        routeType,
        stepIndex,
        stepTitle,
        interactionType: interactionType ?? 'none',
      },
    });
  }

  if (interactionCompleted) {
    await emitEvent({
      name: 'step_interaction_completed',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: {
        routeType,
        stepIndex,
        stepTitle,
        interactionType: interactionType ?? 'none',
        interactionDurationMs: interactionDurationMs ?? null,
      },
    });
  }

  const ruleKind = completionRuleKind ?? 'selection_required';
  const rulePassed = interactionCompleted ?? false;
  let errorType: string | undefined;
  if (!rulePassed) {
    if (
      ruleKind === 'first_difference_correct' &&
      typeof interactionSelected === 'number' &&
      typeof interactionExpected === 'number'
    ) {
      errorType = interactionSelected !== interactionExpected ? 'wrong_first_difference' : 'rule_not_met';
    } else {
      errorType = 'rule_not_met';
    }
  }

  if ((interactionType ?? 'none') !== 'none') {
    await emitEvent({
      name: 'step_interaction_evaluated',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: {
        routeType,
        stepIndex,
        stepTitle,
        interactionType: interactionType ?? 'none',
        ruleKind,
        rulePassed,
        errorType,
        attemptsBeforePass: rulePassed ? retryCount : undefined,
        interactionDurationMs: interactionDurationMs ?? null,
      },
    });
  }

  if (correct) {
    await emitEvent({
      name: 'step_checkpoint_mastered',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: { routeType, stepIndex, stepTitle, retryCount, durationMs: durationMs ?? null, inferredConfidence },
    });
  }

  if (alternativeShown) {
    await emitEvent({
      name: 'step_alternative_shown',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: { routeType, stepIndex, stepTitle, retryCount, durationMs: durationMs ?? null, inferredConfidence },
    });
  }

  // Auto-flag intervention when repeated reteach-step failure persists over time
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const repeatedStepFailures = await prisma.event.count({
    where: {
      name: 'step_checkpoint_attempted',
      studentUserId: userId,
      subjectId,
      skillId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  if (!correct && repeatedStepFailures >= 12) {
    await emitEvent({
      name: 'intervention_flagged',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: {
        skillId,
        reason: 'Repeated reteach-step failure pattern in 7-day window',
      },
    });
  }

  return NextResponse.json({ ok: true });
}
