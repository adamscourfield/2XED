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
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/features/auth/authOptions';
import { generateQuestionsForSkill } from '@/lib/ai/questionGenerator';

const schema = z.object({
  skillCode: z.string().min(1),
  count: z.number().int().min(1).max(20).optional().default(5),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
