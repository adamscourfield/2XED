import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

const schema = z.object({
  // Optional: explicitly set the phase index. If omitted, advance by 1.
  phaseIndex: z.number().int().nonnegative().optional(),
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

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherUserId: true, phases: true, currentPhaseIndex: true },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const phases = (liveSession.phases as Array<unknown>) ?? [];
  const nextIndex = parsed.data.phaseIndex ?? (liveSession.currentPhaseIndex + 1);

  // C5: reject navigation when the session has no phases at all — previously
  // the guard `phases.length > 0` allowed arbitrary phaseIndex writes on
  // phase-free sessions, corrupting currentPhaseIndex and currentContent.
  if (phases.length === 0) {
    return NextResponse.json({ error: 'This session has no phases.' }, { status: 400 });
  }

  if (nextIndex >= phases.length) {
    return NextResponse.json({ error: 'Already at last phase' }, { status: 400 });
  }

  const currentContent = phases.length > 0 ? phases[nextIndex] ?? null : null;

  const updated = await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      currentPhaseIndex: nextIndex,
      currentContent: currentContent as Parameters<typeof prisma.liveSession.update>[0]['data']['currentContent'],
    },
    select: { id: true, currentPhaseIndex: true, currentContent: true },
  });

  return NextResponse.json(updated);
}
