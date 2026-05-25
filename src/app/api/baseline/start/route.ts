import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

const schema = z.object({ subjectSlug: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const subject = await prisma.subject.findUnique({ where: { slug: parsed.data.subjectSlug }, select: { id: true } });
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  const existing = await prisma.baselineSession.findFirst({
    where: { userId: user.id, subjectId: subject.id, status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
  });

  const session = existing ?? await prisma.baselineSession.create({
    data: { userId: user.id, subjectId: subject.id },
  });

  return NextResponse.json({ sessionId: session.id, maxItems: session.maxItems });
}
