import { z } from 'zod';
import { markSchema } from './schemas';

export { markSchema } from './schemas';

export interface MarkRequest {
  questionId: string;
  attemptId?: string;
  answer: string | null;
  canvasData?: {
    snapshotBase64: string;
    snapshotCropped?: string;
    strokes?: unknown[];
  } | null;
  mode: 'DRAFT' | 'FINAL';
}

export interface MarkResult {
  correct: boolean;
  score: number;       // 0–1
  criteria: Array<{
    element: string;
    score: number;
    maxScore: number;
    summary?: string;
  }>;
  feedback: string;
  wtm: string;
  ebi: string;
  flagged: boolean;
  latencyMs: number;
}

export interface AIMarkResult extends MarkResult {
  attemptId: string;
  questionId: string;
  modelUsed: string;
  createdAt: Date;
}

// ── Rate limiter ────────────────────────────────────────────────────────────────

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  retries: number;
  nextRetryMs: number;
};

class ConcurrencyLimiter {
  private queue: PendingRequest[] = [];
  private inFlight = 0;

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxRetries: number,
    private readonly baseDelayMs: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inFlight < this.maxConcurrent) {
      this.inFlight++;
      try {
        return await fn();
      } finally {
        this.inFlight--;
        this.flush();
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        retries: 0,
        nextRetryMs: this.baseDelayMs,
      });
    });
  }

  private flush(): void {
    while (this.inFlight < this.maxConcurrent && this.queue.length > 0) {
      const req = this.queue.shift()!;
      this.inFlight++;
      req.resolve(
        (async () => {
          try {
            return await this.runWithRetry(req, 0);
          } finally {
            this.inFlight--;
            this.flush();
          }
        })()
      );
    }
  }

  private async runWithRetry(req: PendingRequest, attempt: number): Promise<unknown> {
    try {
      return await this.attempt(req);
    } catch (err) {
      const error = err as { message?: string; status?: number };
      const isRetryable =
        error?.status === 429 ||
        error?.message?.includes('rate_limit') ||
        error?.message?.includes('timeout');

      if (isRetryable && attempt < this.maxRetries) {
        await this.sleep(req.nextRetryMs * Math.pow(2, attempt));
        return this.runWithRetry(req, attempt + 1);
      }
      throw err;
    }
  }

  private async attempt(req: PendingRequest): Promise<unknown> {
    // Delegate — caller passes a factory so we can call it fresh on retry
    throw new Error('Override in subclass');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// Global rate limiter — 5 concurrent, 3 retries, 1s base delay
export const markingLimiter = new (class extends ConcurrencyLimiter {
  constructor() {
    super(5, 3, 1000);
  }
})();

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildSystemPrompt(rubric: unknown): string {
  return `You are an expert secondary school English teacher marking student work.

Your role is to give precise, formative feedback that helps the student improve.
Be specific, reference the student's actual answer, and cite evidence from their text.
Use a warm but rigorous tone — the goal is growth, not praise or criticism for its own sake.

When marking, use the following rubric criteria:
${JSON.stringify(rubric, null, 2)}

Return valid JSON only.
Include criterion-level scoring using this shape:
{
  "correct": boolean,
  "score": number,
  "criteria": [{ "element": string, "score": number, "maxScore": number, "summary": string }],
  "feedback": string,
  "wtm": string,
  "ebi": string,
  "flagged": boolean
}
Respond using the rubric criteria names where possible.`;
}

function buildUserPrompt(
  question: string,
  answer: string,
  rubric: unknown
): string {
  return `Question: ${question}

Student's answer:
${answer}

Rubric:
${JSON.stringify(rubric, null, 2)}

Mark the student's answer against the rubric. Respond with the required JSON schema, including criterion-level scores.`;
}

function buildImagePrompt(question: string, rubric: unknown): string {
  return `You are an expert secondary school English teacher.
A student has handwritten their answer to the question below.
Read the handwriting, then mark it against the rubric.
Be specific — reference what they actually wrote.

Question: ${question}

Rubric:
${JSON.stringify(rubric, null, 2)}

Respond using the required JSON schema, including criterion-level scores.`;
}

// ── LLM call ───────────────────────────────────────────────────────────────────

const LLM_RESPONSE_SCHEMA = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  criteria: z
    .array(
      z.object({
        element: z.string().min(1),
        score: z.number().min(0),
        maxScore: z.number().positive(),
        summary: z.string().optional(),
      })
    )
    .default([]),
  feedback: z.string(),
  wtm: z.string(),
  ebi: z.string(),
  flagged: z.boolean(),
});

