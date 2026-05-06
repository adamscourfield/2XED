import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { z } from 'zod';

const ITEM_TYPES = ['SLIDE', 'QUESTION', 'IMAGE', 'CANVAS_FRAME'] as const;
const ANSWER_MODES = ['MCQ', 'ORDER', 'SHORT_ANSWER', 'PICK'] as const;

async function authorizeBlock(lessonId: string, blockId: string, userId: string, role: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blockModel = (prisma as any).lessonBlock;
  if (!blockModel) return null;
  const block = await blockModel.findUnique({
    where: { id: blockId },
    include: { lesson: { select: { teacherUserId: true, id: true } } },
  });
  if (!block || block.lessonId !== lessonId) return null;
  if (block.lesson.teacherUserId !== userId && role !== 'ADMIN') return null;
  return block;
}

const createSchema = z.object({
  itemType: z.enum(ITEM_TYPES).default('QUESTION'),
  answerMode: z.enum(ANSWER_MODES).nullable().optional(),
  content: z.record(z.unknown()),
  skillId: z.string().nullable().optional(),
  sourceItemId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { lessonId: string; blockId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const block = await authorizeBlock(params.lessonId, params.blockId, user.id, user.role ?? '');
  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemModel = (prisma as any).lessonItem;
  if (!itemModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const last = await itemModel.findFirst({
      where: { blockId: params.blockId },
      orderBy: { sortOrder: 'desc' as const },
      select: { sortOrder: true },
    });
    sortOrder = last ? last.sortOrder + 1 : 0;
  }

  const item = await itemModel.create({
    data: {
      blockId: params.blockId,
      itemType: parsed.data.itemType,
      answerMode: parsed.data.answerMode ?? null,
      content: parsed.data.content,
      skillId: parsed.data.skillId ?? null,
      sourceItemId: parsed.data.sourceItemId ?? null,
      sortOrder,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
