/**
 * generate-missing-routes.ts
 *
 * Generates ExplanationRoute (A / B / C) + ExplanationStep records for every
 * enriched skill that currently has no explanation routes.
 *
 * One API call per skill generates all three routes and their steps in one shot.
 * Routes are persisted using the same upsert pattern as the hand-authored
 * ensure-routes-*.ts scripts, passing through validateExplanationStepWrite so
 * the data is guaranteed valid.
 *
 * Estimated: ~52 skills × 8 s delay ≈ 7 minutes, ~$1.50.
 * Safe to re-run — skips skills that already have at least one route.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' \
 *     prisma/generate-missing-routes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env without dotenv dependency
const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { validateExplanationStepWrite } from '../src/features/learn/explanationStepWriteGuard';

const prisma = new PrismaClient();
const DELAY_MS = 8_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MisconceptionEntry {
  id: string;
  label: string;
  description: string;
  frequency: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface GeneratedStep {
  stepOrder: number;
  title: string;
  explanation: string;
  checkpointQuestion: string;
  checkpointOptions?: string[];
  checkpointAnswer: string;
}

interface GeneratedRoute {
  routeType: 'A' | 'B' | 'C';
  misconceptionSummary: string;
  workedExample: string;
  guidedPrompt: string;
  guidedAnswer: string;
  steps: GeneratedStep[];
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert KS3 maths teacher writing explanation routes for a live classroom tool.

For each skill you receive, generate exactly THREE explanation routes (A, B, C) that a teacher can deploy to students who are struggling.

Route A — Concrete/worked example approach: clear first-principles walkthrough with a fully worked numerical example.
Route B — Misconception-targeted: directly addresses the most frequent student error. Name the error, show why it's wrong, show the correct approach.
Route C — Alternative representation or method: a different way of thinking about the same concept.

Each route must have exactly 3 steps. Each step builds on the last and ends with a checkpoint question to verify understanding.

For checkpoint questions:
- Short-answer questions: omit checkpointOptions (leave as empty array or omit the key)
- True/False questions: checkpointOptions must be exactly ["True", "False"] and checkpointAnswer must be "True" or "False"
- MCQ questions: checkpointOptions must be 3–4 distinct choices and checkpointAnswer must exactly match one option

Output ONLY valid JSON — no markdown fences, no preamble, no trailing text.

Output a JSON array of exactly 3 objects, each with this exact shape:
{
  "routeType": "A" | "B" | "C",
  "misconceptionSummary": string,  // one sentence: the error this route addresses
  "workedExample": string,          // a concrete numerical worked example
  "guidedPrompt": string,           // a question the teacher poses at the end
  "guidedAnswer": string,           // the expected student answer
  "steps": [
    {
      "stepOrder": 1,
      "title": string,
      "explanation": string,        // 2–4 sentences, clear and precise
      "checkpointQuestion": string,
      "checkpointOptions": string[] | [],
      "checkpointAnswer": string
    },
    ... (exactly 3 steps)
  ]
}`;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(skill: {
  code: string;
  name: string;
  masteryDefinition: string;
  misconceptions: MisconceptionEntry[];
  generativeContext: string | null;
}): string {
  const mcList = skill.misconceptions
    .map(m => `  • [${m.frequency}] "${m.label}": ${m.description}`)
    .join('\n');

  return `Generate 3 explanation routes (A, B, C) for this KS3 maths skill.

SKILL: ${skill.code} — ${skill.name}

MASTERY DEFINITION:
${skill.masteryDefinition}

GENERATION CONTEXT:
${skill.generativeContext ?? 'Standard KS3 curriculum topic.'}

KNOWN MISCONCEPTIONS (use these to inform Route B and misconceptionSummary fields):
${mcList}

Return a JSON array of exactly 3 route objects.`;
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<GeneratedRoute[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
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

  const text = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Persist ───────────────────────────────────────────────────────────────────

async function persistRoutes(
  skillId: string,
  skillCode: string,
  routes: GeneratedRoute[],
): Promise<number> {
  let count = 0;

  for (const route of routes) {
    if (!['A', 'B', 'C'].includes(route.routeType)) {
      console.warn(`    ⚠ Invalid routeType "${route.routeType}" — skipping`);
      continue;
    }

    const upserted = await prisma.explanationRoute.upsert({
      where: { skillId_routeType: { skillId, routeType: route.routeType } },
      create: {
        skillId,
        routeType: route.routeType,
        misconceptionSummary: route.misconceptionSummary ?? '',
        workedExample: route.workedExample ?? '',
        guidedPrompt: route.guidedPrompt ?? '',
        guidedAnswer: route.guidedAnswer ?? '',
        isActive: true,
        defaultPriorityRank: route.routeType === 'A' ? 0 : route.routeType === 'B' ? 1 : 2,
      },
      update: {
        misconceptionSummary: route.misconceptionSummary ?? '',
        workedExample: route.workedExample ?? '',
        guidedPrompt: route.guidedPrompt ?? '',
        guidedAnswer: route.guidedAnswer ?? '',
        isActive: true,
      },
    });

    const steps = Array.isArray(route.steps) ? route.steps : [];
    for (const step of steps) {
      try {
        const validated = validateExplanationStepWrite({
          checkpointQuestion: step.checkpointQuestion,
          checkpointOptions: step.checkpointOptions ?? [],
          checkpointAnswer: step.checkpointAnswer,
        });

        await prisma.explanationStep.upsert({
          where: {
            explanationRouteId_stepOrder: {
              explanationRouteId: upserted.id,
              stepOrder: step.stepOrder,
            },
          },
          create: {
            explanationRouteId: upserted.id,
            stepOrder: step.stepOrder,
            title: step.title ?? '',
            explanation: step.explanation ?? '',
            stepType: 'checkpoint',
            checkpointQuestion: validated.checkpointQuestion,
            checkpointOptions: validated.checkpointOptions as unknown as Prisma.InputJsonValue,
            checkpointAnswer: validated.checkpointAnswer,
            questionType: validated.questionType,
          },
          update: {
            title: step.title ?? '',
            explanation: step.explanation ?? '',
            checkpointQuestion: validated.checkpointQuestion,
            checkpointOptions: validated.checkpointOptions as unknown as Prisma.InputJsonValue,
            checkpointAnswer: validated.checkpointAnswer,
            questionType: validated.questionType,
          },
        });
      } catch (err) {
        console.warn(`    ⚠ ${skillCode} Route ${route.routeType} step ${step.stepOrder}: ${(err as Error).message}`);
      }
    }

    console.log(`    ✓ ${skillCode} Route ${route.routeType}`);
    count++;
  }

  return count;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Generating explanation routes for skills with none...\n');

  // Find all enriched skills that have zero ExplanationRoutes
  const skills = await prisma.skill.findMany({
    where: {
      masteryDefinition: { not: null },
      explanationRoutes: { none: {} },
    },
    select: {
      id: true,
      code: true,
      name: true,
      masteryDefinition: true,
      misconceptions: true,
      generativeContext: true,
    },
    orderBy: { code: 'asc' },
  });

  console.log(`Found ${skills.length} skills needing routes.\n`);

  let skillsDone = 0;
  let routesDone = 0;
  let errors = 0;

  for (const skill of skills) {
    if (!skill.masteryDefinition) continue;

    const misconceptions = (skill.misconceptions ?? []) as unknown as MisconceptionEntry[];
    console.log(`  → ${skill.code} — ${skill.name}`);

    try {
      const prompt = buildPrompt({
        code: skill.code,
        name: skill.name,
        masteryDefinition: skill.masteryDefinition,
        misconceptions,
        generativeContext: skill.generativeContext,
      });

      const routes = await callAnthropic(prompt);
      const count = await persistRoutes(skill.id, skill.code, routes);
      routesDone += count;
      skillsDone++;
    } catch (err) {
      console.error(`    ✗ ${skill.code} failed: ${(err as Error).message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────────────');
  console.log('Done.');
  console.log(`  Skills processed : ${skillsDone}`);
  console.log(`  Routes created   : ${routesDone}`);
  console.log(`  Errors           : ${errors}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
