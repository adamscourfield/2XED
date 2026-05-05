/**
 * AI question generator.
 *
 * Generates live-practice questions at runtime from enriched skill metadata.
 * Persists each question as an Item + ItemSkill so it flows through
 * the existing live-session item pool without any other changes.
 */

import { prisma } from '@/db/prisma';
import { Prisma } from '@prisma/client';
import { inferLiveItemMetadata, toPrismaJson } from '@/lib/live/liveItemMetadata';

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

interface GeneratedRubricCriterion {
  element: string;
  weight: number;
  descriptors: Array<{
    score: number;
    descriptor: string;
  }>;
}

interface GeneratedRubric {
  criteria: GeneratedRubricCriterion[];
  overall: {
    wtmTemplate: string;
    ebiTemplate: string;
  };
}

type GeneratedResponseType = 'MCQ' | 'EXTENDED_WRITING' | 'CANVAS_INPUT';

interface RawGeneratedQuestion {
  question: string;
  type: GeneratedResponseType;
  options?: string[];
  answer: string;
  misconceptionMap?: Record<string, string | null>;
  rubric?: GeneratedRubric;
}

export interface GeneratedItem {
  id: string;
  question: string;
  type: string;
  options: unknown;
  answer: string;
  misconceptionMap: Record<string, string | null>;
  skillId: string;
  skillCode: string;
}

type SubjectProfile = 'maths' | 'english' | 'general';

function detectSubjectProfile(subject: { slug?: string | null; title?: string | null } | null | undefined): SubjectProfile {
  const haystack = `${subject?.slug ?? ''} ${subject?.title ?? ''}`.toLowerCase();
  if (/english|literature|language/.test(haystack)) return 'english';
  if (/math|maths|mathematics|numeracy/.test(haystack)) return 'maths';
  return 'general';
}

function buildSystemPrompt(profile: SubjectProfile): string {
  const subjectLabel =
    profile === 'english'
      ? 'secondary English'
      : profile === 'maths'
        ? 'KS3 maths'
        : 'secondary curriculum';

  return `You are an expert ${subjectLabel} question writer.
Generate live-practice questions that are precise, unambiguous, and pedagogically sound.

Output ONLY a valid JSON array — no markdown fences, no preamble, no trailing text.

Each element must have exactly these keys:
  "question" — the question stem (string)
  "type" — one of "MCQ", "EXTENDED_WRITING", "CANVAS_INPUT"
  "options" — array of choices for MCQ, otherwise []
  "answer" — for MCQ, the exact correct option (must match one of the choices exactly); for rich-response items, a short exemplar answer
  "misconceptionMap" — object mapping each wrong option text to a misconception ID from the list provided, or {} for non-MCQ items; use null for distractors with no matching misconception
  "rubric" — null for MCQ; otherwise an object with criteria[] and overall {wtmTemplate, ebiTemplate}

General rules:
- Vary question surface forms across the set
- Keep stems student-facing and concise
- Rich-response items must be markable from the rubric alone
- Rubric criteria must use concrete element names like "accuracy", "method", "analysis", "evidence", "structure"
- Criterion weights must sum to exactly 1.0
- Each criterion must have exactly 5 descriptors with scores 0, 1, 2, 3, 4

EXAMPLES — output must follow these structures precisely:

MCQ example:
{"question":"Which number is a factor of both 12 and 18?","type":"MCQ","options":["6","5","7","11"],"answer":"6","misconceptionMap":{"5":"MC_001","7":null,"11":null},"rubric":null}

EXTENDED_WRITING example:
{"question":"Explain two reasons why the character changes in this extract.","type":"EXTENDED_WRITING","options":[],"answer":"The character becomes more confident because of X, and more suspicious because of Y.","misconceptionMap":{},"rubric":{"criteria":[{"element":"evidence","weight":0.4,"descriptors":[{"score":0,"descriptor":"No textual reference"},{"score":1,"descriptor":"Vague reference to the text"},{"score":2,"descriptor":"Relevant quotation cited"},{"score":3,"descriptor":"Quotation embedded and explained"},{"score":4,"descriptor":"Quotation analysed with precise language focus"}]},{"element":"analysis","weight":0.6,"descriptors":[{"score":0,"descriptor":"No analysis present"},{"score":1,"descriptor":"Surface description only"},{"score":2,"descriptor":"Some inference about character"},{"score":3,"descriptor":"Clear argument linked to question"},{"score":4,"descriptor":"Nuanced argument considering context and tone"}]}],"overall":{"wtmTemplate":"You clearly argued {strength}.","ebiTemplate":"To improve, develop your analysis of {weakness}."}}}`;
}

