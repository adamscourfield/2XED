/**
 * POST /api/curriculum-plans/[planId]/units/ai-suggest
 *
 * Two modes:
 *   describe — JSON body: { mode: 'describe', unitTitle, description? }
 *   import   — multipart form: mode=import, file (PDF/CSV/DOCX/PPTX), unitTitle?
 *
 * Returns:
 *   { aims, successMeasures, suggestedSkillCodes: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { writeFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import { extractTextFromFile, FILE_TEXT_LIMIT } from '@/lib/ai/fileExtractor';
import { checkRateLimit } from '@/lib/rateLimit';

// ── Public types ──────────────────────────────────────────────────────────────

export interface UnitAiSuggestion {
  aims: string;
  successMeasures: string;
  suggestedSkillCodes: string[];
}

// ── Prompt ────────────────────────────────────────────────────────────────────

interface SkillRef { code: string; name: string }

function buildPrompt(
  subjectTitle: string,
  unitTitle: string,
  skills: SkillRef[],
  content: string,
  mode: 'describe' | 'import',
): string {
  const skillList = skills.length > 0
    ? skills.map((s) => `  • ${s.code} — ${s.name}`).join('\n')
    : '  (none available)';

  const contentSection = mode === 'import'
    ? `SCHEME OF WORK / RESOURCE CONTENT:\n---\n${content.slice(0, FILE_TEXT_LIMIT)}\n---`
    : content
      ? `TEACHER DESCRIPTION: ${content}`
      : '';

  return `You are a secondary school curriculum planning assistant.

SUBJECT: ${subjectTitle}
UNIT TITLE: ${unitTitle}
${contentSection}

AVAILABLE SKILL CODES (only suggest codes from this list):
${skillList}

Generate curriculum planning content for this unit. Output ONLY valid JSON — no markdown, no preamble.

Schema:
{
  "aims": "2–4 bullet-point learning aims as a single string, each on its own line starting with •",
  "successMeasures": "2–3 bullet-point success criteria as a single string, each on its own line starting with •",
  "suggestedSkillCodes": ["skill codes from the available list that this unit covers — max 8"]
}

Rules:
- aims: what students will be able to DO by the end of this unit (use action verbs)
- successMeasures: observable evidence the teacher can use to judge success
- suggestedSkillCodes: only codes from AVAILABLE SKILL CODES — never invent new codes
- If the resource/description covers multiple topics, focus on the most prominent ones
- Keep language clear and teacher-facing`;
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<UnitAiSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Log details server-side but never expose them to the client
    console.error(`[unit ai-suggest] Anthropic API error ${res.status}: ${errText}`);
    throw new Error('AI generation failed');
  }

  const json = await res.json();
  const raw =
    (json.content as Array<{ type: string; text?: string }>).find((b) => b.type === 'text')
      ?.text ?? '';

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const jsonStr = start !== -1 && end > start ? raw.slice(start, end + 1) : raw;

  const parsed = JSON.parse(jsonStr) as UnitAiSuggestion;
  if (typeof parsed.aims !== 'string' || typeof parsed.successMeasures !== 'string') {
    throw new Error('Unexpected AI response structure');
  }
  return parsed;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'LEADERSHIP') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!checkRateLimit(`unit-ai-suggest:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests — please wait a minute before generating again.' },
      { status: 429 },
    );
  }

  // Verify the plan belongs to this teacher
  const planModel = prisma.curriculumPlan;
  if (!planModel) return NextResponse.json({ error: 'Model unavailable' }, { status: 503 });

  const plan = await planModel.findUnique({
    where: { id: planId },
    select: { teacherUserId: true, subjectId: true },
  });
  if (!plan || plan.teacherUserId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Load subject + skills
  const subject = await prisma.subject.findUnique({
    where: { id: plan.subjectId },
    select: { title: true },
  });
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

  const skills = await prisma.skill.findMany({
    where: { subjectId: plan.subjectId },
    select: { code: true, name: true },
    orderBy: { sortOrder: 'asc' },
  });

  // Parse request
  let mode: 'describe' | 'import' = 'describe';
  let unitTitle = '';
  let description = '';
  let tmpFilePath: string | null = null;
  let uploadedFileName = '';
  let uploadedFileType = '';

  const contentType = req.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('multipart/form-data')) {
      mode = 'import';
      const form = await req.formData();
      unitTitle = (form.get('unitTitle') as string) ?? '';
      const file = form.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      // H3: reject oversized uploads before writing to disk
      const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10 MB.' },
          { status: 413 },
        );
      }

      uploadedFileName = file.name;
      uploadedFileType = file.type;
      tmpFilePath = path.join(
        os.tmpdir(),
        `unit_${crypto.randomUUID()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`,
      );
      await writeFile(tmpFilePath, Buffer.from(await file.arrayBuffer()));
      description = await extractTextFromFile(tmpFilePath, uploadedFileType, uploadedFileName);
      if (!description.trim()) {
        return NextResponse.json({ error: 'Could not extract text from the uploaded file.' }, { status: 422 });
      }
    } else {
      const body = (await req.json()) as { mode?: string; unitTitle?: string; description?: string };
      mode = 'describe';
      unitTitle = body.unitTitle ?? '';
      description = body.description ?? '';
    }

    if (!unitTitle.trim()) return NextResponse.json({ error: 'unitTitle is required' }, { status: 400 });

    const prompt = buildPrompt(subject.title, unitTitle, skills, description, mode);
    const suggestion = await callAnthropic(prompt);

    return NextResponse.json(suggestion);
  } catch (e) {
    console.error('[unit ai-suggest]', (e as Error).message);
    // H4: never expose internal error details (may include API keys, model names, etc.)
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
  } finally {
    if (tmpFilePath) await unlink(tmpFilePath).catch(() => void 0);
  }
}
