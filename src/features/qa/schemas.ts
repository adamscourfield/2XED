import { z } from 'zod';

// ── RubricCriterion ────────────────────────────────────────────────────────────

export const RubricCriterionSchema = z.object({
  element: z.string().min(1),
  weight: z.number().min(0).max(1),
  descriptors: z
    .array(
      z.object({
        score: z.number().int().min(0).max(4),
        descriptor: z.string().min(1),
      })
    )
    .min(1),
});

// ── Rubric ────────────────────────────────────────────────────────────────────

export const RubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema).min(1),
  overall: z.object({
    wtmTemplate: z.string().min(1),
    ebiTemplate: z.string().min(1),
  }),
});

// ── SubQuestion ───────────────────────────────────────────────────────────────

export const SubQuestionSchema = z.object({
  index: z.number().int().min(0),
  stem: z.string().min(1),
  inputType: z.enum(['MCQ', 'SHORT_TEXT', 'NUMERIC', 'CANVAS', 'MIXED']),
  options: z.array(z.string()).optional(),
  rubric: RubricSchema.optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  points: z.number().int().min(0),
});

// ── QuestionBlock ─────────────────────────────────────────────────────────────

export const QuestionBlockSchema = z.object({
  id: z.string().cuid(),
  skillCode: z.string().min(1),
  questions: z.array(SubQuestionSchema).min(1),
  presentationHint: z.enum(['sequential', 'all_visible', 'accordion']),
  submitRule: z.enum(['per_question', 'all_together']),
  instructionText: z.string().optional(),
});

// ── MarkRequest ───────────────────────────────────────────────────────────────

export const MarkRequestSchema = z.object({
  questionId: z.string().min(1),
  attemptId: z.string().optional(),
  answer: z.string().nullish(),
  canvasData: z
    .object({
      snapshotBase64: z.string().min(1),
      snapshotCropped: z.string().optional(),
      strokes: z.array(z.unknown()).optional(),
    })
    .nullish(),
  mode: z.enum(['DRAFT', 'FINAL']),
});

// ── MarkResult (= markSchema) ─────────────────────────────────────────────────
// This is the validated shape returned by AIMarkingService and /api/mark.

export const markSchema = z.object({
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
  latencyMs: z.number().int().min(0),
});

export type MarkResultSchema = z.infer<typeof markSchema>;
