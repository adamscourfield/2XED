import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { handleHandback } from '@/lib/live/lane-router';

interface Props {
  params: Promise<{ sessionId: string; participantId: string }>;
}

export async function POST(_req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;
  const { sessionId, participantId } = await params;

  // Verify teacher owns the session
  const liveSession = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify participant exists in this session
  const participant = await prisma.liveParticipant.findUnique({
    where: { id: participantId },
  });
  if (!participant || participant.liveSessionId !== sessionId) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  const result = await handleHandback(participantId, sessionId, userId);

  return NextResponse.json(result);
}
