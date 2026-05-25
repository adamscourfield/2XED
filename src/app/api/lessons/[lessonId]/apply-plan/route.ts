/**
 * POST /api/lessons/[lessonId]/apply-plan
 *
 * Atomically applies an AI-generated lesson plan to an existing lesson:
 *   1. Updates the lesson title
 *   2. Creates a DO_NOW block and populates it with selected Do Now items
 *   3. Creates EXPLAIN / CHECK / PRACTICE blocks per skill phase config
 *
 * Returns the updated title and the full block list.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { LessonBlockType, Prisma } from '@prisma/client';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import type { AiLessonPlanResponse } from '@/app/api/teacher/ai/lesson-plan/route';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const lessonModel = prisma.lesson;
  const blockModel = prisma.lessonBlock;
  const itemModel = prisma.lessonItem;

  if (!lessonModel || !blockModel || !itemModel) {
    return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });
  }

  const lesson = await lessonModel.findUnique({
    where: { id: lessonId },
    select: { teacherUserId: true },
  });
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lesson.teacherUserId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as { plan: AiLessonPlanResponse };
  const { plan } = body;
  if (!plan || !Array.isArray(plan.matchedSkills)) {
    return NextResponse.json({ error: 'plan is required' }, { status: 400 });
  }

  // Get current max sortOrder so new blocks are appended after any existing ones.
  const lastBlock = await blockModel.findFirst({
    where: { lessonId },
    orderBy: { sortOrder: 'desc' as const },
    select: { sortOrder: true },
  });
  let sortOrder: number = lastBlock ? lastBlock.sortOrder + 1 : 0;

  interface BlockDef {
    type: LessonBlockType;
    title: string | null;
    doNowItems?: AiLessonPlanResponse['doNowItems'];
  }

  const blockDefs: BlockDef[] = [];

  // DO_NOW always first in the plan
  blockDefs.push({ type: 'DO_NOW', title: null, doNowItems: plan.doNowItems ?? [] });

  // Per-skill phase blocks
  for (const skill of plan.matchedSkills) {
    if (skill.hasExplanation) blockDefs.push({ type: 'EXPLAIN', title: skill.skillName });
    if (skill.hasCheck) blockDefs.push({ type: 'CHECK', title: null });
    if (skill.hasPractice) blockDefs.push({ type: 'PRACTICE', title: skill.skillName });
  }

  const blocks = await prisma.$transaction(async (tx) => {
    if (plan.title?.trim()) {
      await tx.lesson.update({
        where: { id: lessonId },
        data: { title: plan.title.trim() },
      });
    }

    for (const def of blockDefs) {
      const block = await tx.lessonBlock.create({
        data: { lessonId, type: def.type, title: def.title ?? null, sortOrder: sortOrder++ },
        include: { items: { orderBy: { sortOrder: 'asc' as const } } },
      });

      if (def.doNowItems && def.doNowItems.length > 0) {
        for (let i = 0; i < def.doNowItems.length; i++) {
          const doNow = def.doNowItems[i]!;
          await tx.lessonItem.create({
            data: {
              blockId: block.id,
              itemType: 'QUESTION',
              answerMode: doNow.answerMode ?? 'MCQ',
              content: (doNow.content ?? { question: doNow.stemPreview }) as Prisma.InputJsonValue,
              sourceItemId: doNow.sourceItemId ?? null,
              skillId: doNow.skillId || null,
              sortOrder: i,
            },
          });
        }
      }
    }

    return tx.lessonBlock.findMany({
      where: { lessonId },
      orderBy: { sortOrder: 'asc' as const },
      include: { items: { orderBy: { sortOrder: 'asc' as const } } },
    });
  });

  return NextResponse.json(
    { title: plan.title ?? '', blocks },
    { status: 201 },
  );
}
