/**
 * backfill-misconception-maps.ts
 *
 * Back-populates Item.misconceptionMap for all authored questions that lack it.
 *
 * Strategy: group items by skill, send one API call per skill containing all
 * un-tagged questions for that skill. The AI assigns a misconception ID (from
 * the skill's enrichment data) to each wrong option, or null if no misconception
 * clearly applies.
 *
 * This closes the signal loop for the 4,544 imported authored questions —
 * LiveAttempt.misconceptionId will now be populated for any wrong answer,
 * not just AI-generated questions.
 *
 * Rate limiting: CONCURRENCY=1, DELAY_MS=8000 between skill batches.
 * Estimated runtime: ~107 skills × 8s = ~15 minutes.
 * Estimated cost: ~$3 at Haiku rates.
 *
 * Safe to re-run — skips items that already have a misconceptionMap.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS"}' \
 *     prisma/backfill-misconception-maps.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env without requiring dotenv — parse it with built-in modules only.
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

const prisma = new PrismaClient();

const DELAY_MS = 8_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MisconceptionEntry {
  id: string;
  label: string;
  description: string;
  frequency: string;
}

interface ItemRow {
  id: string;
  question: string;
  answer: string;
  options: { choices: string[]; acceptedAnswers: string[] };
}

interface AnnotationResult {
  itemId: string;
  misconceptionMap: Record<string, string | null>;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are tagging distractor (wrong answer) options on KS3 maths questions with misconception IDs.

For each question you receive, analyse every wrong option and assign the misconception ID from the provided list that best explains why a student would choose that distractor. Use null if no misconception from the list clearly applies.

Output ONLY a valid JSON array — no markdown fences, no preamble, no trailing text.

Each element must have exactly these keys:
  "itemId"          — the item ID provided in the input (string, copy exactly)
  "misconceptionMap" — object mapping each WRONG option text to a misconception ID string, or null

Rules:
- Only include wrong options in misconceptionMap (not the correct answer)
- Use the exact misconception IDs provided — do not invent new ones
- Be specific: if a distractor maps to two misconceptions, pick the most likely one
- Return one entry per item, in the same order as the input`;

function buildPrompt(
  skill: { code: string; name: string; misconceptions: MisconceptionEntry[] },
  items: ItemRow[],
): string {
  const mcList = skill.misconceptions
    .map(m => `  • "${m.id}" — ${m.label}: ${m.description} [${m.frequency}]`)
    .join('\n');

  const questionList = items
    .map(item => {
      const wrongOptions = item.options.choices.filter(
        c => c.trim().toLowerCase() !== item.answer.trim().toLowerCase(),
      );
      return JSON.stringify({
        itemId: item.id,
        question: item.question,
        correctAnswer: item.answer,
        wrongOptions,
      });
    })
    .join('\n');

  return `Tag the wrong answer options for ${items.length} questions on this KS3 maths skill.

SKILL: ${skill.code} — ${skill.name}

MISCONCEPTIONS (use ONLY these IDs):
${mcList}

QUESTIONS:
${questionList}

Return a JSON array with one entry per item.`;
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<AnnotationResult[]> {
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
      max_tokens: 16384,
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

  // Strip markdown fences if the model wraps output
  const text = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ── Sleep helper ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the item needs (re)tagging.
 *
 * An item needs tagging if:
 *   - misconceptionMap is null (never tagged), OR
 *   - the map was built from Codex source data and contains none of our enrichment
 *     misconception IDs (format: "<strand><n>-<n>-m<n>", e.g. "n1-1-m1")
 *
 * This handles the case where the import set misconceptionMap in the old Codex
 * format (keys = misconception type names, values = diagnostic signal strings)
 * rather than our format (keys = wrong option text, values = enrichment ID | null).
 */
function needsTagging(
  item: { misconceptionMap: unknown },
  validMisconceptionIds: Set<string>,
): boolean {
  if (item.misconceptionMap === null) return true;
  if (typeof item.misconceptionMap !== 'object') return true;
  const values = Object.values(item.misconceptionMap as Record<string, unknown>);
  // If any value is one of our enrichment IDs the item is already tagged correctly.
  return !values.some(v => typeof v === 'string' && validMisconceptionIds.has(v));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting misconception map backfill...\n');

  // Load all enriched skills (must have misconceptions to annotate distractors).
  // Using masteryDefinition (String?) as the enrichment sentinel — simpler than
  // filtering on a nullable JSON field.
  const skills = await prisma.skill.findMany({
    where: { masteryDefinition: { not: null } },
    select: {
      id: true,
      code: true,
      name: true,
      misconceptions: true,
      items: {
        select: {
          item: {
            select: {
              id: true,
              question: true,
              answer: true,
              options: true,
              misconceptionMap: true,
            },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  console.log(`Found ${skills.length} enriched skills.\n`);

  let skillsProcessed = 0;
  let itemsTagged = 0;
  let itemsSkipped = 0;
  let errors = 0;

  for (const skill of skills) {
    // Filter to items that need tagging: null map OR old Codex-format map
    // (old format has keys that aren't wrong-option text and values that aren't
    // our enrichment IDs). needsTagging() detects both cases.
    const misconceptionsForFilter = skill.misconceptions as unknown as MisconceptionEntry[];
    const validIdsForFilter = new Set(misconceptionsForFilter.map(m => m.id));
    const untagged: ItemRow[] = skill.items
      .map(is => is.item)
      .filter(item => needsTagging(item, validIdsForFilter))
      .map(item => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        options: item.options as { choices: string[]; acceptedAnswers: string[] },
      }));

    if (untagged.length === 0) {
      console.log(`  ○ ${skill.code} — no untagged items, skipping`);
      itemsSkipped += skill.items.length;
      continue;
    }

    const misconceptions = skill.misconceptions as unknown as MisconceptionEntry[];
    console.log(`  → ${skill.code} — tagging ${untagged.length} items...`);

    try {
      const prompt = buildPrompt(
        { code: skill.code, name: skill.name, misconceptions },
        untagged,
      );

      const results = await callAnthropic(prompt);

      // Build a lookup map from the API response
      const resultMap = new Map<string, Record<string, string | null>>();
      for (const r of results) {
        if (r.itemId && r.misconceptionMap && typeof r.misconceptionMap === 'object') {
          resultMap.set(r.itemId, r.misconceptionMap);
        }
      }

      // Persist each item's misconceptionMap
      let skillTagged = 0;
      for (const item of untagged) {
        const map = resultMap.get(item.id);
        if (!map) {
          console.warn(`    ⚠ No result for item ${item.id} — skipping`);
          continue;
        }

        await prisma.item.update({
          where: { id: item.id },
          data: { misconceptionMap: map as unknown as Prisma.InputJsonValue },
        });
        skillTagged++;
      }

      console.log(`    ✓ ${skillTagged}/${untagged.length} items tagged`);
      itemsTagged += skillTagged;
      skillsProcessed++;
    } catch (err) {
      console.error(`    ✗ ${skill.code} failed: ${(err as Error).message}`);
      errors++;
    }

    // Rate limit: wait before next skill
    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`Done.`);
  console.log(`  Skills processed : ${skillsProcessed}`);
  console.log(`  Items tagged     : ${itemsTagged}`);
  console.log(`  Items skipped    : ${itemsSkipped} (already had map)`);
  console.log(`  Errors           : ${errors}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
