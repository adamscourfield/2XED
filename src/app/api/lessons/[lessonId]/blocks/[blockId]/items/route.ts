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
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  const { lessonId, blockId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const block = await authorizeBlock(lessonId, blockId, user.id, user.role ?? '');
  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemModel = (prisma as any).lessonItem;
  if (!itemModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  // R3 + R8: validate content shape for QUESTION items on creation
  if (parsed.data.itemType === 'QUESTION') {
    const c = parsed.data.content as Record<string, unknown>;

    // R8: reject completely empty content — at minimum a question string must be present
    // (allow blank string so teachers can create a placeholder and fill in later)
    if (c.question !== undefined && typeof c.question !== 'string') {
      return NextResponse.json({ error: 'content.question must be a string' }, { status: 400 });
    }

    if (parsed.data.answerMode === 'MCQ') {
      // options must be an array when provided
      if (c.options !== undefined && !Array.isArray(c.options)) {
        return NextResponse.json({ error: 'MCQ content.options must be an array' }, { status: 400 });
      }
      // correctIndex must be a non-negative integer when provided
      if (c.correctIndex !== undefined) {
        if (typeof c.correctIndex !== 'number' || !Number.isInteger(c.correctIndex) || (c.correctIndex as number) < 0) {
          return NextResponse.json({ error: 'MCQ content.correctIndex must be a non-negative integer' }, { status: 400 });
        }
      }
    }

    if (parsed.data.answerMode === 'SHORT_ANSWER') {
      if (c.answer !== undefined && typeof c.answer !== 'string') {
        return NextResponse.json({ error: 'SHORT_ANSWER content.answer must be a string' }, { status: 400 });
      }
    }
  }

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const last = await itemModel.findFirst({
      where: { blockId },
      orderBy: { sortOrder: 'desc' as const },
      select: { sortOrder: true },
    });
    sortOrder = last ? last.sortOrder + 1 : 0;
  }

  const item = await itemModel.create({
    data: {
      blockId,
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
