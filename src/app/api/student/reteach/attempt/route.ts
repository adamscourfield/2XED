import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUser } from '@/lib/api/auth';
import { recordReteachAttempt } from '@/features/reteach/studentReteach';

const schema = z.object({
  subjectId: z.string().min(1),
  skillId: z.string().min(1),
  assignedPathId: z.string().min(1),
  step: z.enum(['TEACH', 'GUIDED', 'INDEPENDENT', 'RETRIEVAL']),
  stepIndex: z.number().int().min(0),
  correct: z.boolean(),
  supportLevel: z.enum(['INDEPENDENT', 'LIGHT_PROMPT', 'WORKED_EXAMPLE', 'SCAFFOLDED', 'FULL_EXPLANATION']).optional(),
  isDelayedRetrieval: z.boolean().optional(),
  responseTimeMs: z.number().finite().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['STUDENT']);
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  await recordReteachAttempt({ userId: user.id, ...parsed.data });
  return NextResponse.json({ ok: true });
}
