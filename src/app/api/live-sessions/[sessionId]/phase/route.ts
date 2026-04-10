import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

const schema = z.object({
  // Optional: explicitly set the phase index. If omitted, advance by 1.
  phaseIndex: z.number().int().nonnegative().optional(),
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
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

  if (nextIndex >= phases.length && phases.length > 0) {
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
