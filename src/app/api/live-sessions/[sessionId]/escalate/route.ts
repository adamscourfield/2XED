import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { escalateLane } from '@/lib/live/lane-router';
import { emitEvent } from '@/features/telemetry/eventService';

// failedExplanationId is required for explanation-escalation flows.
// General student help requests ("I need help") omit it and send reason/message instead.
const schema = z.object({
  failedExplanationId: z.string().min(1).optional(),
  reason: z.string().optional(),
  message: z.string().optional(),
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
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { failedExplanationId, reason, message } = parsed.data;

  // Find the participant record for this student in this session
  const participant = await prisma.liveParticipant.findUnique({
    where: {
      liveSessionId_studentUserId: {
        liveSessionId: sessionId,
        studentUserId: userId,
      },
    },
  });

  if (!participant) return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

  // General help request / student message — persist as a live event for the teacher workspace.
  if (!failedExplanationId) {
    const liveSession = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: { subjectId: true, skillId: true },
    });
    if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const eventName = reason === 'student_message' ? 'live_student_message' : 'live_student_help_request';
    await emitEvent({
      name: eventName,
      actorUserId: userId,
      studentUserId: userId,
      subjectId: liveSession.subjectId,
      skillId: liveSession.skillId ?? undefined,
      payload: {
        liveSessionId: sessionId,
        participantId: participant.id,
        studentUserId: userId,
        reason: reason ?? null,
        message: message?.trim() || null,
        lane: participant.currentLane,
      },
    });

    return NextResponse.json({ acknowledged: true });
  }

  try {
    const result = await escalateLane(participant.id, sessionId, failedExplanationId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[escalate] escalateLane failed:', (err as Error).message);
    return NextResponse.json({ error: 'Failed to escalate lane' }, { status: 500 });
  }
}
