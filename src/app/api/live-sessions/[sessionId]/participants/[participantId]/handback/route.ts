import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { handleHandback } from '@/lib/live/lane-router';

interface HandbackItem {
  id: string;
  question: string;
  type: string;
  options: unknown;
}

interface Props {
  params: Promise<{ sessionId: string; participantId: string }>;
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['TEACHER', 'ADMIN']);
  if (response) return response;

  const userId = user.id;
  const { sessionId, participantId } = await params;

  // Verify teacher owns the session. ADMINs are allowed to hand back students
  // in any session — their userId won't match teacherUserId, so skip the check.
  const liveSession = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify participant exists in this session
  const participant = await prisma.liveParticipant.findUnique({
    where: { id: participantId },
  });
  if (!participant || participant.liveSessionId !== sessionId) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  const result = await handleHandback(participantId, sessionId, userId);

  let handbackItem: HandbackItem | null = null;
  if (result.shadowCheckItemId) {
    const item = await prisma.item.findUnique({
      where: { id: result.shadowCheckItemId },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
      },
    });
    if (item) {
      handbackItem = item;
    }
  }

  return NextResponse.json({
    ...result,
    handbackItem,
  });
}
