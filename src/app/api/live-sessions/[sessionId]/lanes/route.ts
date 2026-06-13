import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { getLaneView } from '@/lib/live/lane-view';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['TEACHER', 'ADMIN']);
  if (response) return response;

  const userId = user.id;
  const { sessionId } = await params;

  const liveSession = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  // L10: ADMIN can view lanes for any session (mirrors the same bypass in handback/route.ts).
  if (liveSession.teacherUserId !== userId && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const laneView = await getLaneView(sessionId);

  return NextResponse.json(laneView, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
