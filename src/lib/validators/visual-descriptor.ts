import { z } from 'zod';

export const NumberLineDescriptorSchema = z.object({
  type: z.literal('number_line'),
  min: z.number(),
  max: z.number(),
  step: z.number().optional(),
  marked: z.array(z.number()).optional(),
  highlight: z.number().optional(),
  arrow: z.object({
    from: z.number(),
    to: z.number(),
    label: z.string().optional(),
  }).optional(),
  showQuestion: z.object({
    position: z.number(),
    label: z.string().optional(),
  }).optional(),
  width: z.number().optional(),
});

export const BarSegmentSchema = z.object({
  value: z.number(),
  denominator: z.number().optional(),
  label: z.string().optional(),
  highlight: z.boolean().optional(),
  isQuestion: z.boolean().optional(),
  color: z.enum(['primary', 'secondary', 'question']).optional(),
});

export const BarModelDescriptorSchema = z.object({
  type: z.literal('bar_model'),
  total: z.number(),
  segments: z.array(BarSegmentSchema),
  orientation: z.enum(['horizontal', 'vertical']).optional(),
  showTotal: z.boolean().optional(),
  question: z.string().optional(),
});

export const RectangleDescriptorSchema = z.object({
  type: z.literal('rectangle'),
  width: z.number(),
  height: z.number(),
  showDimensions: z.boolean().optional(),
  showArea: z.boolean().optional(),
  labelWidth: z.string().optional(),
  labelHeight: z.string().optional(),
  shaded: z.boolean().optional(),
  question: z.enum(['area', 'perimeter', 'missing_dimension']).nullable().optional(),
  missingDimension: z.enum(['width', 'height']).optional(),
  gridLines: z.boolean().optional(),
});

export const TriangleDescriptorSchema = z.object({
  type: z.literal('triangle'),
  variant: z.enum(['right', 'isoceles', 'scalene', 'equilateral']),
  sideA: z.union([z.number(), z.literal('?')]).optional(),
  sideB: z.union([z.number(), z.literal('?')]).optional(),
  sideC: z.union([z.number(), z.literal('?')]).optional(),
  angleA: z.union([z.number(), z.literal('?')]).optional(),
  angleB: z.union([z.number(), z.literal('?')]).optional(),
  angleC: z.union([z.number(), z.literal('?')]).optional(),
  showRightAngle: z.boolean().optional(),
  question: z.enum(['area', 'perimeter', 'missing_side', 'missing_angle']).optional(),
});

export const CompositeShapeDescriptorSchema = z.object({
  type: z.literal('composite'),
  shapes: z.array(z.union([RectangleDescriptorSchema.omit({ type: true }).extend({ type: z.literal('rectangle') }), TriangleDescriptorSchema.omit({ type: true }).extend({ type: z.literal('triangle') })])),
  layout: z.enum(['joined_right', 'joined_top', 'l_shape', 'custom']),
  totalDimensions: z.object({ width: z.number(), height: z.number() }).optional(),
  question: z.enum(['area', 'perimeter']).optional(),
});

export const VisualDescriptorSchema = z.discriminatedUnion('type', [
  NumberLineDescriptorSchema,
  BarModelDescriptorSchema,
  RectangleDescriptorSchema,
  TriangleDescriptorSchema,
  CompositeShapeDescriptorSchema,
]);

export type NumberLineDescriptor = z.infer<typeof NumberLineDescriptorSchema>;
export type BarSegment = z.infer<typeof BarSegmentSchema>;
export type BarModelDescriptor = z.infer<typeof BarModelDescriptorSchema>;
export type RectangleDescriptor = z.infer<typeof RectangleDescriptorSchema>;
export type TriangleDescriptor = z.infer<typeof TriangleDescriptorSchema>;
export type CompositeShapeDescriptor = z.infer<typeof CompositeShapeDescriptorSchema>;
export type VisualDescriptor = z.infer<typeof VisualDescriptorSchema>;
