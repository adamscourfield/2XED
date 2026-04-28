import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { escalateLane } from '@/lib/live/lane-router';

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

  const { failedExplanationId } = parsed.data;

  // General help request (no failed explanation ID) — acknowledge without lane mutation.
  // This covers "I need help" taps and student messages from the live UI.
  if (!failedExplanationId) {
    return NextResponse.json({ acknowledged: true });
  }

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

  const result = await escalateLane(participant.id, sessionId, failedExplanationId);

  return NextResponse.json(result);
}
