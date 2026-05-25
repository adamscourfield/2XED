import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { getItemContent } from '@/features/learn/itemContent';
import { gradeAttempt } from '@/features/learn/gradeAttempt';
import { updateSkillMastery } from '@/features/mastery/updateMastery';

const schema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  skillId: z.string().min(1),
  answer: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const session = await prisma.baselineSession.findFirst({
    where: { id: parsed.data.sessionId, userId: user.id, status: 'IN_PROGRESS' },
    select: { id: true, subjectId: true },
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const item = await prisma.item.findFirst({
    where: {
      id: parsed.data.itemId,
      skills: { some: { skillId: parsed.data.skillId } },
    },
  });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const itemContent = getItemContent(item);
  const correct = gradeAttempt(itemContent.acceptedAnswers, parsed.data.answer, itemContent.numberLine?.tolerance);

  let duplicateAttempt = false;
  const attempt = await prisma.baselineAttempt.create({
    data: {
      baselineSessionId: session.id,
      userId: user.id,
      itemId: parsed.data.itemId,
      skillId: parsed.data.skillId,
      answer: parsed.data.answer,
      correct,
    },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      duplicateAttempt = true;
      return null;
    }
    throw error;
  });

  if (attempt) {
    await prisma.baselineSession.update({
      where: { id: session.id },
      data: { itemsSeen: { increment: 1 } },
    });

    const skillAttempts = await prisma.baselineAttempt.findMany({
      where: { baselineSessionId: session.id, skillId: parsed.data.skillId },
      select: { correct: true },
    });
    await updateSkillMastery(
      user.id,
      parsed.data.skillId,
      session.subjectId,
      skillAttempts.filter((row) => row.correct).length,
      skillAttempts.length,
    );
  }

  return NextResponse.json({ correct, duplicate: duplicateAttempt });
}
