/**
 * AI question generator.
 *
 * Generates MCQ questions at runtime from enriched skill metadata.
 * Persists each question as an Item + ItemSkill so it flows through
 * the existing live-session item pool without any other changes.
 *
 * misconceptionMap on each Item links wrong options to misconception IDs
 * from the skill's enrichment data — the attempts route uses this to
 * write LiveAttempt.misconceptionId, closing the signal loop.
 */

import { prisma } from '@/db/prisma';
import { Prisma } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────────

interface MisconceptionEntry {
  id: string;
  label: string;
  description: string;
  frequency: string;
}

interface DifficultyDimension {
  dimension: string;
  easy: string;
  hard: string;
}

/** Shape returned by the model — validated before persisting */
interface RawGeneratedQuestion {
  question: string;
  options: string[];
  answer: string;
  misconceptionMap: Record<string, string | null>;
}

/** Shape persisted and returned to callers */
export interface GeneratedItem {
  id: string;
  question: string;
  type: string;
  options: { choices: string[]; acceptedAnswers: string[] };
  answer: string;
  /** Maps each wrong option text to a misconception ID from the skill enrichment, or null */
  misconceptionMap: Record<string, string | null>;
  skillId: string;
  skillCode: string;
}

// ── Prompt construction ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert KS3 maths question writer for UK secondary schools.
Generate multiple-choice questions that are precise, unambiguous, and pedagogically sound.

Output ONLY a valid JSON array — no markdown fences, no preamble, no trailing text.

Each element must have exactly these keys:
  "question"       — the question stem (string)
  "options"        — array of exactly 4 answer choices (strings), including the correct answer
  "answer"         — the text of the correct choice (must match one option exactly, character for character)
  "misconceptionMap" — object mapping each WRONG option text to a misconception ID from the provided list,
                       or null if the distractor is not tied to a specific misconception

Rules:
- Exactly one correct answer
- All four options must be distinct
- Distractors must be plausible and reflect real student errors, not random values
- Tag each distractor to a misconception ID wherever possible
- Vary question surface forms across the set`;

function buildUserPrompt(skill: {
  code: string;
  name: string;
  masteryDefinition: string | null;
  misconceptions: MisconceptionEntry[];
  difficultyDimensions: DifficultyDimension[];
  generativeContext: string | null;
}, count: number): string {
  const mcList = skill.misconceptions
    .map(m => `  • "${m.id}" — ${m.label}: ${m.description} [${m.frequency}]`)
    .join('\n');

  const ddList = skill.difficultyDimensions
    .map(d => `  • ${d.dimension}: easy → "${d.easy}" / hard → "${d.hard}"`)
    .join('\n');

  return `Generate ${count} MCQ questions for this KS3 maths skill.

SKILL: ${skill.code} — ${skill.name}

MASTERY DEFINITION:
${skill.masteryDefinition ?? skill.name}

GENERATION CONTEXT:
${skill.generativeContext ?? 'Standard KS3 curriculum question.'}

KNOWN MISCONCEPTIONS (use these IDs in misconceptionMap — tag every distractor you can):
${mcList}

DIFFICULTY DIMENSIONS (target a mix across the set):
${ddList}

