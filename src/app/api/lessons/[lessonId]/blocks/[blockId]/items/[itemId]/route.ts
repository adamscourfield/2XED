import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { z } from 'zod';

const ANSWER_MODES = ['MCQ', 'ORDER', 'SHORT_ANSWER', 'PICK'] as const;

async function authorizeItem(lessonId: string, blockId: string, itemId: string, userId: string, role: string) {
  const itemModel = prisma.lessonItem;
  if (!itemModel) return null;
  const item = await itemModel.findUnique({
    where: { id: itemId },
    include: {
      block: {
        include: { lesson: { select: { teacherUserId: true, id: true } } },
      },
    },
  });
  if (!item || item.blockId !== blockId || item.block.lessonId !== lessonId) return null;
  if (item.block.lesson.teacherUserId !== userId && role !== 'ADMIN') return null;
  return item;
}

const patchSchema = z.object({
  answerMode: z.enum(ANSWER_MODES).nullable().optional(),
  content: z.record(z.unknown()).optional(),
  skillId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string; itemId: string }> }
) {
  const { lessonId, blockId, itemId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;

  const item = await authorizeItem(lessonId, blockId, itemId, user.id, user.role ?? '');
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  // Medium #14: server-side content structure validation for QUESTION items
  const answerMode = parsed.data.answerMode ?? item.answerMode;
  const content = parsed.data.content as Record<string, unknown> | undefined;
  if (content !== undefined && answerMode === 'MCQ') {
    if (typeof content.question !== 'string') {
      return NextResponse.json({ error: 'MCQ content must have a question string' }, { status: 400 });
    }
    if (content.options !== undefined && !Array.isArray(content.options)) {
      return NextResponse.json({ error: 'MCQ content.options must be an array' }, { status: 400 });
    }
    if (content.correctIndex !== undefined && typeof content.correctIndex !== 'number') {
      return NextResponse.json({ error: 'MCQ content.correctIndex must be a number' }, { status: 400 });
    }
  }
  if (content !== undefined && answerMode === 'SHORT_ANSWER') {
    if (typeof content.question !== 'string') {
      return NextResponse.json({ error: 'SHORT_ANSWER content must have a question string' }, { status: 400 });
    }
  }

  const updateData: Prisma.LessonItemUncheckedUpdateInput = {};
  if (parsed.data.answerMode !== undefined) updateData.answerMode = parsed.data.answerMode;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content as Prisma.InputJsonValue;
  if (parsed.data.skillId !== undefined) updateData.skillId = parsed.data.skillId;
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;

  const updated = await prisma.lessonItem.update({
    where: { id: itemId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string; itemId: string }> }
) {
  const { lessonId, blockId, itemId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;

  const item = await authorizeItem(lessonId, blockId, itemId, user.id, user.role ?? '');
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.lessonItem.delete({ where: { id: itemId } });

  return NextResponse.json({ ok: true });
}
