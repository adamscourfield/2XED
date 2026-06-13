import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { resolveOpeningCheckQueueForParticipant, type LiveCheckPlan } from '@/lib/live/live-check-plan';

const schema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']),
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['TEACHER']);
  if (response) return response;

  const userId = user.id;
  const { sessionId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { status } = parsed.data;

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: {
      teacherUserId: true,
      startedAt: true,
      subjectId: true,
      checkPlan: true,
    },
  });
  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  const updateData: {
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    startedAt?: Date;
    endedAt?: Date;
  } = { status };

  if (status === 'ACTIVE' && !liveSession.startedAt) {
    updateData.startedAt = now;
  }

  if (status === 'COMPLETED') {
    updateData.endedAt = now;
  }

  const updated = await prisma.liveSession.update({
    where: { id: sessionId },
    data: updateData,
  });

  if (status === 'ACTIVE' && !liveSession.startedAt) {
    const plan = liveSession.checkPlan as LiveCheckPlan | null | undefined;
    if (plan && (plan.shared?.length || Object.keys(plan.perStudent ?? {}).length)) {
      const participants = await prisma.liveParticipant.findMany({
        where: { liveSessionId: sessionId },
        select: { id: true, studentUserId: true },
      });
      for (const p of participants) {
        const queue = await resolveOpeningCheckQueueForParticipant({
          studentUserId: p.studentUserId,
          checkPlan: plan,
          subjectId: liveSession.subjectId,
        });
        await prisma.liveParticipant.update({
          where: { id: p.id },
          data: {
            openingCheckQueue: queue.length ? queue : undefined,
            openingCheckIndex: 0,
          },
        });
      }
    }
  }

  return NextResponse.json(updated);
}
