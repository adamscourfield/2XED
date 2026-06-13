import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { z } from 'zod';

async function authorize(lessonId: string, userId: string, role: string) {
  const lessonModel = prisma.lesson;
  if (!lessonModel) return null;
  const lesson = await lessonModel.findUnique({ where: { id: lessonId } });
  if (!lesson) return null;
  if (lesson.teacherUserId !== userId && role !== 'ADMIN') return null;
  return lesson;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;
  const lessonModel = prisma.lesson;
  if (!lessonModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const lesson = await lessonModel.findUnique({
    where: { id: lessonId },
    include: {
      subject: { select: { id: true, title: true, slug: true } },
      curriculumUnit: { select: { id: true, title: true } },
      blocks: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' as const },
            select: {
              id: true,
              sortOrder: true,
              itemType: true,
              answerMode: true,
              content: true,
              skillId: true,
              sourceItemId: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lesson.teacherUserId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(lesson);
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  topic: z.string().min(1).max(200).optional(),
  isPublished: z.boolean().optional(),
  curriculumUnitId: z.string().nullable().optional(),
  curriculumPromptDismissed: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;

  const lesson = await authorize(lessonId, user.id, user.role ?? '');
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: parsed.data,
    select: { id: true, title: true, topic: true, isPublished: true, curriculumUnitId: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;

  const lesson = await authorize(lessonId, user.id, user.role ?? '');
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.lesson.delete({ where: { id: lessonId } });

  return NextResponse.json({ ok: true });
}
