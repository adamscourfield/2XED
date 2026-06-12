import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { checkRateLimit } from '@/lib/rateLimit';

interface AiSuggestion {
  stem: string;
  type: 'MCQ' | 'SHORT_ANSWER';
  options?: string[];
  answer?: string;
}

function buildPrompt(topic: string, subject: string, unitTitle: string | null, count: number): string {
  const context = unitTitle
    ? `The lesson is part of the curriculum unit: "${unitTitle}". Target prerequisites for that unit.`
    : `No curriculum unit linked — use general prerequisites for the topic.`;

  return `Generate exactly ${count} Do Now questions for a ${subject || 'secondary'} lesson on: "${topic || 'this topic'}".

${context}

Do Now questions test what students need to ALREADY KNOW before this lesson — not the new content itself.
Keep stems concise and student-facing.
Mix question types — aim for roughly 60% MCQ and 40% SHORT_ANSWER across the set.

Output ONLY a valid JSON array with exactly ${count} items. Each item must have:
  "stem" — the question text (string)
  "type" — "MCQ" or "SHORT_ANSWER" (string)
  "options" — for MCQ: exactly 4 distinct answer choices (string[]); for SHORT_ANSWER: [] (empty array)
  "answer" — for MCQ: one of the options, matching exactly; for SHORT_ANSWER: a brief model answer (string)

Example (showing 3 items for brevity — your output must have exactly ${count}):
[
  {"stem":"What is the gradient of a horizontal line?","type":"MCQ","options":["0","1","-1","undefined"],"answer":"0"},
  {"stem":"State the formula for the area of a triangle.","type":"SHORT_ANSWER","options":[],"answer":"½ × base × height"},
  {"stem":"Which of these is a prime number?","type":"MCQ","options":["9","15","17","21"],"answer":"17"}
]`;
}

async function callAnthropic(apiKey: string, prompt: string, count: number): Promise<AiSuggestion[]> {
  // Scale token budget with question count: ~200 tokens per question + 256 overhead
  const maxTokens = Math.min(4096, count * 200 + 256);

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
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const raw =
    (json.content as Array<{ type: string; text?: string }>).find((b) => b.type === 'text')
      ?.text ?? '';

  const cleaned = raw
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();

  // Find the JSON array in case there is preamble text
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  const jsonStr = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('AI returned non-array response');
  return parsed as AiSuggestion[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; blockId: string }> }
) {
  const { lessonId, blockId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };
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

  if (!checkRateLimit(`do-now-ai:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please wait before generating again.' }, { status: 429 });
  }

  if (block.type !== 'DO_NOW')
    return NextResponse.json({ error: 'Only DO_NOW blocks support AI suggestions' }, { status: 400 });

  const body = await req.json();
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const subjectTitle = typeof body.subjectTitle === 'string' ? body.subjectTitle.trim() : '';
  const unitTitle = typeof body.curriculumUnitTitle === 'string' ? body.curriculumUnitTitle : null;

  // count: teacher-controlled, clamped server-side to valid range (5–10)
  const rawCount = typeof body.count === 'number' ? body.count : 5;
  const count = Math.max(5, Math.min(10, Math.round(rawCount)));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: 'AI not configured — ANTHROPIC_API_KEY is not set' }, { status: 503 });

  try {
    const questions = await callAnthropic(apiKey, buildPrompt(topic, subjectTitle, unitTitle, count), count);
    return NextResponse.json({ questions });
  } catch (e) {
    console.error('[do-now-ai] generation failed:', (e as Error).message);
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
  }
}
