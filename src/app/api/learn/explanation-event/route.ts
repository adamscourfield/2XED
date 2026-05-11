import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { emitEvent } from '@/features/telemetry/eventService';

const shownSchema = z.object({
  kind: z.literal('shown'),
  subjectId: z.string(),
  skillId: z.string(),
  skillCode: z.string().optional(),
  routeType: z.enum(['A', 'B', 'C']),
  trigger: z.enum(['zero_score', 'repeat_failure']),
  priorSessionScore: z.string(),
});

const retryStartedSchema = z.object({
  kind: z.literal('retry_started'),
  subjectId: z.string(),
  skillId: z.string(),
  skillCode: z.string().optional(),
  routeType: z.enum(['A', 'B', 'C']),
  retryItemCount: z.number().int().positive(),
});

const retryCompletedSchema = z.object({
  kind: z.literal('retry_completed'),
  subjectId: z.string(),
  skillId: z.string(),
  skillCode: z.string().optional(),
  routeType: z.enum(['A', 'B', 'C']),
  retryCorrectCount: z.number().int().nonnegative(),
  retryTotalItems: z.number().int().positive(),
  recoveryState: z.enum(['recovered', 'improving', 'still_needs_support']),
});

const schema = z.union([shownSchema, retryStartedSchema, retryCompletedSchema]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const payload = parsed.data;

  if (payload.kind === 'shown') {
    await emitEvent({
      name: 'explanation_shown',
      actorUserId: userId,
      studentUserId: userId,
      subjectId: payload.subjectId,
      skillId: payload.skillId,
      payload: {
        skillId: payload.skillId,
        skillCode: payload.skillCode,
        subjectId: payload.subjectId,
        routeType: payload.routeType,
        trigger: payload.trigger,
        priorSessionScore: payload.priorSessionScore,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (payload.kind === 'retry_started') {
    await emitEvent({
      name: 'explanation_retry_started',
      actorUserId: userId,
      studentUserId: userId,
      subjectId: payload.subjectId,
      skillId: payload.skillId,
      payload: {
        skillId: payload.skillId,
        skillCode: payload.skillCode,
        subjectId: payload.subjectId,
        routeType: payload.routeType,
        retryItemCount: payload.retryItemCount,
      },
    });
    return NextResponse.json({ ok: true });
  }

  await emitEvent({
    name: 'explanation_retry_completed',
    actorUserId: userId,
    studentUserId: userId,
    subjectId: payload.subjectId,
    skillId: payload.skillId,
    payload: {
      skillId: payload.skillId,
      skillCode: payload.skillCode,
      subjectId: payload.subjectId,
      routeType: payload.routeType,
      retryCorrectCount: payload.retryCorrectCount,
      retryTotalItems: payload.retryTotalItems,
      recoveryState: payload.recoveryState,
    },
  });

  return NextResponse.json({ ok: true });
}
