import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { aiMarkingService, markSchema } from '@/features/qa/AIMarkingService';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SNAPSHOT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB as base64 characters

const RequestSchema = z.object({
  questionId: z.string().min(1),
  attemptId: z.string().optional(),
  answer: z.string().nullish(),
  canvasData: z
    .object({
      snapshotBase64: z.string().max(SNAPSHOT_MAX_BYTES),
      snapshotCropped: z.string().max(SNAPSHOT_MAX_BYTES).optional(),
      strokes: z.array(z.unknown()).optional(),
    })
    .nullish(),
  mode: z.enum(['DRAFT', 'FINAL']),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  if (!checkRateLimit(`mark:${userId}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { questionId, attemptId, answer, canvasData, mode } = parsed.data;

    const result = await aiMarkingService.mark({
      questionId,
      attemptId,
      answer: answer ?? null,
      canvasData: canvasData ?? null,
      mode,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('[/api/mark]', error.message);

    if (error.message === 'No answer provided' || error.message.startsWith('Question')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Marking failed', details: error.message },
      { status: 500 }
    );
  }
}
