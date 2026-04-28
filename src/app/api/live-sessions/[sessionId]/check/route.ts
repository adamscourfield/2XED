import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { selectLiveItem } from '@/lib/live/selectLiveItem';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_req: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

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

  const activeParticipants = await prisma.liveParticipant.findMany({
    where: {
      liveSessionId: sessionId,
      isActive: true,
    },
    select: { studentUserId: true },
  });

  if (activeParticipants.length === 0) {
    return NextResponse.json({ error: 'No active students found in this session.' }, { status: 400 });
  }

  const targetStudentIds = activeParticipants.map((participant) => participant.studentUserId);
  const selection = await selectLiveItem({
    sessionId,
    subjectId: liveSession.subjectId,
    skillId: targetSkillId,
    intent: 'CHECK',
    audience: 'all',
    targetStudentIds,
  });

  if (!selection.item) {
    return NextResponse.json({ error: 'Unable to select a check item.', selection }, { status: 404 });
  }

  const content = {
    contentType: 'CHECK' as const,
    targetLanes: ['LANE_1', 'LANE_2', 'LANE_3'],
    broadcastAt: new Date().toISOString(),
    item: {
      id: selection.item.id,
      question: selection.item.question,
      type: selection.item.type,
      options: selection.item.options,
      skillId: selection.item.skillId,
    },
  };

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      currentContent: content as Parameters<typeof prisma.liveSession.update>[0]['data']['currentContent'],
    },
  });

  return NextResponse.json({ success: true, content, selection });
}