Generate exactly ${count} questions as a JSON array.`;
}

// ── Anthropic call ───────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<RawGeneratedQuestion[]> {
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
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const raw = (json.content as Array<{ type: string; text?: string }>)
    .find(b => b.type === 'text')?.text ?? '';

  // Strip markdown fences if model wraps output
  const text = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateQuestion(raw: RawGeneratedQuestion): string | null {
  if (!raw.question || typeof raw.question !== 'string') return 'missing question';
  if (!Array.isArray(raw.options) || raw.options.length !== 4) return 'options must be array of 4';
  if (!raw.options.every(o => typeof o === 'string' && o.trim())) return 'all options must be non-empty strings';
  if (!raw.answer || typeof raw.answer !== 'string') return 'missing answer';
  if (!raw.options.includes(raw.answer)) return `answer "${raw.answer}" not in options`;
  if (typeof raw.misconceptionMap !== 'object') return 'misconceptionMap must be an object';
  return null;
}

// ── DB persistence ───────────────────────────────────────────────────────────

async function persistItems(
  questions: RawGeneratedQuestion[],
  skillId: string,
  subjectId: string | null,
): Promise<GeneratedItem[]> {
  const skill = await prisma.skill.findUnique({ where: { id: skillId }, select: { code: true } });
  const skillCode = skill?.code ?? '';

  const items: GeneratedItem[] = [];

  for (const q of questions) {
    const options = {
      choices: q.options,
      acceptedAnswers: [q.answer],
    };

    const item = await prisma.item.create({
      data: {
        question: q.question,
        type: 'MCQ',
        options: options as unknown as Prisma.InputJsonValue,
        answer: q.answer,
        misconceptionMap: q.misconceptionMap as unknown as Prisma.InputJsonValue,
        subjectId: subjectId ?? undefined,
        skills: {
          create: { skillId },
        },
      },
      select: { id: true, question: true, type: true, options: true, answer: true, misconceptionMap: true },
    });

    items.push({
      id: item.id,
      question: item.question,
      type: item.type,
      options: item.options as { choices: string[]; acceptedAnswers: string[] },
      answer: item.answer,
      misconceptionMap: (item.misconceptionMap ?? {}) as Record<string, string | null>,
      skillId,
      skillCode,
    });
  }

  return items;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate questions for a skill and persist them to the Item table.
 * Returns the created Item records ready to be served to students.
 */
export async function generateQuestionsForSkill(params: {
  skillCode: string;
  count?: number;
}): Promise<GeneratedItem[]> {
  const { skillCode, count = 5 } = params;

  const skill = await prisma.skill.findFirst({
    where: { code: skillCode },
    select: {
      id: true,
      code: true,
      name: true,
      masteryDefinition: true,
      misconceptions: true,
      difficultyDimensions: true,
      generativeContext: true,
      subject: { select: { id: true } },
    },
  });

  if (!skill) throw new Error(`Skill not found: ${skillCode}`);

  if (!skill.masteryDefinition || !skill.misconceptions || !skill.generativeContext) {
    throw new Error(`Skill ${skillCode} has not been enriched yet. Run apply-skill-enrichment.ts first.`);
  }

  const misconceptions = skill.misconceptions as unknown as MisconceptionEntry[];
  const difficultyDimensions = ((skill.difficultyDimensions ?? []) as unknown as DifficultyDimension[]);

  const prompt = buildUserPrompt(
    {
      code: skill.code,
      name: skill.name,
      masteryDefinition: skill.masteryDefinition,
      misconceptions,
      difficultyDimensions,
      generativeContext: skill.generativeContext,
    },
    count,
  );

  const raw = await callAnthropic(prompt);

  // Validate and filter
  const valid: RawGeneratedQuestion[] = [];
  for (const q of raw) {
    const err = validateQuestion(q);
    if (err) {
      console.warn(`[questionGenerator] Skipping invalid question (${err}):`, q.question?.slice(0, 60));
      continue;
    }
    valid.push(q);
  }

  if (valid.length === 0) {
    throw new Error('AI returned no valid questions. Check the prompt or API response.');
  }

  const subjectId = skill.subject?.id ?? null;
  return persistItems(valid, skill.id, subjectId);
}

/**
 * Ensure a skill has at least `minItems` items in the pool.
 * Generates and persists the deficit if the pool is thin.
 * Safe to call concurrently — excess items are harmless.
 */
export async function ensureItemPool(params: {
  skillCode: string;
  skillId: string;
  minItems?: number;
  generateCount?: number;
}): Promise<void> {
  const { skillCode, skillId, minItems = 3, generateCount = 5 } = params;

  const existing = await prisma.itemSkill.count({ where: { skillId } });
  if (existing >= minItems) return;

  console.log(`[questionGenerator] Pool thin for ${skillCode} (${existing} items) — generating ${generateCount}`);
  await generateQuestionsForSkill({ skillCode, count: generateCount });
}