function buildTypeInstructions(profile: SubjectProfile, count: number): string {
  if (profile === 'english') {
    return count >= 4
      ? 'Generate a mixed set with at least 2 EXTENDED_WRITING items and at least 1 CANVAS_INPUT item for handwritten drafting/annotation.'
      : 'Prefer EXTENDED_WRITING or CANVAS_INPUT over MCQ unless a closed check is genuinely better.';
  }

  if (profile === 'maths') {
    return count >= 4
      ? 'Generate a mixed set with at least 1 CANVAS_INPUT item that rewards showing working, and at least 1 MCQ item for fast checking.'
      : 'Prefer a mix of MCQ and CANVAS_INPUT. Use EXTENDED_WRITING only when explanation of reasoning is genuinely the goal.';
  }

  return 'Generate a sensible mix of MCQ and rich-response items. Use rich-response items when explanation, justification, or working is the main evidence of understanding.';
}

function buildUserPrompt(skill: {
  code: string;
  name: string;
  masteryDefinition: string | null;
  misconceptions: MisconceptionEntry[];
  difficultyDimensions: DifficultyDimension[];
  generativeContext: string | null;
  subjectTitle: string | null;
  profile: SubjectProfile;
}, count: number): string {
  const mcList = skill.misconceptions
    .map((m) => `  • "${m.id}" — ${m.label}: ${m.description} [${m.frequency}]`)
    .join('\n');

  const ddList = skill.difficultyDimensions
    .map((d) => `  • ${d.dimension}: easy → "${d.easy}" / hard → "${d.hard}"`)
    .join('\n');

  return `Generate ${count} live-practice questions for this skill.

SUBJECT: ${skill.subjectTitle ?? 'Unknown subject'}
SKILL: ${skill.code} — ${skill.name}

MASTERY DEFINITION:
${skill.masteryDefinition ?? skill.name}

GENERATION CONTEXT:
${skill.generativeContext ?? 'Standard curriculum question.'}

KNOWN MISCONCEPTIONS (use these exact IDs in misconceptionMap):
${mcList || '  • None provided'}

DIFFICULTY DIMENSIONS:
${ddList || '  • Use an appropriate spread of difficulty'}

${buildTypeInstructions(skill.profile, count)}

Additional response-type rules:
- MCQ: exactly 4 distinct choices; answer must match one choice exactly; misconceptionMap should tag wrong options with IDs from the list above wherever possible, null otherwise
- EXTENDED_WRITING: no choices; supply a concise exemplar answer plus a structured rubric
- CANVAS_INPUT: no choices; design for diagramming, annotating, showing working, or handwritten composition; supply a concise exemplar answer plus a structured rubric

Generate exactly ${count} questions as a JSON array.`;
}

// Fix #6: single retry with 1 s delay on transient API failure.
async function callAnthropic(systemPrompt: string, prompt: string): Promise<RawGeneratedQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  async function attempt(): Promise<string> {
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
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const json = await res.json();
    return (json.content as Array<{ type: string; text?: string }>)
      .find((b) => b.type === 'text')?.text ?? '';
  }

  let raw: string;
  try {
    raw = await attempt();
  } catch (err) {
    console.warn('[questionGenerator] API call failed, retrying in 1 s:', (err as Error).message);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    raw = await attempt();
  }

  const text = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// Fix #2 + #8: full rubric shape validation; weight tolerance tightened to ±0.01.
function isRubric(value: unknown): value is GeneratedRubric {
  if (!value || typeof value !== 'object') return false;
  const rubric = value as GeneratedRubric;
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) return false;
  if (!rubric.overall || typeof rubric.overall !== 'object') return false;
  if (typeof rubric.overall.wtmTemplate !== 'string' || !rubric.overall.wtmTemplate.trim()) return false;
  if (typeof rubric.overall.ebiTemplate !== 'string' || !rubric.overall.ebiTemplate.trim()) return false;

  let weightTotal = 0;
  for (const criterion of rubric.criteria) {
    if (typeof criterion.element !== 'string' || !criterion.element.trim()) return false;
    if (typeof criterion.weight !== 'number' || criterion.weight <= 0 || criterion.weight > 1) return false;
    if (!Array.isArray(criterion.descriptors) || criterion.descriptors.length === 0) return false;
    for (const d of criterion.descriptors) {
      if (typeof d.score !== 'number' || d.score < 0 || d.score > 4) return false;
      if (typeof d.descriptor !== 'string' || !d.descriptor.trim()) return false;
    }
    weightTotal += criterion.weight;
  }

  return Math.abs(weightTotal - 1) < 0.01;
}

