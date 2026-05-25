import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { z } from 'zod';

const schema = z.object({
  // Array of block IDs in new order
  blockIds: z.array(z.string()).min(1),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  const lessonModel = prisma.lesson;
  const blockModel = prisma.lessonBlock;
  if (!lessonModel || !blockModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const lesson = await lessonModel.findUnique({ where: { id: lessonId }, select: { teacherUserId: true } });
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lesson.teacherUserId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // SEC-1: Verify all submitted blockIds actually belong to this lesson
  const ownedBlocks = await blockModel.findMany({
    where: { id: { in: parsed.data.blockIds }, lessonId },
    select: { id: true },
  });
  if (ownedBlocks.length !== parsed.data.blockIds.length) {
    return NextResponse.json({ error: 'One or more blocks do not belong to this lesson' }, { status: 400 });
  }

  // Update each block's sortOrder in a transaction
  await prisma.$transaction(
    parsed.data.blockIds.map((blockId, index) =>
      prisma.lessonBlock.update({
        where: { id: blockId },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
