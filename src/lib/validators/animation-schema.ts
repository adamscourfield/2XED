import { z } from 'zod';

const ShowExpressionPartSchema = z.object({
  text: z.string(),
  id: z.string(),
  highlight: z.enum(['accent', 'blue', 'green', 'dim']).nullable(),
});

const ShowExpressionSchema = z.object({
  type: z.literal('show_expression'),
  expression: z.string(),
  parts: z.array(ShowExpressionPartSchema),
});

const NumberLineSchema = z.object({
  type: z.literal('number_line'),
  range: z.tuple([z.number(), z.number()]),
  highlightStart: z.number().optional(),
  arrowFrom: z.number().optional(),
  arrowTo: z.number().optional(),
});

const StepRevealLineSchema = z.object({
  text: z.string(),
  highlight: z.enum(['accent', 'blue', 'green', 'dim']).nullable(),
});

const StepRevealSchema = z.object({
  type: z.literal('step_reveal'),
  lines: z.array(StepRevealLineSchema),
});

const RuleCalloutSchema = z.object({
  type: z.literal('rule_callout'),
  ruleText: z.string(),
  subText: z.string().optional(),
});

const AreaModelSchema = z.object({
  type: z.literal('area_model'),
  rows: z.number().int().min(1),
  cols: z.number().int().min(1),
  highlightRows: z.array(z.number().int()).optional(),
  label: z.string().optional(),
});

const FractionBarSchema = z.object({
  type: z.literal('fraction_bar'),
  numerator: z.number(),
  denominator: z.number(),
  showDecimal: z.boolean().optional(),
  showPercent: z.boolean().optional(),
});

const ResultRevealSchema = z.object({
  type: z.literal('result_reveal'),
  expression: z.string(),
  label: z.string().optional(),
});

const VisualPrimitiveSchema = z.discriminatedUnion('type', [
  ShowExpressionSchema,
  NumberLineSchema,
  StepRevealSchema,
  RuleCalloutSchema,
  AreaModelSchema,
  FractionBarSchema,
  ResultRevealSchema,
]);

const AnimationStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  id: z.string(),
  visuals: z.array(VisualPrimitiveSchema),
  narration: z.string(),
  audioFile: z.string().nullable(),
});

const MisconceptionStripSchema = z.object({
  text: z.string(),
  audioNarration: z.string(),
});

export const AnimationSchemaValidator = z.object({
  schemaVersion: z.string(),
  skillCode: z.string(),
  skillName: z.string(),
  routeType: z.enum(['A', 'B', 'C']),
  routeLabel: z.string(),
  misconceptionSummary: z.string(),
  generatedAt: z.string(),
  steps: z.array(AnimationStepSchema).min(1),
  misconceptionStrip: MisconceptionStripSchema,
  loopable: z.boolean(),
  pauseAtEndMs: z.number().int().min(0),
});

export type AnimationSchema = z.infer<typeof AnimationSchemaValidator>;
export type AnimationStep = z.infer<typeof AnimationStepSchema>;
export type VisualPrimitive = z.infer<typeof VisualPrimitiveSchema>;
export type MisconceptionStrip = z.infer<typeof MisconceptionStripSchema>;
