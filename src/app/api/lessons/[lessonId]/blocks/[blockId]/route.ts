import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { z } from 'zod';

const BLOCK_TYPES = ['DO_NOW', 'EXPLAIN', 'MODEL', 'CHECK', 'PRACTICE'] as const;

async function authorizeBlock(lessonId: string, blockId: string, userId: string, role: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blockModel = (prisma as any).lessonBlock;
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
  { params }: { params: { lessonId: string; blockId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const block = await authorizeBlock(params.lessonId, params.blockId, user.id, user.role ?? '');
  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma as any).lessonBlock.update({
    where: { id: params.blockId },
    data: parsed.data,
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { lessonId: string; blockId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const block = await authorizeBlock(params.lessonId, params.blockId, user.id, user.role ?? '');
  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).lessonBlock.delete({ where: { id: params.blockId } });

  return NextResponse.json({ ok: true });
}
