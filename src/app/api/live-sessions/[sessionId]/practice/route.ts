import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { selectLiveItem } from '@/lib/live/selectLiveItem';
import type { LiveItemIntent } from '@/lib/live/liveItemTypes';

const schema = z.object({
  kind: z.enum(['easier', 'similar', 'challenge', 'misconception']),
  audience: z.enum(['all', 'lane', 'individual']),
  lanes: z.array(z.enum(['LANE_1', 'LANE_2', 'LANE_3'])).min(1),
});

interface Props {
  params: Promise<{ sessionId: string }>;
}

const PRACTICE_INTENT_MAP: Record<z.infer<typeof schema>['kind'], LiveItemIntent> = {
  easier: 'PRACTICE_EASIER',
  similar: 'PRACTICE_SIMILAR',
  challenge: 'PRACTICE_CHALLENGE',
  misconception: 'PRACTICE_MISCONCEPTION',
};

export async function POST(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { kind, audience, lanes } = parsed.data;

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      teacherUserId: true,
      subjectId: true,
      skillId: true,
      currentPhaseIndex: true,
      phases: true,
      status: true,
    },
  });

  if (!liveSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (liveSession.teacherUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (liveSession.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
  }

  const phaseSkillId = Array.isArray(liveSession.phases)
    ? ((liveSession.phases[liveSession.currentPhaseIndex] as { skillId?: string } | undefined)?.skillId ?? null)
    : null;
  const targetSkillId = phaseSkillId ?? liveSession.skillId;

  if (!targetSkillId) {
    return NextResponse.json({ error: 'No skill is associated with this live session.' }, { status: 400 });
  }

  const targetParticipants = await prisma.liveParticipant.findMany({
    where: {
      liveSessionId: sessionId,
      isActive: true,
      currentLane: { in: lanes },
    },
    select: { studentUserId: true },
  });

  if (targetParticipants.length === 0) {
    return NextResponse.json({ error: 'No active students found in the selected audience.' }, { status: 400 });
  }

  const targetStudentIds = targetParticipants.map((participant) => participant.studentUserId);

  const misconceptionId =
    kind === 'misconception'
      ? await prisma.liveAttempt.findFirst({
          where: {
            liveSessionId: sessionId,
            studentUserId: { in: targetStudentIds },
            skillId: targetSkillId,
            correct: false,
            misconceptionId: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          select: { misconceptionId: true },
        }).then((row) => row?.misconceptionId ?? null)
      : null;

  const selection = await selectLiveItem({
    sessionId,
    subjectId: liveSession.subjectId,
    skillId: targetSkillId,
    intent: PRACTICE_INTENT_MAP[kind],
    audience,
    targetStudentIds,
    misconceptionId,
  });

  if (!selection.item) {
    return NextResponse.json({ error: 'Unable to select a practice item.', selection }, { status: 404 });
  }

  const content = {
    contentType: 'PRACTICE' as const,
    kind,
    audience,
    targetLanes: lanes,
    broadcastAt: new Date().toISOString(),
    item: {
      id: selection.item.id,
      question: selection.item.question,
      type: selection.item.type,
      options: selection.item.options,
      skillId: selection.item.skillId,
    },
    questionNumber: 1,
    totalQuestions: 1,
  };

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      currentContent: content as Parameters<typeof prisma.liveSession.update>[0]['data']['currentContent'],
    },
  });

  return NextResponse.json({ success: true, content, selection });
}
