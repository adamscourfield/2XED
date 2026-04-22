import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { emitEvent } from '@/features/telemetry/eventService';

const schema = z.object({
  eventType: z.enum(['shown', 'acknowledged']),
  explanationRouteId: z.string().min(1),
  skillId: z.string().min(1),
  routeType: z.string().min(1),
  lane: z.enum(['LANE_1', 'LANE_2', 'LANE_3']).nullable().optional(),
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
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const participant = await prisma.liveParticipant.findUnique({
    where: {
      liveSessionId_studentUserId: {
        liveSessionId: sessionId,
        studentUserId: userId,
      },
    },
    select: { id: true, currentLane: true },
  });

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, subjectId: true },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { eventType, explanationRouteId, skillId, routeType, lane } = parsed.data;

  if (eventType === 'shown') {
    await emitEvent({
      name: 'live_explanation_shown',
      actorUserId: userId,
      studentUserId: userId,
      subjectId: liveSession.subjectId,
      skillId,
      payload: {
        liveSessionId: sessionId,
        explanationRouteId,
        skillId,
        routeType,
        lane: lane ?? participant.currentLane,
      },
    });
  } else {
    await emitEvent({
      name: 'live_explanation_acknowledged',
      actorUserId: userId,
      studentUserId: userId,
      subjectId: liveSession.subjectId,
      skillId,
      payload: {
        liveSessionId: sessionId,
        explanationRouteId,
        skillId,
        routeType,
        acknowledgedFromLane: lane ?? participant.currentLane,
      },
    });
  }

  return NextResponse.json({ success: true });
}
