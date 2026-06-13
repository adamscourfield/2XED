import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireApiUser } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/rateLimit';

interface Slide {
  body: string;
  speakerNote?: string;
}

function buildPrompt(
  topic: string,
  subjectTitle: string,
  blockTitle: string | undefined,
  variant: 'explain' | 'model',
  count: number,
): string {
  const focus = blockTitle || topic;
  const variantLabel =
    variant === 'explain'
      ? 'explanation slides (teacher-led I Do)'
      : 'worked example steps (step-by-step model)';

  return `Generate ${count} ${variantLabel}.

SUBJECT: ${subjectTitle}
SKILL/FOCUS: ${focus}

Rules:
  • Each slide body: 2–4 clear, student-facing sentences
  • Explanation slides: build understanding progressively across slides
  • Worked example steps: one step of the solution per slide; number the steps
  • speakerNote: optional 1-sentence teacher delivery cue

Return a JSON array:
[{"body": "...", "speakerNote": "..."}, ...]`;
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
  count: number,
): Promise<Slide[]> {
  const maxTokens = 1000 + count * 200;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system:
        'You are an expert secondary school teacher writing lesson slides. Output ONLY valid JSON — no markdown fences, no preamble.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const raw =
    (json.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )?.text ?? '';

  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  const jsonStr = start !== -1 && end > start ? raw.slice(start, end + 1) : raw;

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('AI returned non-array response');

  const slides = (parsed as unknown[]).filter(
    (item): item is Slide =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).body === 'string',
  );

  return slides;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> },
) {
  const { lessonId, blockId } = await params;
  const { user, response } = await requireApiUser();
  if (response) return response;

  if (!checkRateLimit(`slides-ai:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please wait before generating again.' }, { status: 429 });
  }
  const blockModel = prisma.lessonBlock;
  if (!blockModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const block = await blockModel.findUnique({
    where: { id: blockId },
    include: { lesson: { select: { teacherUserId: true, id: true } } },
  });

  if (!block || block.lessonId !== lessonId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (block.lesson.teacherUserId !== user.id && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const subjectTitle = typeof body.subjectTitle === 'string' ? body.subjectTitle.trim() : '';

  if (!topic || !subjectTitle)
    return NextResponse.json(
      { error: 'Missing required fields: topic, subjectTitle' },
      { status: 400 },
    );

  const blockTitle =
    typeof body.blockTitle === 'string' ? body.blockTitle.trim() : undefined;

  const variant = body.variant === 'explain' || body.variant === 'model' ? body.variant : null;
  if (!variant)
    return NextResponse.json(
      { error: 'Invalid or missing variant — must be "explain" or "model"' },
      { status: 400 },
    );

  const rawCount = typeof body.count === 'number' ? body.count : 3;
  const count = Math.max(1, Math.min(5, Math.round(rawCount)));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: 'AI not configured — ANTHROPIC_API_KEY is not set' },
      { status: 503 },
    );

  try {
    const slides = await callAnthropic(
      apiKey,
      buildPrompt(topic, subjectTitle, blockTitle, variant, count),
      count,
    );
    return NextResponse.json({ slides });
  } catch (e) {
    console.error('[slides-ai] generation failed:', (e as Error).message);
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
  }
}
