/**
 * POST /api/teacher/ai/lesson-plan
 *
 * Generates a lesson plan using Claude. Two modes:
 *
 *   generate — JSON body: { mode:'generate', subjectId, topic, yearGroup?, priorKnowledge?, goal? }
 *   import   — multipart form: mode=import, subjectId, file (PDF/PPTX/DOCX), topicHint?
 *
 * Returns a text/event-stream (SSE) response. Events are newline-delimited JSON
 * objects matching the SseEvent discriminated union, terminated with `done`.
 *
 * Pipeline stages:
 *   parsing → [extracting] → ai_thinking → matching → persisting → done
 *   (extracting only fires in import mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { writeFile, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { authOptions } from '@/features/auth/authOptions';
import { prisma } from '@/db/prisma';
import {
  generateLessonFromTopic,
  extractLessonFromResource,
  type AiLessonPlanRaw,
  type AiDoNowQuestion,
  type SkillContext,
} from '@/lib/ai/lessonPlanner';

// ── Public types (imported by the client) ─────────────────────────────────────

export interface AiMatchedSkill {
  skillId: string;
  skillCode: string;
  skillName: string;
  hasExplanation: boolean;
  hasCheck: boolean;
  hasPractice: boolean;
  rationale?: string;
}

export interface AiDoNowItem {
  skillId: string;
  itemId: string;
  stemPreview: string;
}

export interface AiLessonPlanResponse {
  title: string;
  topicSummary: string;
  matchedSkills: AiMatchedSkill[];
  doNowItems: AiDoNowItem[];
}

/** Discriminated union of all SSE event shapes the server emits. */
export type SseEvent =
  | { stage: 'parsing';     message?: string }
  | { stage: 'extracting';  message?: string }
  | { stage: 'ai_thinking'; message?: string }
  | { stage: 'matching';    message?: string }
  | { stage: 'persisting';  message?: string; total?: number; saved?: number }
  | { stage: 'done';        plan: AiLessonPlanResponse }
  | { stage: 'error';       message: string };

// ── Text extraction helpers ───────────────────────────────────────────────────

function readZipEntry(filePath: string, entry: string): string {
  try {
    return execFileSync('unzip', ['-p', filePath, entry], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

function listZipEntries(filePath: string, pattern: RegExp): string[] {
  try {
    return execFileSync('unzip', ['-Z1', filePath], { encoding: 'utf8' })
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => pattern.test(l));
  } catch {
    return [];
  }
}

function extractTextFromPptx(filePath: string): string {
  const entries = listZipEntries(filePath, /^ppt\/slides\/slide\d+\.xml$/).sort((a, b) => {
    return (
      Number(a.match(/slide(\d+)/)?.[1] ?? 0) - Number(b.match(/slide(\d+)/)?.[1] ?? 0)
    );
  });
  return entries
    .map((entry) => {
      const xml = readZipEntry(filePath, entry);
      const runs: string[] = [];
      const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        const t = m[1].trim();
        if (t) runs.push(t);
      }
      return runs.join(' ');
    })
    .filter(Boolean)
    .join('\n\n');
}

function extractTextFromDocx(filePath: string): string {
  const xml = readZipEntry(filePath, 'word/document.xml');
  if (!xml) return '';
  const runs: string[] = [];
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = m[1];
    if (t.trim()) runs.push(t);
  }
  return runs.join(' ').replace(/\s+/g, ' ').trim();
}

