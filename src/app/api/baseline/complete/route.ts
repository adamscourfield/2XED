import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';

const schema = z.object({
  sessionId: z.string().min(1),
  subjectSlug: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const session = await prisma.baselineSession.updateMany({
    where: { id: parsed.data.sessionId, userId: user.id, status: 'IN_PROGRESS' },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
  if (session.count === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
