import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { z } from 'zod';

const BLOCK_TYPES = ['DO_NOW', 'EXPLAIN', 'MODEL', 'CHECK', 'PRACTICE'] as const;

async function authorizeBlock(lessonId: string, blockId: string, userId: string, role: string) {
  const blockModel = prisma.lessonBlock;
  if (!blockModel) return null;
  const block = await blockModel.findUnique({
    where: { id: blockId },
    include: { lesson: { select: { teacherUserId: true } } },
  });
  if (!block || block.lessonId !== lessonId) return null;
  if (block.lesson.teacherUserId !== userId && role !== 'ADMIN') return null;
  return block;
}

const patchSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  type: z.enum(BLOCK_TYPES).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  const { lessonId, blockId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;

  const block = await authorizeBlock(lessonId, blockId, user.id, user.role ?? '');
  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const updated = await prisma.lessonBlock.update({
    where: { id: blockId },
    data: parsed.data,
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  const { lessonId, blockId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;

  const block = await authorizeBlock(lessonId, blockId, user.id, user.role ?? '');
  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.lessonBlock.delete({ where: { id: blockId } });

  return NextResponse.json({ ok: true });
}
