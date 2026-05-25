import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { z } from 'zod';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  const { lessonId, blockId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  const blockModel = prisma.lessonBlock;
  if (!blockModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const block = await blockModel.findUnique({
    where: { id: blockId },
    include: { lesson: { select: { teacherUserId: true } } },
  });
  if (!block || block.lessonId !== lessonId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (block.lesson.teacherUserId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.object({ itemIds: z.array(z.string()).min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // SEC-2: Verify all submitted itemIds actually belong to this block
  const itemModel = prisma.lessonItem;
  const ownedItems = await itemModel.findMany({
    where: { id: { in: parsed.data.itemIds }, blockId },
    select: { id: true },
  });
  if (ownedItems.length !== parsed.data.itemIds.length) {
    return NextResponse.json({ error: 'One or more items do not belong to this block' }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.itemIds.map((itemId, index) =>
      prisma.lessonItem.update({
        where: { id: itemId },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
