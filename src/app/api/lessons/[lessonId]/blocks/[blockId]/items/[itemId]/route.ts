import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { z } from 'zod';

const ANSWER_MODES = ['MCQ', 'ORDER', 'SHORT_ANSWER', 'PICK'] as const;

async function authorizeItem(lessonId: string, blockId: string, itemId: string, userId: string, role: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemModel = (prisma as any).lessonItem;
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
  { params }: { params: { lessonId: string; blockId: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const item = await authorizeItem(params.lessonId, params.blockId, params.itemId, user.id, user.role ?? '');
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma as any).lessonItem.update({
    where: { id: params.itemId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { lessonId: string; blockId: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const item = await authorizeItem(params.lessonId, params.blockId, params.itemId, user.id, user.role ?? '');
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).lessonItem.delete({ where: { id: params.itemId } });

  return NextResponse.json({ ok: true });
}
