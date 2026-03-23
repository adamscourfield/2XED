import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiMarkingService, markSchema } from '@/features/qa/AIMarkingService';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RequestSchema = z.object({
  questionId: z.string().min(1),
  attemptId: z.string().optional(),
  answer: z.string().nullish(),
  canvasData: z
    .object({
      snapshotBase64: z.string(),
      snapshotCropped: z.string().optional(),
      strokes: z.array(z.unknown()).optional(),
    })
    .nullish(),
  mode: z.enum(['DRAFT', 'FINAL']),
});

export async function POST(req: NextRequest) {
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