function validateQuestion(raw: RawGeneratedQuestion): string | null {
  if (!raw.question || typeof raw.question !== 'string') return 'missing question';
  if (!raw.type || !['MCQ', 'EXTENDED_WRITING', 'CANVAS_INPUT'].includes(raw.type)) return 'invalid type';
  if (!raw.answer || typeof raw.answer !== 'string') return 'missing answer';

  if (raw.type === 'MCQ') {
    if (!Array.isArray(raw.options) || raw.options.length !== 4) return 'mcq options must be array of 4';
    if (!raw.options.every((o) => typeof o === 'string' && o.trim())) return 'all mcq options must be non-empty strings';
    // Fix #4: case-insensitive answer-in-options check.
    const answerLower = raw.answer.trim().toLowerCase();
    if (!raw.options.some((o) => o.trim().toLowerCase() === answerLower)) {
      return `mcq answer "${raw.answer}" not in options`;
    }
    if (!raw.misconceptionMap || typeof raw.misconceptionMap !== 'object') return 'mcq misconceptionMap must be an object';
    return null;
  }

  if ((raw.options?.length ?? 0) > 0) return 'rich-response options must be empty';
  if (!isRubric(raw.rubric)) return 'rich-response rubric missing or invalid';
  return null;
}

function buildStoredOptions(question: RawGeneratedQuestion, normalizedAnswer: string): Prisma.InputJsonValue {
  if (question.type === 'MCQ') {
    return {
      choices: question.options,
      acceptedAnswers: [normalizedAnswer],
    } as unknown as Prisma.InputJsonValue;
  }

  return {
    acceptedAnswers: normalizedAnswer ? [normalizedAnswer] : [],
    rubric: question.rubric,
    responseMode: question.type === 'CANVAS_INPUT' ? 'draw+type' : 'write',
  } as unknown as Prisma.InputJsonValue;
}

async function persistItems(
  questions: RawGeneratedQuestion[],
  skillId: string,
  subjectId: string | null,
): Promise<GeneratedItem[]> {
  // Fix #1: fetch misconceptions so we can validate generated IDs.
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    select: { code: true, misconceptions: true },
  });
  const skillCode = skill?.code ?? '';
  const validMcIds = new Set(
    (skill?.misconceptions as unknown as MisconceptionEntry[] ?? []).map((m) => m.id),
  );

  const items: GeneratedItem[] = [];

  for (const q of questions) {
    // Fix #4: normalize MCQ answer to use the exact casing of the matching option.
    const normalizedAnswer =
      q.type === 'MCQ'
        ? (q.options!.find((o) => o.trim().toLowerCase() === q.answer.trim().toLowerCase()) ?? q.answer)
        : q.answer;

    const options = buildStoredOptions(q, normalizedAnswer);

    // Fix #1: filter misconceptionMap — drop entries whose ID isn't in the skill's taxonomy.
    const rawMap = q.type === 'MCQ' ? (q.misconceptionMap ?? {}) : {};
    const misconceptionMap: Record<string, string | null> = {};
    for (const [optionText, mcId] of Object.entries(rawMap)) {
      if (mcId === null || validMcIds.has(mcId)) {
        misconceptionMap[optionText] = mcId;
      } else {
        console.warn(
          `[questionGenerator] Dropping unknown misconception ID "${mcId}" for option "${optionText}" (skill ${skillCode})`,
        );
      }
    }

    const liveMetadata = inferLiveItemMetadata({
      question: q.question,
      type: q.type,
      options,
      answer: normalizedAnswer,
      misconceptionMap,
      source: 'AI_GENERATED',
    });

    const item = await prisma.item.create({
      data: {
        question: q.question,
        type: q.type,
        options,
        answer: normalizedAnswer,
        misconceptionMap: misconceptionMap as unknown as Prisma.InputJsonValue,
        liveMetadata: toPrismaJson(liveMetadata),
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
      options: item.options,
      answer: item.answer,
      misconceptionMap: (item.misconceptionMap ?? {}) as Record<string, string | null>,
      skillId,
      skillCode,
    });
  }

  return items;
}

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
      subject: { select: { id: true, title: true, slug: true } },
    },
  });

  if (!skill) throw new Error(`Skill not found: ${skillCode}`);

  if (!skill.masteryDefinition || !skill.misconceptions || !skill.generativeContext) {
    throw new Error(`Skill ${skillCode} has not been enriched yet. Run apply-skill-enrichment.ts first.`);
  }

  const misconceptions = skill.misconceptions as unknown as MisconceptionEntry[];
  const difficultyDimensions = (skill.difficultyDimensions ?? []) as unknown as DifficultyDimension[];
  const profile = detectSubjectProfile(skill.subject);

  const systemPrompt = buildSystemPrompt(profile);
  const prompt = buildUserPrompt(
    {
      code: skill.code,
      name: skill.name,
      masteryDefinition: skill.masteryDefinition,
      misconceptions,
      difficultyDimensions,
      generativeContext: skill.generativeContext,
      subjectTitle: skill.subject?.title ?? null,
      profile,
    },
    count,
  );

  const raw = await callAnthropic(systemPrompt, prompt);

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
