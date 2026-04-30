/**
 * AI Lesson Planner
 *
 * Generates a structured lesson plan from either:
 *   1. A teacher's topic description (generate mode)
 *   2. Extracted text from an uploaded resource (import mode)
 *
 * Uses the same raw Anthropic fetch pattern as questionGenerator.ts.
 * Model: claude-sonnet-4-6 (more capable than haiku for lesson planning).
 */

// ── Output types ──────────────────────────────────────────────────────────────

export interface AiDoNowQuestion {
  stem: string;
  type: 'MCQ' | 'SHORT_ANSWER';
  options?: string[];
  answer?: string;
  skillCode?: string;
}

export interface AiPhaseConfig {
  skillCode: string;
  hasExplanation: boolean;
  hasCheck: boolean;
  hasPractice: boolean;
  rationale?: string;
}

export interface AiLessonPlanRaw {
  title: string;
  topicSummary: string;
  suggestedSkillCodes: string[];
  phaseConfig: AiPhaseConfig[];
  doNowQuestions: AiDoNowQuestion[];
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface SkillContext {
  code: string;
  name: string;
  strand?: string;
}

export interface GenerateLessonParams {
  topic: string;
  subjectTitle: string;
  yearGroup?: string;
  priorKnowledge?: string;
  goal?: string;
  availableSkills: SkillContext[];
}

export interface ExtractLessonParams {
  resourceText: string;
  subjectTitle: string;
  topicHint?: string;
  availableSkills: SkillContext[];
}

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert secondary school lesson planner.
Design structured, pedagogically sound lessons following the Gradual Release of Responsibility model:
  • I Do (Explain)   — teacher introduces and models the skill
  • We Do (Check)    — class checks for understanding together
  • You Do (Practice) — students work independently

Output ONLY valid JSON — no markdown fences, no preamble, no trailing text.
The JSON must exactly match the schema provided.`;

function buildSkillList(skills: SkillContext[]): string {
  if (skills.length === 0) return '  (none specified)';
  return skills
    .map((s) => `  • ${s.code} — ${s.name}${s.strand ? ` [${s.strand}]` : ''}`)
    .join('\n');
}

const JSON_SCHEMA = `{
  "title": "Lesson title (string)",
  "topicSummary": "1–2 sentence description of what the lesson covers (string)",
  "suggestedSkillCodes": ["skill codes from the AVAILABLE SKILLS list only"],
  "phaseConfig": [
    {
      "skillCode": "must be one of suggestedSkillCodes",
      "hasExplanation": true,
      "hasCheck": true,
      "hasPractice": true,
      "rationale": "one sentence explaining the phase choice (optional)"
    }
  ],
  "doNowQuestions": [
    {
      "stem": "The question text students will see",
      "type": "MCQ",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A (must exactly match one option for MCQ)",
      "skillCode": "skill code this tests (optional — use codes from AVAILABLE SKILLS if possible)"
    }
  ]
}`;

const PHASE_RULES = `Phase selection rules:
  • New content or difficult skill → hasExplanation: true, hasCheck: true, hasPractice: true
  • Recap / consolidation → hasExplanation: false, hasCheck: true, hasPractice: true
  • Extension for already-mastered skill → hasExplanation: false, hasCheck: false, hasPractice: true
  • Select 1–4 skills from AVAILABLE SKILLS — do not invent skill codes`;

const DO_NOW_RULES = `Do Now question rules:
  • Generate 3–5 questions testing what students need to already know (prerequisites)
  • MCQ: exactly 4 distinct options; answer must exactly match one option
  • SHORT_ANSWER: no options needed; provide a concise model answer
  • Keep stems concise and student-facing`;

function buildGeneratePrompt(p: GenerateLessonParams): string {
  return `Generate a lesson plan.

SUBJECT: ${p.subjectTitle}
TOPIC: ${p.topic}${p.yearGroup ? `\nYEAR GROUP: ${p.yearGroup}` : ''}${p.priorKnowledge ? `\nSTUDENT PRIOR KNOWLEDGE: ${p.priorKnowledge}` : ''}${p.goal ? `\nLESSON GOAL: ${p.goal}` : ''}

AVAILABLE SKILLS (only use codes from this list):
${buildSkillList(p.availableSkills)}

${PHASE_RULES}

${DO_NOW_RULES}

Return JSON matching this schema exactly:
${JSON_SCHEMA}`;
}

function buildExtractPrompt(p: ExtractLessonParams): string {
  return `A teacher has uploaded a teaching resource. Analyse it and generate a lesson plan.

SUBJECT: ${p.subjectTitle}${p.topicHint ? `\nTOPIC HINT: ${p.topicHint}` : ''}

RESOURCE CONTENT (first 6000 chars):
---
${p.resourceText.slice(0, 6000)}
---

AVAILABLE SKILLS (only use codes from this list):
${buildSkillList(p.availableSkills)}

Instructions:
  • Identify the main topic(s) and learning content in the resource
  • Map to the most relevant skills from AVAILABLE SKILLS
  • Resource contains worked examples → hasExplanation: true
  • Resource contains practice questions → hasPractice: true
  • Resource has comprehension checks → hasCheck: true

${DO_NOW_RULES}

Return JSON matching this schema exactly:
${JSON_SCHEMA}`;
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<AiLessonPlanRaw> {
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
      model: 'claude-sonnet-4-6',
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
  const raw =
    (json.content as Array<{ type: string; text?: string }>).find((b) => b.type === 'text')
      ?.text ?? '';

  // Strip any accidental markdown code fences
  const text = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(text) as AiLessonPlanRaw;

  if (
    !parsed.title ||
    !Array.isArray(parsed.suggestedSkillCodes) ||
    !Array.isArray(parsed.phaseConfig) ||
    !Array.isArray(parsed.doNowQuestions)
  ) {
    throw new Error('AI returned an unexpected lesson plan structure');
  }

  return parsed;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Generate a lesson plan from a teacher's topic description and context. */
export async function generateLessonFromTopic(
  params: GenerateLessonParams,
): Promise<AiLessonPlanRaw> {
  return callAnthropic(buildGeneratePrompt(params));
}

/** Extract a lesson plan from the text content of an uploaded resource. */
export async function extractLessonFromResource(
  params: ExtractLessonParams,
): Promise<AiLessonPlanRaw> {
  return callAnthropic(buildExtractPrompt(params));
}
