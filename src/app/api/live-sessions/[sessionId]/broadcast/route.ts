import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { LiveWhiteboardPayloadSchema, validateWhiteboardPointBudget } from '@/lib/live/whiteboard-strokes';

const schema = z.object({
  // Which lanes receive the broadcast. Defaults to all lanes if omitted.
  lanes: z.array(z.enum(['LANE_1', 'LANE_2', 'LANE_3'])).optional(),
  // The content to push — can be an explanation route id, a message, etc.
  contentType: z.enum(['EXPLANATION', 'MESSAGE', 'PHASE', 'WHITEBOARD']),
  explanationRouteId: z.string().optional(),
  stepIndex: z.number().int().min(0).optional(),
  message: z.string().max(500).optional(),
  phaseIndex: z.number().int().nonnegative().optional(),
  whiteboard: LiveWhiteboardPayloadSchema.optional(),
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const { user, response } = await requireApiUser(['TEACHER']);
  if (response) return response;

  const userId = user.id;
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

  const { lanes, contentType, explanationRouteId, stepIndex, message, phaseIndex, whiteboard } = parsed.data;

  const broadcastPayload: Record<string, unknown> = {
    contentType,
    broadcastAt: new Date().toISOString(),
  };

  if (contentType === 'WHITEBOARD') {
    if (!whiteboard) {
      return NextResponse.json({ error: 'whiteboard payload required' }, { status: 400 });
    }
    if (!validateWhiteboardPointBudget(whiteboard.strokes)) {
      return NextResponse.json({ error: 'Whiteboard has too many points' }, { status: 400 });
    }
    broadcastPayload.whiteboard = whiteboard;
  }

  if (contentType === 'EXPLANATION' && explanationRouteId) {
    const route = await prisma.explanationRoute.findUnique({
      where: { id: explanationRouteId },
      select: {
        id: true,
        skillId: true,
        routeType: true,
        misconceptionSummary: true,
        workedExample: true,
        animationSchema: true,
        steps: { select: { id: true } },
      },
    });
    if (!route) return NextResponse.json({ error: 'Explanation route not found' }, { status: 404 });
    broadcastPayload.explanationRouteId = explanationRouteId;
    broadcastPayload.explanation = route;
    broadcastPayload.stepIndex = stepIndex ?? 0;
    broadcastPayload.totalSteps = route.animationSchema
      ? ((route.animationSchema as { steps?: unknown[] }).steps?.length ?? 1)
      : (route.steps.length || 1);
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
