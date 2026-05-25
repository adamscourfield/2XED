import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api/auth';
import { evaluateGate } from '@/features/reteach/studentReteach';

const schema = z.object({
  subjectId: z.string().min(1),
  skillId: z.string().min(1),
  assignedPathId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const result = await evaluateGate({ userId: user.id, ...parsed.data });
  return NextResponse.json(result);
}
