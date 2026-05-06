import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { z } from 'zod';

async function authorize(lessonId: string, userId: string, role: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonModel = (prisma as any).lesson;
  if (!lessonModel) return null;
  const lesson = await lessonModel.findUnique({ where: { id: lessonId } });
  if (!lesson) return null;
  if (lesson.teacherUserId !== userId && role !== 'ADMIN') return null;
  return lesson;
}

export async function GET(_req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonModel = (prisma as any).lesson;
  if (!lessonModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const lesson = await lessonModel.findUnique({
    where: { id: params.lessonId },
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

export async function PATCH(req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const lesson = await authorize(params.lessonId, user.id, user.role ?? '');
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma as any).lesson.update({
    where: { id: params.lessonId },
    data: parsed.data,
    select: { id: true, title: true, topic: true, isPublished: true, curriculumUnitId: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const lesson = await authorize(params.lessonId, user.id, user.role ?? '');
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).lesson.delete({ where: { id: params.lessonId } });

  return NextResponse.json({ ok: true });
}
