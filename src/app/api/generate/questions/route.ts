/**
 * POST /api/generate/questions
 *
 * Generates MCQ questions for a skill using AI and persists them to the
 * Item table so they flow through the existing live-session item pool.
 *
 * Teachers (or the system) call this to pre-populate the pool before a
 * live session. The attempts route serves these items like any other Item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateQuestionsForSkill } from '@/lib/ai/questionGenerator';
import { checkRateLimit } from '@/lib/rateLimit';
import { requireApiUser } from '@/lib/api/auth';

const schema = z.object({
  skillCode: z.string().min(1),
  count: z.number().int().min(1).max(20).optional().default(5),
});

export async function POST(req: NextRequest) {
  const { user, response } = await requireApiUser(['TEACHER', 'ADMIN']);
  if (response) return response;
  const userId = user.id;

  if (!checkRateLimit(`generate-questions:${userId}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down.' }, { status: 429 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { skillCode, count } = parsed.data;

  try {
    const items = await generateQuestionsForSkill({ skillCode, count });
    return NextResponse.json({ items, generated: items.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate/questions]', message);
    return NextResponse.json({ error: 'Question generation failed. Please try again.' }, { status: 500 });
  }
}
