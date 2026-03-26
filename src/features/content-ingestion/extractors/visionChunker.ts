/**
 * visionChunker.ts
 *
 * Sends a single PDF page image to GPT-4o vision and classifies each
 * visual block as EXPLANATION | MODEL | QUESTION.
 *
 * Block-type mapping to ExplanationBlockType:
 *   EXPLANATION → TEXT  (definitions, notes, learning content)
 *   MODEL       → MODEL (worked examples, teacher exemplars, model answers)
 *   QUESTION    → CHECKPOINT (student tasks, activities, practice questions)
 *
 * Requires: OPENAI_API_KEY in environment.
 */

import { z } from 'zod';

// ── Public types ───────────────────────────────────────────────────────────────

export type VisionBlockType = 'EXPLANATION' | 'MODEL' | 'QUESTION';

export interface VisionBlock {
  /** Short id derived from page + block index, e.g. "p3_b2" */
  id: string;
  blockType: VisionBlockType;
  /** Verbatim text of the block as read by GPT-4o */
  text: string;
  /** Optional spatial hint from the model, e.g. "top-left", "centre column" */
  boundingHint?: string;
}

export interface ParsedPage {
  pageIndex: number;          // 1-based
  blocks: VisionBlock[];
  /** 0–1 overall confidence for this page (average across blocks) */
  confidence: number;
  /** True if GPT-4o flagged any block as ambiguous */
  hasAmbiguous: boolean;
}

// ── Internal Zod schema for GPT-4o response ────────────────────────────────────

const BlockSchema = z.object({
  blockType: z.enum(['EXPLANATION', 'MODEL', 'QUESTION']),
  text: z.string(),
  boundingHint: z.string().optional(),
  /** Model self-rates confidence 0–1 per block */
  confidence: z.number().min(0).max(1).default(0.8),
  ambiguous: z.boolean().default(false),
});

const PageResponseSchema = z.object({
  blocks: z.array(BlockSchema),
});

type PageResponse = z.infer<typeof PageResponseSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert curriculum analyst reviewing a page from a secondary school English booklet.

Your job is to identify every distinct content block on the page and classify each one as exactly one of:
- EXPLANATION — definitions, learning content, teacher notes, key vocabulary, quotations, or any text that teaches the student something
- MODEL       — worked examples, model essays/paragraphs, exemplar answers, annotated texts that show the student *how* to do something
- QUESTION    — student tasks, practice questions, activities, exercises, "Your turn" prompts, checklists, anything the student writes or responds to

Rules:
1. Read every block of text visible on the page — do NOT skip headers, labels, or callout boxes.
2. Each block must have a verbatim copy of its text in the "text" field.
3. Provide a "boundingHint" describing where the block sits on the page (e.g. "top heading", "left column", "box at bottom right").
4. Rate your confidence 0–1 for each block. If you are uncertain between two types, set ambiguous:true and pick the most likely.
5. Respond ONLY with a JSON object matching this schema — no markdown fences, no extra keys:

{
  "blocks": [
    {
      "blockType": "EXPLANATION" | "MODEL" | "QUESTION",
      "text": "<verbatim text>",
      "boundingHint": "<spatial description>",
      "confidence": <0.0–1.0>,
      "ambiguous": <true|false>
    }
  ]
}`;

// ── OpenAI call ────────────────────────────────────────────────────────────────

async function callVisionAPI(
  imageBase64: string,
  pageIndex: number,
): Promise<PageResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Classify all content blocks on page ${pageIndex} of the booklet.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 429) {
        const error = Object.assign(new Error('rate_limit_exceeded'), { status: 429 });
        throw error;
      }
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = json.choices[0]?.message?.content ?? '';
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return PageResponseSchema.parse(JSON.parse(cleaned));
  } finally {
    clearTimeout(timeout);
  }
}

// ── Retry wrapper ──────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const e = err as { status?: number; message?: string };
      const isRetryable =
        e?.status === 429 ||
        e?.message?.includes('rate_limit') ||
        e?.message?.includes('timeout') ||
        e?.message?.includes('AbortError');
      if (!isRetryable || attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      process.stderr.write(
        `  [visionChunker] retrying page after ${delay}ms (attempt ${attempt + 1})\n`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Classify all content blocks on a single PDF page.
 *
 * @param imageBase64 - PNG of the page encoded as base64
 * @param pageIndex   - 1-based page number (used for block id generation)
 * @returns ParsedPage with classified blocks + confidence metrics
 */
export async function chunkPage(
  imageBase64: string,
  pageIndex: number,
): Promise<ParsedPage> {
  const response = await withRetry(() => callVisionAPI(imageBase64, pageIndex));

  const blocks: VisionBlock[] = response.blocks.map((b, i) => ({
    id: `p${pageIndex}_b${i + 1}`,
    blockType: b.blockType,
    text: b.text.trim(),
    boundingHint: b.boundingHint,
  }));

  const confidences = response.blocks.map((b) => b.confidence ?? 0.8);
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, c) => a + c, 0) / confidences.length
      : 0;

  const hasAmbiguous = response.blocks.some((b) => b.ambiguous);

  return { pageIndex, blocks, confidence: avgConfidence, hasAmbiguous };
}
