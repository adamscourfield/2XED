import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';

const schema = z.object({
  // Which lanes receive the broadcast. Defaults to all lanes if omitted.
  lanes: z.array(z.enum(['LANE_1', 'LANE_2', 'LANE_3'])).optional(),
  // The content to push — can be an explanation route id, a message, etc.
  contentType: z.enum(['EXPLANATION', 'MESSAGE', 'PHASE']),
  explanationRouteId: z.string().optional(),
  message: z.string().max(500).optional(),
  phaseIndex: z.number().int().nonnegative().optional(),
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherUserId: true, status: true },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { lanes, contentType, explanationRouteId, message, phaseIndex } = parsed.data;

  const broadcastPayload: Record<string, unknown> = {
    contentType,
    broadcastAt: new Date().toISOString(),
  };

  if (contentType === 'EXPLANATION' && explanationRouteId) {
    // Verify explanation route exists
    const route = await prisma.explanationRoute.findUnique({
      where: { id: explanationRouteId },
      select: { id: true, skillId: true, routeType: true, misconceptionSummary: true },
    });
    if (!route) return NextResponse.json({ error: 'Explanation route not found' }, { status: 404 });
    broadcastPayload.explanationRouteId = explanationRouteId;
    broadcastPayload.explanation = route;
  }

  if (contentType === 'MESSAGE' && message) {
    broadcastPayload.message = message;
  }

  if (contentType === 'PHASE' && phaseIndex !== undefined) {
    broadcastPayload.phaseIndex = phaseIndex;
  }

  // Store broadcast as currentContent on the session so students can poll it
  const contentWithLanes = {
    ...broadcastPayload,
    targetLanes: lanes ?? ['LANE_1', 'LANE_2', 'LANE_3'],
  };

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { currentContent: contentWithLanes as Parameters<typeof prisma.liveSession.update>[0]['data']['currentContent'] },
  });

  return NextResponse.json({ success: true, content: contentWithLanes });
}
