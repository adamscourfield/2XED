import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { z } from 'zod';

export async function PUT(
  req: NextRequest,
  { params }: { params: { lessonId: string; blockId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blockModel = (prisma as any).lessonBlock;
  if (!blockModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const block = await blockModel.findUnique({
    where: { id: params.blockId },
    include: { lesson: { select: { teacherUserId: true } } },
  });
  if (!block || block.lessonId !== params.lessonId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (block.lesson.teacherUserId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.object({ itemIds: z.array(z.string()).min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  await prisma.$transaction(
    parsed.data.itemIds.map((itemId, index) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).lessonItem.update({
        where: { id: itemId },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