async function callLLM(
  messages: Array<{ role: 'system' | 'user'; content: string | object }>,
  imageBase64?: string
): Promise<z.infer<typeof LLM_RESPONSE_SCHEMA>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const content: string | object =
    imageBase64
      ? [
          { type: 'text' as const, text: messages[messages.length - 1].content as string },
          {
            type: 'image_url' as const,
            image_url: { url: `data:image/png;base64,${imageBase64}`, detail: 'high' },
          },
        ]
      : messages[messages.length - 1].content;

  const body: Record<string, unknown> = {
    model: 'gpt-4o',
    messages: [
      ...messages.slice(0, -1),
      { role: messages[messages.length - 1].role, content },
    ],
    temperature: 0.3,
    max_tokens: 800,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 429) throw Object.assign(new Error('rate_limit_exceeded'), { status: 429 });
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const json = await res.json() as { choices: Array<{ message: { content: string } }> };
    const content_str = json.choices[0]?.message?.content ?? '';
    const cleaned = content_str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return LLM_RESPONSE_SCHEMA.parse(JSON.parse(cleaned));
  } finally {
    clearTimeout(timeout);
  }
}

// ── AIMarkingService ───────────────────────────────────────────────────────────

export class AIMarkingService {
  /**
   * Mark a student response using AI.
   * - DRAFT mode: returns feedback without persisting anything
   * - FINAL mode: persists AIMarkResult + Attempt, returns feedback
   */
  async mark(req: MarkRequest): Promise<MarkResult> {
    const start = Date.now();

    // 1. Fetch question + rubric from DB
    const question = await this.fetchQuestion(req.questionId);
    if (!question) throw new Error(`Question ${req.questionId} not found`);

    const rubric = question.rubric ?? this.defaultRubric(question);
    const hasImage = !!req.canvasData?.snapshotBase64;
    const answer = req.canvasData
      ? '[Handwritten answer — see image]'
      : (req.answer ?? '').trim();

    if (!answer && !hasImage) {
      throw new Error('No answer provided');
    }

    // 2. Build messages
    const systemMsg = { role: 'system' as const, content: buildSystemPrompt(rubric) };
    if (hasImage) {
      const userContent = buildImagePrompt(question.stem, rubric);
      return this.callWithRetry([systemMsg, { role: 'user' as const, content: userContent }],
        req.canvasData!.snapshotBase64, start);
    } else {
      const userContent = buildUserPrompt(question.stem, answer, rubric);
      return this.callWithRetry([systemMsg, { role: 'user' as const, content: userContent }], undefined, start);
    }
  }

  private async callWithRetry(
    messages: Array<{ role: 'system' | 'user'; content: string | object }>,
    imageBase64: string | undefined,
    start: number
  ): Promise<MarkResult> {
    return markingLimiter.execute(async () => {
      const result = await callLLM(messages, imageBase64);
      return {
        ...result,
        criteria: Array.isArray(result.criteria) ? result.criteria : [],
        feedback: result.feedback ?? '',
        wtm: result.wtm ?? '',
        ebi: result.ebi ?? '',
        latencyMs: Date.now() - start,
      };
    }) as Promise<MarkResult>;
  }

  private async fetchQuestion(questionId: string): Promise<{
    stem: string;
    rubric: unknown;
  } | null> {
    // Lazy import to avoid circular dependency issues
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const item = await prisma.item.findUnique({
        where: { id: questionId },
        select: { question: true, options: true },
      });
      if (!item) return null;

      // Try to parse rubric from options
      const options = (item as unknown as { options?: { rubric?: unknown } }).options ?? {};
      return {
        stem: item.question,
        rubric: options['rubric'] ?? null,
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  private defaultRubric(question: { stem: string }): object {
    return {
      criteria: [
        {
          element: 'content',
          weight: 0.5,
          descriptors: [
            { score: 0, descriptor: 'No relevant response' },
            { score: 1, descriptor: 'Minimal relevance to the question' },
            { score: 2, descriptor: 'Partial address of the question' },
            { score: 3, descriptor: 'Addresses the question well' },
            { score: 4, descriptor: 'Thorough, insightful response that fully addresses the question' },
          ],
        },
        {
          element: 'expression',
          weight: 0.3,
          descriptors: [
            { score: 0, descriptor: 'Illegible or completely unclear' },
            { score: 1, descriptor: 'Very poor expression, difficult to follow' },
            { score: 2, descriptor: 'Adequate expression with some clarity issues' },
            { score: 3, descriptor: 'Clear and appropriate expression' },
            { score: 4, descriptor: 'Sophisticated, precise expression' },
          ],
        },
        {
          element: 'structure',
          weight: 0.2,
          descriptors: [
            { score: 0, descriptor: 'No organisation' },
            { score: 1, descriptor: 'Minimal organisation' },
            { score: 2, descriptor: 'Some organisation, logical weaknesses' },
            { score: 3, descriptor: 'Well-organised response' },
            { score: 4, descriptor: 'Coherent and sophisticated structure' },
          ],
        },
      ],
      overall: {
        wtmTemplate: 'Your {strength} was strong — {evidence}',
        ebiTemplate: 'To improve, focus on {area}. {tip}',
      },
    };
  }
}

export const aiMarkingService = new AIMarkingService();
