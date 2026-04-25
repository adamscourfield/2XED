import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { resolveOpeningCheckQueueForParticipant, type LiveCheckPlan } from '@/lib/live/live-check-plan';

const schema = z.object({
  joinCode: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = (session.user as { id: string }).id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { joinCode } = parsed.data;

  const liveSession = await prisma.liveSession.findUnique({
    where: { joinCode: joinCode.toUpperCase() },
    include: {
      skill: { select: { id: true, code: true, name: true } },
      subject: { select: { id: true, title: true, slug: true } },
    },
  });

  if (!liveSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (liveSession.status !== 'LOBBY' && liveSession.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session is not joinable' }, { status: 400 });
  }

  // Validate the student is enrolled in the session's classroom
  const enrollment = await prisma.classroomEnrollment.findUnique({
    where: {
      classroomId_studentUserId: {
        classroomId: liveSession.classroomId,
        studentUserId: userId,
      },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this classroom' }, { status: 403 });
  }

  // Upsert participant record (handles rejoins)
  const participant = await prisma.liveParticipant.upsert({
    where: {
      liveSessionId_studentUserId: {
        liveSessionId: liveSession.id,
        studentUserId: userId,
      },
    },
    update: { isActive: true, joinedAt: new Date() },
    create: {
      liveSessionId: liveSession.id,
      studentUserId: userId,
    },
    select: { id: true, openingCheckQueue: true },
  });

  if (liveSession.status === 'ACTIVE') {
    const plan = liveSession.checkPlan as LiveCheckPlan | null | undefined;
    if (plan && (plan.shared?.length || Object.keys(plan.perStudent ?? {}).length)) {
      const queue = await resolveOpeningCheckQueueForParticipant({
        studentUserId: userId,
        checkPlan: plan,
        subjectId: liveSession.subjectId,
      });
      const hasQueue =
        Array.isArray(participant.openingCheckQueue) &&
        (participant.openingCheckQueue as unknown[]).length > 0;
      if (queue.length > 0 && !hasQueue) {
        await prisma.liveParticipant.update({
          where: { id: participant.id },
          data: { openingCheckQueue: queue, openingCheckIndex: 0 },
        });
      }
    }
  }

  return NextResponse.json({
    sessionId: liveSession.id,
    status: liveSession.status,
    subject: liveSession.subject,
    skill: liveSession.skill,
  });
}
