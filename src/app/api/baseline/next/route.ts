import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { evaluateBaselineStop, selectNextSkill } from '@/features/baseline/baselineService';

const schema = z.object({ sessionId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const session = await prisma.baselineSession.findFirst({
    where: { id: parsed.data.sessionId, userId: user.id, status: 'IN_PROGRESS' },
    select: { id: true, subjectId: true, itemsSeen: true, maxItems: true },
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const [skills, attempts] = await Promise.all([
    prisma.skill.findMany({
      where: { subjectId: session.subjectId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        sortOrder: true,
        items: { select: { itemId: true } },
      },
    }),
    prisma.baselineAttempt.findMany({
      where: { baselineSessionId: session.id },
      select: { itemId: true, skillId: true, correct: true },
    }),
  ]);

  const attemptedItemIds = new Set(attempts.map((attempt) => attempt.itemId));
  const progress = skills.map((skill) => {
    const skillAttempts = attempts.filter((attempt) => attempt.skillId === skill.id);
    const correct = skillAttempts.filter((attempt) => attempt.correct).length;
    const remainingItemIds = skill.items.map((item) => item.itemId).filter((itemId) => !attemptedItemIds.has(itemId));
    return {
      skillId: skill.id,
      skillCode: skill.code,
      sortOrder: skill.sortOrder,
      attempts: skillAttempts.length,
      correct,
      accuracy: skillAttempts.length === 0 ? 0 : correct / skillAttempts.length,
      remainingItemIds,
    };
  });

  const stop = evaluateBaselineStop({
    itemsSeen: session.itemsSeen,
    minItems: Math.min(8, session.maxItems),
    maxItems: session.maxItems,
    confidenceTarget: 0.85,
    skillProgress: progress,
  });
  if (stop.shouldStop) {
    return NextResponse.json({ done: true, reason: stop.reason, itemsSeen: session.itemsSeen, maxItems: session.maxItems });
  }

  const nextSkill = selectNextSkill(progress);
  const itemId = nextSkill?.remainingItemIds[0];
  if (!nextSkill || !itemId) {
    return NextResponse.json({ done: true, reason: 'no_items_remaining', itemsSeen: session.itemsSeen, maxItems: session.maxItems });
  }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, question: true, type: true, options: true, answer: true },
  });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  return NextResponse.json({
    done: false,
    item: { ...item, skillId: nextSkill.skillId, skillCode: nextSkill.skillCode },
    itemsSeen: session.itemsSeen,
    maxItems: session.maxItems,
  });
}
