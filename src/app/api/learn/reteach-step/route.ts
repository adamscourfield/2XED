import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { z } from 'zod';
import { emitEvent } from '@/features/telemetry/eventService';

const schema = z.object({
  subjectId: z.string(),
  skillId: z.string(),
  routeType: z.enum(['A', 'B', 'C']),
  stepIndex: z.number().int().nonnegative(),
  stepTitle: z.string(),
  correct: z.boolean(),
  retryCount: z.number().int().nonnegative(),
  alternativeShown: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { subjectId, skillId, routeType, stepIndex, stepTitle, correct, retryCount, alternativeShown } = parsed.data;

  await emitEvent({
    name: 'step_checkpoint_attempted',
    actorUserId: userId,
    studentUserId: userId,
    subjectId,
    skillId,
    payload: { routeType, stepIndex, stepTitle, correct, retryCount },
  });

  if (correct) {
    await emitEvent({
      name: 'step_checkpoint_mastered',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: { routeType, stepIndex, stepTitle, retryCount },
    });
  }

  if (alternativeShown) {
    await emitEvent({
      name: 'step_alternative_shown',
      actorUserId: userId,
      studentUserId: userId,
      subjectId,
      skillId,
      payload: { routeType, stepIndex, stepTitle, retryCount },
    });
  }

  return NextResponse.json({ ok: true });
}
