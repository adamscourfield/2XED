import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { z } from 'zod';

const postSchema = z.object({
  skillId: z.string().min(1),
  blockType: z.string().min(1),
  sortOrder: z.number().int(),
  content: z.string(),
  sourceRef: z.string().min(1),
});

const deleteSchema = z.object({
  blockId: z.string().min(1),
});

async function requireTeacher() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });
  }

  const { skillId, blockType, sortOrder, content, sourceRef } = parsed.data;

  const block = await prisma.englishContentBlock.create({
    data: {
      skillId,
      blockType,
      sortOrder,
      content,
      sourceRef,
      isPublished: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: block.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await requireTeacher();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });
  }

  const { blockId } = parsed.data;

  try {
    await prisma.englishContentBlock.delete({ where: { id: blockId } });
  } catch {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
