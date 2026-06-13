import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { z } from 'zod';

const BLOCK_TYPES = ['DO_NOW', 'EXPLAIN', 'MODEL', 'CHECK', 'PRACTICE'] as const;

const createSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  title: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;
  const lessonModel = prisma.lesson;
  const blockModel = prisma.lessonBlock;
  if (!lessonModel || !blockModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const lesson = await lessonModel.findUnique({ where: { id: lessonId }, select: { teacherUserId: true } });
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lesson.teacherUserId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // Determine sort order if not provided
  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const last = await blockModel.findFirst({
      where: { lessonId },
      orderBy: { sortOrder: 'desc' as const },
      select: { sortOrder: true },
    });
    sortOrder = last ? last.sortOrder + 1 : 0;
  }

  const block = await blockModel.create({
    data: {
      lessonId,
      type: parsed.data.type,
      title: parsed.data.title ?? null,
      sortOrder,
    },
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
  });

  return NextResponse.json(block, { status: 201 });
}
