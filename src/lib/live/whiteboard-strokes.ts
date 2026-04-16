import { z } from 'zod';

/** Matches `Stroke` / `StrokePoint` from `CanvasInput` for live whiteboard sync. */

export const LiveStrokePointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  pressure: z.number().finite().optional(),
  timestamp: z.number().finite().optional(),
});

export const LiveStrokeSchema = z.object({
  points: z.array(LiveStrokePointSchema).min(2).max(8000),
  color: z.string().min(1).max(32),
  width: z.number().finite().min(0.5).max(48),
});

export const LiveWhiteboardPayloadSchema = z.object({
  action: z.enum(['show', 'clear', 'hide']),
  /** Logical drawing resolution (teacher canvas pixel size). */
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  /** Monotonic version so clients can ignore stale polls. */
  version: z.number().int().nonnegative(),
  strokes: z.array(LiveStrokeSchema).max(600),
});

export type LiveStrokePoint = z.infer<typeof LiveStrokePointSchema>;
export type LiveStroke = z.infer<typeof LiveStrokeSchema>;
export type LiveWhiteboardPayload = z.infer<typeof LiveWhiteboardPayloadSchema>;

const MAX_TOTAL_POINTS = 120_000;

export function countStrokePoints(strokes: LiveStroke[]): number {
  return strokes.reduce((n, s) => n + s.points.length, 0);
}

export function validateWhiteboardPointBudget(strokes: LiveStroke[]): boolean {
  return countStrokePoints(strokes) <= MAX_TOTAL_POINTS;
}