async function extractTextFromPdf(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const { readFile } = await import('node:fs/promises');
  const buf = await readFile(filePath);
  try {
    const data = await pdfParse(buf);
    return (data.text ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

async function extractTextFromFile(
  filePath: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pptx' || mimeType.includes('presentationml')) return extractTextFromPptx(filePath);
  if (ext === '.docx' || mimeType.includes('wordprocessingml')) return extractTextFromDocx(filePath);
  if (ext === '.pdf' || mimeType === 'application/pdf') return extractTextFromPdf(filePath);
  const { readFile } = await import('node:fs/promises');
  return (await readFile(filePath, 'utf8')).slice(0, 8000);
}

// ── Skill matching ────────────────────────────────────────────────────────────

type DbSkill = { id: string; code: string; name: string; strand: string | null; sortOrder: number | null };

function matchSkillCodes(aiCodes: string[], dbSkills: DbSkill[]): DbSkill[] {
  const byCode = new Map(dbSkills.map((s) => [s.code.toUpperCase(), s]));
  const matched: DbSkill[] = [];
  for (const code of aiCodes) {
    const skill = byCode.get(code.toUpperCase());
    if (skill && !matched.some((m) => m.id === skill.id)) matched.push(skill);
  }
  return matched;
}

// ── Do Now persistence ────────────────────────────────────────────────────────

async function persistDoNowItem(
  q: AiDoNowQuestion,
  skillId: string,
  subjectId: string,
): Promise<string> {
  const options =
    q.type === 'MCQ' && Array.isArray(q.options) && q.options.length === 4
      ? { choices: q.options, acceptedAnswers: q.answer ? [q.answer] : [] }
      : { acceptedAnswers: q.answer ? [q.answer] : [], responseMode: 'write' };

  const item = await prisma.item.create({
    data: {
      question: q.stem,
      type: q.type === 'MCQ' ? 'MCQ' : 'EXTENDED_WRITING',
      options: options as never,
      answer: q.answer ?? '',
      misconceptionMap: {} as never,
      subjectId,
      skills: { create: { skillId } },
    },
    select: { id: true },
  });
  return item.id;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth (must happen before the stream starts) ───────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ── Parse request body (must read before returning the stream) ────────────
  let mode: string;
  let subjectId: string;
  let topic = '';
  let yearGroup: string | undefined;
  let priorKnowledge: string | undefined;
  let goal: string | undefined;
  let topicHint: string | undefined;
  let tmpFilePath: string | null = null;
  let uploadedFileName = '';
  let uploadedFileType = '';

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    mode = (form.get('mode') as string) ?? 'import';
    subjectId = (form.get('subjectId') as string) ?? '';
    topicHint = (form.get('topicHint') as string) || undefined;

    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    uploadedFileName = file.name;
    uploadedFileType = file.type;
    tmpFilePath = path.join(
      os.tmpdir(),
      `lb_${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`,
    );
    await writeFile(tmpFilePath, Buffer.from(await file.arrayBuffer()));
  } else {
    const body = (await req.json()) as {
      mode?: string;
      subjectId?: string;
      topic?: string;
      yearGroup?: string;
      priorKnowledge?: string;
      goal?: string;
    };
    mode = body.mode ?? 'generate';
    subjectId = body.subjectId ?? '';
    topic = body.topic ?? '';
    yearGroup = body.yearGroup || undefined;
    priorKnowledge = body.priorKnowledge || undefined;
    goal = body.goal || undefined;

    if (!topic.trim()) return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }

  if (!subjectId) return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });

  // ── Stream pipeline ───────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: SseEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // ── Stage: parsing ──────────────────────────────────────────────────
        send({ stage: 'parsing', message: 'Loading subject and skills…' });

        const subject = await prisma.subject.findUnique({
          where: { id: subjectId },
          select: { title: true },
        });
        if (!subject) {
          send({ stage: 'error', message: 'Subject not found.' });
          controller.close();
          return;
        }

        const dbSkills = await prisma.skill.findMany({
          where: { subjectId },
          select: { id: true, code: true, name: true, strand: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        });

        const availableSkills: SkillContext[] = dbSkills.map((s) => ({
          code: s.code,
          name: s.name,
          strand: s.strand ?? undefined,
        }));

        // ── Stage: extracting (import mode only) ────────────────────────────
        let resourceText = '';
        if (mode === 'import' && tmpFilePath) {
          send({ stage: 'extracting', message: `Reading ${uploadedFileName}…` });
          resourceText = await extractTextFromFile(tmpFilePath, uploadedFileType, uploadedFileName);
          if (!resourceText.trim()) {
            send({ stage: 'error', message: 'Could not extract text from the uploaded file.' });
            controller.close();
            return;
          }
        }

        // ── Stage: ai_thinking ──────────────────────────────────────────────
        send({ stage: 'ai_thinking', message: 'Claude is building your lesson…' });

        let plan: AiLessonPlanRaw;
        try {
          if (mode === 'import') {
            plan = await extractLessonFromResource({
              resourceText,
              subjectTitle: subject.title,
              topicHint,
              availableSkills,
            });
          } else {
            plan = await generateLessonFromTopic({
              topic,
              subjectTitle: subject.title,
              yearGroup,
              priorKnowledge,
              goal,
              availableSkills,
            });
          }
        } catch (err) {
          send({
            stage: 'error',
            message:
              err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')
                ? 'Anthropic API key is not configured on this server.'
                : 'Claude could not generate a lesson plan. Please try again.',
          });
          controller.close();
          return;
        }

        // ── Stage: matching ─────────────────────────────────────────────────
        send({ stage: 'matching', message: 'Matching skills to your curriculum…' });

        const matchedDbSkills = matchSkillCodes(plan.suggestedSkillCodes, dbSkills);
        const phaseByCode = new Map(
          plan.phaseConfig.map((p) => [p.skillCode.toUpperCase(), p]),
        );

        const matchedSkills: AiMatchedSkill[] = matchedDbSkills.map((s) => {
          const cfg = phaseByCode.get(s.code.toUpperCase());
          return {
            skillId: s.id,
            skillCode: s.code,
            skillName: s.name,
            hasExplanation: cfg?.hasExplanation ?? true,
            hasCheck: cfg?.hasCheck ?? true,
            hasPractice: cfg?.hasPractice ?? true,
            rationale: cfg?.rationale,
          };
        });

        // ── Stage: persisting ───────────────────────────────────────────────
        const doNowQuestions = plan.doNowQuestions.filter((q) => q.stem?.trim()).slice(0, 8);
        send({
          stage: 'persisting',
          message: `Saving ${doNowQuestions.length} Do Now question${doNowQuestions.length !== 1 ? 's' : ''}…`,
          total: doNowQuestions.length,
          saved: 0,
        });

        const firstSkillId = matchedDbSkills[0]?.id ?? '';
        const doNowItems: AiDoNowItem[] = [];

        for (const [i, q] of doNowQuestions.entries()) {
          const qSkillCode = q.skillCode?.toUpperCase() ?? '';
          const dbSkill =
            dbSkills.find((s) => s.code.toUpperCase() === qSkillCode) ?? matchedDbSkills[0];
          const resolvedSkillId = dbSkill?.id ?? firstSkillId;
          if (!resolvedSkillId) continue;

          try {
            const itemId = await persistDoNowItem(q, resolvedSkillId, subjectId);
            doNowItems.push({
              skillId: resolvedSkillId,
              itemId,
              stemPreview: q.stem.slice(0, 100) + (q.stem.length > 100 ? '…' : ''),
            });
            send({
              stage: 'persisting',
              message: `Saving questions… (${i + 1}/${doNowQuestions.length})`,
              total: doNowQuestions.length,
              saved: i + 1,
            });
          } catch (err) {
            console.warn('[lesson-plan/route] Failed to persist Do Now item:', err);
          }
        }

        // ── Done ────────────────────────────────────────────────────────────
        const response: AiLessonPlanResponse = {
          title: plan.title ?? '',
          topicSummary: plan.topicSummary ?? '',
          matchedSkills,
          doNowItems,
        };
        send({ stage: 'done', plan: response });
        controller.close();
      } catch (err) {
        send({
          stage: 'error',
          message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        });
        controller.close();
      } finally {
        if (tmpFilePath) await unlink(tmpFilePath).catch(() => void 0);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Prevent nginx proxy buffering
    },
  });
}
