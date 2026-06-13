import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  subjectId: z.string().min(1),
  curriculumUnitId: z.string().optional(),
  yearGroup: z.string().optional(),
  isCopy: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  const lessonModel = prisma.lesson;
  if (!lessonModel) return NextResponse.json({ error: 'Lesson model not available — run prisma generate' }, { status: 503 });

  const lesson = await lessonModel.create({
    data: {
      title: parsed.data.title,
      topic: parsed.data.topic,
      subjectId: parsed.data.subjectId,
      teacherUserId: user.id,
      curriculumUnitId: parsed.data.curriculumUnitId ?? null,
      yearGroup: parsed.data.yearGroup ?? null,
      isCopy: parsed.data.isCopy ?? false,
      // If created from within a curriculum unit, dismiss the linking prompt
      curriculumPromptDismissed: !!parsed.data.curriculumUnitId,
    },
    select: { id: true, title: true, topic: true, subjectId: true, isPublished: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(lesson, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const lessonModel = prisma.lesson;
  if (!lessonModel) return NextResponse.json({ lessons: [] });

  const lessons = await lessonModel.findMany({
    where: { teacherUserId: user.id },
    orderBy: { updatedAt: 'desc' as const },
    take: 200,
    include: {
      subject: { select: { title: true, slug: true } },
      _count: { select: { blocks: true } },
    },
  });

  return NextResponse.json({ lessons });
}
