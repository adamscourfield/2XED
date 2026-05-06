import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from '@/db/prisma';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  subjectId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonModel = (prisma as any).lesson;
  if (!lessonModel) return NextResponse.json({ error: 'Lesson model not available — run prisma generate' }, { status: 503 });

  const lesson = await lessonModel.create({
    data: {
      title: parsed.data.title,
      topic: parsed.data.topic,
      subjectId: parsed.data.subjectId,
      teacherUserId: user.id,
    },
    select: { id: true, title: true, topic: true, subjectId: true, isPublished: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(lesson, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonModel = (prisma as any).lesson;
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
